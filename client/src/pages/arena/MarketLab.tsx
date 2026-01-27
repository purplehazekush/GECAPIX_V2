import { useState } from 'react';
import { api } from '../../lib/api';
import { TradingChart } from '../../components/arena/TradingChart';
import { Science, PlayArrow, Refresh, Assessment, Speed } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

// Configuração Padrão (Cópia exata do seu bot)
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

export default function MarketLab() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [days, setDays] = useState(30); // Dias para simular
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Novo Estado para Stats (Monte Carlo)
    const [stats, setStats] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    // Função para chamar a Simulação Visual (4 Gráficos)
    const runSimulation = async () => {
        setLoading(true);
        try {
            // Pede 4 simulações de uma vez
            const res = await api.post('/exchange/simulate', { 
                config, 
                days, 
                simulations: 4 
            });
            // Ajusta o time para o gráfico aceitar (segundos timestamp fake para evitar sobreposição se rodar várias vezes)
            // Na verdade, o backend já deve mandar um time coerente, mas aqui garantimos unicidade se precisar
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

    // Função para chamar a Super Simulação (Monte Carlo)
    const runMonteCarlo = async () => {
        setStatsLoading(true);
        try {
            const res = await api.post('/exchange/simulate-stats', { 
                config, 
                days, 
                iterations: 5000 // 5k é um bom número pra não travar por 10s
            });
            setStats(res.data);
        } catch (e) {
            console.error(e);
            alert("Erro na simulação estatística");
        } finally {
            setStatsLoading(false);
        }
    };

    // Componente de Cartão de Estatística
    const StatCard = ({ label, value, sub, color = "text-white" }: any) => (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center text-center shadow-lg">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">{label}</span>
            <span className={`text-2xl font-black font-mono ${color}`}>{typeof value === 'number' ? value.toFixed(2) : value}</span>
            {sub && <span className="text-[9px] text-slate-600 mt-1">{sub}</span>}
        </div>
    );

    // Sub-componente para Input Numérico
    const NumInput = ({ label, value, onChange, step = 0.001 }: any) => (
        <div>
            <label className="text-[8px] text-slate-500 font-bold uppercase">{label}</label>
            <input 
                type="number" step={step} value={value} 
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full bg-black border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:border-purple-500 outline-none"
            />
        </div>
    );

    // Sub-componente para Grupo de Atributos
    const AttributeGroup = ({ title, attrKey }: { title: string, attrKey: keyof typeof DEFAULT_CONFIG.ATTRIBUTES }) => {
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
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <p className="text-[10px] font-black text-cyan-400 uppercase mb-2 border-b border-white/5 pb-1">{title}</p>
                <div className="grid grid-cols-2 gap-2">
                    <NumInput label="MÉDIA (Mean)" value={attr.MEAN} onChange={(v:number) => update('MEAN', v)} />
                    <NumInput label="DESVIO (Dev)" value={attr.DEV} onChange={(v:number) => update('DEV', v)} />
                    <NumInput label="MÍNIMO" value={attr.MIN} onChange={(v:number) => update('MIN', v)} />
                    <NumInput label="MÁXIMO" value={attr.MAX} onChange={(v:number) => update('MAX', v)} />
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 pb-32 max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* HEADER */}
            <div className="flex justify-between items-end">
                <div className="flex items-center gap-3">
                    <Science className="text-purple-500 text-4xl"/>
                    <div>
                        <h1 className="text-2xl font-black text-white italic uppercase leading-none">Market Lab</h1>
                        <p className="text-xs text-slate-400">Simulador de Caos & Probabilidade</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Duração (Dias)</span>
                    <input 
                        type="number" value={days} onChange={e => setDays(Number(e.target.value))} 
                        className="w-16 bg-black border border-slate-700 rounded text-center text-white font-bold"
                    />
                </div>
            </div>

            {/* PAINEL DE CONTROLE (INPUTS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <AttributeGroup title="🐂 Bullish Bias (Viés de Alta)" attrKey="BULLISH_BIAS" />
                <AttributeGroup title="📉 Volatility Dampener (Elástico)" attrKey="VOLATILITY_DAMPENER" />
                <AttributeGroup title="🎈 Drift Rate (Inflação Meta)" attrKey="DRIFT_RATE" />
            </div>

            {/* ÁREA DE TESTE RÁPIDO (GRÁFICOS) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Speed className="text-cyan-500" />
                    <h2 className="text-sm font-bold text-white uppercase">Visualização (4 Amostras)</h2>
                </div>
                
                <button 
                    onClick={runSimulation}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                    {loading ? <CircularProgress size={20} color="inherit" /> : <><PlayArrow/> RODAR 4 CENÁRIOS PARALELOS ({days} DIAS)</>}
                </button>

                {/* RESULTADOS (GRID DE 4 GRÁFICOS) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1, 2, 3].map((idx) => {
                        const sim = results[idx];
                        return (
                            <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative h-[300px]">
                                {/* Overlay de Info */}
                                <div className="absolute top-2 left-2 z-10 bg-black/50 backdrop-blur px-2 py-1 rounded border border-white/10">
                                    <p className="text-[10px] text-slate-300 font-mono">
                                        SIMULAÇÃO #{idx + 1}
                                    </p>
                                    {sim && (
                                        <p className={`text-xs font-bold ${sim.finalPrice > 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            ${sim.finalPrice.toFixed(2)}
                                        </p>
                                    )}
                                </div>

                                {sim && sim.candles.length > 0 ? (
                                    <TradingChart 
                                        key={`chart-${idx}-${sim.finalPrice}`} // Força recriar
                                        data={sim.candles} 
                                        colors={{ backgroundColor: '#020617' }} 
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-700 font-black text-4xl opacity-20">
                                        <Refresh sx={{fontSize: 60}}/>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ÁREA DE TESTE MASSIVO (ESTATÍSTICA) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mt-8">
                    <Assessment className="text-emerald-500" />
                    <h2 className="text-sm font-bold text-white uppercase">Monte Carlo (5.000 Simulações)</h2>
                </div>
                
                <button 
                    onClick={runMonteCarlo}
                    disabled={statsLoading}
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500 text-emerald-400 font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                >
                    {statsLoading ? <CircularProgress size={20} color="inherit"/> : "CALCULAR PROBABILIDADES MATEMÁTICAS"}
                </button>

                {stats && (
                    <div className="animate-slide-up space-y-4">
                        <div className="bg-black/40 border border-slate-800 rounded-2xl p-4 text-center">
                            <p className="text-xs text-slate-400 mb-2">Preço Inicial: <strong className="text-white">${stats.initialPrice.toFixed(2)}</strong></p>
                            
                            {/* Barra de Progresso Win Rate */}
                            <div className="relative h-6 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                                <div 
                                    className={`absolute left-0 top-0 bottom-0 flex items-center justify-center text-[10px] font-black text-black transition-all ${stats.winRate > 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                    style={{ width: `${stats.winRate}%` }}
                                >
                                    CHANCE DE ALTA: {stats.winRate.toFixed(1)}%
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard 
                                label="Média Final" 
                                value={stats.avgPrice} 
                                color={stats.avgPrice > stats.initialPrice ? "text-emerald-400" : "text-rose-400"} 
                                sub="Esperado"
                            />
                            <StatCard 
                                label="Pior Caso (5%)" 
                                value={stats.p05Price} 
                                color="text-rose-500" 
                                sub="Suporte Crítico"
                            />
                            <StatCard 
                                label="Melhor Caso (5%)" 
                                value={stats.p95Price} 
                                color="text-emerald-500" 
                                sub="Resistência"
                            />
                            <StatCard 
                                label="Mediana" 
                                value={stats.medianPrice} 
                                color="text-yellow-400" 
                                sub="Mais Provável"
                            />
                        </div>
                        
                        <div className="flex justify-between px-2 text-[9px] text-slate-500 font-mono">
                            <span>Min Absoluto: ${stats.minPrice.toFixed(2)}</span>
                            <span>Max Absoluto: ${stats.maxPrice.toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}