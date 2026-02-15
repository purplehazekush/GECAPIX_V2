const ConfigService = require('../services/ConfigService');

// Inicializa assim que o módulo é carregado
const getVal = (key) => {
    const config = ConfigService.get();
    return config ? config[key] : 0; // Proteção contra undefined no boot
};

module.exports = {
    // --- ESTÁTICOS (Matemática pura e infra) ---
    SEASON: {
        ID: 1,
        LENGTH: 180,
        START_DATE: "2026-02-01T00:00:00Z"
    },

    // 🔥 AQUI ESTAVA FALTANDO (Isso conserta o crash loop)
    CURVES: {
        REFERRAL_A_CONST: 5000, 
        REFERRAL_K: 0.05,       
        CASHBACK_POOL: 10000, 
        CASHBACK_P_EXP: 1.5
    },

    CAPS: {
        TOTAL_SUPPLY: 10000000,
        INITIAL_USER_BALANCE: 1000
    },
    
    ALLOCATION: {
        LOCKED_TREASURY: 2000000,
        CASHBACK_FUND: 1000000,
        CENTRAL_BANK: 500000
    },

    WALLETS: {
        TREASURY: "treasury@geca.com",
        TREASURY_LOCKED: "locked@gecapix.com",
        CASHBACK: "cashback@geca.com",
        BANK: "central_bank@gecapix.com",
        FEES: "trading_fees@gecapix.com",
        BURN: "burn_address@gecapix.com"
    },

    // --- DINÂMICOS (Painel Admin) ---
    
    get COINS() {
        return {
            WELCOME_BONUS: getVal('WELCOME_BONUS') || 50,
            DAILY_LOGIN_BASE: getVal('DAILY_LOGIN_BASE') || 10,
            DAILY_LOGIN_STEP: getVal('DAILY_LOGIN_STEP') || 5,
            REFERRAL_FIXED: getVal('REFERRAL_FIXED') || 100,
            MAX_REFERRAL_REWARD: 1000, 
            REFERRAL_WELCOME: 250,
        };
    },

    get XP() {
        return {
            MEME_POSTADO: 150,
            SPOTTED_POST: 50,
            DAILY_LOGIN: 20,
            REFERRAL: 200,
            GAME_WIN: getVal('GAME_WIN_XP') || 100,
            GAME_LOSS: 10
        };
    },

    get COSTS() {
        return {
            SPOTTED_COMMENT: 5,
            SPOTTED_POST: getVal('SPOTTED_POST_COST') || 100,
            AI_SOLVER_GLUE: getVal('ORACLE_COST_GLUE') || 1,
            AI_SOLVER_COINS: getVal('ORACLE_COST_COINS') || 50
        };
    },

    get GAMES() {
        return {
            DAILY_LIMIT: 30, // Quantas partidas por dia
            MIN_BET: 10,
            TAX_RATE: getVal('TAX_RATE') || 0.05
        };
    },

    get BANK() {
        return {
            STAKING_ALLOCATION: 0.30,
            LOCKED_WEIGHT: 2.0,
            MAX_DAILY_YIELD_LIQUID: 0.01,
            MAX_DAILY_YIELD_LOCKED: 0.025,
            LOCKED_PERIOD_DAYS: 30,
            LOCKED_APR_DAILY_BASE: getVal('LOCKED_APR_DAILY') || 0.005
        };
    },

    get CLASSES() {
        return {
            ESPECULADOR: { STAKING_YIELD_MULT: 1 + (getVal('ESPECULADOR_YIELD_BONUS') || 0.1) },
            TECNOMANTE: { ORACLE_DISCOUNT: getVal('TECNOMANTE_DISCOUNT') || 0.5 },
            BARDO: { REFERRAL_BONUS_MULT: getVal('BARDO_BONUS_MULT') || 1.5 },
            BRUXO: { GAME_WIN_MULT: 1.10 },
            NOVATO: { _dummy: 0 }
        };
    },

    get DATING() {
        return {
            LIKE_COST: getVal('DATING_LIKE_COST') || 10,
            SUPERLIKE_COST_COINS: getVal('DATING_SUPERLIKE_COST') || 100,
            MATCH_BONUS: getVal('MATCH_BONUS') || 500
        };
    },
    
    get GLOBAL() {
        return {
            EMERGENCY_STOP: getVal('EMERGENCY_STOP'),
            MARKET_OPEN: getVal('MARKET_OPEN')
        };
    }
};