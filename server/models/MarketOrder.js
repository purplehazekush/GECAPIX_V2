// server/models/MarketOrder.js
const mongoose = require('mongoose');

const MarketOrderSchema = new mongoose.Schema({
    vendedor_id: { type: String, required: true },
    vendedor_nome: String,
    vendedor_avatar: String,
    
    tipo: { type: String, default: 'VENDA_GLUE' }, // No futuro podemos ter VENDA_ITEM
    
    quantidade_glue: { type: Number, required: true, default: 1 }, // Geralmente vende-se de 1 em 1
    preco_coins: { type: Number, required: true }, // Quanto ele quer em troca (ex: 5000)
    
    status: { type: String, default: 'ABERTA' }, // ABERTA, VENDIDA, CANCELADA
    
    comprador_id: String, // Quem comprou
    data_criacao: { type: Date, default: Date.now },
    data_conclusao: Date
});

module.exports = mongoose.model('MarketOrder', MarketOrderSchema);