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

// server/controllers/exchangeController.js

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