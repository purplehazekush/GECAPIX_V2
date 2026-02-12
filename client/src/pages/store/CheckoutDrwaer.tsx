import { X, Copy, CheckCircle, Zap, Coins } from 'lucide-react';

interface Product {
    _id: string;
    nome: string;
    preco: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    step: 'CART' | 'PIX' | 'SUCCESS';
    cartItems: { product: Product; qty: number }[];
    total: number;
    userCoins: number;
    useCoins: boolean;
    setUseCoins: (v: boolean) => void;
    pixTimerStr: string;
    onCheckout: () => void;
    onSimulateSuccess: () => void;
}

export function CheckoutDrawer({ 
    isOpen, onClose, step, cartItems, total, 
    userCoins, useCoins, setUseCoins, pixTimerStr, 
    onCheckout, onSimulateSuccess 
}: Props) {
    if (!isOpen) return null;

    const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-fade-in" onClick={onClose} />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-cyan-500/30 rounded-t-[2rem] max-w-lg mx-auto h-[85vh] flex flex-col animate-slide-up shadow-2xl">
                
                {/* Handle */}
                <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-2xl font-black italic uppercase text-white flex items-center gap-2">
                        Checkout
                    </h2>
                    {step === 'CART' && (
                        <button onClick={onClose} className="text-slate-500 hover:text-white">
                            <X />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* ETAPA 1: CARRINHO */}
                    {step === 'CART' && (
                        <>
                            <div className="space-y-4">
                                {cartItems.map(({ product, qty }) => (
                                    <div key={product._id} className="flex items-center justify-between border-b border-slate-800 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold border border-slate-700 text-white">
                                                {qty}x
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{product.nome}</p>
                                                <p className="text-xs text-slate-500">{formatBRL(product.preco)} un</p>
                                            </div>
                                        </div>
                                        <span className="font-black text-white">{formatBRL(product.preco * qty)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Gamification Toggle */}
                            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-inner">
                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-500/20 p-2 rounded-lg text-yellow-400">
                                        <Coins size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-300 uppercase">Usar GecaCoins</p>
                                        <p className="text-[10px] text-slate-500">Saldo: {userCoins}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={useCoins} onChange={e => setUseCoins(e.target.checked)} />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                </label>
                            </div>
                            {useCoins && (
                                <p className="text-center text-[10px] text-emerald-400 font-bold animate-pulse">
                                    Desconto de R$ 5,00 aplicado! (-500 Coins)
                                </p>
                            )}
                        </>
                    )}

                    {/* ETAPA 2: PIX */}
                    {step === 'PIX' && (
                        <div className="text-center space-y-6 animate-fade-in">
                            <div className="bg-white p-4 rounded-2xl inline-block mx-auto border-4 border-cyan-500 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PagamentoGecaStore" alt="QR Code" className="rounded-lg" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Expira em</p>
                                <p className="text-3xl font-black text-cyan-400 font-mono">{pixTimerStr}</p>
                            </div>
                            <button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 border border-slate-700 transition-colors">
                                <Copy size={16} /> Copiar Código PIX
                            </button>
                            
                            <button onClick={onSimulateSuccess} className="text-[10px] text-slate-600 underline hover:text-slate-400">
                                (Admin: Simular Confirmação)
                            </button>
                        </div>
                    )}

                    {/* ETAPA 3: SUCESSO */}
                    {step === 'SUCCESS' && (
                        <div className="flex flex-col items-center justify-center h-full py-10 animate-scale-up">
                            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-emerald-500/50">
                                <CheckCircle size={48} />
                            </div>
                            <h3 className="text-2xl font-black text-white italic uppercase mb-2">Pagamento Confirmado!</h3>
                            <p className="text-slate-400 text-sm mb-6 text-center">Apresente seu nome no balcão para retirar.</p>
                            
                            <div className="bg-slate-950 rounded-xl p-4 w-full flex justify-between items-center border border-slate-800">
                                <span className="text-xs font-bold text-slate-400 uppercase">Cashback</span>
                                <span className="text-lg font-black text-yellow-400 flex items-center gap-1">
                                    +150 XP <Zap size={16} />
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'CART' && (
                    <div className="p-6 bg-slate-950 border-t border-slate-800">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-slate-400 text-xs font-bold uppercase">Total</span>
                            <span className="text-3xl font-black text-white">{formatBRL(total)}</span>
                        </div>
                        <button 
                            onClick={onCheckout} 
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-2xl font-black text-lg uppercase shadow-lg shadow-emerald-900/50 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                        >
                            <span>Pagar com Pix</span>
                            <Zap size={20} className="group-hover:animate-pulse" />
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}