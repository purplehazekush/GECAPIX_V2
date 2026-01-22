import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

// IMPORTAÇÕES DOS NOVOS COMPONENTES SEPARADOS
import AvatarSection from '../../components/arena/Profile/AvatarSection';
import AcademicSection from '../../components/arena/Profile/AcademicSection';
import FinancialSection from '../../components/arena/Profile/FinancialSection';
import SocialSection from '../../components/arena/Profile/SocialSection';

import AVATAR_ASSETS from '../../data/avatarAssets.json'; // O JSON agora existe!

import { Logout, VerifiedUser, Save } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

export default function ArenaProfile() {
    const { dbUser, setDbUser, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isAvatarEditing, setIsAvatarEditing] = useState(false);

    // Estado do Formulário Geral
    const [formData, setFormData] = useState({
        classe: 'Mago',
        curso: '',
        materias: '',
        chave_pix: '',
        status_profissional: 'Apenas Estudante',
        equipe_competicao: 'Nenhuma',
        comprovante_url: ''
    });

    // Estado Específico do Avatar Pixel
    const [avatarConfig, setAvatarConfig] = useState<any>({
    body: 'male_light', 
    hair: 'messy_raven', 
    torso: 'shirt_long_white_longsleeve',
    legs: 'pants_white_pants_male', 
    feet: 'shoes_brown_shoes_male', 
    hand_r: 'none'
});

    useEffect(() => {
        if (dbUser) {
            setFormData({
                classe: dbUser.classe || 'Mago',
                curso: dbUser.curso || '',
                materias: dbUser.materias?.join(', ') || '',
                chave_pix: dbUser.chave_pix || '',
                status_profissional: dbUser.status_profissional || 'Apenas Estudante',
                equipe_competicao: dbUser.equipe_competicao || 'Nenhuma',
                comprovante_url: dbUser.comprovante_url || ''
            });

            if (dbUser.avatar_layers && Object.keys(dbUser.avatar_layers).length > 0) {
                setAvatarConfig(dbUser.avatar_layers);
            } else {
                setAvatarConfig({
                    body: AVATAR_ASSETS.body?.[0] || 'skin_light',
                    hair: AVATAR_ASSETS.hair?.[0] || 'messy_raven',
                    torso: AVATAR_ASSETS.torso?.[0] || 'shirt_white',
                    legs: AVATAR_ASSETS.legs?.[0] || 'pants_white',
                    feet: AVATAR_ASSETS.feet?.[0] || 'shoes_brown',
                    hand_r: 'none'
                });
            }
        }
    }, [dbUser]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const arrayMaterias = formData.materias.split(',').filter(m => m.trim().length > 0);
            
            const payload = {
                email: dbUser?.email,
                ...formData,
                materias: arrayMaterias,
                avatar_layers: avatarConfig
            };

            const res = await api.put('arena/perfil', payload);
            
            setDbUser(res.data);
            setIsAvatarEditing(false);
            toast.success("Perfil atualizado! 🔥");
        } catch (e) {
            toast.error("Erro ao salvar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-32 animate-fade-in p-4 space-y-6 max-w-md mx-auto">
            
            {/* 1. SEÇÃO DE AVATAR */}
            <AvatarSection 
                user={dbUser}
                avatarConfig={avatarConfig}
                setAvatarConfig={setAvatarConfig}
                isEditing={isAvatarEditing}
                setIsEditing={setIsAvatarEditing}
            />

            {/* Se estiver editando o avatar, esconde o resto */}
            {!isAvatarEditing && (
                <>
                    <AcademicSection formData={formData} setFormData={setFormData} />
                    <FinancialSection formData={formData} setFormData={setFormData} />
                    <SocialSection formData={formData} setFormData={setFormData} />

                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? <CircularProgress size={20} color="inherit"/> : <><Save /> SALVAR ALTERAÇÕES</>}
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