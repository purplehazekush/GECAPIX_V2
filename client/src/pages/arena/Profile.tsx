import { useAuth } from '../../context/AuthContext';
import UserAvatar from '../../components/arena/UserAvatar';
import { Chip } from '@mui/material';
import { EmojiEvents, History, Logout } from '@mui/icons-material'; // Importe o Logout


export default function ArenaProfile() {
    const { dbUser, user, logout } = useAuth();

    // Dicionário de Badges (No futuro isso vem do banco)
    const badgeDetails: Record<string, { nome: string, desc: string, icon: string }> = {
        'cervejeiro_nv1': { nome: 'Cervejeiro Júnior', desc: 'Comprou 10 cervejas', icon: '🍺' },
        'troll': { nome: 'Troll Master', desc: 'Usou 5 sabotagens', icon: '🤡' },
        'baleia': { nome: 'Baleia', desc: 'Gastou muito dinheiro', icon: '🐳' },
        'vip': { nome: 'VIP', desc: 'Cliente especial', icon: '💎' },
    };

    return (
        <div className="pb-24 animate-fade-in">
            {/* CAPA + INFO PESSOAL */}
            <div className="bg-slate-900 border-b border-slate-800 pb-6 pt-10 px-4 flex flex-col items-center relative">
                <UserAvatar user={dbUser} googlePhoto={user?.photoURL} size="xl" showLevel={true} className="mb-4" />
                <h1 className="text-2xl font-black text-white">{dbUser?.nome}</h1>
                <p className="text-xs text-slate-400 font-mono mt-1">{dbUser?.email}</p>
                
                <div className="flex gap-2 mt-4">
                    <Chip label={`Nível ${dbUser?.nivel}`} color="secondary" size="small" className="font-bold" />
                    <Chip label={`${dbUser?.xp} XP`} variant="outlined" sx={{ color: 'white', borderColor: '#475569' }} size="small" />
                </div>
            </div>

            {/* ÁREA DE BADGES DETALHADA */}
            <div className="p-6 space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                    <EmojiEvents className="text-yellow-500" fontSize="small" /> Galeria de Troféus
                </h3>

                {(!dbUser?.badges || dbUser.badges.length === 0) ? (
                    <div className="text-center py-8 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                        <p className="text-slate-500 text-sm">Sua estante está vazia.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {dbUser.badges.map(badgeId => {
                            const info = badgeDetails[badgeId] || { nome: 'Desconhecido', desc: '???', icon: '❓' };
                            return (
                                <div key={badgeId} className="flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800">
                                    <div className="text-3xl bg-slate-950 w-12 h-12 flex items-center justify-center rounded-lg border border-slate-700">
                                        {info.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{info.nome}</h4>
                                        <p className="text-xs text-slate-500">{info.desc}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* HISTÓRICO (Placeholder) */}
            <div className="px-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                    <History className="text-cyan-500" fontSize="small" /> Últimas Atividades
                </h3>
                <div className="border-l-2 border-slate-800 pl-4 space-y-6">
                    <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-700 border-2 border-slate-900"></div>
                        <p className="text-xs text-slate-300">Você fez login na Arena.</p>
                        <span className="text-[10px] text-slate-600">Hoje</span>
                    </div>
                    {/* Mais itens virão do backend futuramente */}
                </div>
            </div>
            {/* BOTÃO DE LOGOUT (DESTACADO) */}
            <div className="p-6">
                <button 
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 py-4 rounded-2xl text-sm font-black transition-all active:scale-95"
                >
                    <Logout fontSize="small" />
                    ENCERRAR SESSÃO
                </button>
                <p className="text-[10px] text-slate-600 text-center mt-4 uppercase tracking-widest font-bold">
                    GECAPIX v2.0 - 2026
                </p>
            </div>
        </div>
    );
}