const mongoose = require('mongoose');

const MemeSchema = new mongoose.Schema({
    usuario_id: { type: String, required: true },
    autor_nome: String,
    autor_avatar: String,
    
    imagem_url: { type: String, required: true },
    legenda: String,
    
    // --- DADOS FINANCEIROS ---
    total_up: { type: Number, default: 0 },
    total_down: { type: Number, default: 0 }, 
    total_geral: { type: Number, default: 0 },
    
    investidores: [{
        user_email: String,
        valor: Number,
        lado: { type: String, enum: ['UP', 'DOWN'], required: true },
        data: { type: Date, default: Date.now }
    }],
    
    // 🔥 CORREÇÃO AQUI: Adicionei 'AMBOS' no enum
    resultado: { type: String, enum: ['MELHOR', 'PIOR', 'AMBOS', 'NEUTRO', null], default: null },
    
    status: { type: String, default: 'ativo', enum: ['ativo', 'fechado'] },
    data_postagem: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Meme || mongoose.model('Meme', MemeSchema);