// client/src/pages/arena/Memes.tsx
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from '../../components/arena/UserAvatar';
import NewMemeModal from '../../components/arena/NewMemeModal';
import { 
    TrendingUp, History, AddPhotoAlternate,
    MonetizationOn, LockClock, CandlestickChart
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { CircularProgress } from '@mui/material';

export default function ArenaMemes() {
    const { dbUser, setDbUser } = useAuth();
    const [tab, setTab] = useState<'live' | 'history'>('live');
    const [memes, setMemes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [investingId, setInvestingId] = useState<string | null>(null);

    const fetchMemes = () => {
        setLoading(true);
        api.get(`/arena/memes?tipo=${tab === 'live' ? 'ativo' : 'historico'}`)
            .then(res => setMemes(res.data))
            .catch(() => toast.error("Erro ao carregar mercado"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchMemes(); }, [tab]);

    const handleInvest = async (memeId: string) => {
        // Futuramente podemos fazer um Modal bonito de "Ordem de Compra"
        const amountStr = prompt("💰 ORDEM DE COMPRA\n\nQuanto deseja investir?\nRetorno estimado: +20% se vencer.");
        if (!amountStr) return;
        const amount = parseInt(amountStr);
        
        if (isNaN(amount) || amount <= 0) return toast.error("Valor inválido");
        if ((dbUser?.saldo_coins || 0) < amount) return toast.error("Saldo insuficiente");

        setInvestingId(memeId);
        try {
            const res = await api.post('/arena/memes/invest', {
                email: dbUser?.email,
                memeId,
                valor: amount
            });
            
            toast.success(`Ordem executada! -${amount} coins`, { icon: '💸' });
            
            // Atualiza Market Cap em tempo real
            setMemes(prev => prev.map(m => 
                m._id === memeId ? { ...m, total_investido: res.data.novo_total } : m
            ));
            
            // Atualiza Carteira
            if (dbUser) setDbUser({ ...dbUser, saldo_coins: dbUser.saldo_coins - amount });

        } catch (e) {
            toast.error("Ordem rejeitada pelo servidor.");
        } finally {
            setInvestingId(null);
        }
    };

    return (
        <div className="pb-28 p-4 animate-fade-in space-y-6 max-w-lg mx-auto">
            
            {/* HUD HEADER */}
            <header className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm sticky top-2 z-40">
                <div>
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter flex items-center gap-2">
                        MEME <span className="text-emerald-400">STOCKS</span>
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Mercado Aberto
                    </p>
                </div>
                <button 
                    onClick={() => setModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-xl shadow-lg active:scale-95 transition-all"
                >
                    <AddPhotoAlternate />
                </button>
            </header>

            {/* ABAS (TICKER) */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button 
                    onClick={() => setTab('live')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${
                        tab === 'live' ? 'bg-slate-800 text-emerald-400 shadow border border-slate-700' : 'text-slate-500'
                    }`}
                >
                    <CandlestickChart fontSize="small" /> Pregão Ativo
                </button>
                <button 
                    onClick={() => setTab('history')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${
                        tab === 'history' ? 'bg-slate-800 text-yellow-400 shadow border border-slate-700' : 'text-slate-500'
                    }`}
                >
                    <History fontSize="small" /> Blue Chips (Histórico)
                </button>
            </div>

            {/* FEED DE AÇÕES */}
            {loading ? (
                <div className="flex justify-center py-20"><CircularProgress color="success" /></div>
            ) : memes.length === 0 ? (
                <div className="text-center py-20 opacity-50 border-2 border-dashed border-slate-800 rounded-3xl">
                    <p className="text-slate-400 text-sm font-bold">Nenhum ativo listado.</p>
                    <p className="text-[10px] text-slate-600">Faça o primeiro IPO do dia!</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {memes.map((meme, idx) => (
                        <div key={meme._id} className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative group transition-all hover:border-slate-600">
                            
                            {/* HEADER (INSTAGRAM STYLE) */}
                            <div className="p-3 flex items-center justify-between bg-slate-950 border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                    <UserAvatar user={{ nome: meme.autor_nome, avatar_slug: meme.autor_avatar }} size="sm" className="ring-2 ring-slate-800" />
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">Ticker</p>
                                        <p className="text-xs text-white font-black uppercase tracking-wider">${meme.autor_nome?.split(' ')[0].substring(0, 4).toUpperCase()}</p>
                                    </div>
                                </div>
                                {tab === 'live' && idx === 0 && (
                                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded text-[9px] font-black uppercase animate-pulse">
                                        🚀 Top Gainer
                                    </span>
                                )}
                            </div>

                            {/* IMAGEM (THE ASSET) */}
                            <div className="relative bg-black group-hover:opacity-95 transition-opacity cursor-pointer" onDoubleClick={() => handleInvest(meme._id)}>
                                <img src={meme.imagem_url} alt="Meme" className="w-full object-contain max-h-[500px]" />
                                
                                {/* Overlay de Legenda */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-12">
                                    <p className="text-white font-bold text-sm italic">"{meme.legenda}"</p>
                                </div>
                            </div>

                            {/* FOOTER (BROKER STYLE) */}
                            <div className="p-4 bg-slate-900 flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Market Cap (Total Apostado)</p>
                                    <div className="flex items-center gap-1 text-xl font-mono font-black text-white">
                                        <MonetizationOn className="text-yellow-500" fontSize="small" />
                                        {meme.total_investido}
                                    </div>
                                </div>

                                {tab === 'live' ? (
                                    <button 
                                        onClick={() => handleInvest(meme._id)}
                                        disabled={investingId === meme._id}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-emerald-900/20 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        {investingId === meme._id ? <CircularProgress size={14} color="inherit" /> : <TrendingUp fontSize="small" />}
                                        COMPRAR
                                    </button>
                                ) : (
                                    <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                                        <p className="text-[9px] text-yellow-500 font-bold uppercase flex items-center gap-1">
                                            <LockClock sx={{ fontSize: 12 }} /> Fechado
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <NewMemeModal open={modalOpen} onClose={() => setModalOpen(false)} onRefresh={fetchMemes} />
        </div>
    );
}