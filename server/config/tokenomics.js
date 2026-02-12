// server/config/tokenomics.js
const ConfigService = require('../services/ConfigService');

// Inicializa assim que o módulo é carregado (ou quando o server sobe)
// O index.js deve chamar ConfigService.init() também para garantir
const getVal = (key) => ConfigService.get()[key];

module.exports = {
    // --- SEASON INFO (Estático) ---
    SEASON: {
        ID: 1,
        LENGTH: 180,
        START_DATE: "2026-02-01T00:00:00Z"
    },

    // --- GETTERS DINÂMICOS ---
    // Toda vez que alguém pedir TOKEN.COINS.WELCOME_BONUS, 
    // ele vai buscar o valor atual na memória do ConfigService.
    
    get COINS() {
        return {
            WELCOME_BONUS: getVal('WELCOME_BONUS'),
            DAILY_LOGIN_BASE: getVal('DAILY_LOGIN_BASE'),
            DAILY_LOGIN_STEP: getVal('DAILY_LOGIN_STEP'),
            REFERRAL_FIXED: getVal('REFERRAL_FIXED'), // Unifiquei aqui
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
            GAME_WIN: getVal('GAME_WIN_XP'),
            GAME_LOSS: 10
        };
    },

    get COSTS() {
        return {
            SPOTTED_COMMENT: 5,
            SPOTTED_POST: getVal('SPOTTED_POST_COST'),
            AI_SOLVER_GLUE: getVal('ORACLE_COST_GLUE'),
            AI_SOLVER_COINS: getVal('ORACLE_COST_COINS')
        };
    },

    get GAMES() {
        return {
            DAILY_LIMIT: 30,
            MIN_BET: 10,
            TAX_RATE: getVal('TAX_RATE') // <--- Isso é poderoso
        };
    },

    get BANK() {
        return {
            STAKING_ALLOCATION: 0.30,
            LOCKED_WEIGHT: 2.0,
            MAX_DAILY_YIELD_LIQUID: 0.01,
            MAX_DAILY_YIELD_LOCKED: 0.025,
            LOCKED_PERIOD_DAYS: 30,
            LOCKED_APR_DAILY_BASE: getVal('LOCKED_APR_DAILY')
        };
    },

    get CLASSES() {
        return {
            ESPECULADOR: { STAKING_YIELD_MULT: 1 + getVal('ESPECULADOR_YIELD_BONUS') },
            TECNOMANTE: { ORACLE_DISCOUNT: getVal('TECNOMANTE_DISCOUNT') },
            BARDO: { REFERRAL_BONUS_MULT: getVal('BARDO_BONUS_MULT') },
            BRUXO: { GAME_WIN_MULT: 1.10 },
            NOVATO: { _dummy: 0 }
        };
    },

    get DATING() {
        return {
            LIKE_COST: getVal('DATING_LIKE_COST'),
            SUPERLIKE_COST_COINS: getVal('DATING_SUPERLIKE_COST'),
            MATCH_BONUS: getVal('MATCH_BONUS')
        };
    },
    
    // Configs de Emergência
    get GLOBAL() {
        return {
            EMERGENCY_STOP: getVal('EMERGENCY_STOP'),
            MARKET_OPEN: getVal('MARKET_OPEN')
        };
    },

    // --- CARTEIRAS DE SISTEMA (Estáticas) ---
    WALLETS: {
        TREASURY: "treasury@gecapix.com",
        TREASURY_LOCKED: "locked@gecapix.com",
        CASHBACK: "cashback@gecapix.com",
        BANK: "central_bank@gecapix.com",
        FEES: "trading_fees@gecapix.com",
        BURN: "burn_address@gecapix.com"
    }
};