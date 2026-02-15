const axios = require('axios');
require('dotenv').config({ path: '../.env' });

// ============================================================================
// ⚙️ CONFIGURAÇÃO & CONEXÃO
// ============================================================================
const CONFIG = {
    API_URL: 'http://localhost:3001/api', 
    SECRET: process.env.BOT_SECRET,
    TICK_RATE: 4000,   // 5 segundos entre trades
    PRICE_CAP: 50000, // Teto onde o bias vira neutro
    BASE_HAND: 1,      // Mão mínima
    MAX_HAND: 6        // Aumentei um pouco a mão máxima para dar liquidez
};

// ============================================================================
// 🎭 REGIMES DE MERCADO (V31 QUANTUM DYNAMICS)
// ============================================================================
const REGIMES = {
    0: { name: '🌊 LAMINAR',   duration: [360, 900], drift: [0.02, 0.07], curve: 'convex',  noise: 0.01 },
    1: { name: '🌪️ TURBULENT', duration: [180, 540],  drift: [0.01, 0.05], curve: 'convex',  noise: 0.05 },
    2: { name: '🍋 SQUEEZE',   duration: [120, 360],  drift: [0.01, 0.03], curve: 'convex',  noise: 0.02 },
    3: { name: '☢️ CRITICAL',  duration: [90, 270],   drift: [0.01, 0.06], curve: 'concave', noise: 0.15 },
    4: { name: '🚀 PARABOLA',  duration: [90, 120],   drift: [0.05, 0.18], curve: 'concave', noise: 0.04 },
    5: { name: '🥴 INSTABLE',  duration: [180, 360],  drift: [0.05, 0.01], curve: 'linear',  noise: 0.06 },
    6: { name: '🪤 TRAP',      duration: [180, 900],  drift: [0.003, 0.01], curve: 'linear', noise: 0.03, mode: 'trap' },
    7: { name: '⚙️ GRIND',     duration: [300, 600], drift: [0.03, 0.001], curve: 'convex',  noise: 0.02 }
};

// ============================================================================
// 🧠 ESTADO DO BOT
// ============================================================================
let state = {
    currentRegimeId: 0,
    startTime: Date.now(),
    durationMs: 0,
    startParams: {},
    endParams: {},
    wins: 0,
    errors: 0
};

// ============================================================================
// 🧮 MATEMÁTICA AUXILIAR
// ============================================================================

function interpolate(start, end, progress, type) {
    let t = progress;
    if (type === 'convex') t = progress * progress;
    else if (type === 'concave') t = 1 - (1 - progress) * (1 - progress);
    return start + (end - start) * t;
}

function gaussian(mean = 0, stdev = 1) {
    const u = 1 - Math.random(); 
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

/**
 * 🔥 BULLISH BIAS CONTROL
 * Probabilidade de compra decresce conforme chega no teto de 100k
 */
function getBullishProbability(currentPrice) {
    if (currentPrice >= CONFIG.PRICE_CAP) return 0.50; // Neutro no topo

    const x = currentPrice / CONFIG.PRICE_CAP;
    
    // Curva Quadrática Suave
    // Começa em 60% (0.5 + 0.1) e cai para 50%
    const bonus = 0.05 * Math.pow(1 - x, 2);
    
    return 0.50 + bonus;
}

function pickNewRegime() {
    const current = state.currentRegimeId;
    let next = current;
    while (next === current) {
        next = Math.floor(Math.random() * 8);
    }
    
    const regime = REGIMES[next];
    const durationSec = Math.floor(Math.random() * (regime.duration[1] - regime.duration[0]) + regime.duration[0]);
    
    state.currentRegimeId = next;
    state.startTime = Date.now();
    state.durationMs = durationSec * 1000;
    
    const jitter = () => 1 + (Math.random() * 0.4 - 0.2); 

    state.startParams = {
        drift: regime.drift[0] * jitter(),
        noise: regime.noise * jitter()
    };
    state.endParams = {
        drift: regime.drift[1] * jitter(),
        noise: regime.noise
    };

    console.log(`\n🎲 MUDANÇA DE FASE: [${regime.name}] por ${durationSec}s`);
}

// ============================================================================
// 🚀 LOOP PRINCIPAL (QUANTUM TICK)
// ============================================================================
async function quantumTick() {
    try {
        // 1. Obter Preço Atual (Endpoint Ticker)
        let currentPrice = 50.00;
        
        try {
            // 🔥 CORREÇÃO: Usa a rota /ticker agora
            const res = await axios.get(`${CONFIG.API_URL}/exchange/ticker`, { 
                headers: { 'x-bot-secret': CONFIG.SECRET },
                timeout: 3000
            });
            
            if (res.data.price) {
                currentPrice = Number(res.data.price);
            }
        } catch (e) {
            console.warn("⚠️ API Ticker Error:", e.message);
            // Fallback não crítico, o bot tenta operar no escuro por um tick
        }

        // 2. Lógica Temporal
        const now = Date.now();
        const elapsed = now - state.startTime;
        const progress = Math.min(elapsed / state.durationMs, 1.0);

        if (elapsed >= state.durationMs) {
            pickNewRegime();
            return;
        }

        const regime = REGIMES[state.currentRegimeId];

        // 3. Física de Mercado
        const bullProb = getBullishProbability(currentPrice);
        const isBullishTick = Math.random() < bullProb;
        
        let direction = isBullishTick ? 1 : -1;

        // Trap Mode
        if (regime.mode === 'trap' && progress > 0.6) direction *= -1;

        const currentDrift = interpolate(state.startParams.drift, state.endParams.drift, progress, regime.curve);
        const noiseVal = gaussian(0, state.startParams.noise);
        const force = (currentDrift * direction) + noiseVal;

        // 4. Decisão
        const action = force > 0 ? 'buy' : 'sell';
        
        let amount = Math.ceil(Math.abs(force) * 50); 
        amount = Math.max(amount, CONFIG.BASE_HAND);
        amount = Math.min(amount, CONFIG.MAX_HAND);

        // 5. Execução
        const logProb = (bullProb * 100).toFixed(1);
        const logProg = (progress * 100).toFixed(0);
        const icon = action === 'buy' ? '🟩' : '🟥';

        console.log(`[${regime.name}] ${logProg}% | $${currentPrice.toFixed(2)} | Prob: ${logProb}% | F: ${force.toFixed(3)} | ${icon} ${amount}`);
        
        await axios.post(`${CONFIG.API_URL}/exchange/trade`, {
            action: action,
            amount: amount
        }, { headers: { 'x-bot-secret': CONFIG.SECRET } });

        state.wins++;

    } catch (error) {
        state.errors++;
        if (error.response?.status === 403) {
            console.error("⛔ ACESSO NEGADO: Verifique se o BOT é Admin.");
        } else {
            console.error("❌ Erro Tick:", error.message);
        }
    }
}

// ============================================================================
// 🔥 START
// ============================================================================
console.log("🤖 MARKET MAKER V31 - QUANTUM DYNAMICS ONLINE");
console.log(`🎯 Alvo: ${CONFIG.API_URL}`);

pickNewRegime();
setInterval(quantumTick, CONFIG.TICK_RATE);