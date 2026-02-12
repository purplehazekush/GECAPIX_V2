import { Zap, Plus, Minus } from 'lucide-react';

interface Product {
    _id: string;
    nome: string;
    preco: number;
    imagem_url: string;
    cashback_xp: number;
    badge?: string;
}

interface Props {
    product: Product;
    qty: number;
    onUpdateQty: (delta: number) => void;
}

export function ProductCard({ product, qty, onUpdateQty }: Props) {
    const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-lg relative group h-full">
            {product.badge && (
                <div className="absolute top-2 left-2 bg-pink-600 text-white text-[9px] font-black uppercase px-2 py-1 rounded shadow-lg z-10">
                    {product.badge}
                </div>
            )}
            <div className="relative h-32 w-full overflow-hidden bg-black">
                <img src={product.imagem_url} alt={product.nome} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div className="p-3 flex flex-col flex-1">
                <div className="flex-1">
                    <h3 className="text-white text-sm font-bold leading-tight mb-1 line-clamp-2">{product.nome}</h3>
                    <p className="text-xs text-emerald-400 font-bold mb-2 flex items-center gap-1">
                        <Zap size={10} /> +{product.cashback_xp} XP
                    </p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                    <span className="text-white font-black text-lg">{formatBRL(product.preco)}</span>
                </div>
                
                {qty > 0 ? (
                    <div className="mt-3 bg-slate-800 rounded-xl flex items-center justify-between p-1 border border-slate-700 animate-slide-up">
                        <button onClick={() => onUpdateQty(-1)} className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-lg text-white">
                            <Minus size={14} />
                        </button>
                        <span className="font-black text-white">{qty}</span>
                        <button onClick={() => onUpdateQty(1)} className="w-8 h-8 flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white">
                            <Plus size={14} />
                        </button>
                    </div>
                ) : (
                    <button onClick={() => onUpdateQty(1)} className="mt-3 w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold uppercase transition-colors text-slate-300 hover:text-white">
                        Adicionar
                    </button>
                )}
            </div>
        </div>
    );
}