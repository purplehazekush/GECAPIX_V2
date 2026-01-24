// client/src/pages/arena/Profile.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

// Componentes
import AvatarSection from '../../components/arena/Profile/AvatarSection';
import AcademicSection from '../../components/arena/Profile/AcademicSection';
import FinancialSection from '../../components/arena/Profile/FinancialSection';
import SocialSection from '../../components/arena/Profile/SocialSection';

import { Logout, VerifiedUser, Save, Badge } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

export default function ArenaProfile() {
    const { dbUser, setDbUser, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    // Estado de Edição do Avatar (Controlado aqui pelo Pai)
    const [isAvatarEditing, setIsAvatarEditing] = useState(false);

    // Estado do Formulário
    const [formData, setFormData] = useState({
        nome: '', // Nickname
        classe: 'Novato',
        curso: '',
        materias: '',
        chave_pix: '',
        status_profissional: 'Apenas Estudante',
        equipe_competicao: 'Nenhuma',
        comprovante_url: ''
    });

    const [avatarSlug, setAvatarSlug] = useState('default');

    // Carrega dados iniciais
    useEffect(() => {
        if (dbUser) {
            setFormData({
                nome: dbUser.nome || '',
                classe: dbUser.classe || 'Novato',
                curso: dbUser.curso || '',
                materias: dbUser.materias?.join(', ') || '',
                chave_pix: dbUser.chave_pix || '',
                status_profissional: dbUser.status_profissional || 'Apenas Estudante',
                equipe_competicao: dbUser.equipe_competicao || 'Nenhuma',
                comprovante_url: dbUser.comprovante_url || ''
            });
            setAvatarSlug(dbUser.avatar_slug || 'default');
        }
    }, [dbUser]);

    const handleSave = async () => {
        setLoading(true);
        try {
            console.log("Salvando avatar:", avatarSlug); // DEBUG

            const arrayMaterias = formData.materias.split(',').filter(m => m.trim().length > 0);

            const payload = {
                email: dbUser?.email,
                ...formData,
                materias: arrayMaterias,
                avatar_slug: avatarSlug // <--- GARANTA QUE ISSO ESTÁ AQUI
            };

            const res = await api.put('arena/perfil', payload);
            
            // ATUALIZA O CONTEXTO GLOBAL IMEDIATAMENTE
            setDbUser(res.data); 
            
            setIsAvatarEditing(false);
            toast.success("Perfil atualizado! 🔥");
        } catch (e) {
            console.error(e); // DEBUG
            toast.error("Erro ao salvar alterações.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-32 animate-fade-in p-4 space-y-6 max-w-md mx-auto">

            {/* 1. SEÇÃO DE AVATAR (Passamos setAvatarConfig como prop) */}
            <AvatarSection
                user={dbUser}
                isEditing={isAvatarEditing}
                setIsEditing={setIsAvatarEditing}
                setAvatarConfig={(cfg: any) => setAvatarSlug(cfg.slug)} // Callback simples
                draftSlug={avatarSlug} // <--- ADICIONE ISSO (Envia o rascunho pro filho)
            />

            {/* Se estiver editando avatar, esconde o resto para focar */}
            {!isAvatarEditing && (
                <>
                    {/* CAMPO DE NICKNAME (NOVO) */}
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                        <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 flex items-center gap-1 mb-1">
                            <Badge sx={{ fontSize: 12 }} /> Nickname (Nome de Guerra)
                        </label>
                        <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold text-center outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>

                    <AcademicSection formData={formData} setFormData={setFormData} />
                    <FinancialSection formData={formData} setFormData={setFormData} />
                    <SocialSection formData={formData} setFormData={setFormData} />

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-900 py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? <CircularProgress size={20} color="inherit" /> : <><Save /> SALVAR TUDO</>}
                    </button>

                    {dbUser?.role === 'admin' && (
                        <button
                            onClick={() => navigate('/arena/admin/validacao')}
                            className="w-full bg-slate-800 border border-yellow-500/30 text-yellow-500 py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95"
                        >
                            <VerifiedUser fontSize="small" /> Painel Admin
                        </button>
                    )}

                    <button onClick={logout} className="w-full text-center text-red-500 text-xs font-bold uppercase pt-4 pb-2 opacity-50 hover:opacity-100 transition-opacity flex justify-center gap-2">
                        <Logout fontSize="small" /> Sair
                    </button>
                </>
            )}
        </div>
    );
}