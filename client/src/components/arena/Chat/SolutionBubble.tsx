import { useState, useEffect } from 'react';
import { 
    ZoomIn, AutoAwesome, CheckCircle, 
    Lightbulb, ContentCopy 
} from '@mui/icons-material';
import { MathText } from './SolutionPart/MathText'; // Certifique-se que o caminho está certo
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
        
        // 1. Parse Defensivo (Caso venha como string do banco)
        if (typeof raw === 'string') {
            try { 
                // Limpeza básica de quebras de linha json inválidas
                const clean = raw.replace(/[\n\r]/g, "\\n"); 
                raw = JSON.parse(clean); 
            } catch { 
                raw = {}; 
            }
        }
        
        setData(raw);
    }, [msg.dados_ia]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Resultado copiado!", { duration: 1500, icon: '📋' });
    };

    if (!data) return <div className="text-xs text-slate-500 animate-pulse p-4">Decifrando manuscritos...</div>;

    // --- FALLBACK PARA MENSAGENS ANTIGAS (LEGADO) ---
    // Se não tiver o campo novo 'resolucao_narrativa', mostra um aviso simples
    if (!data.resolucao_narrativa && !data.passos) {
        return (
            <div className="bg-slate-800 p-4 rounded-xl text-xs text-slate-400 border border-slate-700">
                <p className="font-bold mb-1">Formato Legado</p>
                Este chat usa uma versão antiga do Oráculo.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 max-w-[95%] w-full md:max-w-[600px] animate-fade-in-up self-start font-sans">
            
            {/* 1. HEADER HEROICO (Título e Estratégia) */}
            <div className="relative bg-gradient-to-br from-purple-900 via-slate-900 to-black rounded-2xl overflow-hidden border border-purple-500/30 shadow-2xl">
                
                {/* Background Decorativo */}
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <AutoAwesome sx={{ fontSize: 140 }} />
                </div>

                <div className="p-5 relative z-10">
                    {/* Top Bar */}
                    <div className="flex justify-between items-start mb-3">
                        <span className="bg-purple-500/20 text-purple-200 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                            Oráculo Gemini
                        </span>
                        {msg.imagem_original && (
                            <button 
                                onClick={() => setShowFullImage(true)} 
                                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors bg-black/30 px-2 py-1 rounded-lg"
                            >
                                <ZoomIn fontSize="small"/> Ver Original
                            </button>
                        )}
                    </div>
                    
                    {/* Título */}
                    <h2 className="text-xl md:text-2xl font-black text-white leading-tight mb-4 tracking-tight">
                        {data.titulo_elegante || "Resolução Magistral"}
                    </h2>

                    {/* A Estratégia (O Pulo do Gato) */}
                    {data.estrategia_analitica && (
                        <div className="bg-white/5 border-l-4 border-yellow-400 p-3 rounded-r-lg backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <Lightbulb className="text-yellow-400" sx={{fontSize: 18}} />
                                <span className="text-[10px] font-bold text-yellow-100 uppercase tracking-widest">Estratégia Inicial</span>
                            </div>
                            <p className="text-xs text-slate-200 italic leading-relaxed">
                                "{data.estrategia_analitica}"
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. CORPO DA RESOLUÇÃO (Narrativa Linear) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
                
                {/* Renderiza cada bloco da narrativa */}
                {data.resolucao_narrativa && data.resolucao_narrativa.map((bloco: string, idx: number) => (
                    <div key={idx} className="relative pl-6 border-l-2 border-slate-700/50 hover:border-purple-500/30 transition-colors">
                        {/* Bolinha do Timeline */}
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-600 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                        </div>
                        
                        {/* Conteúdo do Passo */}
                        <MathText content={bloco} />
                    </div>
                ))}

            </div>

            {/* 3. CONCLUSÃO E RESULTADO (O Grande Final) */}
            <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
                
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4">
                    Resultado Final {data.gabarito_letra && data.gabarito_letra !== 'N/A' && <span className="text-white bg-emerald-600 px-1.5 rounded ml-1">{data.gabarito_letra}</span>}
                </p>
                
                {/* Caixa de Resposta Copiável */}
                <div 
                    onClick={() => copyToClipboard(data.resultado_destaque)}
                    className="bg-slate-950 p-5 rounded-xl border border-emerald-500/20 shadow-inner w-full overflow-x-auto cursor-pointer hover:bg-slate-900 hover:border-emerald-500/40 transition-all relative"
                >
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500">
                        <ContentCopy sx={{fontSize:16}}/>
                    </div>
                    
                    <div className="text-2xl md:text-3xl font-black text-white flex justify-center">
                        <MathText content={`$$${data.resultado_destaque}$$`} />
                    </div>
                </div>

                {data.verificacao_rapida && (
                    <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-200/60 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
                        <CheckCircle sx={{fontSize: 14}} />
                        <span>{data.verificacao_rapida}</span>
                    </div>
                )}
            </div>

            {/* Modal de Imagem Fullscreen */}
            {showFullImage && (
                <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4 animate-fade-in cursor-zoom-out" onClick={() => setShowFullImage(false)}>
                    <img src={msg.imagem_original} className="max-w-full max-h-full object-contain" alt="Original" />
                </div>
            )}
        </div>
    );
}