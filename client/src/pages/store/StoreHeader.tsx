import { Coins, FlaskConical } from 'lucide-react';

interface Props {
    coins: number;
    glue: number;
}

export function StoreHeader({ coins, glue }: Props) {
    return (
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-black italic tracking-tighter text-white">
                    LOJA <span className="text-pink-500">GECA</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Aberto 24h // V2.0
                </p>
            </div>
            <div className="flex gap-2">
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 flex items-center gap-2">
                    <Coins size={14} className="text-yellow-400" />
                    <span className="text-xs font-black text-white">{coins}</span>
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 flex items-center gap-2">
                    <FlaskConical size={14} className="text-pink-400" />
                    <span className="text-xs font-black text-white">{glue}</span>
                </div>
            </div>
        </header>
    );
}