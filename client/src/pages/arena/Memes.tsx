import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
    AddPhotoAlternate, TrendingUp, InfoOutlined, 
    MonetizationOn, Lock, History, EmojiEvents,
    CandlestickChart
} from '@mui/icons-material';
import { Modal, Box, CircularProgress, Tabs, Tab } from '@mui/material';
import toast from 'react-hot-toast';
import UserAvatar from '../../components/arena/UserAvatar';

// FASES DO MERCADO
const getPhase = () => {
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 21) return 'TRADING';
    return 'CREATION';
};

export default function ArenaMemes() {
    const { dbUser, setDbUser } = useAuth();
    
    // Estados de Dados
    const [liveMemes, setLiveMemes] = useState<any[]>([]);
    const [historyMemes, setHistoryMemes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados de UI
    const [tab, setTab] = useState(0); // 0=Live, 1=History
    const [phase] = useState(getPhase());
    
    // Modais
    const [openPost, setOpenPost] = useState(false);
    const [url, setUrl] = useState('');
    const [legenda, setLegenda] = useState('');
    const [investModal, setInvestModal] = useState<string | null>(null);
    const [valorInvest, setValorInvest] = useState('');
    const [openRules, setOpenRules] = useState(false);

    // Carregamento
    const fetchData = async () => {
        setLoading(true);
        try {
            const [resLive, resHistory] = await Promise.all([
                api.get('/arena/memes?mode=live'),
                api.get('/arena/memes?mode=history')
            ]);
            setLiveMemes(resLive.data);
            setHistoryMemes(resHistory.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Ações
    const handlePost = async () => {
        if (!url) return toast.error("Cade o link?");
        const toastId = toast.loading("Processando IPO...");
        try {
            await api.post('/arena/memes', { email: dbUser?.email, imagem_url: url, legenda });
            toast.success("IPO Lançado!", { id: toastId });
            setOpenPost(false);
            fetchData();
        } catch (e: any) { toast.error(e.response?.data?.error || "Erro", { id: toastId }); }
    };

    const handleInvest = async () => {
        const val = parseInt(valorInvest);
        if (!val || val <= 0) return toast.error("Valor inválido");
        const toastId = toast.loading("Comprando...");
        try {
            await api.post('/arena/memes/invest', { email: dbUser?.email, memeId: investModal, valor: val });
            if (dbUser) setDbUser({ ...dbUser, saldo_coins: dbUser.saldo_coins - val });
            toast.success("Ordem Executada!", { id: toastId });
            setInvestModal(null);
            fetchData();
        } catch (e: any) { toast.error(e.response?.data?.error || "Erro", { id: toastId }); }
    };

    // Estilos da Fase
    const isTrading = phase === 'TRADING';
    const headerColor = isTrading ? 'from-emerald-900 to-slate-900 border-emerald-500/30' : 'from-purple-900 to-slate-900 border-purple-500/30';
    
    return (
        <div className="pb-28 p-4 animate-fade-in max-w-lg mx-auto space-y-6">
            
            {/* Header com Abas */}
            <div className="flex items-center justify-between">
                <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" indicatorColor="secondary" className="bg-slate-900 rounded-xl border border-slate-800">
                    <Tab icon={<TrendingUp sx={{fontSize:16}}/>} iconPosition="start" label={<span className="text-[10px] font-black">PREGÃO</span>} />
                    <Tab icon={<History sx={{fontSize:16}}/>} iconPosition="start" label={<span className="text-[10px] font-black">HISTÓRICO</span>} />
                </Tabs>
                
                <button onClick={() => setOpenRules(true)} className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-slate-400">
                    <InfoOutlined fontSize="small"/>
                </button>
            </div>

            {/* === ABA 0: PREGÃO AO VIVO === */}
            {tab === 0 && (
                <div className="space-y-6 animate-fade-in">
                    {/* HUD Fase */}
                    <div className={`bg-gradient-to-r ${headerColor} p-6 rounded-3xl border relative overflow-hidden shadow-2xl`}>
                        <div className="absolute top-0 right-0 p-4 opacity-10 scale-150">
                            {isTrading ? <CandlestickChart/> : <AddPhotoAlternate/>}
                        </div>
                        
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-2 h-2 rounded-full animate-pulse ${isTrading ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isTrading ? 'text-emerald-400' : 'text-purple-400'}`}>
                                        STATUS: {phase}
                                    </p>
                                </div>
                                <h2 className="text-2xl font-black text-white italic uppercase">{isTrading ? "PREGÃO ABERTO" : "FASE DE CRIAÇÃO"}</h2>
                                <p className="text-[10px] text-slate-300 mt-1">
                                    {isTrading ? "Aposte nos memes que vão viralizar." : "Mercado fechado. Lance novos IPOs."}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6">
                            {isTrading ? (
                                <div className="bg-black/20 p-3 rounded-xl border border-white/10 text-center">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Volume em Jogo</p>
                                    <p className="text-xl font-black text-white">
                                        {liveMemes.reduce((acc, m) => acc + m.total_investido, 0).toLocaleString()} <span className="text-xs text-yellow-500">GC</span>
                                    </p>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setOpenPost(true)}
                                    className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                >
                                    <AddPhotoAlternate /> LANÇAR IPO
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Feed Live */}
                    {loading ? <div className="text-center py-10"><CircularProgress color="inherit"/></div> : (
                        <div className="space-y-6">
                            {liveMemes.length === 0 && (
                                <div className="text-center py-10 opacity-50 border-2 border-dashed border-slate-800 rounded-2xl">
                                    <p className="text-xs font-bold text-slate-400">Nenhum ativo listado hoje.</p>
                                    {!isTrading && <p className="text-[10px] text-purple-400 mt-1">Seja o primeiro a postar!</p>}
                                </div>
                            )}

                            {liveMemes.map((meme) => (
                                <div key={meme._id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                                    <div className="p-4 flex items-center gap-3">
                                        <UserAvatar user={{nome: meme.autor_nome, avatar_slug: meme.autor_avatar}} size="md" />
                                        <div>
                                            <p className="text-xs font-black text-white">{meme.autor_nome}</p>
                                            <p className="text-[9px] text-slate-500 uppercase">Ticker: ${meme.autor_nome.split(' ')[0].toUpperCase()}</p>
                                        </div>
                                        <div className="ml-auto text-right">
                                            <span className="bg-slate-800 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded border border-slate-700">
                                                Vol: {meme.total_investido}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="relative aspect-square bg-black">
                                        <img src={meme.imagem_url} className="w-full h-full object-contain" alt="Meme" />
                                    </div>

                                    <div className="p-4">
                                        <p className="text-sm text-slate-300 font-medium mb-4 italic">"{meme.legenda}"</p>
                                        {isTrading ? (
                                            <button 
                                                onClick={() => setInvestModal(meme._id)}
                                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-900/20"
                                            >
                                                <MonetizationOn /> COMPRAR AÇÕES
                                            </button>
                                        ) : (
                                            <button disabled className="w-full bg-slate-800 text-slate-500 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-not-allowed">
                                                <Lock fontSize="small"/> PREGÃO FECHADO
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* === ABA 1: HISTÓRICO (MUSEU) === */}
            {tab === 1 && (
                <div className="space-y-4 animate-fade-in">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                        <h3 className="text-sm font-black text-white uppercase italic">Arquivo Morto</h3>
                        <p className="text-[10px] text-slate-500">Memes de pregões passados</p>
                    </div>

                    {loading ? <div className="text-center"><CircularProgress size={20}/></div> : (
                        <div className="grid grid-cols-2 gap-3">
                            {historyMemes.length === 0 && (
                                <p className="col-span-2 text-center text-xs text-slate-500 py-10">O museu está vazio.</p>
                            )}

                            {historyMemes.map((meme) => (
                                <div key={meme._id} className={`bg-slate-900 border rounded-xl overflow-hidden relative ${meme.vencedor ? 'border-yellow-500/50 shadow-lg shadow-yellow-900/20' : 'border-slate-800 opacity-80'}`}>
                                    {meme.vencedor && (
                                        <div className="absolute top-2 right-2 z-10 bg-yellow-500 text-black text-[8px] font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                                            <EmojiEvents sx={{fontSize:10}}/> VENCEDOR
                                        </div>
                                    )}
                                    
                                    <div className="aspect-square bg-black relative">
                                        <img src={meme.imagem_url} className="w-full h-full object-cover opacity-80" alt="Meme" />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                                            <p className="text-[10px] font-black text-white truncate">{meme.autor_nome}</p>
                                            <p className="text-[8px] text-slate-400 truncate">{new Date(meme.data).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-2 bg-slate-950">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] text-slate-500 uppercase font-bold">Volume Final</span>
                                            <span className="text-[10px] font-black text-white">{meme.total_investido}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MODAIS (Manter igual) */}
            <Modal open={openRules} onClose={() => setOpenRules(false)} sx={{display:'flex', alignItems:'center', justifyContent:'center', p:4}}>
                <Box className="bg-slate-950 border border-slate-700 p-6 rounded-3xl max-w-sm outline-none">
                    <h3 className="text-xl font-black text-white italic uppercase mb-4">Regras do Mercado</h3>
                    <ul className="space-y-3 text-xs text-slate-300 list-disc pl-4">
                        <li><b className="text-purple-400">21:00 - 09:00:</b> Fase de Criação. Lance IPOs.</li>
                        <li><b className="text-emerald-400">09:00 - 21:00:</b> Pregão. Aposte nos vencedores.</li>
                        <li><b className="text-yellow-400">21:00 (Fechamento):</b> O maior volume vence.</li>
                        <li>Vencedores dividem o pote dos perdedores. Perdedores perdem tudo.</li>
                    </ul>
                </Box>
            </Modal>

            <Modal open={!!investModal} onClose={() => setInvestModal(null)} sx={{display:'flex', alignItems:'center', justifyContent:'center', p:4}}>
                <Box className="bg-slate-900 border border-emerald-500/50 p-6 rounded-3xl w-full max-w-xs outline-none">
                    <h3 className="text-lg font-black text-white uppercase mb-2">Ordem de Compra</h3>
                    <input type="number" placeholder="Valor em GC" value={valorInvest} onChange={e => setValorInvest(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold mb-4 outline-none focus:border-emerald-500" />
                    <button onClick={handleInvest} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase">CONFIRMAR</button>
                </Box>
            </Modal>

            <Modal open={openPost} onClose={() => setOpenPost(false)} sx={{display:'flex', alignItems:'center', justifyContent:'center', p:4}}>
                <Box className="bg-slate-900 border border-purple-500/50 p-6 rounded-3xl w-full max-w-xs outline-none">
                    <h3 className="text-lg font-black text-white uppercase mb-2">Lançar IPO</h3>
                    <div className="space-y-3">
                        <input type="text" placeholder="URL da Imagem" value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs outline-none focus:border-purple-500" />
                        <input type="text" placeholder="Legenda..." value={legenda} onChange={e => setLegenda(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs outline-none focus:border-purple-500" />
                        <button onClick={handlePost} className="w-full bg-purple-600 text-white py-3 rounded-xl font-black text-xs uppercase">PUBLICAR</button>
                    </div>
                </Box>
            </Modal>
        </div>
    );
}