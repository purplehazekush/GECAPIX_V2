const axios = require('axios');
require('dotenv').config({ path: '../.env' });

// ============================================================================
// ⚙️ CONFIGURAÇÃO & CONEXÃO
// ============================================================================
const CONFIG = {
    API_URL: 'http://localhost:3001/api', 
    SECRET: process.env.BOT_SECRET,
    TICK_RATE: 5000,   // 5 segundos entre trades
    PRICE_CAP: 100000, // Teto onde o bias vira neutro
    BASE_HAND: 1,      // Mão mínima
    MAX_HAND: 10       // Mão máxima (segurança)
};

// ============================================================================
// 🎭 REGIMES DE MERCADO (V31 QUANTUM DYNAMICS)
// ============================================================================
// Portado do Python Factory V31
// Duration: range em segundos (aproximei os ticks do python para tempo real)
const REGIMES = {
    0: { name: '🌊 LAMINAR',   duration: [120, 300], drift: [0.02, 0.07], curve: 'convex',  noise: 0.01 },
    1: { name: '🌪️ TURBULENT', duration: [60, 180],  drift: [0.01, 0.05], curve: 'convex',  noise: 0.05 },
    2: { name: '🍋 SQUEEZE',   duration: [40, 120],  drift: [0.01, 0.03], curve: 'convex',  noise: 0.02 },
    3: { name: '☢️ CRITICAL',  duration: [30, 90],   drift: [0.01, 0.06], curve: 'concave', noise: 0.15 },
    4: { name: '🚀 PARABOLA',  duration: [30, 60],   drift: [0.05, 0.18], curve: 'concave', noise: 0.04 },
    5: { name: '🥴 INSTABLE',  duration: [60, 120],  drift: [0.05, 0.01], curve: 'linear',  noise: 0.06 },
    6: { name: '🪤 TRAP',      duration: [60, 150],  drift: [0.003, 0.01], curve: 'linear', noise: 0.03, mode: 'trap' },
    7: { name: '⚙️ GRIND',     duration: [100, 200], drift: [0.03, 0.001], curve: 'convex',  noise: 0.02 }
};

// ============================================================================
// 🧠 ESTADO DO BOT (MEMÓRIA QUÂNTICA)
// ============================================================================
let state = {
    currentRegimeId: 0,
    startTime: Date.now(),
    durationMs: 0,
    startParams: {}, // Parâmetros sorteados para o início do regime
    endParams: {},   // Parâmetros alvo para o fim do regime
    wins: 0,
    errors: 0
};

// ============================================================================
// 🧮 MATEMÁTICA AUXILIAR
// ============================================================================

// Interpolação (Linear, Convexa, Côncava)
function interpolate(start, end, progress, type) {
    let t = progress;
    if (type === 'convex') t = progress * progress; // Acelera no fim
    else if (type === 'concave') t = 1 - (1 - progress) * (1 - progress); // Rápido no começo
    return start + (end - start) * t;
}

// Ruído Gaussiano (Box-Muller Transform)
function gaussian(mean = 0, stdev = 1) {
    const u = 1 - Math.random(); 
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

/**
 * 🔥 BULLISH BIAS CONTROL
 * Calcula a probabilidade de COMPRA baseada no preço atual.
 * Regra: 60% no fundo, decai quadraticamente até 50% no teto (100k).
 */
function getBullishProbability(currentPrice) {
    // Se passou do teto, vira neutro (ou até Bearish leve se quiser)
    if (currentPrice >= CONFIG.PRICE_CAP) return 0.50;

    // Normaliza preço entre 0 e 1
    const x = currentPrice / CONFIG.PRICE_CAP;
    
    // Curva Quadrática: y = base + range * (1 - x)^2
    // base = 0.50 (50%)
    // range = 0.10 (os 10% extras pra chegar em 60%)
    // (1 - x)^2 garante que cai rápido no começo e suaviza no final
    const bonus = 0.10 * Math.pow(1 - x, 2);
    
    return 0.50 + bonus;
}

// Sorteia novo regime e calibra parâmetros com "Jitter" (variação natural)
function pickNewRegime() {
    const current = state.currentRegimeId;
    let next = current;
    // Evita repetir o mesmo regime, para garantir transição de fase
    while (next === current) {
        next = Math.floor(Math.random() * 8);
    }
    
    const regime = REGIMES[next];
    
    // Sorteia duração dentro do range do regime
    const durationSec = Math.floor(Math.random() * (regime.duration[1] - regime.duration[0]) + regime.duration[0]);
    
    state.currentRegimeId = next;
    state.startTime = Date.now();
    state.durationMs = durationSec * 1000;
    
    // Aplica "Jitter" (Ruído) nos parâmetros base para que nenhum ciclo seja idêntico
    const jitter = () => 1 + (Math.random() * 0.4 - 0.2); // +/- 20%

    state.startParams = {
        drift: regime.drift[0] * jitter(),
        noise: regime.noise * jitter()
    };
    state.endParams = {
        drift: regime.drift[1] * jitter(),
        noise: regime.noise // Noise geralmente mantemos estável ou linear
    };

    console.log(`\n🎲 MUDANÇA DE FASE: Entrando em [${regime.name}]`);
    console.log(`⏱️ Duração: ${durationSec}s | Drift Base: ${state.startParams.drift.toFixed(4)} -> ${state.endParams.drift.toFixed(4)}`);
}

// ============================================================================
// 🚀 LOOP PRINCIPAL (QUANTUM TICK)
// ============================================================================
async function quantumTick() {
    try {
        // 1. Obter Preço Atual (Com Fallback de Segurança)
        let currentPrice = 50.0;
        try {
            const res = await axios.get(`${CONFIG.API_URL}/exchange/quote`, { 
                headers: { 'x-bot-secret': CONFIG.SECRET },
                timeout: 3000
            });
            if (res.data.price) currentPrice = Number(res.data.price);
        } catch (e) {
            console.warn("⚠️ API Price Error (Using fallback):", e.message);
        }

        // 2. Verifica Tempo do Regime (Progressão Temporal)
        const now = Date.now();
        const elapsed = now - state.startTime;
        const progress = Math.min(elapsed / state.durationMs, 1.0);

        if (elapsed >= state.durationMs) {
            pickNewRegime();
            return; // Pula um tick para recalibrar
        }

        const regime = REGIMES[state.currentRegimeId];

        // 3. Define a Direção (A Alma do Bot)
        // Probabilidade Global (Macro) vs Volatilidade do Regime (Micro)
        
        const bullProb = getBullishProbability(currentPrice);
        const isBullishTick = Math.random() < bullProb;
        
        // Direção Base: 1 (Compra) ou -1 (Venda)
        let direction = isBullishTick ? 1 : -1;

        // 🔥 Lógica da Trap: Inverte a direção no meio do caminho
        if (regime.mode === 'trap') {
            if (progress > 0.6) direction *= -1; // Aos 60% do tempo, a armadilha dispara
        }

        // 4. Calcula Força (Física)
        // Drift Interpolado (Intenção Direcional)
        const currentDrift = interpolate(state.startParams.drift, state.endParams.drift, progress, regime.curve);
        
        // Ruído Térmico (Volatilidade Aleatória)
        const noiseVal = gaussian(0, state.startParams.noise);

        // Força Resultante = (Drift * Direção) + Ruído
        // Se a força for positiva, compra. Se negativa, vende.
        // O Drift dá o "empurrão" na direção escolhida, o ruído bagunça tudo.
        const force = (currentDrift * direction) + noiseVal;

        // 5. Decisão de Trade
        const action = force > 0 ? 'buy' : 'sell';
        
        // Tamanho da Mão: Proporcional à força
        // Quanto maior a força (convicção ou volatilidade), maior o lote.
        let amount = Math.ceil(Math.abs(force) * 50); // Multiplicador de sensibilidade
        amount = Math.max(amount, CONFIG.BASE_HAND);
        amount = Math.min(amount, CONFIG.MAX_HAND);

        // 6. Execução
        const logProb = (bullProb * 100).toFixed(1);
        const logProg = (progress * 100).toFixed(0);
        const icon = action === 'buy' ? '🟩' : '🟥';

        console.log(`[${regime.name}] ${logProg}% | $${currentPrice.toFixed(2)} | BullChance: ${logProb}% | Força: ${force.toFixed(4)} | ${icon} ${amount}`);
        
        await axios.post(`${CONFIG.API_URL}/exchange/trade`, {
            action: action,
            amount: amount
        }, { headers: { 'x-bot-secret': CONFIG.SECRET } });

        state.wins++;

    } catch (error) {
        state.errors++;
        if (error.response?.status === 403) {
            console.error("⛔ ACESSO NEGADO: Verifique BOT_SECRET e usuário 'market_maker'.");
        } else {
            console.error("❌ Erro Tick:", error.message);
        }
    }
}

// ============================================================================
// 🔥 IGNIÇÃO
// ============================================================================
console.log("🤖 MARKET MAKER V31 - QUANTUM DYNAMICS ONLINE");
console.log(`🎯 Alvo: ${CONFIG.API_URL}`);
console.log(`🎲 Price Cap: ${CONFIG.PRICE_CAP}`);

pickNewRegime(); // Start
setInterval(quantumTick, CONFIG.TICK_RATE);