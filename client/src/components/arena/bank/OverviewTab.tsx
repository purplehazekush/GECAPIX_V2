import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Group, Lock, Public, Storefront, LocalAtm } from '@mui/icons-material';
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
    LOCKED: '#475569'
};

export const OverviewTab = ({ tokenomics }: OverviewTabProps) => {
    if (!tokenomics) return <div className="text-center text-xs text-slate-500 animate-pulse">Sincronizando Ledger...</div>;

    // 1. Dados para os Cards de Destaque
    const totalSupply = tokenomics.supply;
    const lockedAmount = tokenomics.wallets?.locked || 0;
    const activeSupply = totalSupply - lockedAmount;
    const distributionRatio = (activeSupply / totalSupply) * 100;

    // 2. Construção da Lista Unificada (Sistema + Humanos)
    // Criamos objetos visuais para as carteiras de sistema
    const systemWalletsList = [
        { 
            nome: 'Fundo Soberano (Bloqueado)', 
            saldo_coins: lockedAmount, 
            avatar_slug: 'safe', 
            classe: 'TECNOMANTE', 
            isSystem: true 
        },
        { 
            nome: 'Tesouro Geral (Ecossistema)', 
            saldo_coins: tokenomics.wallets?.treasury || 0, 
            avatar_slug: 'bank', 
            classe: 'TECNOMANTE', 
            isSystem: true 
        },
        { 
            nome: 'Pool Cashback', 
            saldo_coins: tokenomics.wallets?.cashback || 0, 
            avatar_slug: 'gift', 
            classe: 'BARDO', 
            isSystem: true 
        },
        { 
            nome: 'Banco Central (Liquidez)', 
            saldo_coins: tokenomics.wallets?.bank || 0, 
            avatar_slug: 'robot', 
            classe: 'ESPECULADOR', 
            isSystem: true 
        },
        { 
            nome: 'Taxas Acumuladas', 
            saldo_coins: tokenomics.wallets?.fees || 0, 
            avatar_slug: 'tax', 
            classe: 'ESPECULADOR', 
            isSystem: true 
        }
    ];

    // Junta tudo e ordena por saldo
    const richList = [...systemWalletsList, ...tokenomics.whales]
        .sort((a, b) => b.saldo_coins - a.saldo_coins); // Do maior pro menor

    // 3. Dados Gráfico (Pizza)
    const pieData = [
        { name: 'Comunidade', value: tokenomics.circulating, color: COLORS.COMMUNITY },
        { name: 'Cashback', value: tokenomics.wallets?.cashback || 0, color: COLORS.CASHBACK },
        { name: 'Ecossistema', value: tokenomics.wallets?.treasury || 0, color: COLORS.ECOSYSTEM },
        { name: 'Liquidez BC', value: tokenomics.wallets?.bank || 0, color: COLORS.BANK },
        { name: 'Taxas', value: tokenomics.wallets?.fees || 0, color: COLORS.FEES },
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-6 animate-slide-up">
            
            {/* --- DESTAQUE 1: COTAÇÃO REAL WORLD --- */}
            <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 p-0.5 rounded-2xl shadow-lg shadow-yellow-900/20">
                <div className="bg-slate-900 rounded-[14px] p-4 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 text-yellow-500/10"><Storefront sx={{ fontSize: 100 }} /></div>
                    
                    <div>
                        <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                            <LocalAtm fontSize="inherit"/> Cotação Comercial
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-slate-400">R$ 1,00 =</span>
                            <span className="text-3xl font-black text-white">{tokenomics.cashback_rate} <span className="text-sm text-yellow-500">GC</span></span>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1">Válido para compras na Cantina/Lojinha.</p>
                    </div>
                </div>
            </div>

            {/* --- DESTAQUE 2: SUPPLY E BLOQUEIO --- */}
            <div className="grid grid-cols-2 gap-3">
                {/* Supply Total */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Supply Total</p>
                        <Public sx={{ fontSize: 14 }} className="text-slate-600"/>
                    </div>
                    <p className="text-lg font-black text-white truncate">1.000.000.000</p>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${distributionRatio}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-emerald-500 font-bold">{distributionRatio.toFixed(1)}% Liberado</span>
                        <span className="text-[9px] text-slate-500">Max Cap</span>
                    </div>
                </div>

                {/* Bloqueado */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Cofre Bloqueado</p>
                        <Lock sx={{ fontSize: 14 }} className="text-slate-600"/>
                    </div>
                    <p className="text-lg font-black text-slate-400 truncate">
                        {lockedAmount.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1 flex items-center gap-1">
                        <Lock sx={{fontSize: 10}}/> Travado por 6 meses
                    </p>
                </div>
            </div>

            {/* --- GRÁFICO --- */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Distribuição do Capital Ativo</h3>
                <div className="h-40 w-full max-w-[200px]">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie 
                                data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value" stroke="none"
                            >
                                {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: any) => value?.toLocaleString()}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {/* Legenda simples */}
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {pieData.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-[9px] text-slate-400 font-bold">{d.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- LISTA DE MAIORES INVESTIDORES (SISTEMA + HUMANOS) --- */}
            <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <Group fontSize="small"/> Ranking de Riqueza
                </h3>
                <div className="space-y-3">
                    {richList.map((wallet: any, idx: number) => {
                        const isSystem = wallet.isSystem;
                        
                        return (
                            <div key={idx} className={`flex justify-between items-center p-2 rounded-lg ${isSystem ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`
                                        font-mono font-bold w-5 h-5 flex items-center justify-center rounded text-[10px]
                                        ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                                          idx === 1 ? 'bg-slate-500/20 text-slate-300' : 
                                          idx === 2 ? 'bg-orange-700/20 text-orange-400' : 'text-slate-600'}
                                    `}>
                                        {idx + 1}
                                    </span>
                                    
                                    <UserAvatar user={wallet} size="sm" />
                                    
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <p className={`text-xs font-bold ${isSystem ? 'text-indigo-300' : 'text-white'}`}>
                                                {wallet.nome.split(' ')[0]}
                                            </p>
                                            {isSystem && <Lock sx={{fontSize: 8}} className="text-slate-500"/>}
                                        </div>
                                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                                            {wallet.classe || 'Entidade'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-mono font-bold ${isSystem ? 'text-slate-400' : 'text-emerald-400'}`}>
                                        {Math.floor(wallet.saldo_coins).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};