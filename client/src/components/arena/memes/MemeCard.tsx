import { ThumbUp, ThumbDown, TrendingUp, TrendingDown } from '@mui/icons-material';
import UserAvatar from '../UserAvatar';

interface MemeCardProps {
    meme: any;
    isTrading: boolean;
    onInvest: (id: string, side: 'UP' | 'DOWN') => void;
}

export const MemeCard = ({ meme, isTrading, onInvest }: MemeCardProps) => {
    // Calcula Sentimento (Ratio)
    const total = (meme.total_up + meme.total_down) || 1;
    const upPercent = (meme.total_up / total) * 100;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col">
            {/* Header Autor */}
            <div className="p-3 flex items-center gap-3 bg-slate-950/50">
                <UserAvatar user={{nome: meme.autor_nome, avatar_slug: meme.autor_avatar}} size="sm" />
                <div>
                    <p className="text-xs font-black text-white leading-none">{meme.autor_nome}</p>
                    <p className="text-[9px] text-slate-500 font-mono uppercase mt-0.5">Ticker: ${meme.autor_nome.split(' ')[0].toUpperCase()}</p>
                </div>
            </div>

            {/* Imagem */}
            <div className="relative aspect-square bg-black group">
                <img src={meme.imagem_url} className="w-full h-full object-contain" alt="Meme" />
                
                {/* Overlay de Stats no Hover (Desktop) ou sempre visivel (Mobile design decisions vary) */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                    <p className="text-xs text-white font-medium italic line-clamp-2">"{meme.legenda}"</p>
                </div>
            </div>

            {/* Barra de Sentimento */}
            <div className="h-1.5 w-full flex bg-slate-800">
                <div className="h-full bg-emerald-500 transition-all" style={{width: `${upPercent}%`}} />
                <div className="h-full bg-rose-500 transition-all flex-1" />
            </div>

            {/* Painel de Trade */}
            <div className="p-3 space-y-3 bg-slate-900">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono">
                    <span className="text-emerald-400 flex items-center gap-1"><TrendingUp sx={{fontSize:12}}/> {meme.total_up}</span>
                    <span className="text-rose-400 flex items-center gap-1">{meme.total_down} <TrendingDown sx={{fontSize:12}}/></span>
                </div>

                {isTrading ? (
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => onInvest(meme._id, 'UP')}
                            className="bg-slate-800 hover:bg-emerald-500/20 hover:border-emerald-500/50 border border-slate-700 text-emerald-500 py-2 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1 transition-all active:scale-95"
                        >
                            <ThumbUp sx={{fontSize: 14}} /> BUY UP
                        </button>
                        <button 
                            onClick={() => onInvest(meme._id, 'DOWN')}
                            className="bg-slate-800 hover:bg-rose-500/20 hover:border-rose-500/50 border border-slate-700 text-rose-500 py-2 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1 transition-all active:scale-95"
                        >
                            <ThumbDown sx={{fontSize: 14}} /> BUY DOWN
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-1 bg-slate-950 rounded-lg">
                        <span className="text-[9px] text-slate-600 font-bold uppercase">Apostas Fechadas</span>
                    </div>
                )}
            </div>
        </div>
    );
};