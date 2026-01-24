// server/engine/EmissionCurve.js
const TOKEN = require('../config/tokenomics');

class EmissionCurve {
    static getDailyReferralPool(day) {
        if (day > TOKEN.SEASON.LENGTH) return 0;
        // E(t) = A * e^(-k * t)
        const pool = TOKEN.CURVES.REFERRAL_A_CONST * Math.exp(-TOKEN.CURVES.REFERRAL_K * day);
        return Math.floor(pool);
    }

    static getDailyCashbackPool(day) {
        if (day > TOKEN.SEASON.LENGTH) return 0;
        // Normalização simplificada para garantir integridade do pool
        // Em produção real, recalcularíamos a baseConstant, mas aqui usaremos uma aproximação linear da curva
        const { CASHBACK_POOL, CASHBACK_P_EXP } = TOKEN.CURVES;
        // (Lógica simplificada para MVP: Apenas uma curva de potência crescente)
        const base = 5000; // Valor base arbitrário para start
        const pool = base * Math.pow(day + 1, 1.5); 
        return Math.floor(pool);
    }
    
    static getUnitaryReferralReward(day) {
        const dailyPool = this.getDailyReferralPool(day);
        const dayOnePool = this.getDailyReferralPool(0);
        const decayFactor = dailyPool / dayOnePool;
        
        let reward = TOKEN.COINS.MAX_REFERRAL_REWARD * decayFactor;
        
        // REGRA DE BOM SENSO: Piso mínimo de 50 GC para não desanimar totalmente
        return Math.max(Math.floor(reward), 50);
    }
}

module.exports = EmissionCurve;