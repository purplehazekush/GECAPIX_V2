// client/src/components/arena/memes/PostModal.tsx
import { Modal, Box, CircularProgress } from '@mui/material';
import { useState } from 'react';
import { AddPhotoAlternate, CloudUpload, Close } from '@mui/icons-material';
import toast from 'react-hot-toast';

interface PostModalProps {
    open: boolean;
    onClose: () => void;
    onPost: (url: string, caption: string) => Promise<void>; // Promise para loading state funcionar
}

const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset"; 

export const PostModal = ({ open, onClose, onPost }: PostModalProps) => {
    const [legenda, setLegenda] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState(''); // Fallback para URL direta se quiser
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState(0); // 0=Upload, 1=Link

    const handleConfirm = async () => {
        if (!legenda) return toast.error("Escreva uma legenda!");
        if (tab === 0 && !imageFile) return toast.error("Selecione uma imagem!");
        if (tab === 1 && !imageUrl) return toast.error("Cole o link!");

        setLoading(true);
        try {
            let finalUrl = imageUrl;

            // Se for upload, sobe pro Cloudinary primeiro
            if (tab === 0 && imageFile) {
                const formData = new FormData();
                formData.append('file', imageFile);
                formData.append('upload_preset', UPLOAD_PRESET);

                const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                
                if (!data.secure_url) throw new Error("Falha no upload");
                finalUrl = data.secure_url;
            }

            // Chama o pai para postar no backend
            await onPost(finalUrl, legenda);
            
            // Limpa form
            setLegenda('');
            setImageFile(null);
            setImageUrl('');
            onClose();

        } catch (e) {
            console.error(e);
            toast.error("Erro ao processar imagem.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} sx={{display:'flex', alignItems:'center', justifyContent:'center', p:4, backdropFilter: 'blur(2px)'}}>
            <Box className="bg-slate-900 border border-purple-500/50 p-6 rounded-3xl w-full max-w-sm outline-none shadow-2xl relative">
                
                {/* Botão Fechar */}
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <Close />
                </button>

                <h3 className="text-lg font-black text-white uppercase mb-4 flex items-center gap-2">
                    <AddPhotoAlternate className="text-purple-500"/> Novo IPO
                </h3>
                
                {/* Tabs Upload vs Link */}
                <div className="flex mb-4 bg-slate-950 p-1 rounded-xl">
                    <button onClick={() => setTab(0)} className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${tab===0 ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>UPLOAD</button>
                    <button onClick={() => setTab(1)} className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all ${tab===1 ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>LINK</button>
                </div>

                <div className="space-y-4">
                    {/* Área de Imagem */}
                    {tab === 0 ? (
                        <label className={`w-full aspect-video rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative border-2 border-dashed ${imageFile ? 'border-purple-500/50 bg-black' : 'border-slate-700 bg-slate-950 hover:bg-slate-900'}`}>
                            {imageFile ? (
                                <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-contain" alt="Preview" />
                            ) : (
                                <div className="flex flex-col items-center text-slate-500">
                                    <CloudUpload sx={{ fontSize: 30 }} />
                                    <span className="text-[10px] font-bold uppercase mt-2">Toque para selecionar</span>
                                </div>
                            )}
                            <input type="file" hidden onChange={e => setImageFile(e.target.files?.[0] || null)} accept="image/*" />
                        </label>
                    ) : (
                        <div className="space-y-2">
                            <input 
                                type="text" 
                                placeholder="https://..." 
                                value={imageUrl} 
                                onChange={e => setImageUrl(e.target.value)} 
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs outline-none focus:border-purple-500" 
                            />
                            {imageUrl && (
                                <div className="h-32 rounded-xl overflow-hidden bg-black border border-slate-800">
                                    <img src={imageUrl} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Legenda */}
                    <div>
                        <input 
                            type="text" 
                            placeholder="Legenda / Ticker..." 
                            value={legenda} 
                            onChange={e => setLegenda(e.target.value)} 
                            maxLength={60}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-purple-500 font-bold" 
                        />
                        <p className="text-[9px] text-slate-500 text-right mt-1">{legenda.length}/60</p>
                    </div>

                    <button 
                        onClick={handleConfirm} 
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <CircularProgress size={16} color="inherit" /> : "PUBLICAR ATIVO"}
                    </button>
                </div>
            </Box>
        </Modal>
    );
};