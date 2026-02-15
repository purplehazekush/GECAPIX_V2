const axios = require('axios');
require('dotenv').config({ path: '../.env' });

// ============================================================================
// ⚙️ CONFIGURAÇÃO & CONEXÃO
// ============================================================================
const CONFIG = {
    API_URL: 'http://localhost:3001/api', // Ajuste se for remoto
    SECRET: process.env.BOT_SECRET,
    TICK_RATE: 5000, // 5 segundos entre trades
    PRICE_CAP: 100000, // O teto onde a vantagem acaba
    BASE_HAND: 2, // Mão base de GLUEs
};

// ============================================================================
// 🎭 REGIMES DE MERCADO (INTENTION FIELD)
// ============================================================================
// Portado diretamente do Python Factory V31
const REGIMES = {
    0: { name: '🌊 LAMINAR',   duration: [40, 60],  drift: [0.02, 0.07], curve: 'convex',  noise: 0.01 },
    1: { name: '🌪️ TURBULENT', duration: [30, 50],  drift: [0.01, 0.05], curve: 'convex',  noise: 0.03 },
    2: { name: '🍋 SQUEEZE',   duration: [20, 40],  drift: [0.01, 0.03], curve: 'convex',  noise: 0.015 },
    3: { name: '☢️ CRITICAL',  duration: [15, 30],  drift: [0.01, 0.06], curve: 'concave', noise: 0.08 },
    4: { name: '🚀 PARABOLA',  duration: [10, 20],  drift: [0.05, 0.18], curve: 'concave', noise: 0.04 },
    5: { name: '🥴 INSTABLE',  duration: [30, 50],  drift: [0.01, 0.01], curve: 'linear',  noise: 0.05 },
    6: { name: '🪤 TRAP',      duration: [25, 45],  drift: [0.003, 0.01], curve: 'linear', noise: 0.02, mode: 'trap' },
    7: { name: '⚙️ GRIND',     duration: [40, 80],  drift: [0.03, 0.001], curve: 'convex',  noise: 0.015 }
};

// ============================================================================
// 🧠 ESTADO DO BOT (MEMÓRIA QUÂNTICA)
// ============================================================================
let state = {
    currentRegimeId: 0,
    startTime: Date.now(),
    durationMs: 0,
    startParams: {},
    endParams: {},
    direction: 1 // 1 = Alta, -1 = Baixa
};

// ============================================================================
// 🧮 MATEMÁTICA AUXILIAR
// ============================================================================

// Interpolação (Linear, Convexa, Côncava)
function interpolate(start, end, progress, type) {
    let t = progress;
    if (type === 'convex') t = progress * progress;
    if (type === 'concave') t = 1 - (1 - progress) * (1 - progress);
    return start + (end - start) * t;
}

// Ruído Gaussiano (Box-Muller)
function gaussian(mean = 0, stdev = 1) {
    const u = 1 - Math.random(); 
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

// Probabilidade de Drift Positivo (Bullish Bias)
// Retorna a chance (0.5 a 0.6) baseada no preço atual
function getBullishProbability(currentPrice) {
    if (currentPrice >= CONFIG.PRICE_CAP) return 0.50; // 50% (Neutro) no teto

    // Normaliza preço entre 0 e 1
    const x = currentPrice / CONFIG.PRICE_CAP;
    
    // Curva de Decaimento Quadrática Invertida
    // Começa agressivo (perto de 0.6) e suaviza até 0.5
    // Fórmula: 0.5 + 0.1 * (1 - x)^2
    const bonus = 0.10 * Math.pow(1 - x, 2);
    
    return 0.50 + bonus;
}

// Sorteia novo regime (diferente do atual)
function pickNewRegime() {
    const current = state.currentRegimeId;
    let next = current;
    while (next === current) {
        next = Math.floor(Math.random() * 8);
    }
    
    const regime = REGIMES[next];
    // Sorteia duração (convertendo ticks do python para ms aproximados)
    // Vamos assumir 1 tick python = 1 tick bot (5s)
    const durationTicks = Math.floor(Math.random() * (regime.duration[1] - regime.duration[0]) + regime.duration[0]);
    
    state.currentRegimeId = next;
    state.startTime = Date.now();
    state.durationMs = durationTicks * CONFIG.TICK_RATE;
    
    // Define direção baseada na probabilidade do preço ATUAL será calculada no tick
    // Mas aqui definimos os parms de drift
    state.startParams = {
        drift: regime.drift[0] * (1 + (Math.random() * 0.4 - 0.2)), // +/- 20% jitter
        noise: regime.noise * (1 + (Math.random() * 0.4 - 0.2))
    };
    state.endParams = {
        drift: regime.drift[1] * (1 + (Math.random() * 0.4 - 0.2)),
        noise: regime.noise // Noise geralmente é constante ou linear, simplificamos
    };

    console.log(`\n🎲 MUDANÇA DE FASE: Entrando em [${regime.name}]`);
    console.log(`⏱️ Duração: ${(state.durationMs/1000).toFixed(0)}s`);
}

// ============================================================================
// 🚀 LOOP PRINCIPAL (TICK)
// ============================================================================
async function quantumTick() {
    try {
        // 1. Obter Preço Atual
        const res = await axios.get(`${CONFIG.API_URL}/exchange/quote`, { 
            headers: { 'x-bot-secret': CONFIG.SECRET } 
        });

        // 🔥 DEBUG E CORREÇÃO AQUI
        // Se a API não devolver { price: 123 }, usamos um fallback seguro (50.0)
        let currentPrice = res.data.price;

        if (currentPrice === undefined || currentPrice === null) {
            console.warn("⚠️ API retornou preço nulo. Usando fallback (50.0). Resposta:", res.data);
            currentPrice = 50.0; // Preço base do sistema
        }

        // Garante que é número para o toFixed não quebrar
        currentPrice = Number(currentPrice);

        // 2. Verifica Tempo do Regime
        const now = Date.now();
        const elapsed = now - state.startTime;
        const progress = Math.min(elapsed / state.durationMs, 1.0);

        if (elapsed >= state.durationMs) {
            pickNewRegime();
            return; // Pula um tick para recalibrar
        }

        const regime = REGIMES[state.currentRegimeId];

        // 3. Define a Direção (Drift Control)
        // A cada tick, decidimos a direção baseada na probabilidade global
        const bullProb = getBullishProbability(currentPrice);
        const isBullishTick = Math.random() < bullProb;
        
        // Trap Mode: Inverte direção no meio do caminho
        let direction = isBullishTick ? 1 : -1;
        if (regime.mode === 'trap') {
            if (progress > 0.5) direction *= -1; // A armadilha dispara
        }

        // 4. Calcula Intensidade (Física)
        // O quanto queremos mover o preço?
        const currentDrift = interpolate(state.startParams.drift, state.endParams.drift, progress, regime.curve);
        const currentNoise = state.startParams.noise; // Simplificado

        // Força = Drift + Ruído
        // Drift é a intenção direcional. Ruído é a volatilidade.
        const noiseVal = gaussian(0, currentNoise);
        const force = (currentDrift * direction) + noiseVal;

        // 5. Decisão de Trade
        // Se force > 0 -> Compra. Se force < 0 -> Venda.
        const action = force > 0 ? 'buy' : 'sell';
        
        // O tamanho da mão depende da magnitude da força
        // Força bruta geralmente é pequena (ex: 0.02). Multiplicamos para dar volume.
        let amount = Math.ceil(Math.abs(force) * 100); 
        amount = Math.max(amount, CONFIG.BASE_HAND); // Mínimo
        amount = Math.min(amount, 10); // Trava de segurança por ordem

        // 6. Execução
        console.log(`[${regime.name}] P: ${(progress*100).toFixed(0)}% | $${currentPrice.toFixed(2)} | Chance Bull: ${(bullProb*100).toFixed(1)}% | Força: ${force.toFixed(4)}`);
        
        await axios.post(`${CONFIG.API_URL}/exchange/trade`, {
            action: action,
            amount: amount
        }, { headers: { 'x-bot-secret': CONFIG.SECRET } });

        const icon = action === 'buy' ? '🟩' : '🟥';
        // process.stdout.write(icon); // Visual minimalista se preferir

    } catch (error) {
        console.error("❌ Erro no Tick:", error.message);
        if (error.response?.status === 403) {
            console.error("⛔ ACESSO NEGADO: Verifique se o BOT_SECRET no .env bate com o script e se o usuario 'market_maker' existe.");
        }
    }
}

// ============================================================================
// 🔥 IGNIÇÃO
// ============================================================================
console.log("🤖 INICIANDO MARKET MAKER V31 - QUANTUM DYNAMICS");
console.log(`🎯 Alvo: ${CONFIG.API_URL}`);
console.log(`🎲 Price Cap: ${CONFIG.PRICE_CAP}`);

pickNewRegime(); // Começa o primeiro ciclo
setInterval(quantumTick, CONFIG.TICK_RATE);