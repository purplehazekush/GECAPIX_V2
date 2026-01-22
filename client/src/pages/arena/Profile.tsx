import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import Avatar3D from '../../components/arena/Chat/Avatar3D';
import { 
    Logout, School, AccountBalanceWallet, 
    VerifiedUser, Groups, CloudUpload, Edit 
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

// --- CONFIGURAÇÃO CLOUDINARY ---
const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset";

const EQUIPES = [
    "Nenhuma", "Baja UFMG", "Fórmula Tesla", "Céu Azul", "Cheerleading", 
    "Atlética Eng", "Minas Racing", "Uai Sô Fly"
];

const STATUS_PROFISSIONAL = [
    "Apenas Estudante", "Procurando Estágio", "Estagiando", 
    "Iniciação Científica (IC)", "Monitoria", "Trabalhando CLT/PJ"
];

const CLASSES = [
    { id: 'Mago', nome: 'Mago', emoji: '🧙‍♂️', color: 'border-purple-500' },
    { id: 'Vampiro', nome: 'Vampiro', emoji: '🧛', color: 'border-red-600' },
    { id: 'Atleta', nome: 'Atleta', emoji: '🏋️‍♂️', color: 'border-yellow-500' },
    { id: 'Cientista', nome: 'Cientista', emoji: '🧪', color: 'border-cyan-500' }
];

export default function ArenaProfile() {
    const { dbUser, setDbUser, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Estados do Formulário
    const [formData, setFormData] = useState({
        classe: 'Mago',
        avatar_seed: '', // AGORA ISSO VAI GUARDAR A URL DO 3D (ex: https://models.readyplayer.me/...)
        curso: '',
        materias: '',
        chave_pix: '',
        status_profissional: 'Apenas Estudante',
        equipe_competicao: 'Nenhuma',
        comprovante_url: ''
    });

    useEffect(() => {
        if (dbUser) {
            setFormData({
                classe: dbUser.classe || 'Mago',
                avatar_seed: dbUser.avatar_seed || '', // Carrega o boneco salvo
                curso: dbUser.curso || '',
                materias: dbUser.materias?.join(', ') || '',
                chave_pix: dbUser.chave_pix || '',
                status_profissional: dbUser.status_profissional || 'Apenas Estudante',
                equipe_competicao: dbUser.equipe_competicao || 'Nenhuma',
                comprovante_url: dbUser.comprovante_url || ''
            });
        }
    }, [dbUser]);

    // Função que recebe a URL nova quando o usuário termina de editar o 3D
    const handleAvatar3DUpdate = (newUrl: string) => {
        setFormData(prev => ({ ...prev, avatar_seed: newUrl }));
        toast.success("Avatar atualizado! Clique em SALVAR para confirmar.", { icon: '😎' });
    };

    const handleUploadComprovante = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const toastId = toast.loading("Enviando comprovante...");
        
        try {
            const data = new FormData();
            data.append('file', file);
            data.append('upload_preset', UPLOAD_PRESET);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: data
            });
            const fileData = await res.json();
            
            setFormData(prev => ({ ...prev, comprovante_url: fileData.secure_url }));
            toast.success("Imagem carregada!", { id: toastId });
        } catch (err) {
            toast.error("Erro no upload.", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const arrayMaterias = formData.materias.split(',').filter(m => m.trim().length > 0);
            
            const res = await api.put('arena/perfil', {
                email: dbUser?.email,
                ...formData,
                materias: arrayMaterias
            });
            
            setDbUser(res.data);
            toast.success("Perfil atualizado com sucesso! 💾");
        } catch (e) {
            toast.error("Erro ao salvar perfil.");
        } finally {
            setLoading(false);
        }
    };

    // Pega a cor da borda baseada na classe selecionada

    return (
        <div className="pb-32 animate-fade-in p-4 space-y-6">
            
            {/* 1. ÁREA DO AVATAR 3D (O Destaque) */}
            <div className="flex flex-col items-center py-6 relative">
                
                {/* O COMPONENTE 3D */}
                <div className="relative">
                    <Avatar3D 
                        avatarUrl={formData.avatar_seed} // Passa a URL atual (ou vazia)
                        editable={true} // Permite clicar para editar
                        onAvatarExported={handleAvatar3DUpdate} // Recebe a URL nova
                        size={180} // Tamanho grande para destaque
                    />
                    
                    {/* Dica visual para editar */}
                    <div className="absolute bottom-2 right-2 bg-slate-900 text-white p-2 rounded-full border border-white/20 shadow-xl pointer-events-none">
                        <Edit fontSize="small" />
                    </div>
                </div>

                <h1 className="text-2xl font-black text-white mt-4 tracking-tighter">{dbUser?.nome}</h1>
                <p className="text-xs text-slate-500 font-mono mb-4">{dbUser?.email}</p>

                {/* SELETOR DE CLASSE (Agora define "Guilda" e não mais a aparência) */}
                <div className="flex gap-3 bg-slate-900/50 p-2 rounded-2xl backdrop-blur-sm border border-white/5">
                    {CLASSES.map(c => (
                        <button 
                            key={c.id} 
                            onClick={() => setFormData({...formData, classe: c.id})}
                            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 transition-all active:scale-95 ${
                                formData.classe === c.id 
                                ? `${c.color} bg-slate-800 scale-110 shadow-lg shadow-black/50` 
                                : 'border-transparent opacity-40 hover:opacity-70'
                            }`}
                        >
                            <span className="text-xl">{c.emoji}</span>
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">
                    Guilda: <span className="text-white">{formData.classe}</span>
                </p>
            </div>

            {/* 2. DADOS ACADÊMICOS */}
            <section className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                <h3 className="text-cyan-400 font-black uppercase text-xs flex items-center gap-2">
                    <School fontSize="small" /> Vida Acadêmica
                </h3>
                
                <div className="grid gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Seu Curso</label>
                        <input 
                            placeholder="Ex: Eng. Minas"
                            value={formData.curso}
                            onChange={e => setFormData({...formData, curso: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Matérias (Códigos)</label>
                        <input 
                            placeholder="Ex: DCC034, MAT001"
                            value={formData.materias}
                            onChange={e => setFormData({...formData, materias: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm uppercase outline-none focus:border-cyan-500 transition-colors font-mono"
                        />
                    </div>
                </div>
                
                {/* UPLOAD COMPROVANTE */}
                <div className={`border-2 border-dashed rounded-xl p-4 text-center relative transition-all group ${
                    formData.comprovante_url 
                    ? 'border-green-500/50 bg-green-500/5' 
                    : 'border-slate-700 hover:border-cyan-500 hover:bg-slate-800'
                }`}>
                    {uploading ? <CircularProgress size={20} /> : (
                        <>
                            <CloudUpload className={`mb-2 transition-colors ${formData.comprovante_url ? 'text-green-500' : 'text-slate-500 group-hover:text-cyan-400'}`} />
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                                {formData.comprovante_url ? "Comprovante Carregado!" : "Foto da Carteirinha / SIGA"}
                            </p>
                            <input type="file" onChange={handleUploadComprovante} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                        </>
                    )}
                </div>
            </section>

            {/* 3. DADOS FINANCEIROS */}
            <section className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                <h3 className="text-emerald-400 font-black uppercase text-xs flex items-center gap-2">
                    <AccountBalanceWallet fontSize="small" /> Financeiro
                </h3>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Chave PIX (Para receber prêmios)</label>
                    <input 
                        placeholder="CPF/Email/Tel"
                        value={formData.chave_pix}
                        onChange={e => setFormData({...formData, chave_pix: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-mono outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>
            </section>

            {/* 4. EXTRAS */}
            <section className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                <h3 className="text-purple-400 font-black uppercase text-xs flex items-center gap-2">
                    <Groups fontSize="small" /> Social & Status
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Situação</label>
                        <select 
                            value={formData.status_profissional}
                            onChange={e => setFormData({...formData, status_profissional: e.target.value})}
                            className="w-full bg-slate-950 text-white p-3 rounded-xl text-xs border border-slate-800 outline-none focus:border-purple-500"
                        >
                            {STATUS_PROFISSIONAL.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Equipe</label>
                        <select 
                            value={formData.equipe_competicao}
                            onChange={e => setFormData({...formData, equipe_competicao: e.target.value})}
                            className="w-full bg-slate-950 text-white p-3 rounded-xl text-xs border border-slate-800 outline-none focus:border-purple-500"
                        >
                            {EQUIPES.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                </div>
            </section>

            {/* BOTÃO SALVAR GERAL */}
            <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-200 text-black py-4 rounded-2xl font-black text-sm shadow-xl transition-transform active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
            >
                {loading ? <CircularProgress size={20} color="inherit"/> : "SALVAR ALTERAÇÕES"}
            </button>

            {/* ÁREA ADMINISTRATIVA (Se for admin) */}
            {dbUser?.role === 'admin' && (
                <button 
                    onClick={() => navigate('/arena/admin/validacao')}
                    className="w-full bg-slate-800 border border-yellow-500/30 text-yellow-500 py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <VerifiedUser fontSize="small" /> Painel de Validação
                </button>
            )}

            <button onClick={logout} className="w-full text-center text-red-500 text-xs font-bold uppercase pt-4 pb-2 flex items-center justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                <Logout fontSize="small" /> Sair da Conta
            </button>
        </div>
    );
}