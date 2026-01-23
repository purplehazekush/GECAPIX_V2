// server/models/Usuario.js
const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    nome: String,
    role: { type: String, default: 'membro' },
    status: { type: String, default: 'pendente' },
    
    // --- GAMIFICATION & ECONOMIA (O COFRE) ---
    saldo_coins: { type: Number, default: 0 }, // Mantemos Number, mas cuidado com decimais
    xp: { type: Number, default: 0 },
    nivel: { type: Number, default: 1 },
    badges: [String],

    // 🔥 NOVO: LEDGER (O Rastro do Dinheiro)
    // Isso permite responder: "Você gastou 50 coins no Meme X dia tal"
    extrato: [{
        tipo: { type: String, enum: ['ENTRADA', 'SAIDA'] },
        valor: Number,
        descricao: String, // Ex: "Cashback Cantina", "Voto Meme", "Transferência"
        referencia_id: String, // ID do Pix, do Meme ou do Usuário destino
        data: { type: Date, default: Date.now }
    }],

    // --- ENGENHARIA SOCIAL ---
    codigo_referencia: { type: String, unique: true },
    indicado_por: String,

    // --- DAILY LOGIN ---
    ultimo_login: { type: Date },
    sequencia_login: { type: Number, default: 0 },

    // --- IDENTIDADE ---
    classe: { type: String, default: 'Novato' },
    avatar_slug: { type: String, default: 'default' }, // MUDANÇA: De 'avatar_seed' para 'avatar_slug' (mickey, einstein...)
    bio: String,
    
    materias: { type: [String], default: [] }, 
    hobbies: [String],

    // --- DADOS ADICIONAIS ---
    chave_pix: { type: String, default: '' },
    curso: { type: String, default: '' },
    comprovante_url: { type: String },
    validado: { type: Boolean, default: false },
    status_profissional: { type: String },
    equipe_competicao: { type: String },
    
    missoes_concluidas: { type: [String], default: [] },

    jogos_hoje: { type: Number, default: 0 },
    ultimo_jogo_data: { type: Date },
});

// Hook para gerar código de convite (Mantido igual)
UsuarioSchema.pre('save', async function() {
    if (!this.codigo_referencia && this.nome) {
        const nomeLimpo = this.nome.split(' ')[0].replace(/[^a-zA-Z]/g, '');
        const base = nomeLimpo.toUpperCase().substring(0, 4);
        const random = Math.floor(1000 + Math.random() * 9000);
        this.codigo_referencia = `${base}${random}`;
    }
});

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);