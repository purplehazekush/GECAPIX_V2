// client/src/components/arena/Profile/AcademicSection.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { School, CloudUpload } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset";

interface Props {
    formData: any;
    setFormData: (data: any) => void;
}

export default function AcademicSection({ formData, setFormData }: Props) {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const toastId = toast.loading("Enviando...");
        
        try {
            const data = new FormData();
            data.append('file', file);
            data.append('upload_preset', UPLOAD_PRESET);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: data });
            const fileData = await res.json();
            setFormData((prev: any) => ({ ...prev, comprovante_url: fileData.secure_url }));
            toast.success("Sucesso!", { id: toastId });
        } catch (err) { toast.error("Erro upload", { id: toastId }); } 
        finally { setUploading(false); }
    };

    return (
        <section className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-lg">
            <h3 className="text-cyan-400 font-black uppercase text-xs flex items-center gap-2"><School fontSize="small" /> Acadêmico</h3>
            <div className="grid gap-3">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Curso</label>
                    <input 
                        value={formData.curso} 
                        onChange={e => setFormData({...formData, curso: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors"
                        placeholder="Ex: Eng. Minas"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Matérias</label>
                    <input 
                        value={formData.materias} 
                        onChange={e => setFormData({...formData, materias: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-mono uppercase outline-none focus:border-cyan-500 transition-colors"
                        placeholder="DCC034, MAT001"
                    />
                </div>
                <div className={`border-2 border-dashed rounded-xl p-4 text-center relative transition-all ${formData.comprovante_url ? 'border-green-500/50 bg-green-900/10' : 'border-slate-700 hover:border-cyan-500'}`}>
                    {uploading ? <CircularProgress size={20} /> : (
                        <>
                            <CloudUpload className={`mb-1 ${formData.comprovante_url ? 'text-green-500' : 'text-slate-500'}`} />
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{formData.comprovante_url ? "Comprovante Enviado" : "Enviar Comprovante"}</p>
                            <input type="file" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}