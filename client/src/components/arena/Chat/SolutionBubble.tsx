import { useState, useEffect } from 'react';
import { 
    Bolt, School, Assignment, 
    WarningAmber, 
    ZoomIn
} from '@mui/icons-material';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

interface SolutionProps {
    msg: {
        dados_ia: any;
        imagem_original: string;
    };
}

export default function SolutionBubble({ msg }: SolutionProps) {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Padrão: Roteiro
    const [activeTab, setActiveTab] = useState<'rapida' | 'roteiro' | 'teoria'>('roteiro');
    const [showOriginalImage, setShowOriginalImage] = useState(false);

    useEffect(() => {
        try {
            let rawData = msg.dados_ia;
            if (typeof rawData === 'string') rawData = JSON.parse(rawData);
            if (!rawData || typeof rawData !== 'object') throw new Error("Dados vazios.");

            setData({
                tipo: rawData.tipo || "ABERTA",
                resposta_final: rawData.resposta_final || "Ver Roteiro",
                memoria_calculo: Array.isArray(rawData.memoria_calculo) ? rawData.memoria_calculo : [],
                teoria: rawData.teoria || "Sem teoria disponível.",
                alerta: rawData.alerta || null
            });
            setError(null);
        } catch (err) {
            console.error("Erro Bubble:", err);
            setError("Erro ao processar.");
        }
    }, [msg.dados_ia]);

    // --- FUNÇÃO DE SEGURANÇA DO LATEX ---
    // Se o KaTeX falhar ou reclamar, renderizamos de forma segura
    const SafeBlockMath = ({ children }: { children: string }) => {
        // Remove cifrões extras e limpa espaços vazios que quebram o parser
        const cleanMath = children.replace(/\$/g, '').trim();
        return (
            <BlockMath 
                errorColor={'#ef4444'} 
                renderError={(err) => (
                    <span className="text-red-400 text-xs font-mono break-all" title={err.message}>
                        {cleanMath}
                    </span>
                )}
                // Desativa avisos estritos para acentos em modo math
                settings={{ strict: false, trust: true }} 
            >
                {cleanMath}
            </BlockMath>
        );
    };

    const SafeInlineMath = ({ children }: { children: string }) => {
        const cleanMath = children.replace(/\$/g, '').trim();
        return (
            <InlineMath 
                errorColor={'#ef4444'}
                renderError={() => <span className="text-purple-300">{cleanMath}</span>}
                settings={{ strict: false, trust: true }}
            >
                {cleanMath}
            </InlineMath>
        );
    };

    const renderTextWithMath = (text: string) => {
        if (!text) return null;
        // Regex poderoso: detecta \(...\), \[...\], ou até $...$ se a IA mandar errado
        const parts = text.split(/(\\\(.*?\\\)|\\\[.*?\\\]|\$.*?\$)/g);
        
        return parts.map((part, index) => {
            // Inline Math: \( ... \) ou $ ... $
            if ((part.startsWith('\\(') && part.endsWith('\\)')) || (part.startsWith('$') && part.endsWith('$'))) {
                const math = part.replace(/^\\\(|^\\\[|^\$|\\\)$|\\\]$|\$$/g, ''); // Remove delimitadores
                return <span key={index} className="text-purple-400 font-bold px-1"><SafeInlineMath>{math}</SafeInlineMath></span>;
            } 
            // Block Math: \[ ... \]
            else if (part.startsWith('\\[') && part.endsWith('\\]')) {
                const math = part.slice(2, -2);
                return <div key={index} className="my-2 overflow-x-auto"><SafeBlockMath>{math}</SafeBlockMath></div>;
            }
            // Texto Normal
            return <span key={index}>{part}</span>;
        });
    };

    if (error || !data) return null;

    return (
        <div className="flex flex-col gap-2 max-w-[95%] w-full md:max-w-[450px] animate-fade-in-up self-start">
            
            {/* Header */}
            <div className="flex items-center gap-2 pl-1 mb-1">
                <span className="text-[10px] font-black uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                    Oráculo Solver
                </span>
                <span className="text-[9px] text-slate-600">v2.2</span>
            </div>

            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl">
                
                {/* Banner Imagem */}
                {msg.imagem_original && (
                    <div 
                        onClick={() => setShowOriginalImage(true)}
                        className="w-full h-48 md:h-56 bg-black/50 relative group cursor-pointer border-b border-purple-500/20"
                    >
                        <img 
                            src={msg.imagem_original} 
                            alt="Questão" 
                            className="w-full h-full object-contain group-hover:opacity-80 transition-opacity" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                            <span className="text-white text-xs font-bold flex items-center gap-2">
                                <ZoomIn /> Ampliar
                            </span>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950">
                    <TabButton active={activeTab === 'rapida'} onClick={() => setActiveTab('rapida')} icon={<Bolt sx={{fontSize:16}}/>} label="Rápida" color="text-yellow-400" />
                    <TabButton active={activeTab === 'roteiro'} onClick={() => setActiveTab('roteiro')} icon={<Assignment sx={{fontSize:16}}/>} label="Roteiro" color="text-cyan-400" />
                    <TabButton active={activeTab === 'teoria'} onClick={() => setActiveTab('teoria')} icon={<School sx={{fontSize:16}}/>} label="Teoria" color="text-purple-400" />
                </div>

                {/* Conteúdo */}
                <div className="p-5 bg-slate-900 min-h-[150px]">
                    {data.alerta && (
                        <div className="mb-4 flex gap-3 bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20 items-start">
                            <WarningAmber className="text-yellow-500 shrink-0" sx={{fontSize:18}} />
                            <p className="text-[11px] text-yellow-100/80 leading-snug">{data.alerta}</p>
                        </div>
                    )}

                    {/* RÁPIDA */}
                    {activeTab === 'rapida' && (
                        <div className="flex flex-col items-center justify-center py-4 animate-fade-in">
                            <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center shadow-inner relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Resultado Final</p>
                                <div className="text-3xl md:text-4xl font-black text-white latex-render-huge overflow-x-hidden text-ellipsis">
                                    {data.resposta_final.match(/[\\$]/) ? (
                                        <SafeBlockMath>{data.resposta_final}</SafeBlockMath>
                                    ) : (
                                        <span className="text-emerald-400 break-words">{data.resposta_final}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ROTEIRO */}
                    {activeTab === 'roteiro' && (
                        <div className="space-y-4 animate-fade-in">
                            {data.memoria_calculo.length > 0 ? (
                                data.memoria_calculo.map((step: string, idx: number) => (
                                    <div key={idx} className="flex gap-3 group">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-5 h-5 rounded-full bg-cyan-900/30 text-cyan-400 flex items-center justify-center text-[10px] font-bold border border-cyan-500/20">
                                                {idx + 1}
                                            </div>
                                            {idx !== data.memoria_calculo.length - 1 && <div className="w-0.5 h-full bg-slate-800 group-hover:bg-cyan-900/50 transition-colors"></div>}
                                        </div>
                                        <div className="flex-1 pb-4">
                                            <div className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 overflow-x-auto custom-scrollbar hover:border-cyan-500/30 transition-colors">
                                                <SafeBlockMath>{step}</SafeBlockMath>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 text-xs italic">Verifique a aba Rápida.</p>
                            )}
                        </div>
                    )}

                    {/* TEORIA */}
                    {activeTab === 'teoria' && (
                        <div className="animate-fade-in">
                            <div className="text-xs text-slate-300 leading-7 text-justify whitespace-pre-line font-light">
                                {renderTextWithMath(data.teoria)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showOriginalImage && (
                <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowOriginalImage(false)}>
                    <img src={msg.imagem_original} className="max-w-full max-h-full object-contain" alt="Original" />
                </div>
            )}
        </div>
    );
}

function TabButton({ active, onClick, icon, label, color }: any) {
    return (
        <button 
            onClick={onClick}
            className={`py-3 flex flex-col items-center justify-center gap-1 transition-all relative ${active ? 'bg-slate-900' : 'bg-slate-950 hover:bg-slate-900/50'}`}
        >
            <div className={`${active ? color : 'text-slate-600'} transition-colors`}>{icon}</div>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'text-white' : 'text-slate-600'}`}>
                {label}
            </span>
            {active && <div className={`absolute bottom-0 w-full h-0.5 ${color.replace('text-', 'bg-')} shadow-[0_-2px_6px_currentColor]`}></div>}
        </button>
    )
}