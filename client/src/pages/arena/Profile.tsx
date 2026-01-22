import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import toast from 'react-hot-toast'; // <--- Adeus Alert!
import { 
    Logout, Save, School, AccountBalanceWallet, 
    VerifiedUser, Groups, CloudUpload 
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
    { id: 'Mago', nome: 'Mago', emoji: '🧙‍♂️' },
    { id: 'Vampiro', nome: 'Vampiro', emoji: '🧛' },
    { id: 'Atleta', nome: 'Atleta', emoji: '🏋️‍♂️' },
    { id: 'Cientista', nome: 'Cientista', emoji: '🧪' }
];

export default function ArenaProfile() {
    const { dbUser, setDbUser, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Estados do Formulário
    const [formData, setFormData] = useState({
        classe: 'Mago',
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
                curso: dbUser.curso || '',
                materias: dbUser.materias?.join(', ') || '',
                chave_pix: dbUser.chave_pix || '',
                status_profissional: dbUser.status_profissional || 'Apenas Estudante',
                equipe_competicao: dbUser.equipe_competicao || 'Nenhuma',
                comprovante_url: dbUser.comprovante_url || ''
            });
        }
    }, [dbUser]);

    const handleUploadComprovante = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const toastId = toast.loading("Enviando imagem...");
        
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
            toast.success("Imagem carregada! Clique em Salvar.", { id: toastId });
        } catch (err) {
            toast.error("Erro no upload da imagem.", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Garante o formato de array para as matérias
            const arrayMaterias = formData.materias.split(',').filter(m => m.trim().length > 0);
            
            const res = await api.put('arena/perfil', {
                email: dbUser?.email,
                ...formData,
                materias: arrayMaterias
            });
            
            setDbUser(res.data);
            toast.success("Perfil e Identidade atualizados! 💾");
        } catch (e) {
            toast.error("Erro ao salvar perfil.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-32 animate-fade-in p-4 space-y-6">
            
            {/* 1. CABEÇALHO AVATAR */}
            <div className="flex flex-col items-center py-6">
                <img 
                    src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${formData.classe}-${dbUser?.email}&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                    className="w-28 h-28 rounded-full border-4 border-purple-500 bg-slate-800 mb-4 shadow-lg shadow-purple-900/40"
                    alt="Avatar"
                />
                <div className="flex gap-2 mb-4">
                    {CLASSES.map(c => (
                        <button 
                            key={c.id} 
                            onClick={() => setFormData({...formData, classe: c.id})}
                            className={`text-2xl p-2 rounded-xl border transition-all active:scale-95 ${
                                formData.classe === c.id ? 'bg-purple-600 border-white scale-110' : 'bg-slate-800 border-slate-700 opacity-50'
                            }`}
                        >
                            {c.emoji}
                        </button>
                    ))}
                </div>
                <h1 className="text-xl font-black text-white">{dbUser?.nome}</h1>
                <p className="text-xs text-slate-500 font-mono">{dbUser?.email}</p>
            </div>

            {/* 2. DADOS ACADÊMICOS */}
            <section className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4">
                <h3 className="text-cyan-400 font-black uppercase text-xs flex items-center gap-2">
                    <School fontSize="small" /> Vida Acadêmica
                </h3>
                
                <input 
                    placeholder="Qual seu curso? Ex: Eng. Minas"
                    value={formData.curso}
                    onChange={e => setFormData({...formData, curso: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-cyan-500"
                />

                <input 
                    placeholder="Matérias (Ex: DCC034, MAT001)"
                    value={formData.materias}
                    onChange={e => setFormData({...formData, materias: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm uppercase outline-none focus:border-cyan-500"
                />
                
                {/* UPLOAD COMPROVANTE */}
                <div className={`border-2 border-dashed rounded-xl p-4 text-center relative transition-colors ${
                    formData.comprovante_url ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 hover:border-cyan-500'
                }`}>
                    {uploading ? <CircularProgress size={20} /> : (
                        <>
                            <CloudUpload className={`mb-2 ${formData.comprovante_url ? 'text-green-500' : 'text-slate-500'}`} />
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                                {formData.comprovante_url ? "Comprovante Carregado!" : "Foto da Carteirinha / SIGA"}
                            </p>
                            <input type="file" onChange={handleUploadComprovante} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                        </>
                    )}
                </div>
            </section>

            {/* 3. DADOS FINANCEIROS */}
            <section className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4">
                <h3 className="text-emerald-400 font-black uppercase text-xs flex items-center gap-2">
                    <AccountBalanceWallet fontSize="small" /> Financeiro (Obrigatório)
                </h3>
                <p className="text-[9px] text-slate-500">Para receber premiações em dinheiro real.</p>
                <input 
                    placeholder="Sua Chave PIX (CPF/Email/Tel)"
                    value={formData.chave_pix}
                    onChange={e => setFormData({...formData, chave_pix: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-mono outline-none focus:border-emerald-500"
                />
            </section>

            {/* 4. EXTRAS & STATUS */}
            <section className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4">
                <h3 className="text-purple-400 font-black uppercase text-xs flex items-center gap-2">
                    <Groups fontSize="small" /> Status & Guildas
                </h3>
                
                <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Situação Atual</label>
                    <select 
                        value={formData.status_profissional}
                        onChange={e => setFormData({...formData, status_profissional: e.target.value})}
                        className="w-full bg-slate-950 text-white p-3 rounded-xl text-xs border border-slate-800 outline-none"
                    >
                        {STATUS_PROFISSIONAL.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Equipe de Competição</label>
                    <select 
                        value={formData.equipe_competicao}
                        onChange={e => setFormData({...formData, equipe_competicao: e.target.value})}
                        className="w-full bg-slate-950 text-white p-3 rounded-xl text-xs border border-slate-800 outline-none"
                    >
                        {EQUIPES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
            </section>

            {/* BOTÃO SALVAR GERAL */}
            <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-200 text-black py-4 rounded-2xl font-black text-sm shadow-xl transition-transform active:scale-95 disabled:opacity-70"
            >
                {loading ? "SALVANDO..." : "SALVAR PERFIL COMPLETO"}
            </button>

            {/* ÁREA ADMINISTRATIVA (BOTÃO DE XERIFE) */}
            {dbUser?.role === 'admin' && (
                <button 
                    onClick={() => navigate('/arena/admin/validacao')}
                    className="w-full bg-slate-800 border border-yellow-500/30 text-yellow-500 py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <VerifiedUser fontSize="small" /> Painel de Validação
                </button>
            )}

            <button onClick={logout} className="w-full text-center text-red-500 text-xs font-bold uppercase pt-4 pb-2 flex items-center justify-center gap-2">
                <Logout fontSize="small" /> Sair da Conta
            </button>
        </div>
    );
}