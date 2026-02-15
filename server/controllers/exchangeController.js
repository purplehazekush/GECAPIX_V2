// server/controllers/exchangeController.js
const SystemState = require('../models/SystemState');
const UsuarioModel = require('../models/Usuario');
const Trade = require('../models/Trade');
const mongoose = require('mongoose');

// --- MATEMÁTICA EXPONENCIAL ---
const calculateGeometricCost = (startSupply, amount, basePrice, multiplier) => {
    // Open: Preço do supply atual
    const startUnitPrice = basePrice * Math.pow(multiplier, startSupply);

    let totalCost = 0;
    let currentPrice = startUnitPrice;

    for (let i = 0; i < amount; i++) {
        totalCost += currentPrice;
        currentPrice *= multiplier;
    }

    // Close: Preço do supply FUTURO (após a compra de todas as unidades)
    // Isso garante que o fechamento desta vela seja a abertura da próxima.
    const endUnitPrice = basePrice * Math.pow(multiplier, startSupply + amount);

    return { totalCost, startUnitPrice, endUnitPrice };
};

exports.getQuote = async (req, res) => {
    try {
        const { action, amount } = req.query;
        const state = await SystemState.findOne({ season_id: 1 });
        if (!state) return res.status(500).json({ error: "Offline" });

        const qtd = parseInt(amount);
        if (!qtd || qtd <= 0) return res.json({ total: 0 });

        const mult = state.glue_price_multiplier;
        const base = state.glue_price_base;
        const supply = state.glue_supply_circulating;

        let result = {};

        if (action === 'buy') {
            // Custo para subir a escada
            const { totalCost, startUnitPrice, endUnitPrice } = calculateGeometricCost(supply, qtd, base, mult);
            result = {
                total_coins: Math.ceil(totalCost),
                price_start: startUnitPrice,
                price_end: endUnitPrice
            };
        } else {
            
            const startSupply = supply - qtd;
            const { totalCost, startUnitPrice, endUnitPrice } = calculateGeometricCost(startSupply, qtd, base, mult);

            // Taxa de Slippage/Queima na venda (ex: 5%)
            const burn = totalCost * 0.05;

            result = {
                total_coins: Math.floor(totalCost - burn),
                price_start: endUnitPrice, 
                price_end: startUnitPrice  
            };
        }
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro na cotação" });
    }
};


exports.executeTrade = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { action, amount } = req.body;
        const state = await SystemState.findOne({ season_id: 1 }).session(session);
        const user = await UsuarioModel.findById(req.user._id).session(session);

        if (!state.market_is_open) throw new Error("Mercado Fechado");
        const qtd = parseInt(amount);
        if (qtd <= 0) throw new Error("Quantidade Inválida");

        const mult = state.glue_price_multiplier;
        const base = state.glue_price_base;
        let supply = state.glue_supply_circulating;

        let finalPrice = 0;

        if (action === 'buy') {
            const { totalCost, startUnitPrice, endUnitPrice } = calculateGeometricCost(supply, qtd, base, mult);
            const cost = Math.ceil(totalCost);

            if (user.saldo_coins < cost) throw new Error("Saldo insuficiente");

            user.saldo_coins -= cost;
            user.saldo_glue += qtd;
            state.glue_supply_circulating += qtd;
            finalPrice = endUnitPrice;

            // Registro do Trade
            await Trade.create([{
                userId: user._id, type: 'BUY', amount_glue: qtd, amount_coins: cost,
                price_start: startUnitPrice, price_end: endUnitPrice,
                price_high: endUnitPrice, price_low: startUnitPrice
            }], { session });

        } else if (action === 'sell') {
            if (user.saldo_glue < qtd) throw new Error("GLUE insuficiente");

            const newSupply = supply - qtd;
            const { totalCost, startUnitPrice, endUnitPrice } = calculateGeometricCost(newSupply, qtd, base, mult);

            // LÓGICA DE TAXA (5%)
            const fee = Math.ceil(totalCost * 0.05);
            const receive = Math.floor(totalCost - fee);
            const feePart = Math.floor(fee / 2);
            const burnPart = fee - feePart;

            user.saldo_glue -= qtd;
            user.saldo_coins += receive;
            state.glue_supply_circulating -= qtd;
            state.total_burned += fee;
            finalPrice = startUnitPrice;

            // Envia Metade para Fees
            await UsuarioModel.updateOne(
                { email: "trading_fees@gecapix.com" },
                { $inc: { saldo_coins: feePart } },
                { session }
            );

            // Envia Metade para Burn (Remove de circulação efetivamente)
            await UsuarioModel.updateOne(
                { email: "burn_address@gecapix.com" },
                { $inc: { saldo_coins: burnPart } },
                { session }
            );

            state.total_burned += burnPart; // Atualiza estatística global

            await Trade.create([{
                userId: user._id, type: 'SELL', amount_glue: qtd, amount_coins: receive,
                price_start: endUnitPrice, price_end: startUnitPrice,
                price_high: endUnitPrice, price_low: startUnitPrice
            }], { session });
        }

        await user.save({ session });
        await state.save({ session });

        await session.commitTransaction();

        session.endSession();

        // 📡 NOTIFICAÇÃO REAL-TIME VIA SOCKET
        const io = req.app.get('io');
        if (io) {
            // Calculamos o candle atual para enviar junto
            // Isso evita que o front precise dar GET /chart
            const now = new Date();
            const tradeData = {
                time: Math.floor(now.getTime() / 1000), // Timestamp em segundos para o gráfico
                price: finalPrice,
                amount: qtd,
                type: action,
                supply: state.glue_supply_circulating
            };

            io.emit('market_update', tradeData);
        }

        res.json({ success: true });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ error: error.message });
    }
};

exports.getChartData = async (req, res) => {
    try {
        const { tf } = req.query; // ex: 1, 5, 15 (em minutos)
        const interval = parseInt(tf) || 1;
        const intervalMs = interval * 60 * 1000;

        const trades = await Trade.find().sort({ timestamp: 1 });

        if (trades.length === 0) return res.json([]);

        const candles = [];
        let currentCandle = null;

        trades.forEach(trade => {
            // Arredonda o tempo para o início do balde (bucket)
            const tradeTime = new Date(trade.timestamp).getTime();
            const bucketTime = Math.floor(tradeTime / intervalMs) * intervalMs;
            const bucketSeconds = Math.floor(bucketTime / 1000);

            if (!currentCandle || currentCandle.time !== bucketSeconds) {
                // Inicia uma nova vela
                if (currentCandle) candles.push(currentCandle);

                currentCandle = {
                    time: bucketSeconds,
                    open: trade.price_start,
                    high: trade.price_high,
                    low: trade.price_low,
                    close: trade.price_end
                };
            } else {
                // Atualiza a vela existente no mesmo balde de tempo
                currentCandle.high = Math.max(currentCandle.high, trade.price_high);
                currentCandle.low = Math.min(currentCandle.low, trade.price_low);
                currentCandle.close = trade.price_end; // O fechamento é sempre o do último trade
            }
        });

        // Adiciona a última vela que ficou no loop
        if (currentCandle) candles.push(currentCandle);

        res.json(candles);
    } catch (error) {
        res.status(500).json({ error: "Erro ao processar candles" });
    }
};

// Admin
exports.adminUpdateParams = async (req, res) => {
    const { multiplier, base } = req.body;
    await SystemState.updateOne({ season_id: 1 }, {
        glue_price_multiplier: multiplier,
        glue_price_base: base
    });
    res.json({ success: true });
};

// GET: Retorna dados sensíveis para o Painel do BC
exports.getAdminStats = async (req, res) => {
    try {
        const state = await SystemState.findOne({ season_id: 1 });
        // Retornamos tudo que o Admin precisa monitorar
        res.json({
            multiplier: state.glue_price_multiplier,
            basePrice: state.glue_price_base,
            circulatingSupply: state.glue_supply_circulating,
            marketOpen: state.market_is_open,
            totalBurned: state.total_burned,
            seasonId: state.season_id
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar dados do BC" });
    }
};

// POST: O botão vermelho que muda a realidade
exports.toggleMarket = async (req, res) => {
    try {
        const state = await SystemState.findOne({ season_id: 1 });
        state.market_is_open = !state.market_is_open;
        await state.save();
        res.json({ success: true, marketOpen: state.market_is_open });
    } catch (error) {
        res.status(500).json({ error: "Erro ao alternar mercado" });
    }
};
// ... (Mantenha todo o código acima do exports.toggleMarket igual) ...

// ============================================================================
// 🛠️ FUNÇÕES AUXILIARES (FÍSICA MATEMÁTICA - CORE V6)
// ============================================================================

/**
 * Gera um número aleatório com Distribuição Normal (Curva de Sino)
 * Usando Transformada de Box-Muller.
 * Essencial para simular movimentos orgânicos de mercado.
 */
function randomNormal(mean, stdDev) {
    const u = 1 - Math.random(); // Converte [0,1) para (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return z * stdDev + mean;
}

/**
 * Mantém o valor dentro dos limites (Clamp/Clip)
 */
function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

/**
 * Lógica de Random Walk dos Atributos (A "Alma" do V6)
 * Simula a mudança de regime de mercado ao longo do tempo.
 */
function rollAttribute(currentVal, attrConfig) {
    // 1. Dá um passo aleatório baseado no Desvio Padrão
    // Note: Usamos média 0 para o passo, pois queremos somar ao valor atual
    const step = randomNormal(0, attrConfig.DEV);
    let newVal = currentVal + step;

    // 2. Mean Reversion (Tende a voltar para a Média configurada)
    // Se estiver muito longe da média, puxa 10% de volta para evitar extremos irreais
    const distToMean = attrConfig.MEAN - newVal;
    newVal += distToMean * 0.1;

    // 3. Respeita os limites Min/Max definidos no Frontend
    return clamp(newVal, attrConfig.MIN, attrConfig.MAX);
}

// ============================================================================
// 🧪 MARKET LAB V6: SIMULADOR COM RANDOM WALK
// ============================================================================
exports.simulateMarket = async (req, res) => {
    try {
        const { config, days = 30, simulations = 4 } = req.body;
        const results = [];
        
        // --- CONFIGURAÇÃO DO TEMPO ---
        // Quantos ticks (operações) cabem em 1 dia?
        const TICKS_PER_DAY = (24 * 60 * 60 * 1000) / config.TRADE_INTERVAL_MS;
        const TOTAL_TICKS = Math.floor(TICKS_PER_DAY * days);
        
        // A cada quantos ticks os atributos mudam?
        const RECALIBRATION_TICKS = Math.floor((config.RECALIBRATION_MINUTES * 60 * 1000) / config.TRADE_INTERVAL_MS);
        
        // Resolução de Saída: 1 Candle a cada 1 Hora (para o gráfico não ficar pesado)
        const CANDLE_INTERVAL_TICKS = Math.floor((60 * 60 * 1000) / config.TRADE_INTERVAL_MS); 

        // --- CONSTANTES DO MERCADO ---
        const INITIAL_SUPPLY = 1000;
        const BASE_PRICE = 50; // Preço inicial base
        const MULTIPLIER = 1.0003; // Impacto no preço por unidade
        const NOW = Math.floor(Date.now() / 1000); // Timestamp atual em segundos

        // --- LOOP DE SIMULAÇÕES PARALELAS ---
        for (let s = 0; s < simulations; s++) {
            // Varia levemente o preço inicial para as simulações não serem idênticas
            // (Simula variação de +/- 5% no start)
            const startPrice = BASE_PRICE * (0.95 + Math.random() * 0.10); 
            
            let currentSupply = INITIAL_SUPPLY;
            let currentPrice = startPrice;
            
            // Estado Inicial dos Atributos (Começa na média configurada)
            let currentBias = config.ATTRIBUTES.BULLISH_BIAS.MEAN;
            let currentDampener = config.ATTRIBUTES.VOLATILITY_DAMPENER.MEAN;
            let currentDrift = config.ATTRIBUTES.DRIFT_RATE.MEAN;
            
            // Memória do Mercado (Supply Alvo que sofre Drift)
            let targetSupply = currentSupply;
            
            let candles = [];
            
            // Variáveis do Candle Temporário
            let o = currentPrice, h = currentPrice, l = currentPrice, c = currentPrice, vol = 0;
            let currentTimeSec = NOW;

            // --- LOOP DE TICKS (O TEMPO PASSANDO) ---
            for (let i = 0; i < TOTAL_TICKS; i++) {
                
                // 1. RECALIBRAGEM (Ciclos de Mercado)
                // A cada X minutos, o mercado muda de humor usando a lógica V6
                if (i % RECALIBRATION_TICKS === 0) {
                    currentBias = rollAttribute(currentBias, config.ATTRIBUTES.BULLISH_BIAS);
                    currentDampener = rollAttribute(currentDampener, config.ATTRIBUTES.VOLATILITY_DAMPENER);
                    currentDrift = rollAttribute(currentDrift, config.ATTRIBUTES.DRIFT_RATE);
                }

                // 2. FÍSICA DE MERCADO
                targetSupply += currentDrift; // Inflação/Deflação natural
                const gap = targetSupply - currentSupply; // Pressão de compra/venda (Gap)
                
                // A Fórmula de Probabilidade:
                // Base 50% + Viés do Mercado + (Tamanho do Gap * Força do Elástico)
                let prob = 0.50 + currentBias + (gap * currentDampener);
                prob = clamp(prob, 0.05, 0.95); // Trava entre 5% e 95% para evitar absolutos

                // 3. EXECUÇÃO DA ORDEM
                const isBuy = Math.random() < prob;
                
                // Tamanho da Mão (Hand Size)
                let amount = Math.floor(Math.random() * (config.HAND_SIZE.MAX - config.HAND_SIZE.MIN + 1)) + config.HAND_SIZE.MIN;
                
                // Panic Logic: Se o gap for muito grande (>20), o mercado reage com mais volume
                if (Math.abs(gap) > 20) amount = Math.ceil(amount * 1.5);

                if (isBuy) {
                    currentSupply += amount;
                    currentPrice *= Math.pow(MULTIPLIER, amount);
                } else {
                    currentSupply -= amount;
                    if(currentSupply < 1) currentSupply = 1;
                    currentPrice /= Math.pow(MULTIPLIER, amount);
                }

                // 4. ATUALIZA CANDLE (OHLC)
                if (currentPrice > h) h = currentPrice;
                if (currentPrice < l) l = currentPrice;
                c = currentPrice;
                vol += amount;

                // 5. FECHAMENTO DO CANDLE (Hora em Hora)
                if ((i + 1) % CANDLE_INTERVAL_TICKS === 0) {
                    candles.push({ 
                        time: currentTimeSec, 
                        open: o, 
                        high: h, 
                        low: l, 
                        close: c,
                        volume: vol
                    });
                    
                    // Reseta para o próximo candle
                    o = currentPrice; h = currentPrice; l = currentPrice; c = currentPrice; vol = 0;
                    currentTimeSec += 3600; // +1 Hora em segundos
                }
            }
            
            // Salva o resultado dessa simulação
            results.push({ 
                id: s, 
                candles, 
                finalSupply: currentSupply, 
                finalPrice: currentPrice 
            });
        }

        res.json(results);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};

// Endpoint extra para estatísticas (Monte Carlo rápido - Placeholder)
exports.simulateStats = async (req, res) => {
    // Implementação futura se necessária no JS
    res.json({ status: "WIP - Use a visualização por enquanto" });
};











/**
 * SIMULADOR FÍSICO V7
 * Drift, Dampening e Insensitiveness (Chaos Factor)
 */

function gaussianRandom(mean=0, stdev=1) {
    const u = 1 - Math.random(); 
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return z * stdev + mean;
}

exports.simulateMarketV7 = (config) => {
    // Config esperado: { initialPrice, drift, dampening, insensitiveness, candles, drift_rate, damp_linear_step }
    
    let price = config.initialPrice || 100;
    const data = [];
    const TICKS_PER_CANDLE = 50; 
    const BASE_VOL = 10;

    let currentTime = Date.now();

    for (let i = 0; i < config.candles; i++) {
        let o = price, h = price, l = price, c = price, v = 0;

        // ========================================================
        // 🧪 GAMBIARRA DE EVOLUÇÃO TEMPORAL (DINÂMICA)
        // ========================================================
        
        // 1. Drift Exponencial: Multiplica o drift base pela taxa elevada à potência do candle atual
        // Se drift_rate for 1.05, o drift cresce 5% a cada novo candle.
        const currentDrift = config.drift * Math.pow(1.40 || 1, i); //CORRIGIR //CORRIGIR 1.10 HARDCODED

        // 2. Dampening Linear: Soma um incremento fixo a cada candle
        // Se damp_linear_step for 0.001, a 'mola' fica mais rígida a cada candle.
        //const currentDampening = config.dampening + (i * (config.damp_linear_step || 0));
        // 2. Dampening Exponencial (Troquei de Linear para Exponencial aqui)
        // Se config.damp_rate for 0.95, a "mola" perde força a cada candle
        const currentDampening = config.dampening * Math.pow(config.damp_rate || 1, i); //CORRIGIR 1.10 HARDCODED

        // ========================================================

        for (let t = 0; t < TICKS_PER_CANDLE; t++) {
            // --- VERSÃO ORIGINAL (COMENTADA) ---
            // const targetPriceStep = price * (1 + config.drift);
            // const force = (targetPriceStep - price) * config.dampening;
            
            // --- VERSÃO COM GAMBIARRA ---
            const targetPriceStep = price * (1 + currentDrift);
            const force = (targetPriceStep - price) * currentDampening;
            
            // Movimento Natural
            price += force + gaussianRandom(0, 0.05);

            // 2. Insensitiveness (O Evento de Caos)
            if (Math.random() < config.insensitiveness) {
                const fatDir = Math.random() > 0.5 ? 1 : -1;
                const fatSize = BASE_VOL * (5 + Math.random() * 15);
                const impact = Math.log1p(fatSize) * 0.5 * fatDir;
                const spikePrice = price * (1 + impact);

                if (spikePrice > h) h = spikePrice;
                if (spikePrice < l) l = spikePrice;

                const rejection = impact * (0.80 + Math.random() * 0.15);
                price = spikePrice * (1 - rejection);
                v += fatSize;
            } else {
                v += Math.abs(gaussianRandom(1, 0.5));
            }

            if (price > h) h = price;
            if (price < l) l = price;
        }

        c = price;
        data.push({
            time: currentTime + (i * 60000),
            open: o, high: h, low: l, close: c, volume: v
        });
    }

    return data;
};

// 🔥 NOVO ENDPOINT LEVE PARA O BOT
exports.getTicker = async (req, res) => {
    try {
        const state = await SystemState.findOne({ season_id: 1 });
        if (!state) return res.status(500).json({ error: "Market Offline" });

        const supply = state.glue_supply_circulating;
        const base = state.glue_price_base;
        const mult = state.glue_price_multiplier;

        // Fórmula da Bonding Curve: Preço = Base * (Multiplicador ^ Supply)
        const currentPrice = base * Math.pow(mult, supply);

        res.json({
            price: currentPrice,
            supply: supply,
            market_open: state.market_is_open
        });
    } catch (error) {
        res.status(500).json({ error: "Ticker Error" });
    }
};


