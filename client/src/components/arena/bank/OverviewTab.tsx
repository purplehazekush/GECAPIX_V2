// client/src/components/arena/bank/OverviewTab.tsx
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Group } from '@mui/icons-material';
import UserAvatar from '../UserAvatar'; // Ajuste o import conforme sua estrutura

interface OverviewTabProps {
    status: any;
    tokenomics: any;
}

const PIE_COLORS = ['#22d3ee', '#6366f1'];

export const OverviewTab = ({ status, tokenomics }: OverviewTabProps) => {
    if (!tokenomics) return <div className="text-center text-xs text-slate-500 animate-pulse">Carregando dados on-chain...</div>;

    const pieData = [
        { name: 'Circulante', value: tokenomics.circulating },
        { name: 'Tesouro', value: tokenomics.treasury }
    ];

    return (
        <div className="space-y-4 animate-slide-up">
            {/* Stats Rápidos */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Rendimento Base (CDI)</p>
                    <p className="text-xl font-black text-white">{(status?.last_apr_liquid * 100).toFixed(3)}% <span className="text-xs text-slate-500">a.d.</span></p>
                </div>
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Total Queimado</p>
                    <p className="text-xl font-black text-orange-500">🔥 {status?.total_burned?.toLocaleString()}</p>
                </div>
            </div>

            {/* Gráfico Pizza */}
            <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 flex items-center justify-around">
                <div className="h-32 w-32">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">
                                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="text-xs space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-400"/> 
                        <span className="text-slate-300 font-bold">Circulante: {tokenomics.circulating.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500"/> 
                        <span className="text-slate-300 font-bold">Tesouro: {tokenomics.treasury.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Top Holders */}
            <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <Group fontSize="small"/> Maiores Investidores
                </h3>
                <div className="space-y-2">
                    {tokenomics.whales.map((whale: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-950/50 p-2 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className={`font-mono font-bold w-4 text-center text-xs ${idx<3?'text-yellow-400':'text-slate-600'}`}>{idx+1}</span>
                                <UserAvatar user={whale} size="sm" />
                                <span className="text-xs text-white font-bold">{whale.nome.split(' ')[0]}</span>
                            </div>
                            <span className="text-xs font-mono text-emerald-400">{whale.saldo_coins.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};