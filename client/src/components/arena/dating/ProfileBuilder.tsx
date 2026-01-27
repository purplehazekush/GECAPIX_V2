import { useState } from 'react';
import { CameraAlt, Save } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

// Opções fixas (Enums)
const OPTIONS = {
    genero: ['HOMEM', 'MULHER', 'OUTRO'],
    altura: ['📏 Alto(a)', '📐 Médio(a)', '🤏 Baixo(a)'],
    biotipo: ['🏋️ Fitness', '🧸 Fofinho(a)', '🏃 Magro(a)', '💪 Atlético', '⚡ Normal'],
    bebe: ['🍻 Socialmente', '🥃 Gosto muito', '❌ Não bebo'],
    fuma: ['🚬 Sim', '🌬️ Vape', '❌ Não'],
    festa: ['🎉 Baladeiro(a)', '🏠 Caseiro(a)', '⚖️ Equilibrado']
};

export const ProfileBuilder = ({ onComplete }: { onComplete: () => void }) => {
    const [form, setForm] = useState({
        telefone: '', genero: 'HOMEM', altura: '📐 Médio(a)', biotipo: '⚡ Normal',
        bebe: '🍻 Socialmente', fuma: '❌ Não', festa: '⚖️ Equilibrado',
        bio: '', fotos: [''], interessado_em: ['MULHER']
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if(!form.telefone || form.bio.length < 10) return toast.error("Preencha telefone e bio!");
        
        setLoading(true);
        try {
            await api.post('/dating/optin', {
                ...form,
                fotos: form.fotos.filter(f => f.length > 0) // Limpa vazios
            });
            toast.success("Perfil Criado!");
            onComplete();
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Erro ao criar");
        } finally { setLoading(false); }
    };

    return (
        <div className="space-y-6 animate-slide-up pb-24">
            <header className="text-center">
                <h2 className="text-xl font-black text-white uppercase">Criar Perfil</h2>
                <p className="text-xs text-slate-500">Configure sua carta de apresentação</p>
            </header>

            <div className="space-y-4">
                {/* Telefone */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <label className="text-[10px] font-bold text-purple-400 uppercase">WhatsApp (Será verificado)</label>
                    <input 
                        type="tel" 
                        value={form.telefone}
                        onChange={e => setForm({...form, telefone: e.target.value})}
                        placeholder="(XX) 9XXXX-XXXX"
                        className="w-full bg-transparent border-b border-slate-700 text-white py-2 outline-none focus:border-purple-500 font-mono"
                    />
                </div>

                {/* Bio */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <label className="text-[10px] font-bold text-purple-400 uppercase">Bio (Max 690 chars)</label>
                    <textarea 
                        value={form.bio}
                        onChange={e => setForm({...form, bio: e.target.value})}
                        className="w-full bg-transparent text-sm text-slate-300 mt-2 outline-none h-24 resize-none"
                        placeholder="Fale sobre você, seu curso, o que curte..."
                        maxLength={690}
                    />
                </div>

                {/* Seletores (Grid) */}
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(OPTIONS).map(([key, opts]) => (
                        <div key={key} className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{key}</label>
                            <select 
                                // @ts-ignore
                                value={form[key]} 
                                // @ts-ignore
                                onChange={e => setForm({...form, [key]: e.target.value})}
                                className="w-full bg-slate-950 text-white text-xs p-2 rounded-lg outline-none"
                            >
                                {opts.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                    ))}
                </div>

                {/* Interesse */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <label className="text-[10px] font-bold text-purple-400 uppercase mb-2 block">Interessado em:</label>
                    <div className="flex gap-2">
                        {['HOMEM', 'MULHER', 'OUTRO'].map(g => (
                            <button
                                key={g}
                                onClick={() => {
                                    const newInt = form.interessado_em.includes(g) 
                                        ? form.interessado_em.filter(i => i !== g)
                                        : [...form.interessado_em, g];
                                    setForm({...form, interessado_em: newInt});
                                }}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                                    form.interessado_em.includes(g) 
                                        ? 'bg-purple-600 border-purple-500 text-white' 
                                        : 'bg-slate-950 border-slate-800 text-slate-500'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Fotos (Simples URL input por enquanto) */}
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                    <label className="text-[10px] font-bold text-purple-400 uppercase mb-2 flex items-center gap-1">
                        <CameraAlt sx={{fontSize:14}}/> Fotos (URL)
                    </label>
                    <input 
                        type="text" 
                        placeholder="https://imgur.com/..."
                        value={form.fotos[0]}
                        onChange={e => setForm({...form, fotos: [e.target.value]})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none"
                    />
                    <p className="text-[9px] text-slate-500 mt-2">Dica: Use links do Instagram ou Imgur.</p>
                </div>

                <button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-4 rounded-2xl font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    {loading ? "Salvando..." : <><Save /> Salvar Perfil</>}
                </button>
            </div>
        </div>
    );
};