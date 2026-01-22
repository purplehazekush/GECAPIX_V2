const mongoose = require('mongoose');

const MemeSchema = new mongoose.Schema({
    autor_email: String,
    autor_nome: String,
    legenda: String,
    imagem_url: String,
    investimento_total: { type: Number, default: 0 },
    votos_count: { type: Number, default: 0 },
    data: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Meme || mongoose.model('Meme', MemeSchema);