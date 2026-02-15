// client/src/components/arena/bank/LiquidStakingTab.tsx
import { useState } from 'react';
import { Savings, InfoOutlined } from '@mui/icons-material';
import { api } from '../../../lib/api'; // Ajuste path
import toast from 'react-hot-toast';

interface LiquidStakingTabProps {
    user: any;
    status: any;
    onUpdateUser: (newUser: any) => void;
}

export const LiquidStakingTab = ({ user, status, onUpdateUser }: LiquidStakingTabProps) => {
    const [amount, setAmount] = useState('');

    // Cálculo visual do ganho em tempo real
    const getProjecaoHoje = () => {
        if (!status || !user?.saldo_staking_liquido) return 0;
        
        // 🔥 CÁLCULO DINÂMICO DE APR (XP BOOSTER)
        const baseApr = status.last_apr_liquid || 0;
        const userLevel = user.nivel || 1;
        const multiplier = 1 + (userLevel * 0.05); // +5% por nível
        const finalApr = baseApr * multiplier;

        const ganhoTotal = user.saldo_staking_liquido * finalApr;
        const percentualDia = Math.min(new Date().getHours() / 24, 1);
        return Math.floor(ganhoTotal * percentualDia);
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

    const taxaPersonalizada = status?.user_rate_liquid || 0;

    return (
        <div className="space-y-4 animate-slide-up">
            <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-900 p-6 rounded-3xl border border-emerald-500/30 text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Savings sx={{fontSize: 120}}/></div>
                
                <h3 className="text-xl font-black text-white italic uppercase relative z-10 mb-1">CDB Gecapix</h3>
                <p className="text-xs text-emerald-300 mb-6 relative z-10">
                    Rendimento: <span className="font-black bg-emerald-500/20 px-1 rounded">
                        {(taxaPersonalizada * 100).toFixed(3)}% ao dia
                    </span>
                    {/* Badge de Bônus se tiver nivel alto */}
                    {user.nivel > 1 && (
                        <span className="ml-2 text-[9px] text-yellow-400 font-bold uppercase">
                            (Boost Nível {user.nivel})
                        </span>
                    )}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                    <div className="bg-black/30 p-3 rounded-2xl backdrop-blur-sm">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Investido</p>
                        <p className="text-2xl font-black text-white">{Math.floor(user?.saldo_staking_liquido || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
                        <p className="text-[9px] text-emerald-300 font-bold uppercase">Ganho Hoje (Est.)</p>
                        <p className="text-2xl font-black text-emerald-400 animate-pulse">+{getProjecaoHoje()}</p>
                    </div>
                </div>

                {/* Input */}
                <div className="bg-slate-950/50 p-1 rounded-2xl flex items-center border border-slate-700 relative z-10">
                    <input 
                        type="number" 
                        placeholder="Valor..." 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)}
                        className="bg-transparent w-full px-4 text-white font-bold outline-none placeholder:text-slate-600"
                    />
                    <div className="flex gap-1">
                        <button onClick={() => handleAction('deposit')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all">
                            APLICAR
                        </button>
                        <button onClick={() => handleAction('withdraw')} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all">
                            RESGATAR
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
                <InfoOutlined className="text-emerald-500" fontSize="small"/>
                <p>O rendimento é creditado automaticamente todo dia às 21h. Liquidez diária.</p>
            </div>
        </div>
    );
};