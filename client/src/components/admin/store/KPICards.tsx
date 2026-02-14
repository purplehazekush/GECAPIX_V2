import { Coins, Zap, CheckCircle } from 'lucide-react';

interface Props {
    faturamento: number;
    myCashback: number;
}

export function KPICards({ faturamento, myCashback }: Props) {
    const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <section className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
                <Coins className="absolute -right-2 -top-2 text-slate-800 w-16 h-16 opacity-20" />
                <p className="text-[10px] text-slate-400 uppercase font-bold">Faturamento Turno</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">{formatBRL(faturamento)}</h3>
                <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                    <CheckCircle size={10} /> Meta: 65%
                </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg relative overflow-hidden">
                <Zap className="absolute -right-2 -top-2 text-slate-800 w-16 h-16 opacity-20" />
                <p className="text-[10px] text-slate-400 uppercase font-bold">Seu Cashback (XP)</p>
                <h3 className="text-2xl font-black text-yellow-400 mt-1 flex items-center gap-1">
                    {myCashback} <span className="text-sm">XP</span>
                </h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1">Ganhos como Vendedor</p>
            </div>
        </section>
    );
}