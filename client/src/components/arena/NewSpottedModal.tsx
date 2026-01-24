// client/src/components/arena/NewSpottedModal.tsx
import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Modal, Box, CircularProgress } from '@mui/material';
import { Send, Close, VisibilityOff, AddPhotoAlternate } from '@mui/icons-material';
import toast from 'react-hot-toast';

interface Props { open: boolean; onClose: () => void; onRefresh: () => void; }

// Configuração Cloudinary (Reutilizando a mesma)
const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset"; 

const style = {
  position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  width: '90%', maxWidth: 400, bgcolor: '#0f172a', border: '1px solid #1e293b', borderRadius: '24px',
  boxShadow: 24, p: 4, outline: 'none'
};

export default function NewSpottedModal({ open, onClose, onRefresh }: Props) {
    const { dbUser } = useAuth();
    const [mensagem, setMensagem] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handlePost = async () => {
        if (!mensagem) return toast.error("Escreva algo!");
        setLoading(true);

        try {
            let imageUrl = '';

            // Upload Opcional
            if (image) {
                const formData = new FormData();
                formData.append('file', image);
                formData.append('upload_preset', UPLOAD_PRESET);
                const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
                const dataCloud = await resCloud.json();
                if (dataCloud.secure_url) imageUrl = dataCloud.secure_url;
            }

            await api.post('/arena/spotted', {
                email: dbUser?.email,
                mensagem,
                imagem_url: imageUrl
            });

            toast.success("Segredo enviado! 🤫");
            onRefresh();
            handleClose();
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Erro ao enviar.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setImage(null);
        setMensagem('');
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose}>
            <Box sx={style}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
                        <VisibilityOff className="text-cyan-500" /> Novo Spotted
                    </h2>
                    <button onClick={handleClose} className="text-slate-500 hover:text-white"><Close /></button>
                </div>

                <div className="space-y-4">
                    <textarea
                        placeholder="Quem é o calouro que..."
                        value={mensagem}
                        onChange={e => setMensagem(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-cyan-500 h-32 resize-none"
                        maxLength={280}
                    />
                    
                    {/* Preview Imagem */}
                    {image && (
                        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-700">
                            <img src={URL.createObjectURL(image)} className="w-full h-full object-cover" />
                            <button onClick={() => setImage(null)} className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white"><Close fontSize="small"/></button>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center">
                            <AddPhotoAlternate />
                            <input type="file" hidden onChange={e => setImage(e.target.files?.[0] || null)} accept="image/*" />
                        </label>

                        <button
                            onClick={handlePost}
                            disabled={loading || !mensagem}
                            className="flex-1 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? <CircularProgress size={16} color="inherit" /> : <><Send fontSize="small"/> ENVIAR (ANÔNIMO)</>}
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-500 text-center">
                        Seu nome não aparecerá. +30 XP por post.
                    </p>
                </div>
            </Box>
        </Modal>
    );
}