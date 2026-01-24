import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { MonetizationOn, People, AccountBalance, Security } from '@mui/icons-material';
import UserAvatar from '../../components/arena/UserAvatar';

export default function Tokenomics() {
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        api.get('/tokenomics').then(res => setData(res.data));
    }, []);

    if (!data) return <div className="p-10 text-center animate-pulse text-cyan-500 font-mono">CARREGANDO BLOCKCHAIN...</div>;

    const pieData = [
        { name: 'Circulante (Alunos)', value: data.circulating },
        { name: 'Tesouro (Admin)', value: data.treasury }
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
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                        <MonetizationOn sx={{ fontSize: 12 }} /> Supply Total
                    </div>
                    <div className="text-xl font-black text-white font-mono">{data.supply.toLocaleString()} $GC</div>
                </div>
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                        <People sx={{ fontSize: 12 }} /> Holders
                    </div>
                    <div className="text-xl font-black text-white font-mono">{data.holders}</div>
                </div>
            </div>

            {/* DISTRIBUIÇÃO */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10">
                <h3 className="text-white font-bold text-sm uppercase mb-4 flex items-center gap-2">
                    <AccountBalance className="text-indigo-400"/> Distribuição
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

            {/* TOP HOLDERS (WHALES) */}
            <div>
                <h3 className="text-white font-bold text-sm uppercase mb-3 ml-2">Top 10 Baleias 🐳</h3>
                <div className="space-y-2">
                    {data.whales.map((whale: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-slate-600 font-bold w-4 text-center">{idx + 1}</span>
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