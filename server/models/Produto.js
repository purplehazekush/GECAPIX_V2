const mongoose = require('mongoose');

const ProdutoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    descricao: String,
    preco: { type: Number, required: true },
    imagem_url: { type: String, default: "https://via.placeholder.com/400x400.png?text=GECA" },
    
    // Novos campos para a Loja V2
    categoria: { 
        type: String, 
        enum: ['CERVEJA', 'DESTILADO', 'MERCH', 'INGRESSO', 'OUTROS', 'COMIDA'],
        default: 'OUTROS'
    },
    cashback_xp: { type: Number, default: 0 }, // Gamification
    estoque: { type: Number, default: 100 },   // Controle de escassez
    badge: { type: String, default: null },    // Ex: "LOTE 1", "RARO"
    
    ativo: { type: Boolean, default: true }
});

module.exports = mongoose.model('Produto', ProdutoSchema);