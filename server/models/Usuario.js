const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    nome: String,
    role: { type: String, default: 'membro' },
    status: { type: String, default: 'pendente' },
    
    saldo_coins: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    nivel: { type: Number, default: 1 },
    badges: [String],

    codigo_referencia: { type: String, unique: true },
    indicado_por: String,

    ultimo_login: { type: Date },
    sequencia_login: { type: Number, default: 0 },

    missoes_concluidas: { type: [String], default: [] },
    chave_pix: { type: String, default: '' }, // CPF, Email ou Aleatória

    // --- VALIDAÇÃO ACADÊMICA ---
    curso: { type: String, default: '' }, // Ex: Eng. Metalúrgica
    comprovante_url: { type: String }, // Foto da carteirinha/SIGA (Cloudinary)
    validado: { type: Boolean, default: false }, // Admin aprova depois

    // --- STATUS E EXTRAS ---
    status_profissional: { type: String }, // Estagiando, IC, Procurando...
    equipe_competicao: { type: String }, // Baja, Fórmula, etc.
});

UsuarioSchema.pre('save', async function() {
    if (!this.codigo_referencia && this.nome) {
        const nomeLimpo = this.nome.split(' ')[0].replace(/[^a-zA-Z]/g, '');
        const base = nomeLimpo.toUpperCase().substring(0, 4);
        const random = Math.floor(1000 + Math.random() * 9000);
        this.codigo_referencia = `${base}${random}`;
    }
});

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);