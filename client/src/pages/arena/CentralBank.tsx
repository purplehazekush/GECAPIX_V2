// client/src/pages/arena/CentralBank.tsx
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
    AccountBalance, TrendingDown, Whatshot, 
    LockClock, InfoOutlined, MonetizationOn 
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

// Fórmulas Matemáticas (Réplica do Backend para Projeção)
const SEASON_LENGTH = 180;
const REFERRAL_A = 1459558;
const REFERRAL_K = 0.024;
const CASHBACK_BASE = 5000;

// Função para gerar dados do gráfico (Dia 0 ao 180)
const generateCurveData = (currentDay: number) => {
    const data = [];
    for (let d = 0; d <= SEASON_LENGTH; d += 5) { // Pontos a cada 5 dias
        // Curva Referral (Decaimento)
        const refVal = Math.floor(REFERRAL_A * Math.exp(-REFERRAL_K * d));
        
        // Curva Cashback (Crescimento)
        const cashVal = Math.floor(CASHBACK_BASE * Math.pow(d + 1, 1.5));
        
        data.push({
            day: d,
            Referral: refVal,
            Cashback: cashVal,
            // Marca o dia atual para o gráfico saber onde pintar diferente
            isPast: d <= currentDay
        });
    }
    return data;
};

export default function CentralBank() {
    useAuth();
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [graphData, setGraphData] = useState<any[]>([]);

    useEffect(() => {
        api.get('/tokenomics/status')
            .then(res => {
                setStatus(res.data);
                setGraphData(generateCurveData(res.data.current_day));
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center p-20"><CircularProgress color="secondary" /></div>;

    const currentReward = status?.current_referral_reward || 0;
    const nextReward = Math.floor(currentReward * 0.98); // Simulação de queda de ~2%

    return (
        <div className="pb-28 p-4 animate-fade-in space-y-6 max-w-2xl mx-auto">
            
            {/* Header */}
            <header className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-2">
                        <AccountBalance className="text-emerald-500" fontSize="large"/> Banco Central
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Política Monetária • Season {status?.season_id}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500 font-bold uppercase">Dia da Season</p>
                    <p className="text-2xl font-black text-white">#{status?.current_day} <span className="text-slate-600">/ 180</span></p>
                </div>
            </header>

            {/* TICKER DE FOMO (O PREÇO CAI AMANHÃ) */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <LockClock sx={{ fontSize: 120 }} />
                </div>
                
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                    <Whatshot className="text-orange-500" fontSize="small"/> Oportunidade do Dia
                </h3>
                
                <div className="flex items-end gap-4 relative z-10">
                    <div>
                        <p className="text-4xl font-black text-white tracking-tighter">
                            {currentReward} <span className="text-lg text-yellow-500">GC</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                            Bônus por Indicação (Hoje)
                        </p>
                    </div>

                    <div className="mb-2">
                        <div className="flex items-center gap-1 text-red-400 text-xs font-bold bg-red-900/20 px-2 py-1 rounded-lg">
                            <TrendingDown fontSize="inherit" />
                            Amanhã: ~{nextReward} GC
                        </div>
                    </div>
                </div>

                <div className="mt-4 bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                        <InfoOutlined sx={{fontSize: 12, verticalAlign: 'middle', mr: 0.5}}/>
                        A emissão de moedas é deflacionária. Quanto mais cedo você convidar amigos e participar, maior será sua recompensa. O "Halving" é diário.
                    </p>
                </div>
            </div>

            {/* GRÁFICO DE CURVAS (REFERRAL VS CASHBACK) */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-sm font-black text-white uppercase">Curvas de Liquidez</h3>
                    <div className="flex gap-3 text-[10px] font-bold">
                        <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Referral</span>
                        <span className="flex items-center gap-1 text-purple-400"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Cashback</span>
                    </div>
                </div>

                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={graphData}>
                            <defs>
                                <linearGradient id="colorRef" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                            <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickFormatter={(val) => `Dia ${val}`} />
                            <YAxis hide />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '5px' }}
                            />
                            
                            {/* Linha do Tempo Atual */}
                            <ReferenceLine x={status?.current_day} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: 'HOJE', fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' }} />

                            <Area type="monotone" dataKey="Referral" stroke="#10b981" fillOpacity={1} fill="url(#colorRef)" strokeWidth={2} />
                            <Area type="monotone" dataKey="Cashback" stroke="#a855f7" fillOpacity={1} fill="url(#colorCash)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-center text-[10px] text-slate-500 mt-2">
                    *Projeção algorítmica. Valores reais podem variar conforme demanda.
                </p>
            </div>

            {/* DADOS DO TESOURO */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Pote Referral (Hoje)</p>
                    <p className="text-xl font-black text-emerald-400 truncate">
                        {status?.referral_pool_available.toLocaleString()} <span className="text-xs">GC</span>
                    </p>
                </div>
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Pote Cashback</p>
                    <p className="text-xl font-black text-purple-400 truncate">
                        {status?.cashback_pool_available.toLocaleString()} <span className="text-xs">GC</span>
                    </p>
                </div>
            </div>

            {/* BOTÃO DE AÇÃO */}
            <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-lg shadow-emerald-900/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                <MonetizationOn /> INICIAR MINERAÇÃO SOCIAL
            </button>

        </div>
    );
}