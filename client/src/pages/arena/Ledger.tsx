import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { 
    History, ArrowUpward, ArrowDownward, 
    SportsEsports, SwapHoriz, Refresh,
    ChevronLeft, ChevronRight,
    RocketLaunch, Storefront, AutoAwesome
} from '@mui/icons-material';
import UserAvatar from '../../components/arena/UserAvatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CircularProgress } from '@mui/material';

// Categorias Configuráveis
const CATEGORIES = [
    { id: 'ALL', label: 'Geral', icon: <History fontSize="small"/> },
    { id: 'GAME', label: 'Jogos', icon: <SportsEsports fontSize="small"/> },
    { id: 'P2P', label: 'Transf.', icon: <SwapHoriz fontSize="small"/> },
    { id: 'MEME', label: 'Memes', icon: <RocketLaunch fontSize="small"/> },
    { id: 'SYSTEM', label: 'Sistema', icon: <AutoAwesome fontSize="small"/> },
    // { id: 'SHOP', label: 'Loja', icon: <Storefront fontSize="small"/> }, // Futuro
];

export default function Ledger() {
    const [txs, setTxs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState('ALL');
    const [hasMore, setHasMore] = useState(true);

    const fetchLedger = () => {
        setLoading(true);
        // Passa a página e o filtro selecionado
        api.get(`/tokenomics/ledger?page=${page}&category=${filter}`)
            .then(res => {
                setTxs(res.data);
                setHasMore(res.data.length === 20);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    // Recarrega sempre que mudar página ou filtro
    useEffect(() => { fetchLedger(); }, [page, filter]);

    // Renderiza Ícone baseado na Categoria (Vem do Backend agora!)
    const renderIcon = (cat: string) => {
        switch(cat) {
            case 'GAME': return <SportsEsports className="text-purple-400" sx={{ fontSize: 16 }} />;
            case 'P2P': return <SwapHoriz className="text-cyan-400" sx={{ fontSize: 16 }} />;
            case 'MEME': return <RocketLaunch className="text-pink-400" sx={{ fontSize: 16 }} />;
            case 'SYSTEM': return <AutoAwesome className="text-yellow-400" sx={{ fontSize: 16 }} />;
            case 'SHOP': return <Storefront className="text-orange-400" sx={{ fontSize: 16 }} />;
            default: return <History className="text-slate-400" sx={{ fontSize: 16 }} />;
        }
    };

    return (
        <div className="p-4 pb-28 animate-fade-in space-y-6 max-w-lg mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Livro Razão</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Transparência Total</p>
                </div>
                <button 
                    onClick={fetchLedger}
                    className="p-2 bg-slate-800/50 rounded-full hover:bg-slate-700 transition-colors text-white border border-slate-700"
                >
                    <Refresh className={loading ? 'animate-spin' : ''} fontSize="small" />
                </button>
            </div>

            {/* BARRA DE FILTROS (Scroll Horizontal) */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => { setFilter(cat.id); setPage(0); }}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all active:scale-95
                            ${filter === cat.id 
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'}
                        `}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            {/* LISTA DE TRANSAÇÕES */}
            <div className="space-y-3 min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <CircularProgress size={30} color="secondary" />
                        <span className="text-xs font-mono text-slate-500 animate-pulse">Consultando Blockchain...</span>
                    </div>
                ) : txs.length === 0 ? (
                    <div className="text-center py-20 opacity-50 border-2 border-dashed border-slate-800 rounded-3xl">
                        <History sx={{ fontSize: 40 }} className="mb-2 text-slate-600" />
                        <p className="text-slate-400 text-sm font-bold">Nada encontrado.</p>
                        <p className="text-[10px] text-slate-600">Tente outro filtro.</p>
                    </div>
                ) : (
                    txs.map((tx, idx) => (
                        <div 
                            key={idx} 
                            className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center justify-between hover:border-slate-600 transition-all group animate-fade-in-up" 
                            style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                            
                            <div className="flex items-center gap-3">
                                {/* Avatar com Badge de Categoria */}
                                <div className="relative">
                                    <UserAvatar user={{ avatar_slug: tx.avatar, nome: tx.usuario }} size="sm" />
                                    <div className="absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-1 border border-slate-800 flex items-center justify-center shadow-sm">
                                        {renderIcon(tx.categoria)}
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                                            {tx.usuario.split(' ')[0]}
                                        </span>
                                        <span className="text-[9px] text-slate-600 font-mono bg-slate-950 px-1.5 rounded">
                                            {format(new Date(tx.data), "HH:mm • dd/MM", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium max-w-[160px] truncate mt-0.5">
                                        {tx.descricao}
                                    </p>
                                </div>
                            </div>

                            {/* Valor */}
                            <div className={`font-mono font-black text-sm flex flex-col items-end ${
                                tx.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                                <div className="flex items-center gap-1">
                                    {tx.tipo === 'ENTRADA' ? <ArrowDownward sx={{fontSize:10}}/> : <ArrowUpward sx={{fontSize:10}}/>}
                                    {tx.valor}
                                </div>
                                <span className="text-[8px] text-slate-600 font-bold uppercase tracking-wider opacity-60">
                                    {tx.categoria}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Paginação */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button 
                    disabled={page === 0 || loading}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all"
                >
                    <ChevronLeft fontSize="small" /> Anterior
                </button>

                <span className="text-[10px] font-mono text-slate-600 font-bold bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                    PÁGINA {page + 1}
                </span>

                <button 
                    disabled={!hasMore || loading}
                    onClick={() => setPage(p => p + 1)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all"
                >
                    Próximo <ChevronRight fontSize="small" />
                </button>
            </div>
        </div>
    );
}