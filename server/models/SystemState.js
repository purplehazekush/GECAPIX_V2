// server/models/SystemState.js
const mongoose = require('mongoose');

const SystemStateSchema = new mongoose.Schema({
    season_id: { type: Number, default: 1 },
    season_start_date: { type: Date, required: true },
    
    // Controle de Tempo
    current_day: { type: Number, default: 0 },
    
    // 🔥 TRAVA DE SEGURANÇA (NOVO)
    // Indica qual foi o último dia que a Tesouraria pagou efetivamente.
    // Se current_day == last_processed_day, não pagamos de novo.
    last_processed_day: { type: Number, default: -1 }, 

    last_update: { type: Date, default: Date.now },

    // Potes Disponíveis
    referral_pool_available: { type: Number, default: 0 },
    cashback_pool_available: { type: Number, default: 0 },
    current_referral_reward: { type: Number, default: 500 },
    
    // Status
    is_active: { type: Boolean, default: true },
    
    // Ledger
    total_burned: { type: Number, default: 0 }, 
    total_fees_collected: { type: Number, default: 0 }, 
    
    // Histórico Rendimento
    last_apr_liquid: { type: Number, default: 0 },
    last_apr_locked: { type: Number, default: 0 },
    
    total_staked_liquid: { type: Number, default: 0 },
    total_staked_locked: { type: Number, default: 0 },

    // Bonding Curve
    glue_price_base: { type: Number, default: 200 }, 
    glue_price_multiplier: { type: Number, default: 1.015 }, // Ajustado para o valor correto do reset
    glue_supply_circulating: { type: Number, default: 0 },
    
    market_is_open: { type: Boolean, default: true },

    // 🔥 NOVO CAMPO: Cotação do Mundo Real
    // Ex: 120 significa que R$ 1,00 vale 120 Coins na sede do geca
    real_world_cashback_rate: { type: Number, default: 120 },
});

module.exports = mongoose.models.SystemState || mongoose.model('SystemState', SystemStateSchema);