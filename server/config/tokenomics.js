module.exports = {
    // RECOMPENSAS EM COINS (Dinheiro)
    COINS: {
        WELCOME_BONUS: 100,      // Ao criar conta
        DAILY_LOGIN_BASE: 50,    // Login diário
        DAILY_LOGIN_STEP: 10,    // Bônus por dia de sequência (ex: dia 2 ganha 60)
        REFERRAL_BONUS: 500,     // Para quem indica
        REFERRAL_WELCOME: 200,   // Para quem é indicado (extra)
        SALE_PROCESSED: 5,       // Para o admin que processa uma venda
    },

    // RECOMPENSAS EM XP (Patente)
    XP: {
        DAILY_LOGIN: 20,         // Por logar todo dia
        SALE_PROCESSED: 10,      // Por processar venda
        REFERRAL: 100,           // Por indicar amigo
        MEME_POSTADO: 50,        // Por postar um meme
    },

    // REGRAS DE INFLAÇÃO (Inception)
    INCEPTION: {
        MULTIPLIER_BET: 1.5,     // Pote final do bolão
        MULTIPLIER_MEME: 1.2,    // Multiplicador de votos em memes
    }
};

//teste