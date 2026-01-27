// server/config/tokenomics.js

/**
 * 📊 GECAPIX TOKENOMICS - SEASON 1 CONFIGURATION
 * Calibrado em: 24/01/2026
 * Status: LOCKED 🔒
 */

const SEASON_LENGTH = 180; 

module.exports = {
    SEASON: {
        ID: 1, 
        START_DATE: new Date().toISOString(), 
        LENGTH: SEASON_LENGTH,
    },
    
    // --- 2. HARD CAPS & ALOCAÇÃO INICIAL ---
    CAPS: {
        TOTAL_SUPPLY: 1_000_000_000, // 1 Bilhão
        INITIAL_USER_BALANCE: 1000
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
        WELCOME_BONUS: 500,      
        DAILY_LOGIN_BASE: 50,    
        DAILY_LOGIN_STEP: 37,    
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

    ALLOCATION: {
        LOCKED_TREASURY: 500_000_000, // 50% (Travado 6 meses)
        CASHBACK_FUND:   165_000_000, // 16.5% (Fundo de Cashback)
        CENTRAL_BANK:    100_000_000, // 10% (Liquidez do Bot/Market Maker)
        // O RESTANTE (~23.5%) vai para o Tesouro Geral (Referral, Games, Drops)
    },

    BANK: {
        STAKING_ALLOCATION: 0.30, 
        LOCKED_WEIGHT: 2.0, 
        MAX_DAILY_YIELD_LIQUID: 0.01, 
        MAX_DAILY_YIELD_LOCKED: 0.025, 
        LOCKED_PERIOD_DAYS: 30,
        PENALTY_MAX: 0.40,
        PENALTY_MIN: 0.10,
    },
    
    // --- 8. CARTEIRAS DE SISTEMA (EMAILS) ---
    WALLETS: {
        TREASURY: "treasury@gecapix.com",       // Tesouro Geral (O Resto)
        TREASURY_LOCKED: "locked@gecapix.com",  // Tesouro Bloqueado (500kk)
        CASHBACK: "cashback@gecapix.com",       // Fundo Cashback (165kk)
        BANK: "central_bank@gecapix.com",       // Banco Central (100kk)
        
        FEES: "trading_fees@gecapix.com",       // Coletor de Taxas
        BURN: "burn_address@gecapix.com"        // Cemitério
    },

    // --- 9. RPG CLASS BONUSES ---
    CLASSES: {
        ESPECULADOR: { STAKING_YIELD_MULT: 1.5 },
        TECNOMANTE: { ORACLE_DISCOUNT: 0.50 },
        BARDO: { REFERRAL_BONUS_MULT: 1.25 },
        BRUXO: { GAME_WIN_MULT: 1.10 },
        NOVATO: { _dummy: 0 }
    },

    // --- 10. GECAMATCH (DATING) ---
    DATING: {
        LIKE_COST: 50,          // Custa 50 Coins dar like
        LIKE_XP_REWARD: 10,     // Ganha 10 XP por interagir
        
        SUPERLIKE_COST_COINS: 500,
        SUPERLIKE_COST_GLUE: 1, // Custa 1 Glue (R$ 4.20) + 500 Coins
        
        // Distribuição do Super Like (Coins)
        SUPERLIKE_DISTRIBUTION: {
            RECIPIENT: 0.50, // 50% vai pro crush
            BURN: 0.25,      // 25% queimado
            FEES: 0.25       // 25% pro projeto
        }
    },

    
};