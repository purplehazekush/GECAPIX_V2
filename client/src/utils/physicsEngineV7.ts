// src/utils/physicsEngineV7.ts



/*

export interface PhysicsParams {
  drift: number;          // Tendência direcional (-0.01 a 0.01)
  dampening: number;      // Força elástica/Amortecimento (0.0 a 0.5)
  insensitiveness: number;// Chance de Caos/Dedo Gordo (0.0 a 0.1)
  noise: number;          // Ruído de mercado padrão (0.0 a 1.0)
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Gerador Gaussiano (Box-Muller) para movimentos orgânicos
function randomNormal(mean = 0, stdev = 1) {
    const u = 1 - Math.random(); 
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return z * stdev + mean;
}

export const generateSyntheticBatch = (params: PhysicsParams, candleCount: number = 200): CandleData[] => {
    let price = 1000; // Preço inicial fixo para calibração
    const data: CandleData[] = [];
    
    // Resolução da Microestrutura (50 ticks por candle de 1 min)
    const TICKS_PER_CANDLE = 50; 
    const BASE_VOL = 10;
    
    let currentTime = Date.now();

    for (let i = 0; i < candleCount; i++) {
        let o = price, h = price, l = price, c = price, v = 0;

        for (let t = 0; t < TICKS_PER_CANDLE; t++) {
            // --- 1. A FÍSICA DE FLUIDOS (Drift + Dampening) ---
            
            // O preço "alvo" se move com o drift
            const targetPriceStep = price * (1 + params.drift);
            
            // O dampening define o quão "preso" ao alvo o preço está.
            // Dampening ALTO = Preço comportado. Dampening BAIXO = Preço elástico/solto.
            const force = (targetPriceStep - price) * params.dampening;
            
            // Aplica a força + Ruído natural
            price += force + randomNormal(0, 0.5 * params.noise);

            // --- 2. O FATOR CAOS (Insensitiveness) ---
            // Simula liquidez oculta, stop hunts e fat fingers
            
            if (Math.random() < params.insensitiveness) {
                // Direção do Evento (Aleatório ou contra a tendência imediata)
                const fatDir = Math.random() > 0.5 ? 1 : -1;
                
                // Magnitude do evento (Escala Logarítmica para evitar explosão matemática)
                const fatSize = BASE_VOL * (5 + Math.random() * 20); // 5x a 25x o volume normal
                const impact = Math.log1p(fatSize) * 0.02 * fatDir; // Impacto no preço
                
                const spikePrice = price * (1 + impact);

                // Atualiza sombras extremas instantaneamente
                if (spikePrice > h) h = spikePrice;
                if (spikePrice < l) l = spikePrice;

                // REJEIÇÃO / MEAN REVERSION
                // O mercado fecha a arbitragem rapidamente.
                // Retorna 80% a 95% do movimento do spike
                const rejection = impact * (0.80 + Math.random() * 0.15);
                price = spikePrice * (1 - rejection);
                
                v += fatSize;
            } else {
                v += Math.abs(randomNormal(1, 0.5));
            }

            // Atualiza High/Low normais
            if (price > h) h = price;
            if (price < l) l = price;
        }

        c = price;
        data.push({
            time: currentTime + (i * 60 * 1000),
            open: o, high: h, low: l, close: c, volume: v
        });
    }

    return data;
};

*/

// src/utils/physicsEngineV7.ts

export interface PhysicsParams {
  drift: number;           // Tendência direcional (-0.01 a 0.01)
  dampening: number;       // Força elástica/Amortecimento (0.0 a 0.5)
  insensitiveness: number; // Chance de Caos/Dedo Gordo (0.0 a 0.1)
  noise: number;           // Ruído de mercado padrão (0.0 a 1.0)
  // --- NOVOS PARÂMETROS PARA TESTE EXPONENCIAL ---
  drift_rate?: number;     // Multiplicador do drift por candle (Ex: 0.98 para decair)
  damp_rate?: number;      // Multiplicador do dampening por candle (Ex: 0.95 para decair)
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Gerador Gaussiano (Box-Muller) para movimentos orgânicos
function randomNormal(mean = 0, stdev = 1) {
    const u = 1 - Math.random(); 
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return z * stdev + mean;
}

// src/utils/physicsEngineV7.ts

// src/utils/physicsEngineV7.ts
// src/utils/physicsEngineV7.ts

export const generateSyntheticBatch = (params: PhysicsParams, candleCount: number = 200): CandleData[] => {
    let price = 1000; 
    const data: CandleData[] = [];
    const TICKS_PER_CANDLE = 50; 
    const BASE_VOL = 10;
    let currentTime = Date.now();

    for (let i = 0; i < candleCount; i++) {
        let o = price, h = price, l = price, c = price, v = 0;

        // ========================================================
        // 🧪 GAMBIARRA: EVOLUÇÃO TEMPORAL TRÍPLICE (NORMALIZADA)
        // ========================================================
        
        // Antes:
        // const currentDrift = params.drift;
        // const currentDampening = params.dampening;
        // const currentNoise = params.noise;
        const AUX1= 1.00
        const AUX2= 1.06 //dampening subindo forte pra diminuir seu impacto.
        const AUX3 =1.005 // 1.005 ou 0.995

        // Depois (Com suporte a Decaimento/Crescimento Exponencial):
        // Use taxas como 1.02 (cresce 2%) ou 0.98 (cai 2%) por candle.
        const currentDrift     = params.drift * Math.pow(AUX1 ?? 1, i);
        const currentDampening = params.dampening * Math.pow(AUX2 ?? 1, i);
        const currentNoise     = params.noise * Math.pow(AUX3 ?? 1, i);

        // ========================================================

        for (let t = 0; t < TICKS_PER_CANDLE; t++) {
            // --- 1. A FÍSICA DE FLUIDOS (NORMALIZADA POR TICK) ---
            
            // Drift normalizado para que '0.03' signifique 3% ao final do candle total
            const driftPerTick = currentDrift / TICKS_PER_CANDLE;
            const targetPriceStep = price * (1 + driftPerTick);
            
            // Força da mola (Dampening)
            const force = (targetPriceStep - price) * currentDampening;
            
            // Movimento Natural + Ruído Evolutivo
            // Antes era: params.noise. Agora usamos currentNoise.
            price += force + randomNormal(0, (currentNoise * 0.5));

            // --- 2. O FATOR CAOS (Insensitiveness) ---
            if (Math.random() < params.insensitiveness) {
                const fatDir = Math.random() > 0.5 ? 1 : -1;
                const fatSize = BASE_VOL * (5 + Math.random() * 20); 
                const impact = Math.log1p(fatSize) * 0.02 * fatDir; 
                const spikePrice = price * (1 + impact);

                if (spikePrice > h) h = spikePrice;
                if (spikePrice < l) l = spikePrice;

                const rejection = impact * (0.80 + Math.random() * 0.15);
                price = spikePrice * (1 - rejection);
                v += fatSize;
            } else {
                v += Math.abs(randomNormal(1, 0.5));
            }

            if (price > h) h = price;
            if (price < l) l = price;
        }

        c = price;
        data.push({
            time: currentTime + (i * 60 * 1000),
            open: o, high: h, low: l, close: c, volume: v
        });
    }

    return data;
};