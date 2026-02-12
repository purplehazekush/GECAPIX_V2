// server/services/ConfigService.js
const DynamicConfig = require('../models/DynamicConfig');

// Estado em Memória (Cache Quente)
let memoryConfig = {
    TAX_RATE: 0.05,
    LOCKED_APR_DAILY: 0.012,
    EXCHANGE_PEG: 1000,
    WELCOME_BONUS: 500,
    DAILY_LOGIN_BASE: 50,
    DAILY_LOGIN_STEP: 10,
    REFERRAL_FIXED: 300,
    GAME_WIN_XP: 50,
    MATCH_BONUS: 100,
    ORACLE_COST_COINS: 100,
    ORACLE_COST_GLUE: 1,
    SPOTTED_POST_COST: 50,
    DATING_LIKE_COST: 50,
    DATING_SUPERLIKE_COST: 500,
    BARDO_BONUS_MULT: 1.25,
    TECNOMANTE_DISCOUNT: 0.5,
    ESPECULADOR_YIELD_BONUS: 0.02,
    MARKET_OPEN: true,
    EMERGENCY_STOP: false
};

const initConfig = async () => {
    try {
        let config = await DynamicConfig.findOne({ ver: 'v1' });
        if (!config) {
            console.log("⚙️ Criando configuração dinâmica inicial...");
            config = await DynamicConfig.create({ ver: 'v1' });
        }
        // Atualiza memória
        memoryConfig = config.toObject();
        console.log("✅ [CONFIG] Tokenomics carregado na memória.");
    } catch (e) {
        console.error("❌ Erro ao carregar configs:", e);
    }
};

const updateConfig = async (newValues) => {
    try {
        const updated = await DynamicConfig.findOneAndUpdate(
            { ver: 'v1' },
            { $set: newValues },
            { new: true, upsert: true }
        );
        memoryConfig = updated.toObject();
        console.log("🔄 [CONFIG] Hot-Reload aplicado!");
        return memoryConfig;
    } catch (e) {
        throw new Error("Falha ao atualizar config.");
    }
};

module.exports = {
    init: initConfig,
    update: updateConfig,
    get: () => memoryConfig
};