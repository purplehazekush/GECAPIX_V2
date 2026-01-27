// client/src/components/arena/bank/BondsTab.tsx
import { useState, useEffect } from 'react';
import { Lock, LockOpen, RequestQuote } from '@mui/icons-material';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

interface BondsTabProps {
    user: any;
    status: any;
    onUpdateUser: (newUser: any) => void;
}

export const BondsTab = ({ user, status, onUpdateUser }: BondsTabProps) => {
    const [amount, setAmount] = useState('');
    const [bonds, setBonds] = useState<any[]>([]);

    const fetchBonds = () => {
        if (user?.email) api.get(`/bank/bonds?email=${user.email}`).then(res => setBonds(res.data));
    };

    useEffect(() => { fetchBonds(); }, []);

    const handleBuy = async () => {
        const val = parseInt(amount);
        if (!val || val < 100) return toast.error("Mínimo 100 GC");
        const toastId = toast.loading("Emitindo...");
        
        try {
            await api.post('/bank/bond/buy', { email: user.email, valor: val });
            onUpdateUser({ ...user, saldo_coins: user.saldo_coins - val });
            toast.success("Investimento realizado!", { id: toastId });
            setAmount('');
            fetchBonds();
        } catch (e) { toast.error("Erro na compra", { id: toastId }); }
    };

    const handleRedeem = async (id: string) => {
        if(!confirm("Resgate antecipado tem multa. Continuar?")) return;
        try {
            const res = await api.post('/bank/bond/redeem', { email: user.email, tituloId: id });
            onUpdateUser({ ...user, saldo_coins: user.saldo_coins + res.data.valor_recebido });
            toast.success("Resgatado!", { icon: '💰' });
            setBonds(prev => prev.filter(b => b._id !== id));
        } catch (e) { toast.error("Erro no resgate"); }
    };

    return (
        <div className="space-y-4 animate-slide-up">
            {/* Card Compra */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-purple-500/30 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 p-4 opacity-5 bg-purple-500 rounded-full w-32 h-32 blur-2xl"></div>
                
                <div className="flex justify-between items-start relative z-10 mb-4">
                    <div>
                        <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
                            <Lock className="text-purple-400" fontSize="small"/> Tesouro Pré-Fixado
                        </h3>
                        <p className="text-[10px] text-slate-400">Trava por 30 dias. Rendimento turbinado.</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-slate-500">Taxa Atual</p>
                        <p className="text-2xl font-black text-purple-400">{(status?.last_apr_locked * 100).toFixed(2)}%</p>
                    </div>
                </div>

                <div className="flex gap-2 relative z-10">
                    <input 
                        type="number" 
                        placeholder="Valor (Min. 100)" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 text-white outline-none focus:border-purple-500 font-bold"
                    />
                    <button onClick={handleBuy} className="bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-all">
                        COMPRAR
                    </button>
                </div>
            </div>

            {/* Lista */}
            <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase ml-2">Sua Carteira</h4>
                {bonds.length === 0 ? (
                    <div className="text-center py-8 opacity-50 border-2 border-dashed border-slate-800 rounded-2xl">
                        <LockOpen sx={{fontSize: 30}} className="mb-2 text-slate-600"/>
                        <p className="text-xs font-bold text-slate-500">Nenhum título ativo.</p>
                    </div>
                ) : (
                    bonds.map((t) => {
                        const vencimento = new Date(t.data_vencimento);
                        const venceu = new Date() >= vencimento;
                        const projecao = t.valor_inicial * Math.pow(1 + t.apr_contratada, 30);

                        return (
                            <div key={t._id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative group hover:border-purple-500/50 transition-all">
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Aplicado: {new Date(t.data_compra).toLocaleDateString()}</p>
                                        <p className="text-lg font-black text-white">{Math.floor(t.valor_atual).toLocaleString()} GC</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Final (Est.)</p>
                                        <p className="text-sm font-bold text-purple-400">~{Math.floor(projecao).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                                    <span className={`text-[9px] font-bold px-2 py-1 rounded ${venceu ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                        {venceu ? "VENCIDO" : `VENCE ${vencimento.toLocaleDateString()}`}
                                    </span>
                                    <button 
                                        onClick={() => handleRedeem(t._id)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                                            venceu ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-red-400'
                                        }`}
                                    >
                                        {venceu ? "RESGATAR" : "RESGATE ANTECIPADO"}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};