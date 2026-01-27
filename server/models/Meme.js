// server/models/Meme.js
const mongoose = require('mongoose');

const MemeSchema = new mongoose.Schema({
    usuario_id: { type: String, required: true },
    autor_nome: String,
    autor_avatar: String,
    
    imagem_url: { type: String, required: true },
    legenda: String,
    
    // --- DADOS FINANCEIROS (Dual Ledger) ---
    total_up: { type: Number, default: 0 },   // Volume apostado na ALTA (Melhor Meme)
    total_down: { type: Number, default: 0 }, // Volume apostado na BAIXA (Pior Meme)
    total_geral: { type: Number, default: 0 }, // Soma dos dois
    
    // Livro de Ofertas
    investidores: [{
        user_email: String,
        valor: Number,
        lado: { type: String, enum: ['UP', 'DOWN'], required: true }, // Lado da aposta
        data: { type: Date, default: Date.now }
    }],
    
    // Resultados
    resultado: { type: String, enum: ['MELHOR', 'PIOR', 'NEUTRO', null], default: null },
    status: { type: String, default: 'ativo', enum: ['ativo', 'fechado'] },
    data_postagem: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Meme || mongoose.model('Meme', MemeSchema);