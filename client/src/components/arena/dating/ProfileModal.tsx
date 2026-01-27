import { Close, Verified } from '@mui/icons-material';

interface ProfileModalProps {
    profile: any;
    onClose: () => void;
}

export const ProfileModal = ({ profile, onClose }: ProfileModalProps) => {
    if (!profile) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative"
                onClick={e => e.stopPropagation()} // Evita fechar ao clicar dentro
            >
                {/* Botão Fechar */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                >
                    <Close fontSize="small" />
                </button>

                {/* Foto Principal */}
                <div className="h-72 bg-slate-950 relative">
                    {profile.fotos?.[0] ? (
                        <img src={profile.fotos[0]} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">Sem Foto</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    
                    <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-white">{profile.nome?.split(' ')[0]}</h2>
                            <Verified className="text-blue-400" fontSize="small"/>
                        </div>
                        <p className="text-sm text-purple-300 font-bold uppercase tracking-wider">{profile.curso}</p>
                    </div>
                </div>

                {/* Detalhes */}
                <div className="p-6 space-y-4 max-h-[40vh] overflow-y-auto">
                    {/* Bio */}
                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                        <p className="text-sm text-slate-300 italic leading-relaxed">"{profile.bio || 'Sem descrição.'}"</p>
                    </div>

                    {/* Tags (Trata dados que podem vir do endpoint resumido ou completo) */}
                    <div className="flex flex-wrap gap-2">
                        {profile.altura && <span className="badge-tag">{profile.altura}</span>}
                        {profile.biotipo && <span className="badge-tag">{profile.biotipo}</span>}
                        {profile.festa && <span className="badge-tag">{profile.festa}</span>}
                        {profile.genero && <span className="badge-tag bg-slate-800 text-slate-500">{profile.genero}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};