// client/src/pages/arena/Memes.tsx
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Tabs, Tab, CircularProgress } from '@mui/material';
import { TrendingUp, History } from '@mui/icons-material';
import toast from 'react-hot-toast';

// Componentes
import { MarketHeader } from '../../components/arena/memes/MarketHeader';
import { MemeCard } from '../../components/arena/memes/MemeCard';
import { TradeModal } from '../../components/arena/memes/TradeModal';
import { PostModal } from '../../components/arena/memes/PostModal';

// 1. Defina o tipo explicitamente
type MarketPhase = 'TRADING' | 'CREATION';

// 2. Tipar o retorno da função helper
const getPhase = (): MarketPhase => { // <--- Adicione o tipo de retorno aqui
    const hour = new Date().getHours();
    return (hour >= 9 && hour < 21) ? 'TRADING' : 'CREATION';
};

export default function ArenaMemes() {
    const { dbUser, setDbUser } = useAuth();
    
    // Data
    const [liveMemes, setLiveMemes] = useState<any[]>([]);
    const [historyMemes, setHistoryMemes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // UI State
    const [tab, setTab] = useState(0);
    const [phase] = useState(getPhase());
    
    // Modais
    const [isPostOpen, setIsPostOpen] = useState(false);
    const [tradeState, setTradeState] = useState<{ open: boolean, memeId: string, side: 'UP' | 'DOWN' }>({
        open: false, memeId: '', side: 'UP'
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resLive, resHistory] = await Promise.all([
                api.get('/arena/memes?mode=live'),
                api.get('/arena/memes?mode=history')
            ]);
            setLiveMemes(resLive.data);
            setHistoryMemes(resHistory.data);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // Handlers
    const handleOpenTrade = (id: string, side: 'UP' | 'DOWN') => {
        setTradeState({ open: true, memeId: id, side });
    };

    const confirmTrade = async (amount: number) => {
        const toastId = toast.loading("Processando ordem...");
        try {
            await api.post('/arena/memes/invest', {
                email: dbUser?.email,
                memeId: tradeState.memeId,
                valor: amount,
                lado: tradeState.side
            });
            
            if(dbUser) setDbUser({...dbUser, saldo_coins: dbUser.saldo_coins - amount});
            toast.success("Ordem confirmada!", { id: toastId });
            setTradeState({ ...tradeState, open: false });
            fetchData(); // Refresh numbers
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Erro", { id: toastId });
        }
    };

    const confirmPost = async (url: string, legenda: string) => {
        const toastId = toast.loading("Lançando IPO...");
        try {
            await api.post('/arena/memes', { email: dbUser?.email, imagem_url: url, legenda });
            toast.success("Meme listado com sucesso!", { id: toastId });
            setIsPostOpen(false);
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Erro", { id: toastId });
        }
    };

    return (
        <div className="pb-28 p-4 animate-fade-in max-w-lg mx-auto space-y-6">
            
            {/* Abas */}
            <Tabs 
                value={tab} 
                onChange={(_, v) => setTab(v)} 
                textColor="inherit" 
                indicatorColor="secondary" 
                className="bg-slate-900 rounded-xl border border-slate-800"
                variant="fullWidth"
            >
                <Tab icon={<TrendingUp sx={{fontSize:16}}/>} iconPosition="start" label={<span className="text-[10px] font-black">PREGÃO</span>} />
                <Tab icon={<History sx={{fontSize:16}}/>} iconPosition="start" label={<span className="text-[10px] font-black">HISTÓRICO</span>} />
            </Tabs>

            {/* ABA PREGÃO */}
            {tab === 0 && (
                <>
                    <MarketHeader 
                        phase={phase} 
                        totalVolume={liveMemes.reduce((acc, m) => acc + (m.total_geral || 0), 0)}
                        onPostClick={() => setIsPostOpen(true)}
                    />

                    {loading ? <div className="text-center py-10"><CircularProgress color="inherit"/></div> : (
                        <div className="space-y-6">
                            {liveMemes.length === 0 && (
                                <div className="text-center py-10 opacity-50 border-2 border-dashed border-slate-800 rounded-2xl">
                                    <p className="text-xs font-bold text-slate-400">Nenhum ativo listado hoje.</p>
                                </div>
                            )}
                            {liveMemes.map(meme => (
                                <MemeCard 
                                    key={meme._id} 
                                    meme={meme} 
                                    isTrading={phase === 'TRADING'} 
                                    onInvest={handleOpenTrade} 
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ABA HISTÓRICO */}
            {tab === 1 && (
                <div className="grid grid-cols-2 gap-3">
                    {/* Reutilizar lógica de cards simples ou criar componente HistoryCard */}
                    {historyMemes.map(meme => (
                        <div key={meme._id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden opacity-80">
                            <img src={meme.imagem_url} className="aspect-square object-cover w-full opacity-60 grayscale" />
                            <div className="p-2">
                                <p className="text-[9px] font-bold text-white truncate">{meme.autor_nome}</p>
                                {meme.resultado && (
                                    <span className={`text-[8px] font-black px-1 rounded ${meme.resultado === 'MELHOR' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'}`}>
                                        {meme.resultado}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modais */}
            <TradeModal 
                open={tradeState.open} 
                onClose={() => setTradeState({...tradeState, open: false})}
                onConfirm={confirmTrade}
                side={tradeState.side}
            />
            
            <PostModal 
                open={isPostOpen} 
                onClose={() => setIsPostOpen(false)}
                onPost={confirmPost}
            />
        </div>
    );
}