import { Groups, Work } from '@mui/icons-material';

interface SectionProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function SocialSection({ formData, setFormData }: SectionProps) {
  return (
    <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 space-y-4">
      <div className="flex items-center gap-2 text-purple-400 mb-2">
        <Groups />
        <h3 className="font-black italic uppercase">Social & Guilda</h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* STATUS PROFISSIONAL */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 flex items-center gap-1">
            <Work sx={{ fontSize: 12 }} /> Status Profissional
          </label>
          <select
            value={formData.status_profissional}
            onChange={(e) => setFormData({ ...formData, status_profissional: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500 transition-colors appearance-none"
          >
            <option value="Apenas Estudante">Apenas Estudante</option>
            <option value="Estagiário">Estagiário</option>
            <option value="CLT/Efetivo">CLT / Efetivo</option>
            <option value="PJ/Freelancer">PJ / Freelancer</option>
            <option value="Empreendedor">Empreendedor</option>
            <option value="Open to Work">Open to Work (Procurando)</option>
          </select>
        </div>

        {/* EQUIPE */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Equipe de Competição / Extensão</label>
          <input
            type="text"
            value={formData.equipe_competicao}
            onChange={(e) => setFormData({ ...formData, equipe_competicao: e.target.value })}
            placeholder="Ex: Baja, Aerodesign, Cheerleading..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}