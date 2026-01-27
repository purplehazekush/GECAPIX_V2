import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Group, Lock, Public, Storefront, LocalFireDepartment, InfoOutlined } from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import UserAvatar from '../UserAvatar'; 

interface OverviewTabProps {
    status: any;
    tokenomics: any;
}

const COLORS = {
    COMMUNITY: '#22d3ee',
    CASHBACK: '#a855f7',
    ECOSYSTEM: '#6366f1',
    BANK: '#f59e0b',
    FEES: '#10b981',
    LOCKED: '#334155' // Slate 700 para o bloqueado
};

export const OverviewTab = ({ status, tokenomics }: OverviewTabProps) => {
    if (!tokenomics) return <div className="text-center text-xs text-slate-500 animate-pulse">Sincronizando Ledger...</div>;

    // --- DADOS ---
    const lockedAmount = tokenomics.wallets?.locked || 0;
    const activeSupply = tokenomics.supply - lockedAmount;
    
    // Lista Unificada para o Ranking
    const systemWalletsList = [
        { nome: 'Fundo Soberano', saldo_coins: lockedAmount, avatar_slug: 'safe', classe: 'TECNOMANTE', isSystem: true, locked: true },
        { nome: 'Tesouro Geral', saldo_coins: tokenomics.wallets?.treasury || 0, avatar_slug: 'bank', classe: 'TECNOMANTE', isSystem: true },
        { nome: 'Pool Cashback', saldo_coins: tokenomics.wallets?.cashback || 0, avatar_slug: 'gift', classe: 'BARDO', isSystem: true },
        { nome: 'Banco Central', saldo_coins: tokenomics.wallets?.bank || 0, avatar_slug: 'robot', classe: 'ESPECULADOR', isSystem: true },
        { nome: 'Taxas', saldo_coins: tokenomics.wallets?.fees || 0, avatar_slug: 'tax', classe: 'ESPECULADOR', isSystem: true }
    ];

    const richList = [...systemWalletsList, ...tokenomics.whales]
        .sort((a, b) => b.saldo_coins - a.saldo_coins);

    // Gráfico (Exclui Burn e Locked para mostrar a distribuição "Viva")
    const pieData = [
        { name: 'Comunidade', value: tokenomics.circulating, color: COLORS.COMMUNITY },
        { name: 'Fundo Cashback', value: tokenomics.wallets?.cashback || 0, color: COLORS.CASHBACK },
        { name: 'Ecossistema', value: tokenomics.wallets?.treasury || 0, color: COLORS.ECOSYSTEM },
        { name: 'Liquidez BC', value: tokenomics.wallets?.bank || 0, color: COLORS.BANK },
        { name: 'Taxas', value: tokenomics.wallets?.fees || 0, color: COLORS.FEES },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-6 animate-slide-up">
            
            {/* LINHA 1: Supply Bar e Cotação Discreta */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                            <Public sx={{fontSize:12}}/> Supply Total Emitido
                        </p>
                        <p className="text-lg font-black text-white">1.000.000.000 <span className="text-xs text-slate-600">GC</span></p>
                    </div>
                    {/* Cotação Discreta */}
                    <div className="text-right">
                        <p className="text-[9px] text-yellow-600 font-bold uppercase flex items-center justify-end gap-1">
                            <Storefront sx={{fontSize:10}}/> Cashback Rate
                        </p>
                        <p className="text-sm font-bold text-yellow-500">
                            R$ 1,00 = <span className="font-black text-white">{tokenomics.cashback_rate} GC</span>
                        </p>
                    </div>
                </div>

                {/* Barra de Progresso do Supply */}
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex relative">
                    {/* Parte Ativa */}
                    <div 
                        className="h-full bg-cyan-500" 
                        style={{ width: `${(activeSupply / 1000000000) * 100}%` }}
                    />
                    {/* Parte Bloqueada (Cinza Escuro) */}
                    <div className="h-full bg-slate-700 flex-1 relative pattern-diagonal-lines" />
                </div>
                
                <div className="flex justify-between mt-1 text-[9px] font-bold">
                    <span className="text-cyan-500">{(activeSupply / 1000000).toFixed(0)}M Ativos (Ecossistema + Users)</span>
                    <span className="text-slate-500 flex items-center gap-1"><Lock sx={{fontSize:8}}/> {(lockedAmount / 1000000).toFixed(0)}M Bloqueados (6 meses)</span>
                </div>
            </div>

            {/* LINHA 2: KPI Cards (Inflação e BURN) */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 relative group">
                    <div className="flex items-center gap-1 mb-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Inflação (APR)</p>
                        <Tooltip title="Rendimento base do Staking Líquido ontem." arrow>
                            <InfoOutlined sx={{ fontSize: 12 }} className="text-slate-600"/>
                        </Tooltip>
                    </div>
                    <p className="text-2xl font-black text-white">
                        {status?.last_apr_liquid > 0 ? (status.last_apr_liquid * 100).toFixed(3) : "0.500"}%
                    </p>
                </div>
                
                {/* BURN CARD COM EFEITO DE CHAMAS */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-rose-900/50 relative overflow-hidden shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                    <div className="absolute inset-0 bg-gradient-to-t from-rose-900/20 to-transparent animate-pulse"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] text-rose-400 font-bold uppercase mb-1 flex items-center gap-1">
                            <LocalFireDepartment sx={{fontSize:12}}/> Queimado (Deflação)
                        </p>
                        <p className="text-2xl font-black text-white flex items-center gap-2 drop-shadow-[0_0_5px_rgba(244,63,94,0.8)]">
                            {tokenomics.wallets?.burn?.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* GRÁFICO DE DISTRIBUIÇÃO ATIVA */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 text-center">Distribuição do Capital Ativo</h3>
                <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                    <div className="h-40 w-40 relative">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" stroke="none">
                                    {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: any) => value?.toLocaleString()}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[9px] font-bold text-slate-500">ATIVO</span>
                            <span className="text-xs font-black text-white">{(activeSupply/1000000).toFixed(0)}M</span>
                        </div>
                    </div>
                    {/* Legenda Compacta */}
                    <div className="grid grid-cols-1 gap-1.5 w-full max-w-[200px]">
                        {pieData.map((d, i) => (
                            <div key={i} className="flex justify-between items-center text-[10px]">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-slate-300 font-bold">{d.name}</span>
                                </div>
                                <span className="font-mono text-slate-500">{((d.value / activeSupply) * 100).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RANKING UNIFICADO */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <Group fontSize="small"/> Ranking de Riqueza (Global)
                </h3>
                <div className="space-y-3">
                    {richList.map((wallet: any, idx: number) => {
                        const isSystem = wallet.isSystem;
                        return (
                            <div key={idx} className={`flex justify-between items-center p-2 rounded-lg ${isSystem ? 'bg-slate-950/50 border border-slate-800/50' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`font-mono font-bold w-5 h-5 flex items-center justify-center rounded text-[10px] ${idx < 3 ? 'text-yellow-500 bg-yellow-500/10' : 'text-slate-600'}`}>{idx + 1}</span>
                                    <UserAvatar user={wallet} size="sm" />
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <p className={`text-xs font-bold ${isSystem ? 'text-indigo-300' : 'text-white'}`}>
                                                {wallet.nome.split(' ')[0]}
                                            </p>
                                            {wallet.locked && <Lock sx={{fontSize: 9}} className="text-slate-500"/>}
                                        </div>
                                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                                            {wallet.classe || 'Entidade'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-xs font-mono font-bold ${isSystem ? 'text-slate-400' : 'text-emerald-400'}`}>
                                    {Math.floor(wallet.saldo_coins).toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};