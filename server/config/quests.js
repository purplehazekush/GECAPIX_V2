// server/config/quests.js
const TOKEN = require('./tokenomics');

module.exports = [
    // --- DIÁRIAS (Hábito) ---
    { 
        id: 'd1', 
        titulo: 'Ponto Eletrônico', 
        desc: 'Faça login na Arena.', 
        premio_coins: 50, 
        premio_xp: 20,
        rota_acao: null,
        frequencia: 'DIARIA',
        check_backend: false,
        auto_check: true, // Já é feito no AuthController (Daily Login)
        criterio: 'LOGIN'
    },
    { 
        id: 'd2', 
        titulo: 'Investidor Day-Trade', 
        desc: 'Invista em pelo menos 1 meme hoje.', 
        premio_coins: 100, 
        premio_xp: 50,
        rota_acao: '/arena/memes',
        frequencia: 'DIARIA',
        check_backend: true,
        criterio: 'INVESTIMENTO_MEME'
    },

    // --- SEMANAIS (Grind) ---
    { 
        id: 'w1', 
        titulo: 'Tesouro Direto', 
        desc: 'Compre um título público esta semana.', 
        premio_coins: 300, 
        premio_xp: 150,
        rota_acao: '/arena/bank',
        frequencia: 'SEMANAL',
        check_backend: true,
        criterio: 'COMPRA_TITULO'
    },

    // --- CONQUISTAS (Uma vez só / Achievements) ---
    { 
        id: 'ach1', 
        titulo: 'Primeira Pérola', 
        desc: 'Poste seu primeiro meme na vida.', 
        premio_coins: 200, 
        premio_xp: 200,
        rota_acao: '/arena/memes',
        frequencia: 'UNICA',
        check_backend: false
    },
    { 
        id: 'ach2', 
        titulo: 'Networking', 
        desc: 'Indique um amigo (Use seu código).', 
        premio_coins: TOKEN.COINS.REFERRAL_BONUS, 
        premio_xp: TOKEN.XP.REFERRAL,
        frequencia: 'UNICA',
        rota_acao: null,
        auto_check: true 
    }
];