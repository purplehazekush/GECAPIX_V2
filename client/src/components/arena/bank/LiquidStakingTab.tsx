import { useState } from 'react';
import { Savings, InfoOutlined, TrendingUp, CalendarMonth, EventRepeat } from '@mui/icons-material';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

interface LiquidStakingTabProps {
    user: any;
    status: any;
    onUpdateUser: (newUser: any) => void;
}

export const LiquidStakingTab = ({ user, status, onUpdateUser }: LiquidStakingTabProps) => {
    const [amount, setAmount] = useState('');

    // Taxa base diária vinda do backend
    const dailyRate = status?.user_rate_liquid || 0; // Ex: 0.005 (0.5%)

    // Juros Compostos: M = C * (1 + i)^t
    const monthlyRate = Math.pow(1 + dailyRate, 30) - 1;
    const yearlyRate = Math.pow(1 + dailyRate, 365) - 1;

    const getProjecaoHoje = () => {
        if (!user?.saldo_staking_liquido) return 0;
        const ganhoTotal = user.saldo_staking_liquido * dailyRate;
        return Math.floor(ganhoTotal);
    };

    const handleAction = async (action: 'deposit' | 'withdraw') => {
        const val = parseInt(amount);
        if (!val || val <= 0) return toast.error("Valor inválido");
        
        const toastId = toast.loading("Processando...");
        try {
            await api.post(`/bank/${action}`, { email: user.email, valor: val });
            
            // Update Otimista
            const diff = action === 'deposit' ? val : -val;
            onUpdateUser({
                ...user,
                saldo_coins: user.saldo_coins - diff,
                saldo_staking_liquido: (user.saldo_staking_liquido || 0) + diff
            });
            
            toast.success("Sucesso!", { id: toastId });
            setAmount('');
        } catch (e: any) { toast.error(e.response?.data?.error || "Erro", { id: toastId }); }
    };

    return (
        <div className="space-y-6 animate-slide-up pb-10">
            {/* Card Principal */}
            <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-900 p-6 rounded-3xl border border-emerald-500/30 text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Savings sx={{fontSize: 120}}/></div>
                
                <h3 className="text-xl font-black text-white italic uppercase relative z-10 mb-4">CDB Gecapix</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                    <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Investido</p>
                        <p className="text-2xl font-black text-white truncate">
                            {Math.floor(user?.saldo_staking_liquido || 0).toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
                        <p className="text-[9px] text-emerald-300 font-bold uppercase mb-1">Ganho Hoje</p>
                        <p className="text-2xl font-black text-emerald-400 animate-pulse">
                            +{getProjecaoHoje().toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Input */}
                <div className="bg-slate-950/80 p-1.5 rounded-2xl flex items-center border border-slate-700 relative z-10">
                    <input 
                        type="number" 
                        placeholder="Valor..." 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)}
                        className="bg-transparent w-full px-4 text-white font-bold outline-none placeholder:text-slate-600 text-sm"
                    />
                    <div className="flex gap-1">
                        <button onClick={() => handleAction('deposit')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-[10px] transition-all uppercase">
                            Aplicar
                        </button>
                        <button onClick={() => handleAction('withdraw')} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-black text-[10px] transition-all uppercase">
                            Resgatar
                        </button>
                    </div>
                </div>
            </div>

            {/* Painel de Taxas (Visualizador de Juros) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
                    <TrendingUp className="text-purple-400" fontSize="small"/>
                    <h4 className="text-xs font-black text-white uppercase">Sua Rentabilidade</h4>
                    {user.nivel > 1 && (
                        <span className="ml-auto text-[9px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30 font-bold">
                            BOOST NÍVEL {user.nivel}
                        </span>
                    )}
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                    <RateBox label="Dia" value={dailyRate} icon={<EventRepeat sx={{fontSize:14}}/>} />
                    <RateBox label="Mês" value={monthlyRate} icon={<CalendarMonth sx={{fontSize:14}}/>} />
                    <RateBox label="Ano (APY)" value={yearlyRate} icon={<TrendingUp sx={{fontSize:14}}/>} highlight />
                </div>
            </div>
            
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50 text-[10px] text-slate-500 flex items-start gap-2 leading-relaxed">
                <InfoOutlined className="text-slate-600 mt-0.5" sx={{fontSize: 14}}/>
                <p>O rendimento é composto e creditado automaticamente todo dia às 21h. Liquidez diária: você saca quando quiser.</p>
            </div>
        </div>
    );
};

const RateBox = ({ label, value, icon, highlight }: any) => (
    <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 ${
        highlight ? 'bg-purple-500/10 border-purple-500/30' : 'bg-slate-950 border-slate-800'
    }`}>
        <div className={`text-slate-400 ${highlight ? 'text-purple-400' : ''}`}>{icon}</div>
        <span className="text-[9px] font-bold text-slate-500 uppercase">{label}</span>
        <span className={`text-sm font-black ${highlight ? 'text-white' : 'text-slate-300'}`}>
            {(value * 100).toFixed(2)}%
        </span>
    </div>
);