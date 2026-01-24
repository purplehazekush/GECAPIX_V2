// client/src/pages/arena/CentralBank.tsx
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
    AccountBalance, TrendingDown, Whatshot, 
    LockClock, InfoOutlined, MonetizationOn,
    Lock, LockOpen, Savings, RequestQuote
} from '@mui/icons-material';
import { CircularProgress, Tabs, Tab } from '@mui/material';
import toast from 'react-hot-toast';

// --- CONFIGURAÇÃO GRÁFICA ---
const SEASON_LENGTH = 180;
const REFERRAL_A = 1459558;
const REFERRAL_K = 0.024;
const CASHBACK_BASE = 5000;

const generateCurveData = (currentDay: number) => {
    const data = [];
    for (let d = 0; d <= SEASON_LENGTH; d += 5) {
        const refVal = Math.floor(REFERRAL_A * Math.exp(-REFERRAL_K * d));
        const cashVal = Math.floor(CASHBACK_BASE * Math.pow(d + 1, 1.5));
        data.push({
            day: d,
            Referral: refVal,
            Cashback: cashVal,
            isPast: d <= currentDay
        });
    }
    return data;
};

export default function CentralBank() {
    const { dbUser, setDbUser } = useAuth();
    
    // Estados Gerais
    const [tab, setTab] = useState(0); 
    const [loading, setLoading] = useState(true);
    
    // Estados Tokenomics (Aba 0)
    const [status, setStatus] = useState<any>(null);
    const [graphData, setGraphData] = useState<any[]>([]);

    // Estados Bancários (Aba 1 e 2)
    const [valorLiq, setValorLiq] = useState('');
    const [valorBond, setValorBond] = useState('');
    const [titulos, setTitulos] = useState<any[]>([]);

    // Helper de Formatação
    const fmtPct = (val: number) => (val * 100).toFixed(2) + '%';

    // 1. CARGA INICIAL
    useEffect(() => {
        api.get('/tokenomics/status')
            .then(res => {
                setStatus(res.data);
                setGraphData(generateCurveData(res.data.current_day));
            })
            .finally(() => setLoading(false));
    }, []);

    // 2. CARGA DE TÍTULOS
    const fetchTitulos = () => {
        if (dbUser?.email) {
            api.get(`/bank/bonds?email=${dbUser.email}`).then(res => setTitulos(res.data));
        }
    };
    useEffect(() => { if (tab === 2) fetchTitulos(); }, [tab]);

    // --- AÇÕES BANCÁRIAS ---

    const handleLiqAction = async (action: 'deposit' | 'withdraw') => {
        const val = parseInt(valorLiq);
        if (!val || val <= 0) return toast.error("Valor inválido");

        const toastId = toast.loading(action === 'deposit' ? "Depositando..." : "Sacando...");
        try {
            await api.post(`/bank/${action}`, { email: dbUser?.email, valor: val });
            
            if (dbUser) {
                const novoSaldo = action === 'deposit' ? dbUser.saldo_coins - val : dbUser.saldo_coins + val;
                const novoStaking = action === 'deposit' 
                    ? (dbUser.saldo_staking_liquido || 0) + val 
                    : (dbUser.saldo_staking_liquido || 0) - val;
                
                setDbUser({ ...dbUser, saldo_coins: novoSaldo, saldo_staking_liquido: novoStaking });
            }

            toast.success("Sucesso!", { id: toastId });
            setValorLiq('');
        } catch (e: any) { 
            toast.error(e.response?.data?.error || "Erro na transação", { id: toastId }); 
        }
    };

    const handleBuyBond = async () => {
        const val = parseInt(valorBond);
        if (!val || val < 100) return toast.error("Investimento mínimo: 100 GC");

        const toastId = toast.loading("Emitindo título...");
        try {
            await api.post('/bank/bond/buy', { email: dbUser?.email, valor: val });
            if (dbUser) setDbUser({ ...dbUser, saldo_coins: dbUser.saldo_coins - val });
            toast.success("Título comprado!", { id: toastId });
            setValorBond('');
            fetchTitulos();
        } catch (e: any) { 
            toast.error(e.response?.data?.error || "Erro na compra", { id: toastId }); 
        }
    };

    const handleRedeem = async (id: string) => {
        if(!window.confirm("ATENÇÃO: Resgatar antes do vencimento cobra MULTA de até 40%. Continuar?")) return;
        
        const toastId = toast.loading("Processando resgate...");
        try {
            const res = await api.post('/bank/bond/redeem', { email: dbUser?.email, tituloId: id });
            if (dbUser) setDbUser({ ...dbUser, saldo_coins: dbUser.saldo_coins + res.data.valor_recebido });
            toast.success(`Recebido: ${Math.floor(res.data.valor_recebido)} GC`, { id: toastId });
            fetchTitulos();
        } catch (e: any) { 
            toast.error(e.response?.data?.error || "Erro no resgate", { id: toastId }); 
        }
    };

    if (loading) return <div className="flex justify-center p-20"><CircularProgress color="secondary" /></div>;

    const currentReward = status?.current_referral_reward || 0;
    const nextReward = Math.floor(currentReward * 0.98);

    return (
        <div className="pb-28 p-4 animate-fade-in space-y-6 max-w-2xl mx-auto">
            
            {/* Header Global */}
            <header className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-2">
                        <AccountBalance className="text-emerald-500" fontSize="large"/> Banco Central
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Política Monetária • Season {status?.season_id}
                    </p>
                </div>
                <div className="text-right bg-slate-900 p-2 rounded-xl border border-slate-800">
                     <p className="text-[9px] text-slate-500 font-bold uppercase">Disponível</p>
                     <p className="text-sm font-black text-yellow-400 flex items-center justify-end gap-1">
                        <MonetizationOn sx={{fontSize:14}}/> {dbUser?.saldo_coins}
                     </p>
                </div>
            </header>

            <Tabs 
                value={tab} 
                onChange={(_, v) => setTab(v)} 
                textColor="inherit" 
                indicatorColor="secondary" 
                variant="fullWidth" 
                className="bg-slate-900 rounded-xl border border-slate-800"
            >
                <Tab label={<span className="text-[10px] font-black">POLÍTICA</span>} />
                <Tab label={<span className="text-[10px] font-black">RENDA FIXA</span>} />
                <Tab label={<span className="text-[10px] font-black">TÍTULOS</span>} />
            </Tabs>

            {/* --- ABA 0: POLÍTICA MONETÁRIA --- */}
            {tab === 0 && (
                <div className="space-y-6 animate-fade-in">
                    {/* Ticker FOMO */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><LockClock sx={{ fontSize: 120 }} /></div>
                        
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                            <Whatshot className="text-orange-500" fontSize="small"/> Oportunidade do Dia
                        </h3>
                        
                        <div className="flex items-end gap-4 relative z-10">
                            <div>
                                <p className="text-4xl font-black text-white tracking-tighter">
                                    {currentReward} <span className="text-lg text-yellow-500">GC</span>
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Bônus por Indicação</p>
                            </div>
                            <div className="mb-2">
                                <div className="flex items-center gap-1 text-red-400 text-xs font-bold bg-red-900/20 px-2 py-1 rounded-lg">
                                    <TrendingDown fontSize="inherit" /> Amanhã: ~{nextReward}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gráfico */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl">
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={graphData}>
                                    <defs>
                                        <linearGradient id="colorRef" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                                    <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickFormatter={(val) => `D${val}`} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                                    <ReferenceLine x={status?.current_day} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: 'HOJE', fill: '#f59e0b', fontSize: 10 }} />
                                    <Area type="monotone" dataKey="Referral" stroke="#10b981" fillOpacity={1} fill="url(#colorRef)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="Cashback" stroke="#a855f7" fillOpacity={1} fill="url(#colorCash)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Dados Potes */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Pote Referral</p>
                            <p className="text-lg font-black text-emerald-400 truncate">{status?.referral_pool_available.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Pote Cashback</p>
                            <p className="text-lg font-black text-purple-400 truncate">{status?.cashback_pool_available.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ABA 1: RENDA FIXA (Líquido) --- */}
            {tab === 1 && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-gradient-to-br from-emerald-900 to-slate-900 p-6 rounded-3xl border border-emerald-500/30 text-center relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Savings sx={{fontSize: 100}}/></div>
                        
                        <h3 className="text-xl font-black text-white italic uppercase relative z-10">Staking Líquido</h3>
                        
                        {/* TAXA DINÂMICA AQUI */}
                        <p className="text-emerald-200 text-xs mb-6 relative z-10">
                            Rendimento Ontem: <span className="font-black text-white bg-white/20 px-2 py-0.5 rounded ml-1">{fmtPct(status?.last_apr_liquid || 0)}</span> a.d.
                            <br/>Liquidez imediata.
                        </p>
                        
                        <div className="bg-black/20 p-4 rounded-2xl inline-block mb-6 backdrop-blur-sm border border-emerald-500/20 relative z-10">
                            <p className="text-[10px] text-slate-300 font-bold uppercase">Seu Saldo Aplicado</p>
                            <p className="text-4xl font-black text-white tracking-tighter">
                                {Math.floor(dbUser?.saldo_staking_liquido || 0).toLocaleString()} <span className="text-lg text-emerald-400">GC</span>
                            </p>
                        </div>

                        <div className="flex gap-2 relative z-10">
                            <input 
                                type="number" 
                                placeholder="Valor..." 
                                value={valorLiq} 
                                onChange={e => setValorLiq(e.target.value)}
                                className="flex-1 bg-slate-950/50 border border-emerald-500/30 rounded-xl px-4 text-white outline-none focus:border-emerald-400 font-bold text-center"
                            />
                        </div>
                        
                        <div className="flex gap-2 mt-2 relative z-10">
                            <button onClick={() => handleLiqAction('deposit')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-xs shadow-lg shadow-emerald-900/50 active:scale-95 transition-all">
                                DEPOSITAR
                            </button>
                            <button onClick={() => handleLiqAction('withdraw')} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-black text-xs border border-slate-600 active:scale-95 transition-all">
                                SACAR
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 text-center">
                        <InfoOutlined sx={{fontSize:14, verticalAlign:'text-bottom', mr:1}}/>
                        O rendimento é recalculado diariamente com base na demanda.
                    </div>
                </div>
            )}

            {/* --- ABA 2: TÍTULOS (Locked) --- */}
            {tab === 2 && (
                <div className="space-y-4 animate-fade-in">
                    {/* Criar Título */}
                    <div className="bg-slate-900 p-5 rounded-3xl border border-purple-500/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><RequestQuote sx={{fontSize: 80}}/></div>
                        
                        <h3 className="text-sm font-black text-white uppercase mb-1 flex items-center gap-2 relative z-10">
                            <Lock className="text-purple-400" fontSize="small"/> Novo Título Público
                        </h3>
                        
                        {/* TAXA DINÂMICA AQUI */}
                        <p className="text-[10px] text-slate-400 mb-4 relative z-10">
                            Trava por 30 dias. Rendimento Ontem: <span className="font-black text-purple-400">{fmtPct(status?.last_apr_locked || 0)}</span>.
                        </p>
                        
                        <div className="flex gap-2 relative z-10">
                            <input 
                                type="number" 
                                placeholder="Min. 100 GC" 
                                value={valorBond} 
                                onChange={e => setValorBond(e.target.value)}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 text-white outline-none focus:border-purple-500 font-bold"
                            />
                            <button onClick={handleBuyBond} className="bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-xl font-black text-xs shadow-lg shadow-purple-900/30 active:scale-95 transition-all">
                                INVESTIR
                            </button>
                        </div>
                    </div>

                    {/* Lista de Títulos */}
                    <div className="space-y-3">
                        {titulos.length === 0 && (
                            <div className="text-center py-8 opacity-50 border-2 border-dashed border-slate-800 rounded-2xl">
                                <LockOpen sx={{fontSize: 40}} className="mb-2"/>
                                <p className="text-xs font-bold">Nenhum investimento ativo.</p>
                            </div>
                        )}

                        {titulos.map((t) => {
                            const vencimento = new Date(t.data_vencimento);
                            const hoje = new Date();
                            const venceu = hoje >= vencimento;
                            
                            return (
                                <div key={t._id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center group hover:border-purple-500/50 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                                                Investido: {t.valor_inicial}
                                            </span>
                                            {venceu && <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded animate-pulse">VENCEU</span>}
                                        </div>
                                        <p className="text-xl font-black text-white">{Math.floor(t.valor_atual).toLocaleString()} <span className="text-xs text-purple-400">GC</span></p>
                                    </div>
                                    
                                    <div className="text-right">
                                        <p className="text-[9px] text-slate-500 font-bold uppercase mb-2">
                                            Vence {vencimento.toLocaleDateString()}
                                        </p>
                                        <button 
                                            onClick={() => handleRedeem(t._id)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 ${
                                                venceu 
                                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500' 
                                                    : 'bg-slate-800 text-slate-300 hover:text-red-300 hover:bg-red-900/20 border border-slate-700'
                                            }`}
                                        >
                                            {venceu ? "RESGATAR (0%)" : "RESGATAR (MULTA)"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}