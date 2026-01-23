// server/models/Produto.js
const mongoose = require('mongoose');

const ProdutoSchema = new mongoose.Schema({
    nome: String,
    preco: Number,
    ativo: { type: Boolean, default: true }
});

module.exports = mongoose.model('Produto', ProdutoSchema);