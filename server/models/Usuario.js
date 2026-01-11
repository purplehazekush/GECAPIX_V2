const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    role: { type: String, default: 'membro' }, // 'admin' ou 'membro'
    nome: String,
    status: { type: String, default: 'pendente' } // 'ativo' ou 'pendente'
});

module.exports = mongoose.model('Usuario', UsuarioSchema);