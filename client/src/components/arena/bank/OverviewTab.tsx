import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Group, InfoOutlined } from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import UserAvatar from '../UserAvatar'; 

interface OverviewTabProps {
    status: any;
    tokenomics: any;
}

// Cores Semânticas
const COLORS = {
    COMMUNITY: '#22d3ee', // Cyan (Alunos)
    CASHBACK: '#a855f7',  // Purple
    ECOSYSTEM: '#6366f1', // Indigo (Tesouro Geral)
    BANK: '#f59e0b',      // Amber (Liquidez AMM)
    FEES: '#10b981',      // Emerald
    BURN: '#ef4444'       // Red
};

export const OverviewTab = ({ status, tokenomics }: OverviewTabProps) => {
    if (!tokenomics) return <div className="text-center text-xs text-slate-500 animate-pulse">Carregando dados on-chain...</div>;

    // Dados para o Gráfico
    // O TOTAL deste gráfico será (Supply Total - Locked Treasury)
    const pieData = [
        { name: 'Comunidade', value: tokenomics.circulating, color: COLORS.COMMUNITY },
        { name: 'Fundo Cashback', value: tokenomics.wallets?.cashback || 0, color: COLORS.CASHBACK },
        { name: 'Ecossistema', value: tokenomics.wallets?.treasury || 0, color: COLORS.ECOSYSTEM },
        { name: 'Liquidez BC', value: tokenomics.wallets?.bank || 0, color: COLORS.BANK },
        { name: 'Taxas', value: tokenomics.wallets?.fees || 0, color: COLORS.FEES },
        // Burn não entra no gráfico de distribuição de ativos pois não é ativo, mas pode ser mostrado num card separado
    ];

    // Filtra para não mostrar fatias zeradas ou negativas
    const activeData = pieData.filter(d => d.value > 0);
    
    // Calcula o total visível no gráfico para a porcentagem ficar correta
    const totalVisivel = activeData.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <div className="space-y-6 animate-slide-up">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 relative group">
                    <div className="flex items-center gap-1 mb-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Inflação (APR)</p>
                        <Tooltip title="Rendimento base do Staking Líquido ontem." arrow>
                            <InfoOutlined sx={{ fontSize: 12 }} className="text-slate-600"/>
                        </Tooltip>
                    </div>
                    {/* Fallback visual se for 0 */}
                    <p className="text-2xl font-black text-white">
                        {status?.last_apr_liquid > 0 
                            ? (status.last_apr_liquid * 100).toFixed(3) 
                            : "0.500"}% <span className="text-xs text-slate-500 font-bold">a.d.</span>
                    </p>
                </div>
                
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Queimado (Deflação)</p>
                    <p className="text-2xl font-black text-rose-500 flex items-center gap-2">
                        🔥 {tokenomics.wallets?.burn?.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Gráfico de Distribuição */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 text-center">Distribuição Ativa (Exclui Bloqueado)</h3>
                
                <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                    {/* Donut */}
                    <div className="h-48 w-48 relative">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie 
                                    data={activeData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={50} outerRadius={70} 
                                    paddingAngle={4} 
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {activeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                    formatter={(value: any) => value?.toLocaleString()}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Texto Central */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] font-bold text-slate-500">TOTAL ATIVO</span>
                            <span className="text-xs font-black text-white">500M</span>
                        </div>
                    </div>

                    {/* Legenda Dinâmica */}
                    <div className="grid grid-cols-1 gap-2 w-full max-w-[200px]">
                        {activeData.map((d, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-slate-300 font-bold">{d.name}</span>
                                </div>
                                <span className="font-mono text-slate-500">
                                    {((d.value / totalVisivel) * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Holders (Filtrado) */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <Group fontSize="small"/> Top Holders (Comunidade)
                </h3>
                <div className="space-y-3">
                    {tokenomics.whales.map((whale: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center group cursor-default">
                            <div className="flex items-center gap-3">
                                <span className={`
                                    font-mono font-bold w-5 h-5 flex items-center justify-center rounded text-[10px]
                                    ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                                      idx === 1 ? 'bg-slate-500/20 text-slate-300' : 
                                      idx === 2 ? 'bg-orange-700/20 text-orange-400' : 'text-slate-600'}
                                `}>
                                    {idx + 1}
                                </span>
                                <UserAvatar user={whale} size="sm" />
                                <div>
                                    <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                                        {whale.nome.split(' ')[0]}
                                    </p>
                                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                                        {whale.classe || 'Novato'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-mono font-bold text-slate-300 group-hover:text-emerald-400 transition-colors">
                                    {whale.saldo_coins.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};