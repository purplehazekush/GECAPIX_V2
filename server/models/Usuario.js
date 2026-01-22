const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    nome: String,
    role: { type: String, default: 'membro' },
    status: { type: String, default: 'pendente' },
    
    // --- GAMIFICATION ---
    saldo_coins: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    nivel: { type: Number, default: 1 },
    badges: [String],

    // --- ENGENHARIA SOCIAL ---
    codigo_referencia: { type: String, unique: true },
    indicado_por: String,

    // --- DAILY LOGIN ---
    ultimo_login: { type: Date },
    sequencia_login: { type: Number, default: 0 }
});

// CORREÇÃO: Removi o parâmetro 'next'. O Mongoose lida automaticamente.
UsuarioSchema.pre('save', async function() {
    // Só gera se não existir
    if (!this.codigo_referencia && this.nome) {
        // Pega as 4 primeiras letras do nome ou menos se for curto
        const nomeLimpo = this.nome.split(' ')[0].replace(/[^a-zA-Z]/g, '');
        const base = nomeLimpo.toUpperCase().substring(0, 4);
        const random = Math.floor(1000 + Math.random() * 9000);
        this.codigo_referencia = `${base}${random}`;
    }
});

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);