// client/src/components/arena/Profile/AcademicSection.tsx
import { School, UploadFile } from '@mui/icons-material';

interface SectionProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function AcademicSection({ formData, setFormData }: SectionProps) {
  return (
    <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 space-y-4">
      <div className="flex items-center gap-2 text-cyan-400 mb-2">
        <School />
        <h3 className="font-black italic uppercase">Dados Acadêmicos</h3>
      </div>

      <div className="space-y-3">
        {/* CURSO */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Curso de Engenharia</label>
          <input
            type="text"
            value={formData.curso}
            onChange={(e) => setFormData({ ...formData, curso: e.target.value })}
            placeholder="Ex: Minas, Metalúrgica, Controle..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* MATÉRIAS */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Matérias Atuais (Separadas por vírgula)</label>
          <input
            type="text"
            value={formData.materias}
            onChange={(e) => setFormData({ ...formData, materias: e.target.value })}
            placeholder="Ex: CALC3, FISICA1, ALGEBRA"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* COMPROVANTE URL */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 flex items-center gap-1">
             <UploadFile sx={{ fontSize: 12 }} /> Link do Comprovante (Matrícula)
          </label>
          <input
            type="text"
            value={formData.comprovante_url}
            onChange={(e) => setFormData({ ...formData, comprovante_url: e.target.value })}
            placeholder="Cole o link da imagem aqui..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors"
          />
          <p className="text-[9px] text-slate-600 mt-1">
             Necessário para validar sua conta e liberar acesso total.
          </p>
        </div>
      </div>
    </div>
  );
}