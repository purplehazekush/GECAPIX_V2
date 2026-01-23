// client/src/components/arena/NewMemeModal.tsx
import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Modal, Box, CircularProgress } from '@mui/material';
import { CloudUpload, Send } from '@mui/icons-material';

interface Props { open: boolean; onClose: () => void; onRefresh: () => void; }

export default function NewMemeModal({ open, onClose, onRefresh }: Props) {
    const { dbUser } = useAuth();
    const [legenda, setLegenda] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    // --- CONFIGURAÇÃO CLOUDINARY ---
    // --- CONFIGURAÇÃO CLOUDINARY ---
    const CLOUD_NAME = "dcetrqazm"; // Seu Cloud Name atualizado
    const UPLOAD_PRESET = "gecapix_preset"; // O nome que você deu ao criar o preset "Unsigned"

    const handleUpload = async () => {
        if (!image || !legenda) return alert("Preencha tudo!");
        setLoading(true);

        try {
            // 1. Upload para o Cloudinary (Direto do Front)
            const formData = new FormData();
            formData.append('file', image);
            formData.append('upload_preset', UPLOAD_PRESET);

            const resCloud = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                { method: 'POST', body: formData }
            );
            const dataCloud = await resCloud.json();

            if (!dataCloud.secure_url) throw new Error("Erro no upload da imagem");

            // 2. Registrar o Meme no seu Backend
            await api.post('arena/memes', {
                email: dbUser?.email,
                nome: dbUser?.nome,
                legenda: legenda,
                imagem_url: dataCloud.secure_url
            });

            alert("Meme postado! Você ganhou XP de Criatividade. 🚀");
            onRefresh();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Erro ao postar meme.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <h2 className="text-xl font-black text-white italic mb-4 uppercase">Nova Pérola</h2>

                <div className="space-y-4">
                    {/* Preview / Seleção de Imagem */}
                    <label className="w-full aspect-video bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors overflow-hidden">
                        {image ? (
                            <img src={URL.createObjectURL(image)} className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <CloudUpload className="text-slate-700" sx={{ fontSize: 40 }} />
                                <span className="text-[10px] text-slate-500 font-bold uppercase mt-2">Selecionar Imagem</span>
                            </>
                        )}
                        <input type="file" hidden onChange={e => setImage(e.target.files?.[0] || null)} accept="image/*" />
                    </label>

                    <input
                        placeholder="Escreva uma legenda engraçada..."
                        value={legenda}
                        onChange={e => setLegenda(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-purple-500"
                    />

                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="w-full bg-purple-600 py-4 rounded-xl text-white font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? <CircularProgress size={16} color="inherit" /> : <><Send /> PUBLICAR NA ARENA</>}
                    </button>
                </div>
            </Box>
        </Modal>
    );
}