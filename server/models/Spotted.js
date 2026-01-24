// server/models/Spotted.js
const mongoose = require('mongoose');

const SpottedSchema = new mongoose.Schema({
    autor_id: String, // Opcional guardar, mas a exibição é ANÔNIMA
    mensagem: { type: String, required: true },
    imagem_url: String, // Foto opcional
    data: { type: Date, default: Date.now },
    
    comentarios: [{
        user_nome: String,
        user_avatar: String,
        texto: String,
        data: { type: Date, default: Date.now }
    }],
    
    likes: { type: Number, default: 0 }
});

module.exports = mongoose.model('Spotted', SpottedSchema);