import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
    VisibilityOff, Comment, Add, Send 
} from '@mui/icons-material';
import UserAvatar from '../../components/arena/UserAvatar';
import NewSpottedModal from '../../components/arena/NewSpottedModal';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { CircularProgress } from '@mui/material';

export default function ArenaSpotted() {
    const { dbUser, setDbUser } = useAuth();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    
    // Controle de Comentários (Qual post está expandido e texto do comentário)
    const [expandedPost, setExpandedPost] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [commenting, setCommenting] = useState(false);

    const fetchPosts = () => {
        setLoading(true);
        api.get('/arena/spotted')
            .then(res => setPosts(res.data))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchPosts(); }, []);

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

            // Atualiza o post localmente
            setPosts(prev => prev.map(p => p._id === spottedId ? res.data : p));
            setCommentText('');
            
            // Atualiza saldo visual
            if(dbUser) setDbUser({ ...dbUser, saldo_coins: dbUser.saldo_coins - 5 });
            
            toast.success("Comentário enviado! -5 coins");
        } catch (e) {
            toast.error("Erro ao comentar.");
        } finally {
            setCommenting(false);
        }
    };

    return (
        <div className="pb-28 p-4 animate-fade-in space-y-6 max-w-lg mx-auto">
            
            {/* Header */}
            <header className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm sticky top-2 z-40">
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

            {/* FEED */}
            {loading ? (
                <div className="flex justify-center py-20"><CircularProgress color="inherit" /></div>
            ) : posts.length === 0 ? (
                <div className="text-center py-20 opacity-50 border-2 border-dashed border-slate-800 rounded-3xl">
                    <p className="text-slate-400 text-sm font-bold">Nenhum segredo revelado.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map((post) => (
                        <div key={post._id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                            
                            {/* CORPO DO POST */}
                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="bg-slate-800 p-2 rounded-full">
                                        <VisibilityOff className="text-slate-500" fontSize="small"/>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white text-sm font-medium whitespace-pre-wrap">{post.mensagem}</p>
                                        
                                        {post.imagem_url && (
                                            <div className="mt-3 rounded-xl overflow-hidden border border-slate-800">
                                                <img src={post.imagem_url} alt="Spotted" className="w-full object-cover max-h-64" />
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center mt-3">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                                                {formatDistanceToNow(new Date(post.data), { addSuffix: true, locale: ptBR })}
                                            </span>
                                            <button 
                                                onClick={() => setExpandedPost(expandedPost === post._id ? null : post._id)}
                                                className="text-xs font-bold text-cyan-400 flex items-center gap-1 hover:text-cyan-300 transition-colors"
                                            >
                                                <Comment fontSize="inherit" /> {post.comentarios.length} Comentários
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ÁREA DE COMENTÁRIOS (EXPANDÍVEL) */}
                            {expandedPost === post._id && (
                                <div className="bg-slate-950/50 border-t border-slate-800 p-4 animate-fade-in">
                                    
                                    {/* Lista de Comentários */}
                                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                                        {post.comentarios.map((com: any, idx: number) => (
                                            <div key={idx} className="flex gap-2">
                                                <UserAvatar user={{ nome: com.user_nome, avatar_slug: com.user_avatar }} size="sm" />
                                                <div className="bg-slate-800/50 p-2 rounded-r-xl rounded-bl-xl flex-1">
                                                    <p className="text-[10px] text-cyan-200 font-bold">{com.user_nome}</p>
                                                    <p className="text-xs text-slate-300">{com.texto}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {post.comentarios.length === 0 && <p className="text-center text-[10px] text-slate-600">Seja o primeiro a comentar (Custa 5 coins)</p>}
                                    </div>

                                    {/* Input */}
                                    <div className="flex gap-2 items-center">
                                        <input 
                                            value={commentText}
                                            onChange={e => setCommentText(e.target.value)}
                                            placeholder="Comentar (5 coins)..."
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
                </div>
            )}

            <NewSpottedModal open={modalOpen} onClose={() => setModalOpen(false)} onRefresh={fetchPosts} />
        </div>
    );
}