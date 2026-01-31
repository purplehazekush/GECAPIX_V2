// src/pages/Lab/MarketLabV9.tsx

import { useState, useEffect, useCallback } from 'react';
import { TradingChart } from '../../components/arena/TradingChart'; // Ajuste o import conforme seu projeto
import { Science, ContentCopy, PlayArrow, TrendingUp, BlurOn, Compress } from '@mui/icons-material';
import { generateSyntheticBatchV9, type PhysicsTrajectory } from '../../utils/physicsEngineV9';

// --- NOVOS PRESETS CIENTÍFICOS (V9) ---
const REGIME_PRESETS: Record<number, { name: string, config: PhysicsTrajectory }> = {
    0: { 
        name: 'Laminar Flow (Aceleração Limpa)', 
        config: { 
            drift: { start: 0.0005, end: 0.0080 }, 
            noise: { start: 0.50, end: 0.10 }, // O ruído limpa conforme acelera
            damp:  { start: 0.20, end: 0.05 }, // Mola solta
            insensitiveness: 0.0001
        } 
    },
    1: { 
        name: 'Turbulent Flow (Caos Acelerado)', 
        config: { 
            drift: { start: 0.0020, end: 0.0200 }, 
            noise: { start: 0.20, end: 1.50 }, // Ruído explode
            damp:  { start: 0.10, end: 0.05 }, 
            insensitiveness: 0.001
        } 
    },
    2: { 
        name: 'Compressed Spring (Preço Preso)', 
        config: { 
            drift: { start: 0.0010, end: 0.0060 }, 
            noise: { start: 0.40, end: 0.10 }, 
            damp:  { start: 0.05, end: 0.60 }, // Mola fica duríssima (Endurece)
            insensitiveness: 0.0001
        } 
    },
    4: { 
        name: 'Vacuum Decay (Morte Térmica)', 
        config: { 
            drift: { start: 0.0080, end: 0.0001 }, // Para totalmente
            noise: { start: 0.80, end: 0.05 }, // Para de vibrar
            damp:  { start: 0.20, end: 0.01 }, 
            insensitiveness: 0.00
        } 
    },
    6: { 
        name: 'Solidification (Consolidação)', 
        config: { 
            drift: { start: 0.0040, end: 0.0005 }, 
            noise: { start: 0.50, end: 0.10 }, 
            damp:  { start: 0.10, end: 0.90 }, // Trava total no final
            insensitiveness: 0.0001
        } 
    },
};

// Componente para Input de Trajetória (Start -> End)
const TrajectoryInput = ({ label, icon, startVal, endVal, onChangeStart, onChangeEnd }: any) => {
    return (
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 hover:border-purple-500/30 transition-all group">
            <div className="flex items-center gap-2 mb-2 text-slate-400 group-hover:text-purple-400">
                {icon}
                <label className="text-[10px] font-black uppercase tracking-widest">{label}</label>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-1">
                    <span className="text-[8px] text-slate-600 uppercase font-mono block mb-1">Início</span>
                    <input 
                        type="number" step="0.0001"
                        value={startVal}
                        onChange={(e) => onChangeStart(parseFloat(e.target.value))}
                        className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-sm text-emerald-400 font-mono focus:border-emerald-500 outline-none"
                    />
                </div>
                <div className="text-slate-600">→</div>
                <div className="flex-1">
                    <span className="text-[8px] text-slate-600 uppercase font-mono block mb-1">Fim (Alvo)</span>
                    <input 
                        type="number" step="0.0001"
                        value={endVal}
                        onChange={(e) => onChangeEnd(parseFloat(e.target.value))}
                        className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-sm text-purple-400 font-mono focus:border-purple-500 outline-none"
                    />
                </div>
            </div>
        </div>
    );
};

export default function MarketLabV9() {
    const [config, setConfig] = useState<PhysicsTrajectory>(REGIME_PRESETS[0].config);
    const [results, setResults] = useState<any[]>([]);
    const [activePreset, setActivePreset] = useState<number>(0);

    const runSimulation = useCallback(() => {
        const newResults = [];
        // Gera 4 exemplos para ver a variabilidade estocástica do MESMO set de parâmetros
        for(let i=0; i<4; i++) {
            const candles = generateSyntheticBatchV9(config, 500); // 500 candles por teste
            const startPrice = candles[0].close;
            const finalPrice = candles[candles.length - 1].close;
            const change = ((finalPrice - startPrice) / startPrice) * 100;
            
            newResults.push({ id: i, candles, finalPrice, change });
        }
        setResults(newResults);
    }, [config]);

    // Roda ao carregar
    useEffect(() => { runSimulation(); }, []);

    const applyPreset = (id: number) => {
        setActivePreset(id);
        setConfig(REGIME_PRESETS[id].config);
    };

    const copyJSON = () => {
        const pyDict = `
# Configuração para data_factory_v9.py
'drift': {'start': (${config.drift.start}, ${config.drift.start * 1.2}), 'target': (${config.drift.end}, ${config.drift.end * 1.2})},
'noise': {'start': (${config.noise.start}, ${config.noise.start * 1.1}), 'target': (${config.noise.end}, ${config.noise.end * 1.1})},
'damp':  {'start': (${config.damp.start}, ${config.damp.start * 1.1}), 'target': (${config.damp.end}, ${config.damp.end * 1.1})},
        `;
        navigator.clipboard.writeText(pyDict);
        alert("Configuração Python copiada!");
    };

    return (
        <div className="p-6 pb-32 max-w-7xl mx-auto space-y-8 bg-[#0B0C10] min-h-screen text-slate-200 font-sans">
            
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row justify-between items-end gap-6 border-b border-slate-800 pb-6">
                <div>
                    <h1 className="text-2xl font-black text-white italic tracking-tighter flex items-center gap-2">
                        <Science className="text-purple-500" />
                        PHASE SPACE <span className="text-purple-500">LAB V9</span>
                    </h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                        Modelagem de Variedades Topológicas • Controlled Chaos
                    </p>
                </div>
                
                {/* PRESETS */}
                <div className="flex flex-wrap gap-2 justify-end">
                    {Object.entries(REGIME_PRESETS).map(([key, val]: any) => (
                        <button
                            key={key}
                            onClick={() => applyPreset(Number(key))}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                activePreset === Number(key)
                                ? 'bg-purple-600 border-purple-500 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'
                            }`}
                        >
                            {val.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTROLES (TRAJETÓRIAS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TrajectoryInput 
                    label="Velocidade (Drift)" icon={<TrendingUp fontSize="small"/>}
                    startVal={config.drift.start} endVal={config.drift.end}
                    onChangeStart={(v: number) => setConfig(p => ({...p, drift: {...p.drift, start: v}}))}
                    onChangeEnd={(v: number) => setConfig(p => ({...p, drift: {...p.drift, end: v}}))}
                />
                <TrajectoryInput 
                    label="Entropia (Noise)" icon={<BlurOn fontSize="small"/>}
                    startVal={config.noise.start} endVal={config.noise.end}
                    onChangeStart={(v: number) => setConfig(p => ({...p, noise: {...p.noise, start: v}}))}
                    onChangeEnd={(v: number) => setConfig(p => ({...p, noise: {...p.noise, end: v}}))}
                />
                <TrajectoryInput 
                    label="Rigidez (Dampening)" icon={<Compress fontSize="small"/>}
                    startVal={config.damp.start} endVal={config.damp.end}
                    onChangeStart={(v: number) => setConfig(p => ({...p, damp: {...p.damp, start: v}}))}
                    onChangeEnd={(v: number) => setConfig(p => ({...p, damp: {...p.damp, end: v}}))}
                />
            </div>

            <div className="flex gap-4">
                <button onClick={runSimulation} className="flex-1 py-3 bg-white text-black rounded-lg font-black tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                    <PlayArrow /> SIMULAR TRAJETÓRIA TOPOLÓGICA
                </button>
                <button onClick={copyJSON} className="px-6 border border-slate-700 rounded-lg hover:border-emerald-500 hover:text-emerald-500 transition-colors" title="Copiar p/ Python">
                    <ContentCopy />
                </button>
            </div>

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {results.map((sim) => (
                    <div key={sim.id} className="bg-black border border-slate-800 rounded-xl h-[280px] relative overflow-hidden">
                         <div className="absolute top-2 left-3 z-10 pointer-events-none mix-blend-difference">
                            <span className={`text-xl font-mono font-bold ${sim.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {sim.change >= 0 ? '▲' : '▼'} {Math.abs(sim.change).toFixed(2)}%
                            </span>
                        </div>
                        <TradingChart data={sim.candles} />
                    </div>
                ))}
            </div>
        </div>
    );
}