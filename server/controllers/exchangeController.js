// server/controllers/exchangeController.js
const SystemState = require('../models/SystemState');
const Usuario = require('../models/Usuario');
const Trade = require('../models/Trade');
const mongoose = require('mongoose');

// --- MATEMÁTICA EXPONENCIAL ---
// Calcula o preço acumulado para comprar 'k' tokens a partir do supply 'S'
// Fórmula: Preço = Base * (Multiplicador ^ Supply)
const calculateGeometricCost = (startSupply, amount, basePrice, multiplier) => {
    let totalCost = 0;
    let currentPrice = basePrice * Math.pow(multiplier, startSupply);
    
    const startUnitPrice = currentPrice;
    
    // Loop simples é mais seguro para evitar erros de ponto flutuante em PGs complexas
    // Dado que 'amount' raramente passará de 1000 por vez, isso é super rápido (O(n))
    for (let i = 0; i < amount; i++) {
        totalCost += currentPrice;
        currentPrice *= multiplier; // Sobe o degrau
    }

    // O preço final do último token (o novo "Spot Price")
    const endUnitPrice = currentPrice; 
    
    // O preço de fechamento do candle seria o preço do ÚLTIMO token negociado
    // Mas para o próximo comprador, o preço é endUnitPrice.
    // Vamos retornar o preço do último token efetivamente comprado.
    const lastTokenPrice = currentPrice / multiplier;

    return { totalCost, startUnitPrice, endUnitPrice: lastTokenPrice, nextSpotPrice: endUnitPrice };
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
            // Venda: Custo para descer a escada
            // Supply novo seria supply - qtd
            if (supply < qtd) return res.status(400).json({ error: "Liquidez insuficiente" });
            
            const startSupply = supply - qtd;
            // O valor recebido é o custo que foi pago para subir esses degraus no passado
            const { totalCost, startUnitPrice, endUnitPrice } = calculateGeometricCost(startSupply, qtd, base, mult);
            
            // Taxa de Slippage/Queima na venda (ex: 5%)
            const burn = totalCost * 0.05;
            
            result = {
                total_coins: Math.floor(totalCost - burn),
                price_start: endUnitPrice, // Na venda, começamos do preço alto
                price_end: startUnitPrice  // E terminamos no baixo
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
        const user = await Usuario.findById(req.user._id).session(session);

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

            user.saldo_glue -= qtd;
            user.saldo_coins += receive;
            state.glue_supply_circulating -= qtd;
            state.total_burned += fee;
            finalPrice = startUnitPrice;

            // Redireciona a taxa para a carteira de taxas
            await Usuario.updateOne(
                { email: "trading_fees@gecapix.com" },
                { $inc: { saldo_coins: fee } },
                { session }
            );

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
            io.emit('market_update', { 
                newPrice: finalPrice, 
                supply: state.glue_supply_circulating 
            });
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
        const trades = await Trade.find().sort({ timestamp: 1 }); // Ordem cronológica para o gráfico
        
        // Lightweight Charts precisa de: { time: 'yyyy-mm-dd', open, high, low, close }
        // Se for intraday (segundos), time deve ser UNIX Timestamp (segundos)
        
        const candles = trades.map(t => ({
            time: Math.floor(new Date(t.timestamp).getTime() / 1000), // Unix Timestamp
            open: t.price_start,
            high: t.price_high,
            low: t.price_low,
            close: t.price_end
        }));

        res.json(candles);
    } catch (error) {
        res.status(500).json({ error: "Erro Chart" });
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