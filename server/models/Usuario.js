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
    badges: [String], // Array de IDs de conquistas

    // --- ENGENHARIA SOCIAL ---
    codigo_referencia: { type: String, unique: true },
    indicado_por: String,

    // --- DAILY LOGIN ---
    ultimo_login: { type: Date },
    sequencia_login: { type: Number, default: 0 }
});

// Gera código de convite automático antes de salvar
UsuarioSchema.pre('save', function(next) {
    if (!this.codigo_referencia && this.nome) {
        const base = this.nome.split(' ')[0].toUpperCase().substring(0, 4);
        const random = Math.floor(1000 + Math.random() * 9000);
        this.codigo_referencia = `${base}${random}`;
    }
    next();
});

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);