import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
    AddPhotoAlternate, TrendingUp, InfoOutlined, 
    MonetizationOn, Lock 
} from '@mui/icons-material';
import { Modal, Box, CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';
import UserAvatar from '../../components/arena/UserAvatar';

// FASES DO MERCADO
const getPhase = () => {
    const hour = new Date().getHours();
    // 09:00 as 21:00 = TRADING (Apostas)
    if (hour >= 9 && hour < 21) return 'TRADING';
    return 'CREATION'; // 21:00 as 09:00
};

export default function ArenaMemes() {
    const { dbUser, setDbUser } = useAuth();
    const [memes, setMemes] = useState<any[]>([]);
    const [phase] = useState(getPhase());
    const [loading, setLoading] = useState(true);
    
    // Modal Postar
    const [openPost, setOpenPost] = useState(false);
    const [url, setUrl] = useState('');
    const [legenda, setLegenda] = useState('');

    // Modal Investir
    const [investModal, setInvestModal] = useState<string | null>(null);
    const [valorInvest, setValorInvest] = useState('');

    // Modal Regras
    const [openRules, setOpenRules] = useState(false);

    const fetchMemes = () => {
        api.get('/arena/memes')
            .then(res => setMemes(res.data))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchMemes(); }, []);

    // Ações
    const handlePost = async () => {
        if (!url) return toast.error("Cade o link da imagem?");
        const toastId = toast.loading("Processando IPO...");
        try {
            await api.post('/arena/memes', { email: dbUser?.email, imagem_url: url, legenda });
            toast.success("IPO Lançado!", { id: toastId });
            setOpenPost(false);
            fetchMemes();
        } catch (e: any) { toast.error(e.response?.data?.error || "Erro no post", { id: toastId }); }
    };

    const handleInvest = async () => {
        const val = parseInt(valorInvest);
        if (!val || val <= 0) return toast.error("Valor inválido");
        
        const toastId = toast.loading("Comprando ações...");
        try {
            await api.post('/arena/memes/invest', { email: dbUser?.email, memeId: investModal, valor: val });
            
            if (dbUser) setDbUser({ ...dbUser, saldo_coins: dbUser.saldo_coins - val });
            
            toast.success("Ordem Executada!", { id: toastId });
            setInvestModal(null);
            fetchMemes();
        } catch (e: any) { toast.error(e.response?.data?.error || "Erro na compra", { id: toastId }); }
    };

    // Estilos Dinâmicos da Fase
    const isTrading = phase === 'TRADING';
    const headerColor = isTrading ? 'from-emerald-900 to-slate-900 border-emerald-500/30' : 'from-purple-900 to-slate-900 border-purple-500/30';
    const phaseIcon = isTrading ? <TrendingUp className="text-emerald-400"/> : <AddPhotoAlternate className="text-purple-400"/>;
    const phaseTitle = isTrading ? "PREGÃO ABERTO" : "FASE DE CRIAÇÃO";
    const phaseDesc = isTrading ? "Aposte nos melhores memes até 21h." : "O mercado fechou. Hora de criar os IPOs de amanhã.";

    return (
        <div className="pb-28 p-4 animate-fade-in max-w-lg mx-auto space-y-6">
            
            {/* HUD FASE DE MERCADO */}
            <div className={`bg-gradient-to-r ${headerColor} p-6 rounded-3xl border relative overflow-hidden shadow-2xl transition-all duration-500`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 scale-150">{phaseIcon}</div>
                
                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${isTrading ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isTrading ? 'text-emerald-400' : 'text-purple-400'}`}>
                                STATUS: {phase}
                            </p>
                        </div>
                        <h2 className="text-2xl font-black text-white italic uppercase">{phaseTitle}</h2>
                        <p className="text-[10px] text-slate-300 max-w-[200px] mt-1">{phaseDesc}</p>
                    </div>
                    
                    <button onClick={() => setOpenRules(true)} className="bg-black/30 p-2 rounded-full hover:bg-black/50 transition-colors">
                        <InfoOutlined className="text-white" fontSize="small"/>
                    </button>
                </div>

                {/* BOTÃO DE AÇÃO PRINCIPAL */}
                <div className="mt-6">
                    {isTrading ? (
                        <div className="bg-black/20 p-3 rounded-xl border border-white/10 text-center">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Volume Total</p>
                            <p className="text-xl font-black text-white">
                                {memes.reduce((acc, m) => acc + m.total_investido, 0).toLocaleString()} <span className="text-xs text-yellow-500">GC</span>
                            </p>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setOpenPost(true)}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                        >
                            <AddPhotoAlternate /> LANÇAR IPO (NOVO MEME)
                        </button>
                    )}
                </div>
            </div>

            {/* FEED */}
            {loading ? <div className="text-center py-20"><CircularProgress color="inherit"/></div> : (
                <div className="space-y-6">
                    {memes.length === 0 && (
                        <div className="text-center py-10 opacity-50 border-2 border-dashed border-slate-800 rounded-2xl">
                            <p className="text-xs font-bold">O Mercado está vazio hoje.</p>
                        </div>
                    )}

                    {memes.map((meme) => (
                        <div key={meme._id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                            {/* Header Post */}
                            <div className="p-4 flex items-center gap-3">
                                <UserAvatar user={{nome: meme.autor_nome, avatar_slug: meme.autor_avatar}} size="md" />
                                <div>
                                    <p className="text-xs font-black text-white">{meme.autor_nome}</p>
                                    <p className="text-[9px] text-slate-500 uppercase">Ticker: ${meme.autor_nome.split(' ')[0].toUpperCase()}</p>
                                </div>
                                <div className="ml-auto text-right">
                                    <span className="bg-slate-800 text-yellow-500 text-[10px] font-bold px-2 py-1 rounded">
                                        Vol: {meme.total_investido}
                                    </span>
                                </div>
                            </div>

                            {/* Imagem */}
                            <div className="relative aspect-square bg-black">
                                <img src={meme.imagem_url} className="w-full h-full object-contain" alt="Meme" />
                            </div>

                            {/* Ações */}
                            <div className="p-4">
                                <p className="text-sm text-slate-300 font-medium mb-4">
                                    <span className="font-bold text-white mr-2">{meme.autor_nome}</span>
                                    {meme.legenda}
                                </p>

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

            {/* MODAL REGRAS */}
            <Modal open={openRules} onClose={() => setOpenRules(false)} sx={{display:'flex', alignItems:'center', justifyContent:'center', p:4}}>
                <Box className="bg-slate-950 border border-slate-700 p-6 rounded-3xl max-w-sm outline-none">
                    <h3 className="text-xl font-black text-white italic uppercase mb-4">Regras do Mercado</h3>
                    <ul className="space-y-3 text-xs text-slate-300 list-disc pl-4">
                        <li><b className="text-purple-400">21:00 - 09:00:</b> Fase de Criação. Você pode postar (Lançar IPO).</li>
                        <li><b className="text-emerald-400">09:00 - 21:00:</b> Pregão. Você aposta GecaCoins nos memes que acha que vão bombar.</li>
                        <li><b className="text-yellow-400">21:00 (Fechamento):</b> O meme com maior volume vence.</li>
                        <li>Quem apostou no vencedor divide TODO o dinheiro de quem apostou nos perdedores (Parimutuel).</li>
                        <li>O Criador ganha Royalties fixos.</li>
                    </ul>
                </Box>
            </Modal>

            {/* MODAL INVESTIR */}
            <Modal open={!!investModal} onClose={() => setInvestModal(null)} sx={{display:'flex', alignItems:'center', justifyContent:'center', p:4}}>
                <Box className="bg-slate-900 border border-emerald-500/50 p-6 rounded-3xl w-full max-w-xs outline-none">
                    <h3 className="text-lg font-black text-white uppercase mb-2">Ordem de Compra</h3>
                    <p className="text-[10px] text-slate-400 mb-4">Quanto você quer investir neste ativo?</p>
                    <input 
                        type="number" 
                        placeholder="Valor em GC" 
                        value={valorInvest}
                        onChange={e => setValorInvest(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold mb-4 outline-none focus:border-emerald-500"
                    />
                    <button onClick={handleInvest} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase">CONFIRMAR ORDEM</button>
                </Box>
            </Modal>

            {/* MODAL POSTAR */}
            <Modal open={openPost} onClose={() => setOpenPost(false)} sx={{display:'flex', alignItems:'center', justifyContent:'center', p:4}}>
                <Box className="bg-slate-900 border border-purple-500/50 p-6 rounded-3xl w-full max-w-xs outline-none">
                    <h3 className="text-lg font-black text-white uppercase mb-2">Lançar IPO</h3>
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            placeholder="URL da Imagem (Link Direto)" 
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs outline-none focus:border-purple-500"
                        />
                        <input 
                            type="text" 
                            placeholder="Legenda..." 
                            value={legenda}
                            onChange={e => setLegenda(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs outline-none focus:border-purple-500"
                        />
                        <button onClick={handlePost} className="w-full bg-purple-600 text-white py-3 rounded-xl font-black text-xs uppercase">PUBLICAR</button>
                    </div>
                </Box>
            </Modal>
        </div>
    );
}