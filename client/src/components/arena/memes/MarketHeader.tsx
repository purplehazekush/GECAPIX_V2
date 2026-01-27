import { CandlestickChart, AddPhotoAlternate } from '@mui/icons-material';

interface MarketHeaderProps {
    phase: 'TRADING' | 'CREATION';
    totalVolume: number;
    onPostClick: () => void;
}

export const MarketHeader = ({ phase, totalVolume, onPostClick }: MarketHeaderProps) => {
    const isTrading = phase === 'TRADING';
    const colorClass = isTrading ? 'from-emerald-900 to-slate-900 border-emerald-500/30' : 'from-purple-900 to-slate-900 border-purple-500/30';

    return (
        <div className={`bg-gradient-to-r ${colorClass} p-6 rounded-3xl border relative overflow-hidden shadow-2xl animate-fade-in`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 scale-150">
                {isTrading ? <CandlestickChart fontSize="large"/> : <AddPhotoAlternate fontSize="large"/>}
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${isTrading ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isTrading ? 'text-emerald-400' : 'text-purple-400'}`}>
                        MERCADO: {isTrading ? 'ABERTO' : 'FECHADO'}
                    </p>
                </div>
                
                <h2 className="text-2xl font-black text-white italic uppercase mb-1">
                    {isTrading ? "PREGÃO DE APOSTAS" : "FASE DE CRIAÇÃO"}
                </h2>
                <p className="text-[10px] text-slate-300 max-w-[250px]">
                    {isTrading 
                        ? "Aposte em quem será o MELHOR (Alta) ou o PIOR (Baixa) meme do dia." 
                        : "Mercado de apostas fechado. Hora de lançar novos IPOs para amanhã."}
                </p>

                <div className="mt-6 flex items-center justify-between">
                    <div className="bg-black/20 px-3 py-2 rounded-xl border border-white/5">
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Pote Estimado</p>
                        <p className="text-lg font-black text-white">
                            {(totalVolume + 20000).toLocaleString()} <span className="text-xs text-yellow-500">GC</span>
                        </p>
                    </div>

                    {!isTrading && (
                        <button onClick={onPostClick} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                            <AddPhotoAlternate sx={{fontSize:16}} /> Lançar IPO
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};