import { Groups } from '@mui/icons-material';

interface Props {
    formData: any;
    setFormData: (data: any) => void;
}

const EQUIPES = ["Nenhuma", "Baja UFMG", "Fórmula Tesla", "Céu Azul", "Cheerleading", "Atlética Eng", "Minas Racing", "Uai Sô Fly"];
const STATUS = ["Apenas Estudante", "Procurando Estágio", "Estagiando", "Iniciação Científica (IC)", "Monitoria", "Trabalhando CLT/PJ"];
const CLASSES = [
    { id: 'Mago', emoji: '🧙‍♂️', color: 'border-purple-500' },
    { id: 'Vampiro', emoji: '🧛', color: 'border-red-600' },
    { id: 'Atleta', emoji: '🏋️‍♂️', color: 'border-yellow-500' },
    { id: 'Cientista', emoji: '🧪', color: 'border-cyan-500' }
];

export default function SocialSection({ formData, setFormData }: Props) {
    return (
        <section className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-lg">
            <h3 className="text-purple-400 font-black uppercase text-xs flex items-center gap-2"><Groups fontSize="small" /> Social</h3>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Guilda (Classe)</label>
                    <div className="flex gap-2 mt-1">
                        {CLASSES.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setFormData({...formData, classe: c.id})}
                                className={`flex items-center justify-center w-8 h-8 rounded-lg border text-lg transition-all ${formData.classe === c.id ? `${c.color} bg-slate-800 scale-110` : 'border-transparent opacity-30'}`}
                            >
                                {c.emoji}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Equipe</label>
                    <select 
                        value={formData.equipe_competicao}
                        onChange={e => setFormData({...formData, equipe_competicao: e.target.value})}
                        className="w-full mt-1 bg-slate-950 text-white p-2 rounded-xl text-xs border border-slate-800 outline-none focus:border-purple-500"
                    >
                        {EQUIPES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase">Status Profissional</label>
                <select 
                    value={formData.status_profissional}
                    onChange={e => setFormData({...formData, status_profissional: e.target.value})}
                    className="w-full mt-1 bg-slate-950 text-white p-2 rounded-xl text-xs border border-slate-800 outline-none focus:border-purple-500"
                >
                    {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </section>
    );
}