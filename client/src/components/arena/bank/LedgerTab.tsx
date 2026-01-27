// client/src/components/arena/bank/LedgerTab.tsx
import { useEffect, useState } from 'react';
import { 
    History, ArrowUpward, ArrowDownward, 
    SportsEsports, SwapHoriz, Refresh,
    ChevronLeft, ChevronRight,
    RocketLaunch, Storefront, AutoAwesome
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import UserAvatar from '../UserAvatar'; // Ajuste o path se necessário
import { api } from '../../../lib/api'; // Ajuste o path

const CATEGORIES = [
    { id: 'ALL', label: 'Tudo', icon: <History fontSize="small"/> },
    { id: 'SYSTEM', label: 'Sistema', icon: <AutoAwesome fontSize="small"/> },
    { id: 'GAME', label: 'Jogos', icon: <SportsEsports fontSize="small"/> },
    { id: 'P2P', label: 'Transf.', icon: <SwapHoriz fontSize="small"/> },
    { id: 'MEME', label: 'Memes', icon: <RocketLaunch fontSize="small"/> },
    { id: 'SHOP', label: 'Loja', icon: <Storefront fontSize="small"/> },
];

export const LedgerTab = () => {
    const [txs, setTxs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState('ALL');
    const [hasMore, setHasMore] = useState(true);

    const fetchLedger = () => {
        setLoading(true);
        api.get(`/tokenomics/ledger?page=${page}&category=${filter}`)
            .then(res => {
                setTxs(res.data);
                setHasMore(res.data.length === 20); // Assumindo limit=20 no back
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchLedger(); }, [page, filter]);

    const renderIcon = (cat: string) => {
        switch(cat) {
            case 'GAME': return <SportsEsports className="text-purple-400" sx={{ fontSize: 14 }} />;
            case 'P2P': return <SwapHoriz className="text-cyan-400" sx={{ fontSize: 14 }} />;
            case 'MEME': return <RocketLaunch className="text-pink-400" sx={{ fontSize: 14 }} />;
            case 'SYSTEM': return <AutoAwesome className="text-yellow-400" sx={{ fontSize: 14 }} />;
            case 'SHOP': return <Storefront className="text-orange-400" sx={{ fontSize: 14 }} />;
            default: return <History className="text-slate-400" sx={{ fontSize: 14 }} />;
        }
    };

    return (
        <div className="space-y-4 animate-slide-up">
            
            {/* Header com Refresh */}
            <div className="flex justify-between items-center bg-slate-900 p-3 rounded-2xl border border-slate-800">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-2">
                    Últimas 20 transações globais
                </p>
                <button onClick={fetchLedger} className="p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <Refresh className={loading ? 'animate-spin' : ''} fontSize="small" />
                </button>
            </div>

            {/* Filtros Horizontais */}
            <div className="flex gap-2 overflow-x-auto pb-2 px-1 no-scrollbar">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => { setFilter(cat.id); setPage(0); }}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all active:scale-95
                            ${filter === cat.id 
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}
                        `}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            {/* Lista */}
            <div className="space-y-2 min-h-[300px]">
                {loading ? (
                    <div className="flex justify-center py-10"><CircularProgress size={24} color="inherit" className="text-slate-600"/></div>
                ) : txs.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <History sx={{ fontSize: 30 }} className="text-slate-600 mb-2" />
                        <p className="text-xs text-slate-500">Nada encontrado aqui.</p>
                    </div>
                ) : (
                    txs.map((tx, idx) => (
                        <div key={idx} className="bg-slate-900/50 border border-slate-800/50 p-3 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <UserAvatar user={{ avatar_slug: tx.avatar, nome: tx.usuario }} size="sm" />
                                    <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-800">
                                        {renderIcon(tx.categoria)}
                                    </div>
                                </div>
                                <div className="max-w-[140px]">
                                    <p className="text-xs font-bold text-slate-200 truncate">{tx.usuario}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{tx.descricao}</p>
                                    <p className="text-[9px] text-slate-600 font-mono mt-0.5">
                                        {format(new Date(tx.data), "dd/MM • HH:mm", { locale: ptBR })}
                                    </p>
                                </div>
                            </div>
                            <div className={`text-right font-mono font-bold text-xs ${tx.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                <div className="flex items-center justify-end gap-1">
                                    {tx.tipo === 'ENTRADA' ? '+' : '-'}{tx.valor}
                                    {tx.tipo === 'ENTRADA' ? <ArrowDownward sx={{fontSize:10}}/> : <ArrowUpward sx={{fontSize:10}}/>}
                                </div>
                                <span className="text-[8px] text-slate-600 uppercase bg-slate-950 px-1.5 py-0.5 rounded mt-1 inline-block">
                                    {tx.categoria || 'OUTROS'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Paginação Compacta */}
            <div className="flex justify-center items-center gap-4 pt-2">
                <button 
                    disabled={page === 0 || loading}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    className="p-2 rounded-full bg-slate-900 border border-slate-800 disabled:opacity-30 hover:bg-slate-800"
                >
                    <ChevronLeft fontSize="small" className="text-slate-400"/>
                </button>
                <span className="text-[10px] font-mono text-slate-500 font-bold">PÁG {page + 1}</span>
                <button 
                    disabled={!hasMore || loading}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 rounded-full bg-slate-900 border border-slate-800 disabled:opacity-30 hover:bg-slate-800"
                >
                    <ChevronRight fontSize="small" className="text-slate-400"/>
                </button>
            </div>
        </div>
    );
};