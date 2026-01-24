import { useState } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Modal, Box, CircularProgress } from '@mui/material';
import { AutoAwesome, CameraAlt, Close, Bolt, Science, MonetizationOn } from '@mui/icons-material';
import toast from 'react-hot-toast';

interface Props {
    open: boolean;
    onClose: () => void;
    sala: string; // A sala onde a mágica vai acontecer
    onSuccess: () => void; // Para recarregar o chat depois
}

// Configs Cloudinary
const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset"; 

// Estilo do Modal
const style = {
    position: 'absolute' as 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: '95%', maxWidth: 450, bgcolor: '#0f172a', border: '1px solid #a855f7', borderRadius: '24px',
    boxShadow: '0 0 50px rgba(168, 85, 247, 0.2)', p: 0, outline: 'none', maxHeight: '90vh', overflowY: 'auto'
};

export default function OracleModal({ open, onClose, sala, onSuccess }: Props) {
    const { dbUser, setDbUser } = useAuth();
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Custos Visuais
    const CUSTO_GLUE = 1;
    const CUSTO_COINS = 50;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSummon = async () => {
        if (!image) return toast.error("Tire foto da questão!");
        
        // Verifica Saldo
        if ((dbUser?.saldo_glue || 0) < CUSTO_GLUE) return toast.error("Você precisa de 1 GLUE!");
        if ((dbUser?.saldo_coins || 0) < CUSTO_COINS) return toast.error("GecaCoins insuficientes!");

        setLoading(true);
        const toastId = toast.loading("O Oráculo está lendo...");

        try {
            // 1. Upload
            const formData = new FormData();
            formData.append('file', image);
            formData.append('upload_preset', UPLOAD_PRESET);
            const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            const dataCloud = await resCloud.json();
            if (!dataCloud.secure_url) throw new Error("Erro upload");

            // 2. Chamar IA (Passando a Sala/Matéria)
            await api.post('/arena/ai/solve', {
                email: dbUser?.email,
                imagem_url: dataCloud.secure_url,
                materia: sala // <--- O PULO DO GATO: A IA VAI POSTAR NESSA SALA
            });

            // 3. Atualiza Saldo Local
            if (dbUser) {
                setDbUser({ 
                    ...dbUser, 
                    saldo_glue: (dbUser.saldo_glue || 0) - CUSTO_GLUE,
                    saldo_coins: dbUser.saldo_coins - CUSTO_COINS 
                });
            }

            toast.success("Resolvido! Veja no chat.", { id: toastId });
            onSuccess(); // Recarrega o chat
            handleClose();

        } catch (e: any) {
            console.error(e);
            toast.error(e.response?.data?.error || "O Oráculo falhou.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setImage(null);
        setPreview(null);
        onClose();
    };

    return (
        <Modal open={open} onClose={handleClose}>
            <Box sx={style} className="animate-fade-in">
                {/* Header Bonitão */}
                <div className="bg-gradient-to-r from-purple-900 to-slate-900 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <AutoAwesome sx={{ fontSize: 100 }} className="text-purple-400" />
                    </div>
                    <button onClick={handleClose} className="absolute top-4 right-4 text-white/50 hover:text-white z-10"><Close /></button>
                    
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter flex items-center gap-2 relative z-10">
                        INVOCAR ORÁCULO
                    </h2>
                    <p className="text-purple-200 text-xs mt-1 relative z-10 font-medium">
                        Resolvendo para a turma de: <span className="text-white font-bold underline">{sala}</span>
                    </p>
                </div>

                <div className="p-6 space-y-6 bg-slate-950">
                    {/* Área da Câmera */}
                    <label className={`
                        w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group
                        ${preview ? 'border-purple-500 bg-black' : 'border-slate-700 bg-slate-900 hover:bg-slate-800'}
                    `}>
                        {preview ? (
                            <img src={preview} className="w-full h-full object-contain" />
                        ) : (
                            <div className="flex flex-col items-center text-slate-500 group-hover:text-purple-400">
                                <CameraAlt sx={{ fontSize: 48 }} />
                                <span className="uppercase font-black text-xs mt-2">Fotografar Questão</span>
                            </div>
                        )}
                        <input type="file" accept="image/*" capture="environment" hidden onChange={handleFileChange} />
                    </label>

                    {/* Preço e Ação */}
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Custo do Ritual</span>
                            <div className="flex items-center gap-3">
                                <span className="text-pink-400 font-black text-xs flex items-center gap-1 bg-pink-900/20 px-2 py-1 rounded">
                                    <Science sx={{fontSize:14}}/> 1 GLUE
                                </span>
                                <span className="text-slate-600 font-bold">+</span>
                                <span className="text-yellow-400 font-black text-xs flex items-center gap-1 bg-yellow-900/20 px-2 py-1 rounded">
                                    <MonetizationOn sx={{fontSize:14}}/> 50 GC
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={handleSummon}
                            disabled={loading || !image}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-4 rounded-xl font-black text-sm uppercase shadow-lg shadow-purple-900/30 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                        >
                            {loading ? <CircularProgress size={20} color="inherit" /> : (
                                <>
                                    <Bolt /> RESOLVER AGORA
                                </>
                            )}
                        </button>
                        <p className="text-center text-[10px] text-slate-500 mt-3">
                            A resposta será postada publicamente neste chat.
                        </p>
                    </div>
                </div>
            </Box>
        </Modal>
    );
}