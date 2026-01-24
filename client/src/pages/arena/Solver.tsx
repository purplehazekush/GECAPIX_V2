// client/src/pages/arena/Solver.tsx
    import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
    AutoAwesome, CameraAlt, MonetizationOn, 
    Science, School, Bolt, ArrowBack
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Configuração Cloudinary (Reutilizando a mesma dos Memes)
const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset"; 

export default function ArenaSolver() {
    const { dbUser, setDbUser } = useAuth();
    const navigate = useNavigate();
    
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null); // O JSON da resposta

    // CUSTOS (Display)
    const CUSTO_GLUE = 1;
    const CUSTO_COINS = 50;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
            setResult(null); // Limpa resultado anterior
        }
    };

    const handleSolve = async () => {
        if (!image) return toast.error("Tire uma foto da questão!");
        
        // Validação Visual de Saldo
        if ((dbUser?.saldo_glue || 0) < CUSTO_GLUE) return toast.error("Você precisa de 1 GLUE!");
        if ((dbUser?.saldo_coins || 0) < CUSTO_COINS) return toast.error("GecaCoins insuficientes!");

        setLoading(true);
        const toastId = toast.loading("Analisando átomos da questão...");

        try {
            // 1. Upload Cloudinary
            const formData = new FormData();
            formData.append('file', image);
            formData.append('upload_preset', UPLOAD_PRESET);

            const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            const dataCloud = await resCloud.json();

            if (!dataCloud.secure_url) throw new Error("Erro ao subir imagem.");

            // 2. Enviar para IA (Backend)
            toast.loading("Consultando a Superinteligência...", { id: toastId });
            
            const res = await api.post('/arena/ai/solve', {
                email: dbUser?.email,
                imagem_url: dataCloud.secure_url
            });

            setResult(res.data.data);
            
            // Atualiza saldos visuais
            if (dbUser) {
                setDbUser({ 
                    ...dbUser, 
                    saldo_glue: (dbUser.saldo_glue || 0) - CUSTO_GLUE,
                    saldo_coins: dbUser.saldo_coins - CUSTO_COINS 
                });
            }

            toast.success("Resolvido! 🧠", { id: toastId });

        } catch (e: any) {
            console.error(e);
            toast.error(e.response?.data?.error || "Erro na IA.", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-28 min-h-screen bg-slate-950 p-4 animate-fade-in">
            
            {/* Header */}
            <header className="flex justify-between items-center mb-6">
                <button onClick={() => navigate('/arena')} className="text-slate-400 hover:text-white p-2">
                    <ArrowBack />
                </button>
                <div className="text-right">
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter flex items-center justify-end gap-2">
                        ORÁCULO <AutoAwesome className="text-purple-500" />
                    </h2>
                    <div className="flex items-center justify-end gap-3 text-[10px] font-bold">
                        <span className="text-pink-400 flex items-center gap-1 bg-pink-900/20 px-2 py-1 rounded">
                            <Science sx={{ fontSize: 12 }} /> {dbUser?.saldo_glue || 0} GLUE
                        </span>
                        <span className="text-yellow-400 flex items-center gap-1 bg-yellow-900/20 px-2 py-1 rounded">
                            <MonetizationOn sx={{ fontSize: 12 }} /> {dbUser?.saldo_coins || 0} COINS
                        </span>
                    </div>
                </div>
            </header>

            {/* ÁREA DE INPUT (CÂMERA) */}
            {!result && (
                <div className="flex flex-col gap-6">
                    <div className="bg-slate-900/50 border border-purple-500/30 p-6 rounded-3xl text-center relative overflow-hidden">
                        {/* Background Effect */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-scan"></div>

                        <h3 className="text-white font-bold mb-2">Tire foto da Questão</h3>
                        <p className="text-slate-400 text-xs mb-6 max-w-[250px] mx-auto">
                            Certifique-se que o texto está legível. A IA resolve cálculo, física e teoria.
                        </p>

                        <label className={`
                            w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group
                            ${preview ? 'border-purple-500 bg-black' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'}
                        `}>
                            {preview ? (
                                <img src={preview} className="w-full h-full object-contain" />
                            ) : (
                                <div className="flex flex-col items-center text-slate-500 group-hover:text-purple-400">
                                    <CameraAlt sx={{ fontSize: 48 }} />
                                    <span className="uppercase font-black text-xs mt-2">Abrir Câmera</span>
                                </div>
                            )}
                            {/* capture="environment" abre a camera traseira no celular */}
                            <input type="file" accept="image/*" capture="environment" hidden onChange={handleFileChange} />
                        </label>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Custo da Operação</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-pink-400 font-black text-xs flex items-center gap-1"><Science sx={{fontSize:14}}/> 1 GLUE</span>
                                <span className="text-slate-600">+</span>
                                <span className="text-yellow-400 font-black text-xs flex items-center gap-1"><MonetizationOn sx={{fontSize:14}}/> 50 GC</span>
                            </div>
                        </div>
                        <button 
                            onClick={handleSolve}
                            disabled={loading || !image}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-black text-sm uppercase shadow-lg shadow-purple-900/30 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                        >
                            {loading ? <CircularProgress size={20} color="inherit" /> : "RESOLVER"}
                        </button>
                    </div>
                </div>
            )}

            {/* ÁREA DE RESULTADO (JSON RENDER) */}
            {result && (
                <div className="space-y-4 animate-fade-in-up">
                    <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-3">
                        <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400">
                            <Bolt />
                        </div>
                        <div>
                            <p className="text-[10px] text-emerald-300 font-bold uppercase">Resposta Rápida</p>
                            <p className="text-white font-mono font-bold text-lg">{result.resolucao_rapida}</p>
                        </div>
                    </div>

                    {result.multipla_escolha !== 'N/A' && (
                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Gabarito Sugerido</p>
                            <div className="text-4xl font-black text-white">{result.multipla_escolha}</div>
                        </div>
                    )}

                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                            <School className="text-purple-400" />
                            <h3 className="text-sm font-black text-white uppercase">Resolução Eficiente</h3>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                            {result.resolucao_eficiente}
                        </p>
                    </div>

                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                        <h3 className="text-[10px] text-slate-500 font-black uppercase mb-2">Explicação Completa</h3>
                        <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-line">
                            {result.resolucao_completa}
                        </p>
                        
                        {result.dica_extra && (
                            <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl">
                                <p className="text-yellow-400 text-[10px] font-bold uppercase mb-1">💡 Dica de Ouro</p>
                                <p className="text-yellow-200 text-xs">{result.dica_extra}</p>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => { setImage(null); setPreview(null); setResult(null); }}
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase rounded-xl transition-colors"
                    >
                        Nova Consulta
                    </button>
                </div>
            )}
        </div>
    );
}