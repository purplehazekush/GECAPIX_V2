// server/config/tokenomics.js
module.exports = {
    // ECONOMIA BASE
    COINS: {
        WELCOME_BONUS: 100,
        DAILY_LOGIN_BASE: 50,
        DAILY_LOGIN_STEP: 10, // Max cap pode ser definido no controller
        REFERRAL_BONUS: 500,
        REFERRAL_WELCOME: 200,
        SALE_PROCESSED: 5,
    },

    XP: {
        DAILY_LOGIN: 20,
        SALE_PROCESSED: 10,
        REFERRAL: 100,
        MEME_POSTADO: 50,
        GAME_WIN: 50,    // Vitória no Arcade
        GAME_LOSS: 10,   // Consolação
        SPOTTED_POST: 30
    },

    INCEPTION: {
        MULTIPLIER_BET: 1.5, 
        MULTIPLIER_MEME: 1.2, 
    },
    COSTS: {
        SPOTTED_COMMENT: 5, // Custa 5 coins para comentar
        AI_SOLVER_GLUE: 1, 
        AI_SOLVER_COINS: 50
    },

    // --- NOVA SEÇÃO: ARCADE ---
    GAMES: {
        // Limite de partidas valendo prêmio por dia (anti-vício/anti-farm)
        DAILY_LIMIT: 5, 
        
        // Taxa da Casa (Quanto o sistema queima/retém)
        // Se 2 jogadores apostam 10 (Total 20):
        // WIN_PERCENT 0.9 = Vencedor leva 18 (Lucro 8), Casa queima 2.
        // WIN_PERCENT 1.0 = Vencedor leva 20 (Lucro 10).
        // WIN_PERCENT 1.5 = Vencedor leva 30 (Inflação! Lucro 20).
        
        // Vamos usar um modelo levemente inflacionário para atrair jogadores
        WIN_MULTIPLIER: 1.8, // Apostou 10 -> Ganha 18 (Lucro 8). Perdedor mantém aposta?
        
        // REVISÃO DA SUA LÓGICA ORIGINAL:
        // "Vencedor fica com 60% do pote acumulado, e o perdedor com sua aposta original"
        // Ex: P1 aposta 10, P2 aposta 10. Pote 20.
        // Vencedor leva 60% de 20 = 12.
        // Perdedor leva 10 (de volta).
        // Total pago: 22. 
        // Resultado: Sistema criou 2 coins. (INFLAÇÃO CONTROLADA - BOM PARA ENGAGEMENT)
        
        WIN_RATE: 0.60, // 60% do pote total
    }
};