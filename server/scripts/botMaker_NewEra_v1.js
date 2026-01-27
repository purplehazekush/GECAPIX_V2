const axios = require('axios');
require('dotenv').config({ path: '../.env' });

// ============================================================================
// 🎛️  CENTRAL DE CONTROLE (MENTE DO BOT)
// ============================================================================
const CONFIG = {
    API_URL: 'http://72.62.87.8:3001/api', // Ajuste para localhost se precisar
    SECRET: process.env.BOT_SECRET,
    TRADE_INTERVAL_MS: 5000, // Opera a cada 5 segundos
    
    // A cada 15 minutos, o bot muda de "humor"
    RECALIBRATION_MINUTES: 15, 

    // PERSONALIDADE DINÂMICA (CURVA DE SINO)
    ATTRIBUTES: {
        // Vantagem natural para compra.
        // MEAN 0.01 = 51% chance de compra (Levemente Bullish).
        BULLISH_BIAS: { MEAN: 0.01, DEV: 0.005, MIN: -0.01, MAX: 0.04 },

        // O quão agressivo ele reage se o preço sair da meta.
        // MEAN 0.03 = Reação moderada.
        VOLATILITY_DAMPENER: { MEAN: 0.03, DEV: 0.01, MIN: 0.005, MAX: 0.08 },

        // Inflação da Meta (Quanto a meta de supply sobe por tick).
        // MEAN 0.001 = Sobe devagar e sempre.
        DRIFT_RATE: { MEAN: 0.001, DEV: 0.0005, MIN: -0.0005, MAX: 0.003 } 
    },

    // Tamanho da mão (Quantos GLUEs por trade)
    HAND_SIZE: { MIN: 1, MAX: 3 }
};

// ============================================================================
// 🧠  MATEMÁTICA (TRANSFORMADA DE BOX-MULLER)
// ============================================================================

// Gera número aleatório com distribuição normal (Sino)
function gaussianRandom(mean, stdev) {
    const u = 1 - Math.random(); // Converter [0,1) para (0,1]
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

// Trava de segurança (Clamp)
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

// Rola os dados para um atributo específico
function rollAttribute(key) {
    const attr = CONFIG.ATTRIBUTES[key];
    const rawValue = gaussianRandom(attr.MEAN, attr.DEV);
    return clamp(rawValue, attr.MIN, attr.MAX);
}

// ============================================================================
// 🤖  ESTADO E EXECUÇÃO
// ============================================================================

// Estado Atual (Personalidade do momento)
let currentPersonality = {
    bullishBias: CONFIG.ATTRIBUTES.BULLISH_BIAS.MEAN,
    dampener: CONFIG.ATTRIBUTES.VOLATILITY_DAMPENER.MEAN,
    driftRate: CONFIG.ATTRIBUTES.DRIFT_RATE.MEAN
};

// Memória de Longo Prazo (A Meta do Supply)
let marketMemory = {
    targetSupply: null
};

// --- FUNÇÃO 1: RECALIBRAR (Mudar de Humor) ---
function recalibrateBot() {
    console.log(`\n🎲 ------------------------------------------`);
    console.log(`🎲 RECALIBRANDO PERSONALIDADE (Sorteio Normal)...`);
    
    currentPersonality.bullishBias = rollAttribute('BULLISH_BIAS');
    currentPersonality.dampener = rollAttribute('VOLATILITY_DAMPENER');
    currentPersonality.driftRate = rollAttribute('DRIFT_RATE');

    console.log(`🎲 NOVO HUMOR DEFINIDO:`);
    console.log(`   ➤ Viés (Bias): ${(currentPersonality.bullishBias * 100).toFixed(2)}%`);
    console.log(`   ➤ Reatividade (Dampener): ${currentPersonality.dampener.toFixed(3)}`);
    console.log(`   ➤ Ambição (Drift): ${currentPersonality.driftRate.toFixed(4)}`);
    console.log(`🎲 ------------------------------------------\n`);
}

// --- FUNÇÃO 2: LER O MERCADO ---
async function getMarketData() {
    try {
        // Tenta pegar dados via rota admin para garantir precisão
        const res = await axios.get(`${CONFIG.API_URL}/exchange/admin`, { 
             headers: { 'x-bot-secret': CONFIG.SECRET }
        });
        return res.data;
    } catch (e) {
        console.error("⚠️ Erro de conexão:", e.message);
        return null;
    }
}

// --- FUNÇÃO 3: LOOP PRINCIPAL ---
async function runBot() {
    console.log("🤖 BOT MARKET MAKER V3: ONLINE");
    console.log(`📅 Recalibragem a cada ${CONFIG.RECALIBRATION_MINUTES} min.`);

    // 1. Inicialização e Calibragem da Meta
    const initialData = await getMarketData();
    if (initialData) {
        marketMemory.targetSupply = initialData.circulatingSupply;
        console.log(`🎯 Meta Inicial de Supply: ${marketMemory.targetSupply.toFixed(2)} GLUE`);
    } else {
        console.log("❌ Falha crítica: Não foi possível ler o supply inicial.");
        return;
    }

    // 2. Define a primeira personalidade
    recalibrateBot();

    // 3. Agendar Recalibragem
    setInterval(recalibrateBot, CONFIG.RECALIBRATION_MINUTES * 60 * 1000);

    // 4. Loop de Trading
    setInterval(async () => {
        const market = await getMarketData();
        if (!market) return;

        const currentSupply = market.circulatingSupply;

        // A. Atualiza a Meta (Drift)
        marketMemory.targetSupply += currentPersonality.driftRate;

        // B. Calcula o Gap (Diferença entre Meta e Realidade)
        // Gap Positivo = Supply está baixo (Preço barato) -> Bot quer comprar
        // Gap Negativo = Supply está alto (Preço caro) -> Bot quer vender
        const gap = marketMemory.targetSupply - currentSupply;

        // C. Calcula Probabilidade Final
        // Base (50%) + Viés + (Força do Gap)
        let rawProb = 0.50 + currentPersonality.bullishBias + (gap * currentPersonality.dampener);
        
        // D. Travas de Segurança (Nunca 0% nem 100%)
        let buyProbability = clamp(rawProb, 0.05, 0.95);

        // E. Decisão do Dado
        const isBuying = Math.random() < buyProbability;
        
        // F. Tamanho da Mão Dinâmico
        let amount = Math.floor(Math.random() * CONFIG.HAND_SIZE.MAX) + CONFIG.HAND_SIZE.MIN;
        
        // Se o mercado estiver muito descolado da meta, o bot dobra a mão para corrigir
        if (Math.abs(gap) > 10) {
            amount = Math.ceil(amount * 1.5);
            // console.log("⚠️ GAP ALTO: Aumentando tamanho da mão.");
        }

        // Logs para Debug Visual
        const icon = isBuying ? '🟩' : '🟥';
        const gapStr = gap > 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2);
        
        // console.log(`Stats: Meta ${marketMemory.targetSupply.toFixed(1)} | Real ${currentSupply.toFixed(1)} | Gap ${gapStr}`);
        // console.log(`Prob Compra: ${(buyProbability*100).toFixed(1)}% | Ação: ${isBuying ? 'COMPRA' : 'VENDA'} ${amount}`);

        // G. Execução do Trade
        try {
            await axios.post(`${CONFIG.API_URL}/exchange/trade`, {
                action: isBuying ? 'buy' : 'sell',
                amount: amount
            }, { headers: { 'x-bot-secret': CONFIG.SECRET } });
            
            // Output Minimalista no Console (Tipo Matrix)
            process.stdout.write(icon); 
        } catch (err) {
            process.stdout.write('❌');
            // console.error(err.message);
        }

    }, CONFIG.TRADE_INTERVAL_MS);
}

runBot();