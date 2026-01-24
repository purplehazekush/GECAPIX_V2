import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { 
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
    XAxis, AreaChart, Area
} from 'recharts';
import { MonetizationOn, People, AccountBalance, Security, TrendingUp, History } from '@mui/icons-material';
import UserAvatar from '../../components/arena/UserAvatar';

export default function Tokenomics() {
    const [liveData, setLiveData] = useState<any>(null);
    const [historyData, setHistoryData] = useState<any[]>([]);

    useEffect(() => {
        // Carrega dados em paralelo
        Promise.all([
            api.get('/tokenomics'),
            api.get('/tokenomics/history')
        ]).then(([resLive, resHist]) => {
            setLiveData(resLive.data);
            setHistoryData(resHist.data);
        });
    }, []);

    if (!liveData) return <div className="p-10 text-center animate-pulse text-cyan-500 font-mono">SINCRONIZANDO LEDGER...</div>;

    const pieData = [
        { name: 'Circulante (Alunos)', value: liveData.circulating },
        { name: 'Tesouro (Admin)', value: liveData.treasury }
    ];
    const COLORS = ['#22d3ee', '#6366f1'];

    return (
        <div className="pb-24 p-4 animate-fade-in space-y-6">
            <header>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Tokenomics</h2>
                <p className="text-xs text-slate-500 font-bold uppercase flex items-center gap-1">
                    <Security sx={{ fontSize: 12 }} /> Dados On-Chain em Tempo Real
                </p>
            </header>

            {/* KPI CARDS */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-2 opacity-10"><MonetizationOn sx={{ fontSize: 40 }}/></div>
                    <div className="text-slate-500 text-[10px] font-bold uppercase mb-1">Supply Total</div>
                    <div className="text-xl font-black text-white font-mono">{liveData.supply.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-2 opacity-10"><People sx={{ fontSize: 40 }}/></div>
                    <div className="text-slate-500 text-[10px] font-bold uppercase mb-1">Holders</div>
                    <div className="text-xl font-black text-white font-mono">{liveData.holders}</div>
                </div>
            </div>

            {/* GRÁFICO HISTÓRICO (M1 - MONEY SUPPLY) */}
            <div className="glass-panel p-4 rounded-3xl border border-white/10 shadow-xl">
                <h3 className="text-white font-bold text-sm uppercase mb-4 flex items-center gap-2">
                    <TrendingUp className="text-emerald-400"/> Evolução da Massa Monetária (M1)
                </h3>
                <div className="h-48 w-full">
                    {historyData.length > 0 ? (
                        <ResponsiveContainer>
                            <AreaChart data={historyData}>
                                <defs>
                                    <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="data" 
                                    tickFormatter={(d) => new Date(d).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                                    stroke="#475569" 
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px' }}
                                    itemStyle={{ color: '#22d3ee', fontSize: '12px' }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '5px' }}
                                    formatter={(value: any) => [`${value}`, 'Coins']}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="circulating_supply" 
                                    stroke="#22d3ee" 
                                    fillOpacity={1} 
                                    fill="url(#colorSupply)" 
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-500">
                            Aguardando fechamento diário das 21h...
                        </div>
                    )}
                </div>
            </div>

            {/* DISTRIBUIÇÃO PIZZA */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10">
                <h3 className="text-white font-bold text-sm uppercase mb-4 flex items-center gap-2">
                    <AccountBalance className="text-indigo-400"/> Distribuição de Riqueza
                </h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {pieData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px' }}
                                itemStyle={{ color: '#fff', fontSize: '12px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-cyan-400"></div> Circulante
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Tesouro
                    </div>
                </div>
            </div>

            {/* TOP HOLDERS */}
            <div>
                <h3 className="text-white font-bold text-sm uppercase mb-3 ml-2 flex items-center gap-2">
                    <History sx={{ fontSize: 16 }} className="text-yellow-500"/> Top 10 Baleias
                </h3>
                <div className="space-y-2">
                    {liveData.whales.map((whale: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className={`font-mono font-bold w-4 text-center ${idx < 3 ? 'text-yellow-400' : 'text-slate-600'}`}>
                                    {idx + 1}
                                </span>
                                <UserAvatar user={whale} size="sm" />
                                <div>
                                    <p className="text-xs font-bold text-white">{whale.nome.split(' ')[0]}</p>
                                    <p className="text-[9px] text-slate-500 uppercase">{whale.classe || 'Novato'}</p>
                                </div>
                            </div>
                            <div className="font-mono font-bold text-emerald-400 text-xs">
                                {whale.saldo_coins.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}