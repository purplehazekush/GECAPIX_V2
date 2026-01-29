import { useState } from 'react';
import { api } from '../../lib/api';
import { TradingChart } from '../../components/arena/TradingChart';
import { Science, PlayArrow, Speed, Tune } from '@mui/icons-material'; // Removidos imports não usados
import { CircularProgress } from '@mui/material'; // Removido Tooltip não usado

// Configuração Padrão
const DEFAULT_CONFIG = {
    RECALIBRATION_MINUTES: 15,
    TRADE_INTERVAL_MS: 5000,
    HAND_SIZE: { MIN: 1, MAX: 3 },
    ATTRIBUTES: {
        BULLISH_BIAS: { MEAN: 0.01, DEV: 0.005, MIN: -0.01, MAX: 0.03 },
        VOLATILITY_DAMPENER: { MEAN: 0.03, DEV: 0.01, MIN: 0.005, MAX: 0.06 },
        DRIFT_RATE: { MEAN: 0.00, DEV: 0.01, MIN: -0.001, MAX: 0.002 }
    }
};

// 1. CORREÇÃO DE TIPAGEM: Definimos exatamente quais chaves são permitidas
type AttributeKey = keyof typeof DEFAULT_CONFIG.ATTRIBUTES;

export default function MarketLab() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [days, setDays] = useState(30);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Novo Componente: Input Híbrido (Slider + Texto)
    const SmartInput = ({ label, value, onChange, min, max, step = 0.001, color = "accent-purple-500" }: any) => {
        const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);

        return (
            <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</label>
                    <span className="text-[10px] text-slate-500 font-mono">{value.toFixed(4).replace(/\.?0+$/, '')}</span>
                </div>
                
                <div className="flex gap-2 items-center">
                    {/* O Input Numérico (Digitação Precisa) */}
                    <input 
                        type="number"
                        step={step}
                        value={value}
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        className="w-20 bg-black border border-slate-800 rounded px-2 py-1 text-xs text-white font-mono focus:border-purple-500 outline-none hover:border-slate-600 transition-colors"
                        style={{ MozAppearance: 'textfield' }} // Remove setas no Firefox
                    />
                    
                    {/* O Slider (Ajuste Visual Rápido) */}
                    <div className="relative flex-1 h-6 flex items-center">
                        <input 
                            type="range" 
                            min={min} max={max} step={step} 
                            value={value}
                            onChange={(e) => onChange(parseFloat(e.target.value))}
                            className={`w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer ${color}`}
                        />
                        {/* Indicador de Progresso Visual */}
                        <div 
                            className="absolute h-1 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg pointer-events-none" 
                            style={{ width: `${percentage}%`, top: '50%', transform: 'translateY(-50%)' }}
                        />
                    </div>
                </div>
                
                {/* CSS Inline para remover as setas chatas do input number */}
                <style>{`
                    input[type=number]::-webkit-inner-spin-button, 
                    input[type=number]::-webkit-outer-spin-button { 
                        -webkit-appearance: none; 
                        margin: 0; 
                    }
                `}</style>
            </div>
        );
    };

    // 2. CORREÇÃO DE PROPS: Tipamos attrKey corretamente
    const AttributeGroup = ({ title, attrKey, icon }: { title: string, attrKey: AttributeKey, icon: any }) => {
        const attr = config.ATTRIBUTES[attrKey];
        
        const getLimits = (key: string) => {
            if (key === 'BULLISH_BIAS') return { min: -0.10, max: 0.10, step: 0.001 };
            if (key === 'VOLATILITY_DAMPENER') return { min: 0.0001, max: 0.10, step: 0.0001 };
            if (key === 'DRIFT_RATE') return { min: -0.01, max: 0.01, step: 0.0001 };
            return { min: 0, max: 1, step: 0.01 };
        };

        const limits = getLimits(attrKey);

        const update = (field: string, val: number) => {
            setConfig({
                ...config,
                ATTRIBUTES: {
                    ...config.ATTRIBUTES,
                    [attrKey]: { ...attr, [field]: val }
                }
            });
        };

        return (
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all group">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    {icon}
                    <p className="text-xs font-black text-slate-200 uppercase tracking-widest">{title}</p>
                </div>
                
                <div className="space-y-4">
                    <div className="bg-slate-950/50 p-2 rounded border border-white/5">
                        <p className="text-[9px] text-purple-400 font-bold mb-2 uppercase">Distribuição Normal (O Comportamento)</p>
                        <SmartInput 
                            label="MÉDIA (Centro da Curva)" 
                            value={attr.MEAN} 
                            onChange={(v:number) => update('MEAN', v)} 
                            min={limits.min} max={limits.max} step={limits.step}
                        />
                        <SmartInput 
                            label="DESVIO (Volatilidade da Mudança)" 
                            value={attr.DEV} 
                            onChange={(v:number) => update('DEV', v)} 
                            min={0} max={limits.max / 2} step={limits.step}
                        />
                    </div>

                    <div className="bg-slate-950/50 p-2 rounded border border-white/5">
                        <p className="text-[9px] text-blue-400 font-bold mb-2 uppercase">Limites (O Muro)</p>
                        <SmartInput 
                            label="MÍNIMO PERMITIDO" 
                            value={attr.MIN} 
                            onChange={(v:number) => update('MIN', v)} 
                            min={limits.min * 2} max={attr.MAX} step={limits.step}
                        />
                        <SmartInput 
                            label="MÁXIMO PERMITIDO" 
                            value={attr.MAX} 
                            onChange={(v:number) => update('MAX', v)} 
                            min={attr.MIN} max={limits.max * 2} step={limits.step}
                        />
                    </div>
                </div>
            </div>
        );
    };

    const runSimulation = async () => {
        setLoading(true);
        try {
            const res = await api.post('/exchange/simulate', { 
                config, days, simulations: 4 
            });
            const resultsWithKey = res.data.map((sim: any) => ({
                ...sim,
                candles: sim.candles.map((c: any) => ({...c, time: c.time as number}))
            }));
            setResults(resultsWithKey);
        } catch (e) {
            console.error(e);
            alert("Erro na simulação visual");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 pb-32 max-w-6xl mx-auto space-y-8 animate-fade-in bg-[#0B0C10] min-h-screen text-slate-200">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-900/20 rounded-2xl border border-purple-500/30">
                        <Science className="text-purple-400 text-3xl"/>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Market Lab <span className="text-purple-500">V6</span></h1>
                        <p className="text-xs text-slate-400 font-mono">Física de Mercado & Simulação de Monte Carlo</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-900 p-1 pr-4 rounded-xl border border-slate-800">
                    <div className="bg-black px-3 py-2 rounded-lg border border-slate-800">
                        <span className="text-xs font-bold text-slate-500">DIAS</span>
                    </div>
                    <input 
                        type="number" value={days} onChange={e => setDays(Number(e.target.value))} 
                        className="w-12 bg-transparent text-center text-xl font-black text-white outline-none"
                    />
                </div>
            </div>

            {/* PAINEL DE CONTROLE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <AttributeGroup 
                    title="Viés Direcional (Bullish Bias)" 
                    attrKey="BULLISH_BIAS" 
                    icon={<TrendingUpIcon className="text-emerald-400" fontSize="small"/>}
                />
                <AttributeGroup 
                    title="Elástico (Dampener)" 
                    attrKey="VOLATILITY_DAMPENER" 
                    icon={<Tune className="text-blue-400" fontSize="small"/>}
                />
                <AttributeGroup 
                    title="Inflação (Drift Rate)" 
                    attrKey="DRIFT_RATE" 
                    icon={<Speed className="text-rose-400" fontSize="small"/>}
                />
            </div>

            {/* BOTÃO DE AÇÃO */}
            <button 
                onClick={runSimulation}
                disabled={loading}
                className="group relative w-full bg-slate-900 hover:bg-slate-800 border border-purple-500/30 hover:border-purple-500 text-white font-black py-6 rounded-2xl flex items-center justify-center gap-3 transition-all overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"/>
                {loading ? <CircularProgress size={24} color="inherit" /> : (
                    <>
                        <PlayArrow className="text-purple-400 group-hover:scale-125 transition-transform"/> 
                        <span className="tracking-widest">EXECUTAR SIMULAÇÃO PARALELA (4 THREADS)</span>
                    </>
                )}
            </button>

            {/* RESULTADOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[0, 1, 2, 3].map((idx) => {
                    const sim = results[idx];
                    return (
                        <div key={idx} className="bg-black border border-slate-800 rounded-2xl overflow-hidden relative h-[350px] shadow-2xl">
                            {/* Header do Gráfico */}
                            <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-3 bg-gradient-to-b from-black/80 to-transparent">
                                <span className="text-[10px] font-black text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">CENÁRIO #{idx + 1}</span>
                                {sim && (
                                    <div className="flex gap-4">
                                        <div className="text-right">
                                            <p className="text-[9px] text-slate-500 uppercase">Preço Final</p>
                                            <p className={`text-sm font-mono font-bold ${sim.finalPrice >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                ${sim.finalPrice.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {sim && sim.candles.length > 0 ? (
                                <TradingChart 
                                    key={`chart-${idx}-${sim.finalPrice}`} 
                                    data={sim.candles}
                                    // 3. CORREÇÃO DE PROPS: Removemos 'gridColor' que causava erro
                                    colors={{ backgroundColor: '#000000' }} 
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-800 gap-4">
                                    <Science sx={{fontSize: 60}}/>
                                    <span className="text-xs font-bold tracking-widest uppercase">Aguardando Input</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Ícone Auxiliar (Se não tiver importado)
const TrendingUpIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);