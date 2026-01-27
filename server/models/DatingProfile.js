// server/models/DatingProfile.js
const mongoose = require('mongoose');

const DatingProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
    email: { type: String, required: true }, // Facilita buscas
    
    // --- DADOS PESSOAIS ---
    telefone: { type: String, required: true }, // Obrigatório e Verificado
    genero: { type: String, enum: ['HOMEM', 'MULHER', 'OUTRO'], required: true },
    curso: String, // Cache do curso para não precisar popular sempre
    nome: String,  // Cache do nome
    
    // --- CARACTERÍSTICAS (Emojis) ---
    altura: { type: String, enum: ['📏 Alto(a)', '📐 Médio(a)', '🤏 Baixo(a)'] },
    biotipo: { type: String, enum: ['🏋️ Fitness', '🧸 Fofinho(a)', '🏃 Magro(a)', '💪 Atlético', '⚡ Normal'] },
    
    // --- HÁBITOS ---
    bebe: { type: String, enum: ['🍻 Socialmente', '🥃 Gosto muito', '❌ Não bebo'] },
    fuma: { type: String, enum: ['🚬 Sim', '🌬️ Vape', '❌ Não'] },
    festa: { type: String, enum: ['🎉 Baladeiro(a)', '🏠 Caseiro(a)', '⚖️ Equilibrado'] },
    
    // --- PERFIL ---
    fotos: [String], // Array de URLs (Max 4)
    bio: { type: String, maxlength: 690 },
    
    // --- PREFERÊNCIAS (Filtro) ---
    interessado_em: { type: [String], default: ['HOMEM', 'MULHER', 'OUTRO'] }, // O que eu quero ver
    
    // --- MATCHMAKING ---
    likes_enviados: [String], // IDs dos perfis que eu dei like
    likes_recebidos: [String], // IDs de quem me deu like (para checar match)
    matches: [String], // IDs de quem deu match (telefone liberado)
    
    // --- CAIXA DE CORREIO (Notificações Especiais) ---
    correio: [{
        tipo: { type: String, enum: ['MATCH', 'SUPERLIKE'] },
        remetente_id: String,
        remetente_nome: String,
        remetente_foto: String,
        mensagem: String, // "Deu Match! O telefone é..."
        telefone_revelado: String,
        lido: { type: Boolean, default: false },
        data: { type: Date, default: Date.now }
    }],

    status: { type: String, default: 'ATIVO', enum: ['ATIVO', 'PAUSADO'] },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DatingProfile', DatingProfileSchema);