import { useState } from 'react';
import { api } from '../../lib/api'; // Certifique-se que sua instância axios está correta
import { useAuth } from '../../context/AuthContext';
import { Modal, Box, CircularProgress } from '@mui/material';
import { CloudUpload, Send, Close, Image as ImageIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';

interface Props { 
    open: boolean; 
    onClose: () => void; 
    onRefresh: () => void; 
}

// --- CONFIGURAÇÃO CLOUDINARY ---
// Se estes dados mudarem, o upload falha com erro 400 ou 401
const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset"; 

export default function NewMemeModal({ open, onClose, onRefresh }: Props) {
    const { dbUser } = useAuth();
    const [legenda, setLegenda] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        // 1. Validação Básica
        if (!image) return toast.error("Escolha uma imagem!");
        if (!legenda) return toast.error("Escreva uma legenda!");
        
        setLoading(true);
        const toastId = toast.loading("Subindo ativo para a nuvem...");

        try {
            // 2. Upload para o Cloudinary (Lógica Específica)
            const formData = new FormData();
            formData.append('file', image);
            formData.append('upload_preset', UPLOAD_PRESET);

            // Fetch direto para a API do Cloudinary
            const resCloud = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                { method: 'POST', body: formData }
            );
            
            const dataCloud = await resCloud.json();

            if (!dataCloud.secure_url) {
                console.error("Erro Cloudinary:", dataCloud);
                throw new Error("Falha no upload da imagem (Cloudinary)");
            }

            // 3. Registrar o IPO no Backend (Agora com a URL da imagem)
            toast.loading("Listando na bolsa...", { id: toastId });
            
            await api.post('/arena/memes', {
                email: dbUser?.email,
                legenda: legenda,
                imagem_url: dataCloud.secure_url
            });

            // 4. Sucesso
            toast.success("IPO Lançado com Sucesso! 🚀", { id: toastId });
            onRefresh(); // Atualiza a lista atrás
            handleClose(); // Fecha e limpa

        } catch (e: any) {
            console.error(e);
            const errorMsg = e.response?.data?.error || e.message || "Erro ao postar meme.";
            toast.error(errorMsg, { id: toastId });
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
        <Modal open={open} onClose={handleClose}>
            <Box className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl outline-none animate-fade-in">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-white italic uppercase flex items-center gap-2">
                        <ImageIcon className="text-pink-500" /> Novo IPO
                    </h2>
                    <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors">
                        <Close />
                    </button>
                </div>

                <div className="space-y-4">
                    
                    {/* Área de Seleção de Imagem */}
                    <label className={`
                        w-full aspect-square rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative border-2 border-dashed
                        ${image ? 'border-pink-500/50 bg-black' : 'border-slate-700 bg-slate-950 hover:border-pink-500 hover:bg-slate-900'}
                    `}>
                        {image ? (
                            <img 
                                src={URL.createObjectURL(image)} 
                                className="w-full h-full object-contain animate-fade-in" 
                                alt="Preview"
                            />
                        ) : (
                            <div className="flex flex-col items-center text-slate-500 group-hover:text-pink-400 transition-colors">
                                <CloudUpload sx={{ fontSize: 40 }} />
                                <span className="text-[10px] font-bold uppercase mt-2">Clique para selecionar</span>
                            </div>
                        )}
                        <input 
                            type="file" 
                            hidden 
                            onChange={e => setImage(e.target.files?.[0] || null)} 
                            accept="image/*" 
                        />
                    </label>

                    {/* Input Legenda */}
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Legenda / Ticker</label>
                        <input
                            placeholder="Ex: Quando o compilador aceita de primeira..."
                            value={legenda}
                            onChange={e => setLegenda(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500 transition-colors"
                            maxLength={100}
                        />
                        <p className="text-[9px] text-slate-600 text-right mt-1">{legenda.length}/100</p>
                    </div>

                    {/* Botão de Ação */}
                    <button
                        onClick={handleUpload}
                        disabled={loading || !image || !legenda}
                        className="w-full bg-pink-600 hover:bg-pink-500 py-3 rounded-xl text-white font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-900/20"
                    >
                        {loading ? <CircularProgress size={16} color="inherit" /> : <><Send fontSize="small"/> LISTAR NO MERCADO</>}
                    </button>
                </div>
            </Box>
        </Modal>
    );
}