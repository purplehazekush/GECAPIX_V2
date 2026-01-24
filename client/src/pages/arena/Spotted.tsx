import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
    VisibilityOff, Comment, Add, Send, 
    Whatshot, AccessTime
} from '@mui/icons-material';
import UserAvatar from '../../components/arena/UserAvatar';
import NewSpottedModal from '../../components/arena/NewSpottedModal';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { CircularProgress } from '@mui/material';

export default function ArenaSpotted() {
    const { dbUser, setDbUser } = useAuth();
    
    // Estados de Dados
    const [posts, setPosts] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    
    // Estados de Filtro
    const [periodo, setPeriodo] = useState('all'); // today, week, all
    const [sort, setSort] = useState('newest'); // newest, hot

    // Estados de UI
    const [modalOpen, setModalOpen] = useState(false);
    const [expandedPost, setExpandedPost] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [commenting, setCommenting] = useState(false);

    // RESET: Quando muda o filtro, limpa tudo e começa da página 1
    useEffect(() => {
        setPosts([]);
        setPage(1);
        setHasMore(true);
        fetchPosts(1, periodo, sort, true); // true = reset
    }, [periodo, sort]);

    // PAGINAÇÃO: Chama quando clica em "Carregar Mais"
    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPosts(nextPage, periodo, sort, false);
    };

    const fetchPosts = (pageNum: number, p: string, s: string, isReset: boolean) => {
        setLoading(true);
        api.get(`/arena/spotted?page=${pageNum}&limit=10&periodo=${p}&sort=${s}`)
            .then(res => {
                if (isReset) {
                    setPosts(res.data.posts);
                } else {
                    setPosts(prev => [...prev, ...res.data.posts]); // Append
                }
                setHasMore(res.data.hasMore);
            })
            .catch(() => toast.error("Erro ao carregar feed"))
            .finally(() => setLoading(false));
    };

    const handleComment = async (spottedId: string) => {
        if (!commentText.trim()) return;
        if ((dbUser?.saldo_coins || 0) < 5) return toast.error("Sem saldo (Custa 5 coins).");

        setCommenting(true);
        try {
            const res = await api.post('/arena/spotted/comentar', {
                email: dbUser?.email,
                spottedId,
                texto: commentText
            });

            // Atualiza o post específico dentro da lista sem recarregar tudo
            setPosts(prev => prev.map(p => p._id === spottedId ? res.data : p));
            setCommentText('');
            
            if(dbUser) setDbUser({ ...dbUser, saldo_coins: dbUser.saldo_coins - 5 });
            toast.success("Comentário enviado! -5 coins");
        } catch (e) {
            toast.error("Erro ao comentar.");
        } finally {
            setCommenting(false);
        }
    };

    return (
        <div className="pb-28 p-4 animate-fade-in space-y-4 max-w-lg mx-auto">
            
            {/* Header */}
            <header className="flex justify-between items-center bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm sticky top-2 z-40 shadow-xl">
                <div>
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter flex items-center gap-2">
                        SPOTTED <span className="text-cyan-400">GECA</span>
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <VisibilityOff sx={{ fontSize: 12 }} /> Anônimo & Seguro
                    </p>
                </div>
                <button 
                    onClick={() => setModalOpen(true)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-xl shadow-lg active:scale-95 transition-all"
                >
                    <Add />
                </button>
            </header>

            {/* BARRA DE FILTROS */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {/* Filtro de Ordenação */}
                <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 shrink-0">
                    <button 
                        onClick={() => setSort('newest')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 transition-all ${sort === 'newest' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                    >
                        <AccessTime sx={{fontSize:12}}/> Recentes
                    </button>
                    <button 
                        onClick={() => setSort('hot')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 transition-all ${sort === 'hot' ? 'bg-slate-700 text-orange-400' : 'text-slate-500'}`}
                    >
                        <Whatshot sx={{fontSize:12}}/> Em Alta
                    </button>
                </div>

                {/* Filtro de Tempo */}
                <select 
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="bg-slate-900 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl border border-slate-800 outline-none focus:border-cyan-500 appearance-none"
                >
                    <option value="all">📅 Todo o Período</option>
                    <option value="today">🔥 Hoje</option>
                    <option value="week">📅 Esta Semana</option>
                    <option value="month">📅 Este Mês</option>
                </select>
            </div>

            {/* FEED */}
            {posts.length === 0 && !loading ? (
                <div className="text-center py-20 opacity-50 border-2 border-dashed border-slate-800 rounded-3xl">
                    <p className="text-slate-400 text-sm font-bold">Nenhum post encontrado.</p>
                    <p className="text-[10px] text-slate-600">Mude os filtros ou poste algo!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map((post) => (
                        <div key={post._id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-slate-700 transition-colors">
                            
                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="bg-slate-800 p-2 rounded-full h-fit">
                                        <VisibilityOff className="text-slate-500" fontSize="small"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium whitespace-pre-wrap break-words">{post.mensagem}</p>
                                        
                                        {post.imagem_url && (
                                            <div className="mt-3 rounded-xl overflow-hidden border border-slate-800 bg-black">
                                                <img src={post.imagem_url} alt="Spotted" className="w-full object-contain max-h-80" />
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800/50">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                                                {formatDistanceToNow(new Date(post.data), { addSuffix: true, locale: ptBR })}
                                            </span>
                                            <button 
                                                onClick={() => setExpandedPost(expandedPost === post._id ? null : post._id)}
                                                className={`text-xs font-bold flex items-center gap-1 transition-colors px-2 py-1 rounded-lg ${
                                                    expandedPost === post._id ? 'bg-cyan-900/30 text-cyan-400' : 'text-slate-400 hover:text-cyan-400'
                                                }`}
                                            >
                                                <Comment fontSize="inherit" /> {post.comentarios?.length || 0}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COMENTÁRIOS */}
                            {expandedPost === post._id && (
                                <div className="bg-black/20 border-t border-slate-800 p-4 animate-fade-in">
                                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                                        {post.comentarios?.map((com: any, idx: number) => (
                                            <div key={idx} className="flex gap-2">
                                                <UserAvatar user={{ nome: com.user_nome, avatar_slug: com.user_avatar }} size="sm" />
                                                <div className="bg-slate-800/50 p-2 rounded-r-xl rounded-bl-xl flex-1">
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-[10px] text-cyan-200 font-bold">{com.user_nome}</p>
                                                        <span className="text-[8px] text-slate-600">{formatDistanceToNow(new Date(com.data), { locale: ptBR })}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-300 break-words">{com.texto}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {(!post.comentarios || post.comentarios.length === 0) && (
                                            <p className="text-center text-[10px] text-slate-600 py-2">
                                                Seja o primeiro a fofocar (Custa 5 coins)
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-2 items-center">
                                        <input 
                                            value={commentText}
                                            onChange={e => setCommentText(e.target.value)}
                                            placeholder="Comentar..."
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                                            onKeyDown={e => e.key === 'Enter' && handleComment(post._id)}
                                        />
                                        <button 
                                            onClick={() => handleComment(post._id)}
                                            disabled={commenting || !commentText}
                                            className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-xl disabled:opacity-50"
                                        >
                                            {commenting ? <CircularProgress size={16} color="inherit" /> : <Send fontSize="small"/>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {/* LOADING STATE / LOAD MORE */}
                    {loading && (
                        <div className="flex justify-center py-4">
                            <CircularProgress size={24} color="inherit" />
                        </div>
                    )}
                    
                    {!loading && hasMore && posts.length > 0 && (
                        <button 
                            onClick={handleLoadMore}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase rounded-xl transition-colors border border-slate-700"
                        >
                            Carregar Mais Fofocas 👇
                        </button>
                    )}
                    
                    {!loading && !hasMore && posts.length > 0 && (
                        <p className="text-center text-[10px] text-slate-600 uppercase font-bold pt-4 pb-8">
                            — Você chegou ao fim da internet —
                        </p>
                    )}
                </div>
            )}

            <NewSpottedModal open={modalOpen} onClose={() => setModalOpen(false)} onRefresh={() => {
                setPeriodo('all'); setSort('newest'); // Reseta filtros ao postar
                setPosts([]); setPage(1); fetchPosts(1, 'all', 'newest', true);
            }} />
        </div>
    );
}