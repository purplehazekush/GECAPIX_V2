// server/config/tokenomics.js

/**
 * 📊 GECAPIX TOKENOMICS - SEASON 1 CONFIGURATION
 * Calibrado em: 24/01/2026
 * Status: LOCKED 🔒
 */

const SEASON_LENGTH = 180; // 6 Meses aprox.

module.exports = {
    // --- 1. MACROECONOMIA (SEASON) ---
    SEASON: {
        ID: 1,
        START_DATE: "2026-02-01T00:00:00Z", // Data do Lançamento Oficial
        LENGTH: SEASON_LENGTH,
        CROSSOVER_DAY: 68 // O dia que o Cashback ultrapassa o Referral em volume
    },
    
    // --- 2. HARD CAPS (Limites de Emissão) ---
    CAPS: {
        TOTAL_SUPPLY: 1_000_000_000,   // 1 Bilhão (Teto absoluto)
        REFERRAL_POOL: 60_000_000,     // 6% do Supply (Growth)
        CASHBACK_POOL: 200_000_000     // 20% do Supply (Utility)
    },

    // --- 3. CURVAS MATEMÁTICAS (Engine) ---
    CURVES: {
        // Referral: Decaimento Exponencial Rápido
        // Cria urgência. "Entre agora ou ganhe menos amanhã".
        REFERRAL_K: 0.024,          
        REFERRAL_A_CONST: 1459558,  // Pote do Dia 0

        // Cashback: Power Law (Convexa)
        // Acompanha a adoção lenta do varejo físico.
        CASHBACK_SLOPE: 8.2,
        CASHBACK_P_EXP: 2.7333      
    },

    // --- 4. FLUXO DE CAIXA (MICROECONOMIA) ---
    
    // [ENTRADAS] - Faucets
    COINS: {
        // Boas-vindas generosas para permitir experimentação imediata
        WELCOME_BONUS: 200,      // Suficiente para 2 IPOs ou 20 apostas baixas
        
        // Retenção
        DAILY_LOGIN_BASE: 50,    
        DAILY_LOGIN_STEP: 10,    // Dia 7 = 110 GC. Incentiva streaks curtos.
        
        // Viralidade (Valores Teto - Decaem com o tempo via Engine)
        MAX_REFERRAL_REWARD: 1000, // Começa em 1000 GC. No dia 68, estará em ~190 GC.
        REFERRAL_WELCOME: 250,     // O amigo indicado ganha isso fixo
    },

    // [ENGAGEMENT] - XP (Progressão de Nível)
    XP: {
        MEME_POSTADO: 150,       // Alta recompensa por criar conteúdo
        SPOTTED_POST: 50,        // Média recompensa (conteúdo de texto)
        DAILY_LOGIN: 20,
        REFERRAL: 200,           // XP alto para quem traz gente
        GAME_WIN: 50,
        GAME_LOSS: 10
    },

    // [SAÍDAS] - Sinks (Drenagem de Liquidez)
    COSTS: {
        SPOTTED_COMMENT: 5,     // Barato, mas drena no volume (fofoca custa)
        
        // Custo Híbrido da IA
        AI_SOLVER_GLUE: 1,      // Hard Currency
        AI_SOLVER_COINS: 100    // Taxa administrativa em Soft Currency (aumentei para drenar mais)
    },

    // --- 5. ECONOMIA REAL (HARD CURRENCY) ---
    PRICE: {
        GLUE_BRL: 4.20          // Preço Fixo (Ancoragem psicológica)
    },

    // --- 6. GAMEPLAY ---
    GAMES: {
        DAILY_LIMIT: 30,        // Evita bots farmando o dia todo
        MIN_BET: 10,            // Aposta mínima acessível
        TAX_RATE: 0.05          // 5% da casa (Queima) em cada jogo PvP
    },
    
    MEME_MARKET: {
        CREATOR_ROYALTY: 150,   // Criador do meme vencedor ganha fixo
        YIELD_PERCENT: 0.20     // Vencedores ganham +20% sobre a aposta
    }
};