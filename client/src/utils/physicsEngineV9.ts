// client/src/utils/physicsEngineV9.ts
// src/utils/physicsEngineV9.ts

export interface PhysicsTrajectory {
  drift: { start: number; end: number }; // Agora definimos o INÍCIO e o FIM
  noise: { start: number; end: number };
  damp:  { start: number; end: number };
  insensitiveness: number; // Probabilidade de evento de cauda (mantive para "tempero")
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function randomNormal(mean = 0, stdev = 1) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdev + mean;
}

// Função auxiliar para calcular a taxa de crescimento necessária
function calculateRate(start: number, end: number, steps: number): number {
    // Proteção contra zero absoluto para evitar NaN no log
    const s = Math.max(start, 0.00001);
    const e = Math.max(end, 0.00001);
    return Math.pow(e / s, 1 / steps);
}

export const generateSyntheticBatchV9 = (params: PhysicsTrajectory, candleCount: number = 200): CandleData[] => {
    let price = 1000;
    const data: CandleData[] = [];
    const TICKS_PER_CANDLE = 20; // Otimizado para performance visual
    let currentTime = Date.now();

    // 1. Calcula as Taxas de Evolução (A Mágica da V9)
    const driftRate = calculateRate(params.drift.start, params.drift.end, candleCount);
    const noiseRate = calculateRate(params.noise.start, params.noise.end, candleCount);
    const dampRate  = calculateRate(params.damp.start,  params.damp.end,  candleCount);

    // Estados iniciais
    let currentDrift = params.drift.start;
    let currentNoise = params.noise.start;
    let currentDamp  = params.damp.start;

    // Direction Agnostic: Sorteia direção para visualização (50/50)
    const directionMult = Math.random() > 0.5 ? 1 : -1;

    for (let i = 0; i < candleCount; i++) {
        let o = price, h = price, l = price, c = price, v = 0;

        // 2. Evolução dos Parâmetros a cada candle
        currentDrift *= driftRate;
        currentNoise *= noiseRate;
        currentDamp  *= dampRate;

        // Clamps de segurança visual
        const safeDamp = Math.min(Math.max(currentDamp, 0.001), 0.99);
        const safeNoise = Math.max(currentNoise, 0.001);

        for (let t = 0; t < TICKS_PER_CANDLE; t++) {
            // Física de Fluidos V9
            const driftPerTick = (currentDrift * directionMult) / TICKS_PER_CANDLE;
            const targetPriceStep = price * (1 + driftPerTick);
            
            // Força Elástica (Dampening)
            const force = (targetPriceStep - price) * safeDamp;
            
            // Ruído
            const noise = randomNormal(0, safeNoise * 0.15); // 0.15 fator de escala visual

            price += force + noise;

            // Fator Caos (Insensitiveness) - Eventos raros
            if (Math.random() < params.insensitiveness) {
                 const shock = randomNormal(0, safeNoise * 5); // Choque 5x maior que o ruído atual
                 price += shock;
                 v += Math.abs(shock * 10);
            }

            if (price > h) h = price;
            if (price < l) l = price;
            v += Math.abs(noise * 100);
        }

        c = price;
        data.push({
            time: currentTime + (i * 60 * 1000),
            open: o, high: h, low: l, close: c, volume: v
        });
    }

    return data;
};