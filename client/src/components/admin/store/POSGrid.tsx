import { PlusCircle } from 'lucide-react';
import type { Product } from '../../../types/store';

interface Props {
    products: Product[];
    onSelect: (product: Product) => void;
    onNewProduct: () => void;
}

export function POSGrid({ products, onSelect, onNewProduct }: Props) {
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map(p => (
                    <div 
                        key={p._id} 
                        onClick={() => onSelect(p)} 
                        className="group relative bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl overflow-hidden cursor-pointer transition-all active:scale-95 shadow-md"
                    >
                        {p.badge && (
                            <span className="absolute top-2 right-2 bg-pink-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow z-10">
                                {p.badge}
                            </span>
                        )}
                        
                        <div className="h-28 w-full bg-slate-950 relative">
                            <img 
                                src={p.imagem_url} 
                                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" 
                                alt={p.nome}
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900 to-transparent h-12"></div>
                        </div>
                        
                        <div className="p-2 relative z-10 -mt-2">
                            <p className="text-xs font-bold text-white truncate leading-tight">{p.nome}</p>
                            <div className="flex justify-between items-end mt-1">
                                <span className="text-xs font-black text-cyan-400">R$ {p.preco.toFixed(2)}</span>
                                <span className="text-[9px] text-slate-500 font-bold">Est: {p.estoque}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <button 
                onClick={onNewProduct} 
                className="w-full mt-3 py-3 bg-slate-900 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-cyan-400 hover:border-cyan-400 transition-all"
            >
                <PlusCircle size={16} />
                <span className="text-xs font-bold uppercase">Cadastrar Novo Produto</span>
            </button>
        </div>
    );
}