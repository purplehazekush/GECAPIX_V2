import { useState, useEffect } from 'react';
import { Star, LocalFireDepartment } from '@mui/icons-material';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import { ProfileModal } from './ProfileModal'; // <--- Import Novo

export const SentLikes = () => {
    const [likes, setLikes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProfile, setSelectedProfile] = useState<any>(null); // Para o Modal

    useEffect(() => {
        api.get('/dating/sent')
            .then(res => setLikes(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleUpgrade = async (e: any, id: string, nome: string) => {
        e.stopPropagation(); // Não abre o modal
        if(!confirm(`⚠️ ATENÇÃO: GASTAR 1 GLUE + 500 COINS?\n\nIsso enviará seu telefone DIRETAMENTE para a caixa de entrada de ${nome}, furando a fila de matches.`)) return;
        
        const toastId = toast.loading("Enviando Super Like...");
        try {
            await api.post('/dating/superlike', { targetProfileId: id });
            toast.success(`Super Like enviado!`, { id: toastId });
            // Atualiza localmente para desabilitar botão
            setLikes(prev => prev.map(p => p._id === id ? { ...p, isSuper: true } : p));
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Erro no envio", { id: toastId });
        }
    };

    if (loading) return <div className="p-10 text-center text-xs text-slate-500 animate-pulse">Carregando histórico...</div>;
    if (likes.length === 0) return <div className="p-10 text-center text-xs text-slate-500">Você ainda não curtiu ninguém.</div>;

    return (
        <>
            <div className="grid grid-cols-2 gap-3 pb-24 animate-slide-up">
                {likes.map((profile) => (
                    <div 
                        key={profile._id} 
                        onClick={() => setSelectedProfile(profile)}
                        className={`rounded-xl overflow-hidden border group relative cursor-pointer transition-all ${profile.isSuper ? 'bg-slate-900 border-yellow-500/30' : 'bg-slate-900 border-slate-800'}`}
                    >
                        <div className="h-32 bg-slate-950 relative">
                            {profile.fotos[0] && <img src={profile.fotos[0]} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-2 pt-8">
                                <p className="text-white font-bold text-sm truncate">{profile.nome.split(' ')[0]}</p>
                                <p className="text-[9px] text-slate-400 truncate">{profile.curso}</p>
                            </div>
                        </div>
                        
                        {/* Botão de Ação ou Status */}
                        {profile.isSuper ? (
                            <div className="w-full py-2 bg-yellow-500/10 text-yellow-500 font-bold text-[10px] flex items-center justify-center gap-1 border-t border-yellow-500/20">
                                <LocalFireDepartment sx={{fontSize: 12}} /> SUPER LIKE ENVIADO
                            </div>
                        ) : (
                            <button 
                                onClick={(e) => handleUpgrade(e, profile._id, profile.nome)}
                                className="w-full py-2 bg-slate-800 hover:bg-yellow-500/10 text-slate-500 hover:text-yellow-500 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors border-t border-slate-800"
                            >
                                <Star sx={{fontSize: 12}} /> UPGRADE SUPER
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal */}
            {selectedProfile && <ProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />}
        </>
    );
};