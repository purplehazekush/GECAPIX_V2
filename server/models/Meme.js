const mongoose = require('mongoose');

const MemeSchema = new mongoose.Schema({
    usuario_id: { type: String, required: true }, // Importante para pagar o Royalty
    autor_nome: String,
    autor_avatar: String, // Essencial para o visual "Instagram"
    
    imagem_url: { type: String, required: true },
    legenda: String,
    
    // --- DADOS FINANCEIROS (Broker) ---
    total_investido: { type: Number, default: 0 }, // Market Cap
    
    // Livro de Ofertas (Quem comprou a ação)
    investidores: [{
        user_email: String,
        valor: Number,
        data: { type: Date, default: Date.now }
    }],
    
    vencedor: { type: Boolean, default: false },
    status: { type: String, default: 'ativo', enum: ['ativo', 'fechado'] },
    data_postagem: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Meme || mongoose.model('Meme', MemeSchema);