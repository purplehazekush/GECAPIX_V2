import { useState } from 'react';
import { LocalFireDepartment, Close, Savings } from '@mui/icons-material';

interface SuperLikeModalProps {
    targetName: string;
    userBalance: number;
    onConfirm: (amount: number) => void;
    onClose: () => void;
}

export const SuperLikeModal = ({ targetName, userBalance, onConfirm, onClose }: SuperLikeModalProps) => {
    const [amount, setAmount] = useState(100);
    
    // Regras
    const MIN = 100;
    const MAX = 10000;
    const recipientShare = Math.floor(amount / 2);
    const burnShare = amount - recipientShare;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-yellow-500/50 w-full max-w-sm rounded-3xl p-6 shadow-[0_0_50px_rgba(234,179,8,0.2)] relative">
                
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <Close />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-yellow-500/50">
                        <LocalFireDepartment className="text-yellow-500" sx={{fontSize: 32}} />
                    </div>
                    <h3 className="text-xl font-black text-white italic uppercase">Super Like</h3>
                    <p className="text-xs text-yellow-200/80">Chame a atenção de {targetName}</p>
                </div>

                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 mb-6 space-y-4">
                    <div>
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                            <span>INVESTIMENTO (GC)</span>
                            <span>Saldo: {userBalance}</span>
                        </div>
                        <input 
                            type="range" 
                            min={MIN} max={Math.min(userBalance, MAX)} 
                            step={50}
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full accent-yellow-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex items-center gap-2 mt-2">
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="bg-slate-900 border border-slate-700 text-yellow-400 font-black text-lg w-full text-center rounded-lg py-2"
                            />
                        </div>
                    </div>

                    {/* Resumo da Transação */}
                    <div className="text-[10px] space-y-2 pt-2 border-t border-slate-800/50">
                        <div className="flex justify-between text-emerald-400">
                            <span>🎁 {targetName} recebe:</span>
                            <span className="font-bold">+{recipientShare} GC</span>
                        </div>
                        <div className="flex justify-between text-rose-400">
                            <span>🔥 Queima (Deflação):</span>
                            <span className="font-bold">-{burnShare} GC</span>
                        </div>
                        <div className="flex justify-between text-purple-400">
                            <span>🧪 Taxa de Gás:</span>
                            <span className="font-bold">-1 Glue</span>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => onConfirm(amount)}
                    className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-black py-3 rounded-xl uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Savings sx={{fontSize:18}}/> Enviar {amount} GC
                </button>
            </div>
        </div>
    );
};