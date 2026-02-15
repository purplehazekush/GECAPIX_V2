import { useState, useEffect } from 'react';
import { 
    ZoomIn, AutoAwesome, CheckCircle, 
    Lightbulb, ContentCopy 
} from '@mui/icons-material';
import { MathText } from './SolutionPart/MathText';
import toast from 'react-hot-toast';

interface SolutionProps {
    msg: {
        dados_ia: any;
        imagem_original: string;
    };
}

export default function SolutionBubble({ msg }: SolutionProps) {
    const [data, setData] = useState<any>(null);
    const [showFullImage, setShowFullImage] = useState(false);

    useEffect(() => {
        if (!msg.dados_ia) return;
        let raw = msg.dados_ia;
        if (typeof raw === 'string') {
            try { raw = JSON.parse(raw); } catch { raw = {}; }
        }
        setData(raw);
    }, [msg.dados_ia]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copiado!", { duration: 1000 });
    };

    if (!data) return <div className="text-xs text-slate-500 animate-pulse">Materializando conhecimento...</div>;

    // Fallback para o modelo antigo se tiver mensagens velhas no banco
    const isLegacy = !data.resolucao_narrativa;
    if (isLegacy) return <div className="bg-slate-800 p-4 rounded-xl text-xs text-slate-400">Formato antigo (não suportado nesta view).</div>;

    return (
        <div className="flex flex-col gap-3 max-w-[95%] w-full md:max-w-[550px] animate-fade-in-up self-start font-sans">
            
            {/* 1. Header Heroico */}
            <div className="relative bg-gradient-to-br from-purple-900 via-slate-900 to-black rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl">
                
                {/* Background Decorativo */}
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <AutoAwesome sx={{ fontSize: 120 }} />
                </div>

                <div className="p-5 relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <span className="bg-purple-500/20 text-purple-200 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                            Oráculo Gemini
                        </span>
                        {msg.imagem_original && (
                            <button onClick={() => setShowFullImage(true)} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                                <ZoomIn fontSize="small"/> Ver Questão
                            </button>
                        )}
                    </div>
                    
                    <h2 className="text-xl font-black text-white leading-tight mb-2">
                        {data.titulo_elegante || "Resolução Magistral"}
                    </h2>

                    {/* A Estratégia (O Pulo do Gato) */}
                    <div className="bg-white/5 border-l-2 border-purple-400 p-3 rounded-r-lg mt-3 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <Lightbulb className="text-yellow-400" sx={{fontSize: 16}} />
                            <span className="text-[10px] font-bold text-yellow-100 uppercase">Estratégia</span>
                        </div>
                        <p className="text-xs text-slate-200 italic leading-relaxed">
                            "{data.estrategia_analitica}"
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. O Corpo da Resolução (Narrativa) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-6">
                {data.resolucao_narrativa.map((bloco: string, idx: number) => (
                    <div key={idx} className="relative pl-4 border-l border-slate-700/50">
                        {/* Marcador de Passo */}
                        <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-purple-500/50"></div>
                        <MathText content={bloco} />
                    </div>
                ))}
            </div>

            {/* 3. Conclusão e Resultado */}
            <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-2xl p-5 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
                
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">
                    Resultado Final {data.gabarito_letra !== 'N/A' && `• Letra ${data.gabarito_letra}`}
                </p>
                
                <div 
                    onClick={() => copyToClipboard(data.resultado_destaque)}
                    className="bg-slate-950 p-4 rounded-xl border border-emerald-500/20 shadow-inner w-full overflow-x-auto cursor-pointer hover:bg-slate-900 transition-colors group relative"
                >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ContentCopy sx={{fontSize:14}} className="text-slate-500"/>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-white">
                        <MathText content={`$$${data.resultado_destaque}$$`} />
                    </div>
                </div>

                {data.verificacao_rapida && (
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-200/70">
                        <CheckCircle sx={{fontSize: 12}} />
                        <span>{data.verificacao_rapida}</span>
                    </div>
                )}
            </div>

            {/* Modal Imagem */}
            {showFullImage && (
                <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowFullImage(false)}>
                    <img src={msg.imagem_original} className="max-w-full max-h-full object-contain" alt="Original" />
                </div>
            )}
        </div>
    );
}