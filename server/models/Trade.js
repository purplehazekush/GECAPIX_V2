// server/models/Trade.js
const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    type: { type: String, enum: ['BUY', 'SELL'], required: true },
    
    // Dados para o Candle
    amount_glue: { type: Number, required: true }, // Volume
    amount_coins: { type: Number, required: true }, // Volume Financeiro
    
    price_start: { type: Number, required: true }, // Open
    price_end: { type: Number, required: true },   // Close
    price_high: { type: Number, required: true },  // High
    price_low: { type: Number, required: true },   // Low (Na curva linear, High/Low batem com Open/Close)
    
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Trade', TradeSchema);