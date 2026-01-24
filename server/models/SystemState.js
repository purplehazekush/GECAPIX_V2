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
    is_active: { type: Boolean, default: true }
});

module.exports = mongoose.models.SystemState || mongoose.model('SystemState', SystemStateSchema);