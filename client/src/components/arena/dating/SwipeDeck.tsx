import { useState, useEffect } from 'react';
import { Close, Favorite, Star } from '@mui/icons-material';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

interface Candidate {
    _id: string;
    nome: string;
    curso: string;
    bio: string;
    fotos: string[];
    altura: string;
    biotipo: string;
    bebe: string;
    fuma: string;
    festa: string;
}

export const SwipeDeck = ({ filters }: { filters: any }) => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [current, setCurrent] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            // Converte objeto filters em query string
            const query = new URLSearchParams(filters).toString();
            const res = await api.get(`/dating/candidates?${query}`);
            setCandidates(res.data);
            setCurrent(0);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCandidates(); }, [filters]);

    const handleInteraction = async (type: 'like' | 'dislike' | 'super') => {
        if (!candidates[current]) return;
        const targetId = candidates[current]._id;

        // Animação visual (simples troca por enquanto)
        // Em produção usaria framer-motion para deslizar
        
        if (type === 'like') {
            try {
                await api.post('/dating/like', { targetProfileId: targetId });
                toast.success("Like enviado!", { icon: '❤️' });
            } catch (e: any) { return toast.error(e.response?.data?.error || "Sem saldo!"); }
        } else if (type === 'super') {
            const confirmMsg = 
                `🔥 ENVIAR SUPER LIKE?\n\n` +
                `Isso custará 1 GLUE + 500 COINS.\n\n` +
                `Efeito: Seu telefone será revelado IMEDIATAMENTE na caixa de entrada de ${candidates[current].nome}, sem precisar de match recíproco.\n\n` +
                `Continuar?`;

            if(!confirm(confirmMsg)) return;

            try {
                await api.post('/dating/superlike', { targetProfileId: targetId });
                toast.success("SUPER LIKE!", { icon: '🔥', style: { background: '#f59e0b', color: '#fff' } });
            } catch (e: any) { return toast.error(e.response?.data?.error || "Falta Glue!"); }
        }

        // Avança
        if (current < candidates.length - 1) {
            setCurrent(c => c + 1);
        } else {
            setCandidates([]); // Acabou a pilha
        }
    };

    if (loading) return <div className="p-20 text-center text-slate-500 animate-pulse">Procurando pessoas...</div>;

    if (candidates.length === 0) {
        return (
            <div className="text-center p-10 flex flex-col items-center justify-center h-[60vh]">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Favorite className="text-slate-600" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Acabou por hoje!</h3>
                <p className="text-slate-500 text-sm mb-6">Volte mais tarde para ver novos perfis.</p>
                <button onClick={fetchCandidates} className="text-purple-400 text-xs font-bold uppercase hover:underline">Tentar recarregar</button>
            </div>
        );
    }

    const profile = candidates[current];

    return (
        <div className="relative h-[calc(100vh-200px)] max-h-[600px] w-full max-w-sm mx-auto animate-fade-in">
            {/* O CARTÃO */}
            <div className="absolute inset-0 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
                
                {/* Foto */}
                <div className="relative h-[65%] w-full bg-slate-950">
                    {profile.fotos[0] ? (
                        <img src={profile.fotos[0]} alt={profile.nome} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600 text-xs">SEM FOTO</div>
                    )}
                    
                    {/* Gradiente Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    
                    {/* Info Principal */}
                    <div className="absolute bottom-4 left-4 right-4">
                        <h2 className="text-2xl font-black text-white drop-shadow-md">{profile.nome.split(' ')[0]}</h2>
                        <p className="text-sm text-purple-300 font-bold drop-shadow-md uppercase tracking-wider">{profile.curso}</p>
                    </div>
                </div>

                {/* Detalhes */}
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    <p className="text-sm text-slate-300 leading-relaxed italic">"{profile.bio}"</p>
                    
                    <div className="flex flex-wrap gap-2">
                        <span className="badge-tag">{profile.altura}</span>
                        <span className="badge-tag">{profile.biotipo}</span>
                        <span className="badge-tag">{profile.festa}</span>
                        {profile.bebe !== '❌ Não bebo' && <span className="badge-tag">{profile.bebe}</span>}
                    </div>
                </div>
            </div>

            {/* BOTÕES DE AÇÃO (Floating) */}
            <div className="absolute -bottom-6 left-0 right-0 flex justify-center gap-6 items-center z-20">
                
                {/* Dislike */}
                <button 
                    onClick={() => handleInteraction('dislike')}
                    className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 text-rose-500 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                >
                    <Close fontSize="large" />
                </button>

                {/* Super Like */}
                <div className="relative group">
                    <button 
                        onClick={() => handleInteraction('super')}
                        className="w-12 h-12 rounded-full bg-slate-800 border border-yellow-500/30 text-yellow-400 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                    >
                        <Star />
                    </button>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-slate-950 text-yellow-500 px-2 py-1 rounded border border-yellow-500/20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        1 Glue + 500 C
                    </span>
                </div>

                {/* Like */}
                <div className="relative group">
                    <button 
                        onClick={() => handleInteraction('like')}
                        className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-900/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                    >
                        <Favorite fontSize="large" />
                    </button>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-slate-950 text-purple-400 px-2 py-1 rounded border border-purple-500/20 whitespace-nowrap">
                        -50 Coins
                    </span>
                </div>
            </div>
        </div>
    );
};