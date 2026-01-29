import { useState } from 'react';
import { api } from '../../lib/api';
import { TradingChart } from '../../components/arena/TradingChart';
import { Science, PlayArrow, Speed, Tune, TrendingUp } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

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

type AttributeKey = keyof typeof DEFAULT_CONFIG.ATTRIBUTES;

export default function MarketLab() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [days, setDays] = useState(30);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // NOVO COMPONENTE: RawInput (Sem slider, sem frescura)
    const RawInput = ({ label, value, onChange, step = "any" }: any) => {
        // Estado local para permitir digitar "0." ou "0," sem o React forçar re-render imediato
        const [localVal, setLocalVal] = useState(value.toString());

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;
            setLocalVal(raw); // Atualiza visualmente o que você digita

            // Só manda pro estado global se for um número válido
            const parsed = parseFloat(raw.replace(',', '.')); // Aceita vírgula ou ponto
            if (!isNaN(parsed)) {
                onChange(parsed);
            }
        };

        return (
            <div className="mb-3">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 block">
                    {label}
                </label>
                
                <input 
                    type="text" // Usamos text para aceitar vírgula/ponto livremente enquanto digita
                    value={localVal}
                    onChange={handleChange}
                    onBlur={() => setLocalVal(value.toString())} // Formata bonitinho quando sai do campo
                    className="w-full bg-black border border-slate-800 rounded px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:bg-slate-950 outline-none transition-colors"
                    placeholder="0.00"
                />
            </div>
        );
    };

    const AttributeGroup = ({ title, attrKey, icon }: { title: string, attrKey: AttributeKey, icon: any }) => {
        const attr = config.ATTRIBUTES[attrKey];
        
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
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    {icon}
                    <p className="text-xs font-black text-slate-200 uppercase tracking-widest">{title}</p>
                </div>
                
                <div className="space-y-4">
                    {/* Bloco Comportamental */}
                    <div className="grid grid-cols-2 gap-3">
                        <RawInput 
                            label="MÉDIA (Mean)" 
                            value={attr.MEAN} 
                            onChange={(v:number) => update('MEAN', v)} 
                        />
                        <RawInput 
                            label="DESVIO (Dev)" 
                            value={attr.DEV} 
                            onChange={(v:number) => update('DEV', v)} 
                        />
                    </div>

                    {/* Bloco de Limites */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                        <RawInput 
                            label="MÍNIMO" 
                            value={attr.MIN} 
                            onChange={(v:number) => update('MIN', v)} 
                        />
                        <RawInput 
                            label="MÁXIMO" 
                            value={attr.MAX} 
                            onChange={(v:number) => update('MAX', v)} 
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
                        className="w-16 bg-transparent text-center text-xl font-black text-white outline-none"
                    />
                </div>
            </div>

            {/* PAINEL DE CONTROLE - INPUTS LIVRES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <AttributeGroup 
                    title="Viés Direcional (Bullish Bias)" 
                    attrKey="BULLISH_BIAS" 
                    icon={<TrendingUp className="text-emerald-400" fontSize="small"/>}
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
                        <span className="tracking-widest">EXECUTAR SIMULAÇÃO</span>
                    </>
                )}
            </button>

            {/* RESULTADOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[0, 1, 2, 3].map((idx) => {
                    const sim = results[idx];
                    return (
                        <div key={idx} className="bg-black border border-slate-800 rounded-2xl overflow-hidden relative h-[350px] shadow-2xl">
                            <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-3 bg-gradient-to-b from-black/80 to-transparent">
                                <span className="text-[10px] font-black text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">CENÁRIO #{idx + 1}</span>
                                {sim && (
                                    <p className={`text-sm font-mono font-bold ${sim.finalPrice >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        ${sim.finalPrice.toFixed(2)}
                                    </p>
                                )}
                            </div>

                            {sim && sim.candles.length > 0 ? (
                                <TradingChart 
                                    key={`chart-${idx}-${sim.finalPrice}`} 
                                    data={sim.candles}
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