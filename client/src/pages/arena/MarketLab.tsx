import { useState, useEffect, useCallback } from 'react';
import { TradingChart } from '../../components/arena/TradingChart';
import { Science, ContentCopy, Refresh, Waves, ShowChart, Bolt, GraphicEq } from '@mui/icons-material';
// CORREÇÃO 1: Adicionado 'type' aqui
import { generateSyntheticBatch, type PhysicsParams } from '../../utils/physicsEngineV7';

// --- PRESETS DE REGIME ---
const REGIME_PRESETS: Record<number, { name: string, params: PhysicsParams }> = {
    0: { name: 'Acumulação (Boring)', params: { drift: 0.0001, dampening: 0.15, insensitiveness: 0.001, noise: 0.2 } },
    1: { name: 'Tendência Alta', params: { drift: 0.0005, dampening: 0.05, insensitiveness: 0.002, noise: 0.3 } },
    2: { name: 'Tendência Baixa', params: { drift: -0.0005, dampening: 0.05, insensitiveness: 0.002, noise: 0.3 } },
    3: { name: 'Stop Hunt (Chop)', params: { drift: 0.0, dampening: 0.01, insensitiveness: 0.025, noise: 0.8 } },
    4: { name: 'Pump Manipulado', params: { drift: 0.0015, dampening: 0.005, insensitiveness: 0.04, noise: 0.5 } },
};

// ============================================================================
// 1. COMPONENTES DE UI
// ============================================================================

const PhysicsControl = ({ label, value, min, max, step, onChange, icon }: any) => {
    const [localText, setLocalText] = useState(value.toString());

    useEffect(() => {
        setLocalText(value.toString());
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const txt = e.target.value;
        setLocalText(txt);
        const val = parseFloat(txt.replace(',', '.'));
        if (!isNaN(val)) onChange(val);
    };

    return (
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-all group">
            <div className="flex items-center gap-2 mb-2">
                <div className="text-slate-400 group-hover:text-purple-400 transition-colors">
                    {icon}
                </div>
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex-1">
                    {label}
                </label>
                <input 
                    type="text" 
                    value={localText}
                    onChange={handleTextChange}
                    className="w-16 bg-black border border-slate-700 rounded px-2 py-1 text-xs text-right text-emerald-400 font-mono focus:border-purple-500 outline-none"
                />
            </div>
            
            <input 
                type="range" 
                min={min} max={max} step={step} 
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
            />
        </div>
    );
};

// ============================================================================
// 2. COMPONENTE PRINCIPAL (LAB V7)
// ============================================================================

export default function MarketLabV7() {
    const [params, setParams] = useState<PhysicsParams>(REGIME_PRESETS[1].params);
    const [activePreset, setActivePreset] = useState<number>(1);
    
    const [results, setResults] = useState<any[]>([]);
    // CORREÇÃO 3: Removido o setter não utilizado (setCandleCount)
    const [candleCount] = useState(300);

    const runSimulation = useCallback(() => {
        const newResults = [];
        for(let i=0; i<4; i++) {
            const candles = generateSyntheticBatch(params, candleCount);
            const startPrice = candles[0].close;
            const finalPrice = candles[candles.length - 1].close;
            const change = ((finalPrice - startPrice) / startPrice) * 100;
            
            newResults.push({
                id: i,
                candles,
                finalPrice,
                change
            });
        }
        setResults(newResults);
    }, [params, candleCount]);

    useEffect(() => {
        const timer = setTimeout(() => {
            runSimulation();
        }, 50); 
        return () => clearTimeout(timer);
    }, [runSimulation]);

    const applyPreset = (id: number) => {
        setActivePreset(id);
        setParams(REGIME_PRESETS[id].params);
    };

    const copyConfig = () => {
        navigator.clipboard.writeText(JSON.stringify(params, null, 2));
        alert("JSON copiado! Cole no 'data_factory_v7.py'");
    };

    return (
        <div className="p-6 pb-32 max-w-7xl mx-auto space-y-6 animate-fade-in bg-[#0B0C10] min-h-screen text-slate-200 font-sans">
            
            {/* HEADER & PRESETS */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-slate-800 pb-6">
                <div className="space-y-4 w-full lg:w-auto">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                            <Science className="text-purple-400"/>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white italic tracking-tighter">
                                MARKET LAB <span className="text-purple-500">V7</span>
                            </h1>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                                Calibrador de Realidade • Physics Engine
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {Object.entries(REGIME_PRESETS).map(([key, val]: any) => (
                            <button
                                key={key}
                                onClick={() => applyPreset(Number(key))}
                                className={`whitespace-nowrap px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                    activePreset === Number(key)
                                    ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                                }`}
                            >
                                {key}: {val.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={copyConfig}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 text-slate-300 rounded-lg text-xs font-bold transition-all"
                    >
                        <ContentCopy fontSize="small" /> 
                        <span>JSON</span>
                    </button>
                    <button 
                        onClick={runSimulation}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-100 hover:bg-white text-black rounded-lg text-xs font-black tracking-widest transition-all shadow-lg hover:shadow-xl hover:scale-105"
                    >
                        <Refresh fontSize="small" className={""} />
                        RE-ROLL SEED
                    </button>
                </div>
            </div>

            {/* CONTROLES FÍSICOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <PhysicsControl 
                    label="Tendência (Drift)" 
                    icon={<ShowChart fontSize="small"/>}
                    value={params.drift} 
                    min={-0.003} max={0.003} step={0.0001} 
                    onChange={(v: number) => setParams(p => ({...p, drift: v}))}
                />
                <PhysicsControl 
                    label="Amortecimento (Damp)" 
                    icon={<Waves fontSize="small"/>}
                    value={params.dampening} 
                    min={0.001} max={0.2} step={0.001} 
                    onChange={(v: number) => setParams(p => ({...p, dampening: v}))}
                />
                <PhysicsControl 
                    label="Caos (Insensitiveness)" 
                    icon={<Bolt fontSize="small"/>}
                    value={params.insensitiveness} 
                    min={0.0} max={0.1} step={0.001} 
                    onChange={(v: number) => setParams(p => ({...p, insensitiveness: v}))}
                />
                <PhysicsControl 
                    label="Ruído Base (Noise)" 
                    icon={<GraphicEq fontSize="small"/>}
                    value={params.noise} 
                    min={0.0} max={2.0} step={0.1} 
                    onChange={(v: number) => setParams(p => ({...p, noise: v}))}
                />
            </div>

            {/* RESULTADOS VISUAIS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {results.map((sim) => (
                    <div key={sim.id} className="bg-black border border-slate-800 rounded-xl overflow-hidden relative h-[300px] group hover:border-purple-500/50 transition-colors">
                        
                        <div className="absolute top-2 left-3 z-10 flex flex-col pointer-events-none">
                            <span className="text-[9px] font-black text-slate-600 uppercase">SEED #{sim.id}</span>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-lg font-mono font-bold ${sim.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {sim.change >= 0 ? '+' : ''}{sim.change.toFixed(2)}%
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">${sim.finalPrice.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity">
                            {/* CORREÇÃO 2: Removido trades e equityCurve que não existem no componente */}
                            <TradingChart 
                                data={sim.candles}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}