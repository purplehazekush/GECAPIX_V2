// client/src/components/arena/NewMemeModal.tsx
import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Modal, Box, CircularProgress } from '@mui/material';
import { CloudUpload, Send, Close, Image as ImageIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';

interface Props { open: boolean; onClose: () => void; onRefresh: () => void; }

const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset"; 

export default function NewMemeModal({ open, onClose, onRefresh }: Props) {
    const { dbUser } = useAuth();
    const [legenda, setLegenda] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        if (!image) return toast.error("Escolha uma imagem!");
        if (!legenda) return toast.error("Escreva uma legenda!");
        
        setLoading(true);
        const toastId = toast.loading("Subindo ativo...");

        try {
            const formData = new FormData();
            formData.append('file', image);
            formData.append('upload_preset', UPLOAD_PRESET);

            const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            const dataCloud = await resCloud.json();

            if (!dataCloud.secure_url) throw new Error("Erro Cloudinary");

            await api.post('/arena/memes', {
                email: dbUser?.email,
                legenda: legenda,
                imagem_url: dataCloud.secure_url
            });

            toast.success("IPO Lançado! 🚀", { id: toastId });
            onRefresh();
            handleClose();

        } catch (e) {
            toast.error("Erro ao postar.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setImage(null);
        setLegenda('');
        onClose();
    };

    return (
        <Modal 
            open={open} 
            onClose={handleClose}
            // MÁGICA DO FLEXBOX: Centraliza qualquer coisa perfeitamente
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
        >
            <Box 
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl outline-none w-full max-w-sm animate-fade-in"
                sx={{ maxHeight: '90vh', overflowY: 'auto' }} // Garante scroll se a tela for pequena
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
                        <ImageIcon className="text-pink-500" /> Novo IPO
                    </h2>
                    <button onClick={handleClose} className="text-slate-500 hover:text-white">
                        <Close />
                    </button>
                </div>

                <div className="space-y-4">
                    <label className={`
                        w-full aspect-square rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative border-2 border-dashed
                        ${image ? 'border-pink-500/50 bg-black' : 'border-slate-700 bg-slate-950 hover:border-pink-500 hover:bg-slate-900'}
                    `}>
                        {image ? (
                            <img src={URL.createObjectURL(image)} className="w-full h-full object-contain" alt="Preview" />
                        ) : (
                            <div className="flex flex-col items-center text-slate-500">
                                <CloudUpload sx={{ fontSize: 40 }} />
                                <span className="text-[10px] font-bold uppercase mt-2">Selecionar Imagem</span>
                            </div>
                        )}
                        <input type="file" hidden onChange={e => setImage(e.target.files?.[0] || null)} accept="image/*" />
                    </label>

                    <input
                        placeholder="Legenda / Ticker..."
                        value={legenda}
                        onChange={e => setLegenda(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500"
                        maxLength={100}
                    />

                    <button
                        onClick={handleUpload}
                        disabled={loading || !image || !legenda}
                        className="w-full bg-pink-600 hover:bg-pink-500 py-3 rounded-xl text-white font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? <CircularProgress size={16} color="inherit" /> : <><Send fontSize="small"/> LISTAR</>}
                    </button>
                </div>
            </Box>
        </Modal>
    );
}