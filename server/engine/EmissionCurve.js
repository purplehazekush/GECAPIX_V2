const TOKEN = require('../config/tokenomics');

class EmissionCurve {
    static getDailyReferralPool(day) {
        // Blindagem: Se a config estiver quebrada, não derruba o server, retorna 0
        if (!TOKEN.CURVES || !TOKEN.CURVES.REFERRAL_A_CONST) {
            console.error("⚠️ ERRO CRÍTICO: Tokenomics.CURVES não configurado! Retornando 0.");
            return 0;
        }

        if (day > TOKEN.SEASON.LENGTH) return 0;
        
        // E(t) = A * e^(-k * t)
        const pool = TOKEN.CURVES.REFERRAL_A_CONST * Math.exp(-TOKEN.CURVES.REFERRAL_K * day);
        return Math.floor(pool);
    }

    static getDailyCashbackPool(day) {
        if (!TOKEN.CURVES || !TOKEN.CURVES.CASHBACK_POOL) return 0; // Blindagem

        if (day > TOKEN.SEASON.LENGTH) return 0;
        
        const base = TOKEN.CURVES.CASHBACK_POOL || 5000;
        const pool = base * Math.pow(day + 1, 1.5); 
        return Math.floor(pool);
    }
    
    static getUnitaryReferralReward(day) {
        const dailyPool = this.getDailyReferralPool(day);
        // Evita divisão por zero se dayOnePool for 0
        const dayOnePool = this.getDailyReferralPool(0) || 1; 
        
        const decayFactor = dailyPool / dayOnePool;
        
        let reward = TOKEN.COINS.MAX_REFERRAL_REWARD * decayFactor;
        
        return Math.max(Math.floor(reward), 50);
    }
}

module.exports = EmissionCurve;