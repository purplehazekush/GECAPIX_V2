import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { 
    Logout, 
    Save, 
    School, 
    Science, 
    SportsGymnastics, 
    AutoFixHigh, 
    Nightlife 
} from '@mui/icons-material';
import { Chip, CircularProgress } from '@mui/material';

const CLASSES = [
  { id: 'Mago', nome: 'Mago dos Scripts', emoji: '🧙‍♂️', icon: <AutoFixHigh />, desc: 'Automação é vida' },
  { id: 'Vampiro', nome: 'Vampiro da Madruga', emoji: '🧛', icon: <Nightlife />, desc: 'Só codae à noite' },
  { id: 'Atleta', nome: 'Atleta do CEU', emoji: '🏋️‍♂️', icon: <SportsGymnastics />, desc: 'Shape em dia' },
  { id: 'Cientista', nome: 'Cientista Louco', emoji: '🧪', icon: <Science />, desc: 'Pesquisa pura' }
];

export default function ArenaProfile() {
    const { dbUser, setDbUser, logout } = useAuth();
    
    // Estados do Formulário
    const [classe, setClasse] = useState('Mago');
    const [materiasInput, setMateriasInput] = useState('');
    const [loading, setLoading] = useState(false);

    // Carrega dados iniciais
    useEffect(() => {
        if (dbUser) {
            setClasse(dbUser.classe || 'Mago');
            setMateriasInput(dbUser.materias?.join(', ') || '');
        }
    }, [dbUser]);

    const handleSave = async () => {
        setLoading(true);
        try {
            // Converte string "DCC034, mat001" em array ["DCC034", "MAT001"]
            const arrayMaterias = materiasInput.split(',').filter(m => m.trim().length > 0);

            const res = await api.put('arena/perfil', {
                email: dbUser?.email,
                classe,
                materias: arrayMaterias
            });
            
            setDbUser(res.data); // Atualiza o contexto global
            alert("Identidade atualizada com sucesso! 🆔");
        } catch (e) {
            alert("Erro ao salvar perfil.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-32 animate-fade-in">
            {/* --- CABEÇALHO DO PERSONAGEM --- */}
            <div className="bg-slate-900 border-b border-slate-800 pb-8 pt-10 px-4 flex flex-col items-center relative overflow-hidden">
                {/* Efeito de Fundo */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-900/20 to-slate-900 z-0"></div>

                <div className="z-10 relative flex flex-col items-center">
                    {/* AVATAR DINÂMICO (DiceBear) */}
                    <div className="relative group">
                        <img 
                            src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${classe}-${dbUser?.email}&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                            className="w-32 h-32 rounded-full border-4 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)] bg-slate-800 object-cover"
                            alt="Avatar"
                        />
                        <div className="absolute -bottom-3 -right-2 bg-slate-950 border border-slate-700 px-3 py-1 rounded-xl flex items-center gap-1 shadow-xl">
                            <span className="text-lg">{CLASSES.find(c => c.id === classe)?.emoji}</span>
                            <span className="text-[10px] font-black text-white uppercase">{classe}</span>
                        </div>
                    </div>

                    <h1 className="text-2xl font-black text-white mt-4">{dbUser?.nome}</h1>
                    <div className="flex gap-2 mt-2">
                        <Chip label={`Nível ${dbUser?.nivel}`} color="secondary" size="small" className="font-bold" />
                        <Chip label={`${dbUser?.xp} XP`} variant="outlined" sx={{ color: 'white', borderColor: '#475569' }} size="small" />
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-8">
                
                {/* --- SELETOR DE CLASSE --- */}
                <section>
                    <h3 className="text-white font-black italic uppercase mb-4 flex items-center gap-2">
                        <AutoFixHigh className="text-purple-400" /> Escolha sua Classe
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {CLASSES.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setClasse(c.id)}
                                className={`p-3 rounded-2xl border-2 transition-all flex flex-col gap-1 text-left ${
                                    classe === c.id 
                                    ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-900/20' 
                                    : 'border-slate-800 bg-slate-900 opacity-70 hover:opacity-100'
                                }`}
                            >
                                <div className="text-2xl">{c.emoji}</div>
                                <div>
                                    <span className={`block text-xs font-black uppercase ${classe === c.id ? 'text-white' : 'text-slate-400'}`}>
                                        {c.nome}
                                    </span>
                                    <span className="text-[9px] text-slate-500 leading-none">{c.desc}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* --- DADOS ACADÊMICOS --- */}
                <section className="bg-slate-900 p-5 rounded-3xl border border-slate-800">
                    <h3 className="text-white font-black italic uppercase mb-2 flex items-center gap-2">
                        <School className="text-cyan-400" /> Grade Horária
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-4">
                        Insira os códigos das matérias para entrar nos grupos secretos (ex: DCC034, MAT001).
                    </p>
                    <input 
                        value={materiasInput}
                        onChange={e => setMateriasInput(e.target.value)}
                        placeholder="Códigos separados por vírgula..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-mono text-sm outline-none focus:border-cyan-500 transition-colors uppercase"
                    />
                </section>

                {/* --- BOTÃO SALVAR --- */}
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-4 rounded-2xl text-white font-black text-sm shadow-xl shadow-purple-900/30 active:scale-95 transition-all disabled:opacity-50"
                >
                    {loading ? <CircularProgress size={20} color="inherit" /> : <><Save fontSize="small" className="mr-2"/> SALVAR IDENTIDADE</>}
                </button>

                {/* --- LOGOUT --- */}
                <div className="pt-8 border-t border-slate-800/50">
                    <button 
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 text-red-500/70 hover:text-red-500 py-2 text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                        <Logout fontSize="small" /> Encerrar Sessão
                    </button>
                    <p className="text-[9px] text-slate-700 text-center mt-2">ID: {dbUser?._id}</p>
                </div>
            </div>
        </div>
    );
}