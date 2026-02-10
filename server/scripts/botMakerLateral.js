// server/scripts/botMakerLateral.js
const axios = require('axios');
require('dotenv').config({ path: '../.env' });

// --- CONFIGURAÇÃO DO ALGORITMO ---
const CONFIG = {
    API_URL: 'http://72.62.87.8:3001/api', // Ajuste se for local
    SECRET: process.env.BOT_SECRET,
    
    // O coração do Bot
    INTERVAL_MS: 5000,          // Tenta operar a cada 5s
    BULLISH_BIAS: 0.01,         // 1% de vantagem natural para compra (Drift de Alta)
    VOLATILITY_DAMPENER: 0.01,   // Sensibilidade: Quanto maior, mais forte ele reage a desvios
    
    // Limites de Trade
    MIN_AMOUNT: 1,
    MAX_AMOUNT: 3,              // Aumentamos um pouco a mão pra ele ter força
};

// Estado Interno (Memória do Bot)
let state = {
    targetSupply: null, // Onde o bot "acha" que o supply deveria estar
    lastPrice: 0
};

// Função Auxiliar: Clamp (Limita valor entre min e max)
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

async function getMarketData() {
    try {
        // Usamos a rota de admin ou exchange para ver o supply atual
        // Se a rota publica /exchange/stats nao existir, use /exchange/admin com o secret se necessario
        // Aqui assumo que existe uma rota GET que retorna o estado atual.
        // Se não tiver rota publica, podemos usar o endpoint de admin simulando o header
        const res = await axios.get(`${CONFIG.API_URL}/exchange/admin`, {
             headers: { 'x-bot-secret': CONFIG.SECRET }
        });
        return res.data; // Espera { circulatingSupply, multiplier, basePrice ... }
    } catch (e) {
        console.error("⚠️ Erro ao ler mercado:", e.message);
        return null;
    }
}

async function runBot() {
    console.log("🤖 BOT MARKET MAKER V2: INICIADO");
    console.log("📈 Estratégia: Reversão à Média com Viés de Alta");

    // Inicialização: Pega o supply atual como o primeiro "alvo"
    const initialData = await getMarketData();
    if (initialData) {
        state.targetSupply = initialData.circulatingSupply;
        console.log(`🎯 Alvo Inicial Calibrado: ${state.targetSupply} GLUE`);
    } else {
        console.log("❌ Falha ao calibrar inicial. Abortando.");
        return;
    }

    setInterval(async () => {
        const market = await getMarketData();
        if (!market) return;

        const currentSupply = market.circulatingSupply;

        // 1. O "DRIFT" DE ALTA (A subida infinita e lenta)
        // A cada tick, o bot sobe a régua. Ele "quer" que o supply suba 0.02 a cada 5s.
        // Isso força o preço a subir organicamente ao longo do dia.
        state.targetSupply += 0.02; 

        // 2. CÁLCULO DO DESVIO (GAP)
        // Se Gap positivo: Estamos abaixo da meta (PREÇO BARATO) -> COMPRAR FORTE
        // Se Gap negativo: Estamos acima da meta (PREÇO CARO) -> VENDER (mas nem tanto)
        const gap = state.targetSupply - currentSupply;

        // 3. CÁLCULO DA PROBABILIDADE (A Mágica)
        // Começa em 50%. Soma o Viés Bullish. Soma a força do elástico (gap * sensibilidade).
        let buyProbability = 0.50 + CONFIG.BULLISH_BIAS + (gap * CONFIG.VOLATILITY_DAMPENER);

        // Trava a probabilidade entre 10% e 95% (Nunca 0 ou 100 pra parecer humano)
        buyProbability = clamp(buyProbability, 0.10, 0.95);

        // 4. DECISÃO
        const isBuying = Math.random() < buyProbability;
        
        // Quantidade Dinâmica: Se o desvio for grande, opera mais pesado
        let amount = Math.floor(Math.random() * CONFIG.MAX_AMOUNT) + CONFIG.MIN_AMOUNT;
        if (Math.abs(gap) > 10) amount += 2; // Mão pesada se o mercado descolar muito

        // Logs de Inteligência
        console.log(`\n🔍 Análise:`);
        console.log(`   Real: ${currentSupply.toFixed(2)} | Meta: ${state.targetSupply.toFixed(2)} | Gap: ${gap.toFixed(2)}`);
        console.log(`   Chance Compra: ${(buyProbability*100).toFixed(1)}% ${isBuying ? '✅' : '❌'}`);

        // 5. EXECUÇÃO
        try {
            await axios.post(`${CONFIG.API_URL}/exchange/trade`, {
                action: isBuying ? 'buy' : 'sell',
                amount: amount
            }, {
                headers: { 'x-bot-secret': CONFIG.SECRET } // AUTH DO BOT
            });
            console.log(`⚡ ORDEM: ${isBuying ? '🟢 COMPRA' : '🔴 VENDA'} de ${amount} GLUE`);
        } catch (err) {
            console.error("❌ Falha na ordem:", err.response?.data?.error || err.message);
        }

    }, CONFIG.INTERVAL_MS);
}

runBot();