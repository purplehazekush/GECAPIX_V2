import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
    MonetizationOn, Science, Pix, SwapHoriz, 
    AddCircle, ShoppingCart} from '@mui/icons-material';
import { Modal, Box, CircularProgress, Tab, Tabs } from '@mui/material';
import toast from 'react-hot-toast';
import UserAvatar from '../../components/arena/UserAvatar';

// Tabs
function CustomTabPanel(props: any) {
    const { children, value, index, ...other } = props;
    return (
        <div hidden={value !== index} {...other} className="animate-fade-in">
            {value === index && children}
        </div>
    );
}

export default function ArenaStore() {
    const { dbUser, setDbUser } = useAuth();
    const [tab, setTab] = useState(0);
    const [ofertas, setOfertas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Modal Criar Oferta
    const [openModal, setOpenModal] = useState(false);
    const [precoVenda, setPrecoVenda] = useState('');

    const fetchOfertas = () => {
        setLoading(true);
        api.get('/store/p2p')
            .then(res => setOfertas(res.data))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (tab === 1) fetchOfertas();
    }, [tab]);

    // --- AÇÕES DO P2P ---
    const handleCriarOferta = async () => {
        const preco = parseInt(precoVenda);
        if (!preco || preco < 100) return toast.error("Preço mínimo: 100 GC");
        if ((dbUser?.saldo_glue || 0) < 1) return toast.error("Sem GLUE para vender.");

        const toastId = toast.loading("Criando ordem...");
        try {
            await api.post('/store/p2p/criar', { email: dbUser?.email, preco_coins: preco });
            
            toast.success("Ordem criada!", { id: toastId });
            setOpenModal(false);
            setPrecoVenda('');
            fetchOfertas();
            // Atualiza saldo visual
            if(dbUser) setDbUser({...dbUser, saldo_glue: dbUser.saldo_glue - 1});
        } catch (e) { toast.error("Erro ao criar.", { id: toastId }); }
    };

    const handleComprar = async (ordemId: string, preco: number) => {
        if ((dbUser?.saldo_coins || 0) < preco) return toast.error("Saldo insuficiente.");
        
        const toastId = toast.loading("Processando câmbio...");
        try {
            await api.post('/store/p2p/comprar', { email: dbUser?.email, ordemId });
            
            toast.success("Compra realizada! +1 GLUE", { id: toastId });
            fetchOfertas();
            // Atualiza saldo visual
            if(dbUser) setDbUser({
                ...dbUser, 
                saldo_coins: dbUser.saldo_coins - preco,
                saldo_glue: (dbUser.saldo_glue || 0) + 1
            });
        } catch (e) { toast.error("Erro na compra.", { id: toastId }); }
    };

    // --- UI ---
    return (
        <div className="pb-28 p-4 animate-fade-in space-y-4 max-w-lg mx-auto">
            
            {/* Header */}
            <header className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-2">
                        LOJA <ShoppingCart className="text-pink-500" fontSize="large"/>
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Adquira GLUE ou negocie Coins
                    </p>
                </div>
                <div className="text-right bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Seu Saldo</p>
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-pink-400 font-black text-xs flex items-center gap-1"><Science sx={{fontSize:14}}/> {dbUser?.saldo_glue || 0}</span>
                        <span className="text-yellow-400 font-black text-xs flex items-center gap-1"><MonetizationOn sx={{fontSize:14}}/> {dbUser?.saldo_coins || 0}</span>
                    </div>
                </div>
            </header>

            {/* Abas */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" indicatorColor="secondary" variant="fullWidth">
                <Tab label={<span className="font-black text-xs">💎 OFICIAL</span>} />
                <Tab label={<span className="font-black text-xs">⚖️ P2P MARKET</span>} />
            </Tabs>

            {/* ABA 0: LOJA OFICIAL (PIX) */}
            <CustomTabPanel value={tab} index={0}>
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-pink-900 to-slate-900 p-6 rounded-3xl border border-pink-500/30 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-20"><Science sx={{fontSize: 100}}/></div>
                        <h3 className="text-2xl font-black text-white italic relative z-10">PACOTE ÚNICO</h3>
                        <p className="text-pink-200 text-xs mb-4 relative z-10">Recarga de Hard Currency</p>
                        
                        <div className="bg-slate-950/80 backdrop-blur rounded-2xl p-4 inline-block border border-pink-500/50 mb-4 relative z-10">
                            <span className="block text-4xl font-black text-white">1 GLUE</span>
                            <span className="block text-sm font-bold text-slate-400">= R$ 4,20</span>
                        </div>

                        <button 
                            onClick={() => toast("Integração PIX vindo no próximo commit!", { icon: '🚧' })}
                            className="w-full bg-pink-600 hover:bg-pink-500 text-white py-3 rounded-xl font-black text-sm uppercase shadow-lg shadow-pink-900/40 active:scale-95 transition-all flex items-center justify-center gap-2 relative z-10"
                        >
                            <Pix /> COMPRAR VIA PIX
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-slate-500 px-4">
                        O GLUE é usado para acessar o Oráculo IA. A venda oficial sustenta os custos de servidor e API da OpenAI.
                    </p>
                </div>
            </CustomTabPanel>

            {/* ABA 1: MERCADO P2P */}
            <CustomTabPanel value={tab} index={1}>
                <div className="space-y-4">
                    {/* Criar Oferta */}
                    <button 
                        onClick={() => setOpenModal(true)}
                        className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all"
                    >
                        <AddCircle className="text-emerald-400"/> VENDER MEU GLUE
                    </button>

                    {/* Lista de Ofertas */}
                    {loading ? <div className="text-center py-10"><CircularProgress color="inherit"/></div> : (
                        <div className="space-y-2">
                            {ofertas.length === 0 && (
                                <div className="text-center py-10 opacity-50 border-2 border-dashed border-slate-800 rounded-2xl">
                                    <SwapHoriz sx={{fontSize: 40}} className="mb-2"/>
                                    <p className="text-xs font-bold">Mercado vazio.</p>
                                    <p className="text-[10px]">Seja o primeiro a vender!</p>
                                </div>
                            )}

                            {ofertas.map((offer) => (
                                <div key={offer._id} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <UserAvatar user={{nome: offer.vendedor_nome, avatar_slug: offer.vendedor_avatar}} size="sm" />
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Vendedor</p>
                                            <p className="text-xs font-black text-white">{offer.vendedor_nome}</p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 mb-1">
                                            <span className="text-xs font-bold text-slate-400">1 GLUE = </span>
                                            <span className="text-sm font-black text-yellow-400">{offer.preco_coins} GC</span>
                                        </div>
                                        
                                        {offer.vendedor_id === dbUser?._id ? (
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">Sua oferta</span>
                                        ) : (
                                            <button 
                                                onClick={() => handleComprar(offer._id, offer.preco_coins)}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all"
                                            >
                                                COMPRAR
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CustomTabPanel>

            {/* MODAL CRIAR OFERTA */}
            <Modal open={openModal} onClose={() => setOpenModal(false)} sx={{display:'flex', alignItems:'center', justifyContent:'center', p:2}}>
                <Box className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 w-full max-w-xs outline-none">
                    <h3 className="text-xl font-black text-white italic uppercase mb-1">Vender Glue</h3>
                    <p className="text-[10px] text-slate-400 mb-4">Defina quantos GecaCoins você quer receber por 1 GLUE.</p>
                    
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4 flex items-center gap-2">
                        <MonetizationOn className="text-yellow-400"/>
                        <input 
                            type="number" 
                            placeholder="Preço em Coins (ex: 5000)"
                            value={precoVenda}
                            onChange={e => setPrecoVenda(e.target.value)}
                            className="bg-transparent text-white font-black text-lg w-full outline-none"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setOpenModal(false)} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold text-xs">CANCELAR</button>
                        <button onClick={handleCriarOferta} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-xs">CRIAR</button>
                    </div>
                </Box>
            </Modal>
        </div>
    );
}