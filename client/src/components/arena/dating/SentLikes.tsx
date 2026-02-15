import { useState, useEffect } from 'react';
import { Star, LocalFireDepartment, Person } from '@mui/icons-material';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { ProfileModal } from './ProfileModal';
import { SuperLikeModal } from './SuperLikeModal'; // Reutilizamos o mesmo modal

export const SentLikes = () => {
    const { dbUser, reloadUser } = useAuth();
    const [likes, setLikes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados de Controle
    const [selectedProfile, setSelectedProfile] = useState<any>(null); // Ver perfil completo
    const [upgradeTarget, setUpgradeTarget] = useState<any>(null); // Quem vai receber o Super Like

    useEffect(() => {
        api.get('/dating/sent')
            .then(res => setLikes(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // 1. Abre o Modal de Investimento
    const requestUpgrade = (e: any, profile: any) => {
        e.stopPropagation();
        setUpgradeTarget(profile);
    };

    // 2. Confirma o envio (Callback do Modal)
    const handleConfirmUpgrade = async (amount: number) => {
        if (!upgradeTarget) return;
        
        const toastId = toast.loading("Investindo...");
        try {
            await api.post('/dating/superlike', { targetProfileId: upgradeTarget._id, amount });
            
            toast.success(`Super Like Enviado!`, { id: toastId });
            
            // Atualiza UI Localmente (Marca como Super)
            setLikes(prev => prev.map(p => p._id === upgradeTarget._id ? { ...p, isSuper: true } : p));
            
            reloadUser(); // Atualiza saldo global
            setUpgradeTarget(null); // Fecha modal
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Erro", { id: toastId });
        }
    };

    if (loading) return <div className="p-10 text-center text-xs text-slate-500 animate-pulse">Carregando histórico...</div>;
    
    if (likes.length === 0) return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Person sx={{fontSize: 40}} className="mb-2 opacity-50"/>
            <p className="text-xs">Você ainda não curtiu ninguém.</p>
        </div>
    );

    return (
        <>
            <div className="grid grid-cols-2 gap-3 pb-24 animate-slide-up">
                {likes.map((profile) => (
                    <div 
                        key={profile._id} 
                        onClick={() => setSelectedProfile(profile)}
                        className={`rounded-2xl overflow-hidden border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 relative ${
                            profile.isSuper ? 'bg-slate-900 border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-slate-900 border-slate-800'
                        }`}
                    >
                        {/* Foto */}
                        <div className="h-36 bg-slate-950 relative">
                            {profile.fotos[0] && <img src={profile.fotos[0]} className="w-full h-full object-cover" />}
                            
                            {/* Overlay Info */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent p-3 pt-8">
                                <p className="text-white font-black text-sm truncate flex items-center gap-1">
                                    {profile.nome.split(' ')[0]}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate uppercase font-bold">{profile.curso}</p>
                            </div>
                        </div>
                        
                        {/* Rodapé: Ação ou Status */}
                        {profile.isSuper ? (
                            <div className="w-full py-2 bg-yellow-500/10 text-yellow-500 font-bold text-[9px] flex items-center justify-center gap-1 border-t border-yellow-500/20 uppercase tracking-wide">
                                <LocalFireDepartment sx={{fontSize: 12}} /> Super Like
                            </div>
                        ) : (
                            <button 
                                onClick={(e) => requestUpgrade(e, profile)}
                                className="w-full py-2 bg-slate-800 hover:bg-yellow-500/20 text-slate-500 hover:text-yellow-400 font-bold text-[9px] flex items-center justify-center gap-1 transition-colors border-t border-slate-800 uppercase tracking-wide group"
                            >
                                <Star sx={{fontSize: 12}} className="group-hover:animate-spin-slow"/> Upgrade Super
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal de Perfil Completo */}
            {selectedProfile && <ProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />}
            
            {/* Modal de Upgrade (Super Like) */}
            {upgradeTarget && (
                <SuperLikeModal 
                    targetName={upgradeTarget.nome}
                    // 🔴 ANTES: userBalance={user?.saldo_coins || 0}
                    // 🟢 DEPOIS:
                    userBalance={dbUser?.saldo_coins || 0}
                    onClose={() => setUpgradeTarget(null)}
                    onConfirm={handleConfirmUpgrade}
                />
            )}
        </>
    );
};