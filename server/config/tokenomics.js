// server/config/tokenomics.js

/**
 * 📊 GECAPIX TOKENOMICS - SEASON 1 CONFIGURATION
 * Calibrado em: 24/01/2026
 * Status: LOCKED 🔒
 */

const SEASON_LENGTH = 180; 

module.exports = {
    // --- 1. MACROECONOMIA (SEASON) ---
    SEASON: {
        ID: 1,
        START_DATE: "2026-02-01T00:00:00Z", 
        LENGTH: SEASON_LENGTH,
        CROSSOVER_DAY: 68 
    },
    
    // --- 2. HARD CAPS ---
    CAPS: {
        TOTAL_SUPPLY: 1_000_000_000,
        REFERRAL_POOL: 60_000_000,
        CASHBACK_POOL: 200_000_000
    },

    // --- 3. CURVAS MATEMÁTICAS ---
    CURVES: {
        REFERRAL_K: 0.024,          
        REFERRAL_A_CONST: 1459558,
        CASHBACK_SLOPE: 8.2,
        CASHBACK_P_EXP: 2.7333      
    },

    // --- 4. FLUXO DE CAIXA ---
    COINS: {
        WELCOME_BONUS: 200,      
        DAILY_LOGIN_BASE: 50,    
        DAILY_LOGIN_STEP: 10,    
        MAX_REFERRAL_REWARD: 1000, 
        REFERRAL_WELCOME: 250,
    },

    XP: {
        MEME_POSTADO: 150,       
        SPOTTED_POST: 50,        
        DAILY_LOGIN: 20,
        REFERRAL: 200,           
        GAME_WIN: 50,
        GAME_LOSS: 10
    },

    COSTS: {
        SPOTTED_COMMENT: 5,     
        AI_SOLVER_GLUE: 1,      
        AI_SOLVER_COINS: 100    
    },

    PRICE: {
        GLUE_BRL: 4.20
    },

    // --- 6. GAMEPLAY ---
    GAMES: {
        DAILY_LIMIT: 30,
        MIN_BET: 10,
        TAX_RATE: 0.05
    },
    
    MEME_MARKET: {
        CREATOR_ROYALTY: 150,
        YIELD_PERCENT: 0.20
    },

    // --- 7. SISTEMA BANCÁRIO (FALTAVA ISSO) ---
    // --- 7. SISTEMA BANCÁRIO (DEFI DINÂMICO) ---
    BANK: {
        // Alocação: Quanto da emissão diária de Cashback vai para juros?
        STAKING_ALLOCATION: 0.30, // 30% do pote diário é distribuído

        // Multiplicador de Risco (Locked ganha X vezes mais que Liquid)
        LOCKED_WEIGHT: 2.0, // Quem trava ganha 3x mais yield

        // Circuit Breaker (Teto Máximo de APR Diário)
        MAX_DAILY_YIELD_LIQUID: 0.01, // Max 1% ao dia pro Líquido (365% a.a.)
        MAX_DAILY_YIELD_LOCKED: 0.025, // Max 3% ao dia pro Locked (Explosivo)

        LOCKED_PERIOD_DAYS: 30,
        
        // Multas (Mantém igual)
        PENALTY_MAX: 0.40,
        PENALTY_MIN: 0.10,
    },
    
    // --- 8. CARTEIRAS ---
    WALLETS: {
        BURN_ADDRESS: "0x000000000000000000000000000000000000dEaD",
        TREASURY_ADDRESS: "0xGecaTreasuryFoundation"
    },

    // --- 9. RPG CLASS BONUSES ---
    CLASSES: {
        ESPECULADOR: { STAKING_YIELD_MULT: 1.5 },
        TECNOMANTE: { ORACLE_DISCOUNT: 0.50 },
        BARDO: { REFERRAL_BONUS_MULT: 1.25 },
        BRUXO: { GAME_WIN_MULT: 1.10 },
        NOVATO: { _dummy: 0 }
    }
};