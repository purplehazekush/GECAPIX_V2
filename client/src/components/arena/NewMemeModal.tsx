import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Modal, Box, CircularProgress } from '@mui/material';
import { CloudUpload, Send, Close } from '@mui/icons-material';
import toast from 'react-hot-toast';

interface Props { open: boolean; onClose: () => void; onRefresh: () => void; }

// CONFIGURAÇÃO DO CLOUDINARY
const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset";

export default function NewMemeModal({ open, onClose, onRefresh }: Props) {
    const { dbUser } = useAuth();
    const [legenda, setLegenda] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        if (!image || !legenda) return toast.error("Selecione imagem e legenda!");
        setLoading(true);

        try {
            // 1. Upload Cloudinary
            const formData = new FormData();
            formData.append('file', image);
            formData.append('upload_preset', UPLOAD_PRESET);

            const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            const dataCloud = await resCloud.json();

            if (!dataCloud.secure_url) throw new Error("Erro no upload da imagem");

            // 2. IPO no Backend
            await api.post('arena/memes', {
                email: dbUser?.email,
                legenda: legenda,
                imagem_url: dataCloud.secure_url
            });

            toast.success("IPO Lançado! 🚀");
            onRefresh();
            onClose();
            setImage(null);
            setLegenda('');
        } catch (e) {
            console.error(e);
            toast.error("Falha ao listar ativo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl outline-none">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-white italic uppercase">Lançar IPO</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><Close /></button>
                </div>

                <div className="space-y-4">
                    {/* Preview */}
                    <label className="w-full aspect-square bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors overflow-hidden relative">
                        {image ? (
                            <img src={URL.createObjectURL(image)} className="w-full h-full object-contain" />
                        ) : (
                            <>
                                <CloudUpload className="text-slate-700" sx={{ fontSize: 40 }} />
                                <span className="text-[10px] text-slate-500 font-bold uppercase mt-2">Upload Imagem</span>
                            </>
                        )}
                        <input type="file" hidden onChange={e => setImage(e.target.files?.[0] || null)} accept="image/*" />
                    </label>

                    <input
                        placeholder="Legenda do Ativo..."
                        value={legenda}
                        onChange={e => setLegenda(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-purple-500"
                    />

                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 py-3 rounded-xl text-slate-900 font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? <CircularProgress size={16} color="inherit" /> : <><Send fontSize="small"/> PUBLICAR NO MERCADO</>}
                    </button>
                </div>
            </Box>
        </Modal>
    );
}