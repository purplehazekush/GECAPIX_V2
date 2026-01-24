// server/models/SystemState.js
const mongoose = require('mongoose');

const SystemStateSchema = new mongoose.Schema({
    season_id: { type: Number, default: 1 },
    season_start_date: { type: Date, required: true },
    
    // Controle de Tempo
    current_day: { type: Number, default: 0 },
    last_update: { type: Date, default: Date.now },

    // Potes Disponíveis (Calculados diariamente)
    referral_pool_available: { type: Number, default: 0 },
    cashback_pool_available: { type: Number, default: 0 },

    // Valor Unitário Hoje (O que aparece na tela do usuário)
    current_referral_reward: { type: Number, default: 500 },
    
    // Status
    is_active: { type: Boolean, default: true },
    // --- LEDGER DO SISTEMA ---
    total_burned: { type: Number, default: 0 }, // Moedas destruídas
    total_fees_collected: { type: Number, default: 0 }, // Moedas no tesouro
    // --- HISTÓRICO DE RENDIMENTO ---
    last_apr_liquid: { type: Number, default: 0 }, // Ex: 0.005 (0.5%)
    last_apr_locked: { type: Number, default: 0 }, // Ex: 0.015 (1.5%)
    
    // --- LEDGER ---
    total_staked_liquid: { type: Number, default: 0 }, // TVL Liquido
    total_staked_locked: { type: Number, default: 0 }, // TVL Locked
});

module.exports = mongoose.models.SystemState || mongoose.model('SystemState', SystemStateSchema);