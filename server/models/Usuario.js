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
    sequencia_login: { type: Number, default: 0 },

    // --- IDENTIDADE & LAB ---
    classe: { type: String, default: 'Novato' },
    avatar_seed: String,
    bio: String,
    
    // O IMPORTANTE TÁ AQUI 👇
    materias: { type: [String], default: [] }, // Array de Strings
    hobbies: [String],

    // --- NOVOS DADOS ---
    chave_pix: { type: String, default: '' },
    curso: { type: String, default: '' },
    comprovante_url: { type: String },
    validado: { type: Boolean, default: false },
    status_profissional: { type: String },
    equipe_competicao: { type: String },
    
    missoes_concluidas: { type: [String], default: [] }
});

// Hook para gerar código de convite
UsuarioSchema.pre('save', async function() {
    if (!this.codigo_referencia && this.nome) {
        const nomeLimpo = this.nome.split(' ')[0].replace(/[^a-zA-Z]/g, '');
        const base = nomeLimpo.toUpperCase().substring(0, 4);
        const random = Math.floor(1000 + Math.random() * 9000);
        this.codigo_referencia = `${base}${random}`;
    }
});

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);