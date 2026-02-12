import { ShoppingCart } from 'lucide-react';

interface Props {
    count: number;
    total: number;
    onClick: () => void;
}

export function MiniCart({ count, total, onClick }: Props) {
    const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (count === 0) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-40 animate-slide-up">
            <div 
                onClick={onClick}
                className="bg-cyan-600 hover:bg-cyan-500 text-white p-4 rounded-2xl shadow-2xl shadow-cyan-900/50 flex justify-between items-center cursor-pointer border border-cyan-400/30"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center font-black animate-pulse">
                        {count}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold opacity-80">Total a Pagar</span>
                        <span className="text-lg font-black leading-none">{formatBRL(total)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 font-bold text-xs uppercase">
                    Ver Sacola <ShoppingCart size={16} />
                </div>
            </div>
        </div>
    );
}