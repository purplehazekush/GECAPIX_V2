import { Minus, Zap, CreditCard, Banknote, Check } from 'lucide-react';
import type { Product } from '../../../types/store';

interface CartItem extends Product {
    qty: number;
}

interface Props {
    cart: Record<string, number>;
    products: Product[];
    onRemove: (id: string) => void;
    onCheckout: (method: string) => void;
}

export function POSCart({ cart, products, onRemove, onCheckout }: Props) {
    const cartItems: CartItem[] = Object.keys(cart).map(id => {
        const p = products.find(prod => prod._id === id);
        return p ? { ...p, qty: cart[id] } : null;
    }).filter(Boolean) as CartItem[];

    const total = cartItems.reduce((acc, item) => acc + (item.preco * item.qty), 0);
    const totalXP = cartItems.reduce((acc, item) => acc + (item.cashback_xp * item.qty), 0);
    const itemCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

    return (
        <div className="w-full md:w-72 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-xl h-full">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                <h3 className="text-xs font-black uppercase text-slate-400">Carrinho</h3>
                <span className="bg-cyan-900 text-cyan-200 px-2 py-0.5 rounded text-[10px] font-bold">{itemCount} itens</span>
            </div>
            
            {/* Lista */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 custom-scrollbar text-sm pr-1">
                {cartItems.length === 0 ? (
                    <p className="text-slate-600 text-xs italic text-center mt-10">Selecione produtos para vender</p>
                ) : (
                    cartItems.map(item => (
                        <div key={item._id} className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800 animate-fade-in">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <img src={item.imagem_url} className="w-8 h-8 rounded object-cover border border-slate-700" alt="" />
                                <div className="min-w-0">
                                    <p className="font-bold text-white text-xs truncate">{item.nome}</p>
                                    <p className="text-[9px] text-yellow-500 font-bold">+{item.cashback_xp * item.qty} XP</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-white text-xs">x{item.qty}</span>
                                <button onClick={() => onRemove(item._id)} className="w-6 h-6 flex items-center justify-center bg-slate-800 rounded text-red-400 hover:bg-red-900/30 transition-colors">
                                    <Minus size={10} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Totais */}
            <div className="mt-auto bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Zap size={10} className="text-yellow-500" /> Seu Cashback
                    </span>
                    <span className="text-xs font-black text-yellow-400">+{totalXP} XP</span>
                </div>
                
                <div className="flex justify-between items-end mb-3">
                    <span className="text-slate-400 text-xs font-bold">Total a Cobrar</span>
                    <span className="text-2xl font-black text-white">R$ {total.toFixed(2).replace('.',',')}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => onCheckout('Cartão')} className="bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-[10px] font-bold uppercase border border-slate-700 transition-colors flex items-center justify-center gap-1">
                        <CreditCard size={12} className="text-pink-400" /> Cartão
                    </button>
                    <button onClick={() => onCheckout('Dinheiro')} className="bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-[10px] font-bold uppercase border border-slate-700 transition-colors flex items-center justify-center gap-1">
                        <Banknote size={12} className="text-green-400" /> Dinheiro
                    </button>
                    <button onClick={() => onCheckout('Pix Manual')} className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg text-xs font-black uppercase shadow-lg shadow-emerald-900/40 active:scale-95 transition-all flex items-center justify-center gap-1">
                        <Check size={14} /> Confirmar Venda
                    </button>
                </div>
            </div>
        </div>
    );
}