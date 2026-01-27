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

// =================================================================
// 🧪  MARKET LAB: SIMULADOR DE MONTE CARLO
// =================================================================

// Helper: Box-Muller Transform (Normal Distribution)
const gaussianRandom = (mean, stdev) => {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
};

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const rollAttribute = (config, key) => {
    const attr = config.ATTRIBUTES[key];
    const rawValue = gaussianRandom(attr.MEAN, attr.DEV);
    return clamp(rawValue, attr.MIN, attr.MAX);
};

// 🧪 MARKET LAB: SIMULADOR DE MONTE CARLO (CORRIGIDO)
exports.simulateMarket = async (req, res) => {
    try {
        const { config, days = 30, simulations = 4 } = req.body;
        const results = [];
        
        // Configurações do ambiente simulado
        const TICKS_PER_DAY = (24 * 60 * 60 * 1000) / config.TRADE_INTERVAL_MS;
        const TOTAL_TICKS = Math.floor(TICKS_PER_DAY * days);
        const RECALIBRATION_TICKS = (config.RECALIBRATION_MINUTES * 60 * 1000) / config.TRADE_INTERVAL_MS;
        
        // Output Resolution: 1 Candle a cada 1 Hora
        const CANDLE_INTERVAL_TICKS = (60 * 60 * 1000) / config.TRADE_INTERVAL_MS; 

        // Mock Inicial
        const INITIAL_SUPPLY = 1000;
        const BASE_PRICE = 50;
        const MULTIPLIER = 1.0003;
        const NOW = Math.floor(Date.now() / 1000); // Timestamp Base em Segundos

        for (let s = 0; s < simulations; s++) {
            let currentSupply = INITIAL_SUPPLY;
            let currentPrice = BASE_PRICE * Math.pow(MULTIPLIER, currentSupply);
            
            let botState = {
                bullishBias: config.ATTRIBUTES.BULLISH_BIAS.MEAN,
                dampener: config.ATTRIBUTES.VOLATILITY_DAMPENER.MEAN,
                driftRate: config.ATTRIBUTES.DRIFT_RATE.MEAN
            };
            
            let marketMemory = { targetSupply: currentSupply };
            let candles = [];
            
            // Candle temporário
            let tempCandle = { o: currentPrice, h: currentPrice, l: currentPrice, c: currentPrice, vol: 0 };

            for (let i = 0; i < TOTAL_TICKS; i++) {
                // 1. Recalibra
                if (i % RECALIBRATION_TICKS === 0) {
                    botState.bullishBias = rollAttribute(config, 'BULLISH_BIAS');
                    botState.dampener = rollAttribute(config, 'VOLATILITY_DAMPENER');
                    botState.driftRate = rollAttribute(config, 'DRIFT_RATE');
                }

                // 2. Lógica Bot
                marketMemory.targetSupply += botState.driftRate;
                const gap = marketMemory.targetSupply - currentSupply;
                
                let prob = 0.50 + botState.bullishBias + (gap * botState.dampener);
                prob = clamp(prob, 0.05, 0.95);

                const isBuy = Math.random() < prob;
                
                // Tamanho da Mão
                let amount = Math.floor(Math.random() * config.HAND_SIZE.MAX) + config.HAND_SIZE.MIN;
                if (Math.abs(gap) > 15) amount = Math.ceil(amount * 1.5);

                // 3. Impacto Preço
                if (isBuy) {
                    currentSupply += amount;
                    currentPrice *= Math.pow(MULTIPLIER, amount);
                } else {
                    currentSupply -= amount;
                    if(currentSupply < 1) currentSupply = 1;
                    currentPrice /= Math.pow(MULTIPLIER, amount);
                }

                // 4. Update Candle
                tempCandle.h = Math.max(tempCandle.h, currentPrice);
                tempCandle.l = Math.min(tempCandle.l, currentPrice);
                tempCandle.c = currentPrice;
                tempCandle.vol += amount;

                // 5. Fecha Candle (1 Hora)
                if (i > 0 && i % CANDLE_INTERVAL_TICKS === 0) {
                    const timeOffset = (i / TICKS_PER_DAY) * 86400; // Segundos passados
                    
                    candles.push({ 
                        time: Math.floor(NOW + timeOffset), 
                        open: tempCandle.o, 
                        high: tempCandle.h, 
                        low: tempCandle.l, 
                        close: tempCandle.c 
                    });
                    
                    tempCandle = { o: currentPrice, h: currentPrice, l: currentPrice, c: currentPrice, vol: 0 };
                }
            }
            
            // Push do último candle (CORREÇÃO AQUI)
            // Calculamos o tempo final baseado no total de ticks, não no índice cru
            const finalTimeOffset = (TOTAL_TICKS / TICKS_PER_DAY) * 86400;
            candles.push({ 
                time: Math.floor(NOW + finalTimeOffset), // Timestamp correto
                open: tempCandle.o, 
                high: tempCandle.h, 
                low: tempCandle.l, 
                close: tempCandle.c 
            });
            
            results.push({ id: s, candles, finalSupply: currentSupply, finalPrice: currentPrice });
        }

        res.json(results);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};


// 📊 SUPER SIMULAÇÃO (MONTE CARLO STATS)
exports.runMonteCarloStats = async (req, res) => {
    try {
        const { config, days = 30, iterations = 10000 } = req.body;

        // Configurações de Tempo
        const TICKS_PER_DAY = (24 * 60 * 60 * 1000) / config.TRADE_INTERVAL_MS;
        const TOTAL_TICKS = Math.floor(TICKS_PER_DAY * days);
        const RECALIBRATION_TICKS = (config.RECALIBRATION_MINUTES * 60 * 1000) / config.TRADE_INTERVAL_MS;

        // Constantes de Mercado
        const INITIAL_SUPPLY = 1000;
        const BASE_PRICE = 50;
        const MULTIPLIER = 1.0003;
        const INITIAL_PRICE = BASE_PRICE * Math.pow(MULTIPLIER, INITIAL_SUPPLY);

        // Arrays para guardar resultados finais
        const finalPrices = [];
        const finalSupplies = [];
        let totalVolume = 0;

        // --- O LOOP DE 10.000 SIMULAÇÕES ---
        for (let s = 0; s < iterations; s++) {
            let currentSupply = INITIAL_SUPPLY;
            let currentPrice = INITIAL_PRICE;
            
            // Estado do Bot (Resetado a cada simulação)
            let botState = {
                bullishBias: config.ATTRIBUTES.BULLISH_BIAS.MEAN,
                dampener: config.ATTRIBUTES.VOLATILITY_DAMPENER.MEAN,
                driftRate: config.ATTRIBUTES.DRIFT_RATE.MEAN
            };
            
            let marketMemory = { targetSupply: currentSupply };

            // Loop Temporal (Dias)
            for (let i = 0; i < TOTAL_TICKS; i++) {
                // 1. Recalibra
                if (i % RECALIBRATION_TICKS === 0) {
                    botState.bullishBias = rollAttribute(config, 'BULLISH_BIAS');
                    botState.dampener = rollAttribute(config, 'VOLATILITY_DAMPENER');
                    botState.driftRate = rollAttribute(config, 'DRIFT_RATE');
                }

                // 2. Lógica
                marketMemory.targetSupply += botState.driftRate;
                const gap = marketMemory.targetSupply - currentSupply;
                
                let prob = 0.50 + botState.bullishBias + (gap * botState.dampener);
                prob = clamp(prob, 0.05, 0.95);

                const isBuy = Math.random() < prob;
                
                let amount = Math.floor(Math.random() * config.HAND_SIZE.MAX) + config.HAND_SIZE.MIN;
                if (Math.abs(gap) > 15) amount = Math.ceil(amount * 1.5);

                // 3. Impacto (Matemática Pura, sem logs)
                if (isBuy) {
                    currentSupply += amount;
                    // Otimização: Não precisamos calcular o preço a cada tick, só no final
                    // Mas precisamos atualizar o supply para a lógica do bot funcionar
                } else {
                    currentSupply -= amount;
                    if(currentSupply < 1) currentSupply = 1;
                }
                totalVolume += amount;
            }

            // Calcula preço final apenas no fim da simulação para economizar CPU
            currentPrice = BASE_PRICE * Math.pow(MULTIPLIER, currentSupply);
            
            finalPrices.push(currentPrice);
            finalSupplies.push(currentSupply);
        }

        // --- CÁLCULOS ESTATÍSTICOS ---
        finalPrices.sort((a, b) => a - b); // Ordena para pegar mediana e percentis

        const sum = finalPrices.reduce((a, b) => a + b, 0);
        const avg = sum / finalPrices.length;
        const min = finalPrices[0];
        const max = finalPrices[finalPrices.length - 1];
        const median = finalPrices[Math.floor(finalPrices.length / 2)];
        
        // Percentis (95% das vezes o preço fica acima de X)
        const p05 = finalPrices[Math.floor(finalPrices.length * 0.05)]; // Pior caso razoável
        const p95 = finalPrices[Math.floor(finalPrices.length * 0.95)]; // Melhor caso razoável

        // Probabilidade de Alta (Quantas simulações terminaram acima do preço inicial?)
        const bullishCount = finalPrices.filter(p => p > INITIAL_PRICE).length;
        const winRate = (bullishCount / iterations) * 100;

        res.json({
            iterations,
            avgPrice: avg,
            medianPrice: median,
            minPrice: min,
            maxPrice: max,
            p05Price: p05, // Suporte Estatístico
            p95Price: p95, // Resistência Estatística
            winRate, // Chance de Alta
            initialPrice: INITIAL_PRICE,
            avgVolumePerSim: Math.floor(totalVolume / iterations)
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
};