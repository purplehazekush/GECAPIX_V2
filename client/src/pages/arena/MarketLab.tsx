import { useState } from 'react';
import { api } from '../../lib/api';
import { ChartSection } from '../../components/arena/exchange/ChartSection';
import { Refresh, Science } from '@mui/icons-material';

export default function MarketLab() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Configurações (Default = Sua Config Atual)
    const [config, setConfig] = useState({
        biasMean: 0.01, biasDev: 0.005,
        dampenerMean: 0.03, dampenerDev: 0.01,
        driftMean: 0.002, driftDev: 0.0005,
        ticks: 500
    });

    const runSimulation = async () => {
        setLoading(true);
        try {
            const res = await api.post('/exchange/simulate', config);
            // Ajusta o time para o gráfico aceitar (segundos timestamp fake)
            const chartData = res.data.candles.map((c: any) => ({
                ...c, 
                time: Math.floor(Date.now()/1000) + c.time * 60 // Fake timestamp
            }));
            setData(chartData);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // Helper de Input
    const InputGroup = ({ label, nameMean, nameDev, step }: any) => (
        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] font-bold text-cyan-400 uppercase mb-2">{label}</p>
            <div className="flex gap-2">
                <div>
                    <label className="text-[9px] text-slate-500 block">MÉDIA</label>
                    <input 
                        type="number" step={step}
                        value={config[nameMean as keyof typeof config]}
                        onChange={e => setConfig({...config, [nameMean]: parseFloat(e.target.value)})}
                        className="w-full bg-black border border-slate-700 rounded p-1 text-white text-xs font-mono"
                    />
                </div>
                <div>
                    <label className="text-[9px] text-slate-500 block">DESVIO</label>
                    <input 
                        type="number" step={step/2}
                        value={config[nameDev as keyof typeof config]}
                        onChange={e => setConfig({...config, [nameDev]: parseFloat(e.target.value)})}
                        className="w-full bg-black border border-slate-700 rounded p-1 text-white text-xs font-mono"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-4 pb-24 max-w-lg mx-auto space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Science className="text-purple-500" fontSize="large"/>
                <h1 className="text-2xl font-black text-white italic uppercase">Market Lab</h1>
            </div>

            {/* Controles */}
            <div className="grid grid-cols-2 gap-2">
                <InputGroup label="Viés de Alta (Bias)" nameMean="biasMean" nameDev="biasDev" step={0.01} />
                <InputGroup label="Elástico (Dampener)" nameMean="dampenerMean" nameDev="dampenerDev" step={0.01} />
                <InputGroup label="Inflação (Drift)" nameMean="driftMean" nameDev="driftDev" step={0.001} />
            </div>

            <button 
                onClick={runSimulation}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
            >
                {loading ? "PROCESSANDO..." : <><Refresh/> SIMULAR 500 TICKS</>}
            </button>

            {/* Resultado */}
            <ChartSection data={data} chartLines={[]} loading={loading} />
            
            {data.length > 0 && (
                <p className="text-center text-xs text-slate-500 font-mono">
                    Simulação concluída. {data.length} candles gerados.
                </p>
            )}
        </div>
    );
}