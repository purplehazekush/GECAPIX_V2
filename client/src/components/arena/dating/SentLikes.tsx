import { useState, useEffect } from 'react';
import { Star, Verified } from '@mui/icons-material';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

export const SentLikes = () => {
    const [likes, setLikes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/dating/sent')
            .then(res => setLikes(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleUpgrade = async (id: string, nome: string) => {
        if(!confirm(`Gastar 1 Glue + 500 Coins para mandar SUPER LIKE para ${nome}?`)) return;
        
        const toastId = toast.loading("Enviando Super Like...");
        try {
            await api.post('/dating/superlike', { targetProfileId: id });
            toast.success(`Super Like enviado para ${nome}!`, { id: toastId });
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Erro no envio", { id: toastId });
        }
    };

    if (loading) return <div className="p-10 text-center text-xs text-slate-500 animate-pulse">Carregando histórico...</div>;

    if (likes.length === 0) return <div className="p-10 text-center text-xs text-slate-500">Você ainda não deu like em ninguém.</div>;

    return (
        <div className="grid grid-cols-2 gap-3 pb-24 animate-slide-up">
            {likes.map((profile) => (
                <div key={profile._id} className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 group relative">
                    <div className="h-32 bg-slate-950 relative">
                        {profile.fotos[0] && <img src={profile.fotos[0]} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-2 pt-8">
                            <p className="text-white font-bold text-sm truncate">{profile.nome.split(' ')[0]}</p>
                            <p className="text-[9px] text-slate-400 truncate">{profile.curso}</p>
                        </div>
                    </div>
                    
                    {/* Botão de Upgrade */}
                    <button 
                        onClick={() => handleUpgrade(profile._id, profile.nome)}
                        className="w-full py-2 bg-slate-800 hover:bg-yellow-500/10 text-yellow-500 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors border-t border-slate-800"
                    >
                        <Star sx={{fontSize: 12}} /> UPGRADE SUPER
                    </button>
                    
                    {/* Badge "Já Curtiu" */}
                    <div className="absolute top-2 right-2 bg-purple-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Verified sx={{fontSize:10}}/> LIKED
                    </div>
                </div>
            ))}
        </div>
    );
};