// server/models/DynamicConfig.js
const mongoose = require('mongoose');

const DynamicConfigSchema = new mongoose.Schema({
    ver: { type: String, default: 'v1', unique: true }, // Singleton
    
    // --- 1. MACROECONOMIA ---
    TAX_RATE: { type: Number, default: 0.05 },
    LOCKED_APR_DAILY: { type: Number, default: 0.012 }, // 1.2%
    EXCHANGE_PEG: { type: Number, default: 1000 },
    
    // --- 2. FAUCETS (Entradas) ---
    WELCOME_BONUS: { type: Number, default: 500 },
    DAILY_LOGIN_BASE: { type: Number, default: 50 },
    DAILY_LOGIN_STEP: { type: Number, default: 10 },
    REFERRAL_FIXED: { type: Number, default: 300 },
    GAME_WIN_XP: { type: Number, default: 50 },
    MATCH_BONUS: { type: Number, default: 100 }, // Reduzi para 100 pra evitar inflação
    
    // --- 3. SINKS (Saídas) ---
    ORACLE_COST_COINS: { type: Number, default: 100 },
    ORACLE_COST_GLUE: { type: Number, default: 1 },
    SPOTTED_POST_COST: { type: Number, default: 50 },
    DATING_LIKE_COST: { type: Number, default: 50 },
    DATING_SUPERLIKE_COST: { type: Number, default: 500 },
    
    // --- 4. CLASSES ---
    BARDO_BONUS_MULT: { type: Number, default: 1.25 },
    TECNOMANTE_DISCOUNT: { type: Number, default: 0.5 },
    ESPECULADOR_YIELD_BONUS: { type: Number, default: 0.02 },

    // --- CONTROLE GERAL ---
    MARKET_OPEN: { type: Boolean, default: true },
    EMERGENCY_STOP: { type: Boolean, default: false } // Trava tudo
});

module.exports = mongoose.model('DynamicConfig', DynamicConfigSchema);