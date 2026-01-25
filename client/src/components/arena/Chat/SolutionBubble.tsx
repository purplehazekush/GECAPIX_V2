import { useState, useEffect } from 'react';
import { 
    Bolt, School, Assignment, 
    WarningAmber, 
    ZoomIn, LocalOffer, Speed
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
    const [activeTab, setActiveTab] = useState<'rapida' | 'roteiro' | 'teoria'>('roteiro');
    const [showOriginalImage, setShowOriginalImage] = useState(false);

    useEffect(() => {
        try {
            let rawData = msg.dados_ia;

            // 1. Limpeza de String Suja
            if (typeof rawData === 'string') {
                const cleanString = rawData.replace(/[\n\r]/g, " ");
                try {
                    rawData = JSON.parse(cleanString);
                } catch (e) {
                    // Fallback agressivo para escapes quebrados
                    rawData = JSON.parse(rawData.replace(/\\n/g, " "));
                }
            }

            if (!rawData || typeof rawData !== 'object') throw new Error("Dados vazios.");

            // 2. Normalização
            let roteiroFinal = [];
            if (Array.isArray(rawData.roteiro_estruturado)) {
                roteiroFinal = rawData.roteiro_estruturado;
            } else if (Array.isArray(rawData.memoria_calculo)) {
                roteiroFinal = [{ titulo: null, passos: rawData.memoria_calculo }];
            }

            setData({
                topico: rawData.topico || "Geral",
                dificuldade: rawData.dificuldade || "N/A",
                resultado_unico: rawData.resultado_unico || rawData.resultado_principal || null,
                itens_rapidos: Array.isArray(rawData.itens_rapidos) ? rawData.itens_rapidos : (Array.isArray(rawData.itens) ? rawData.itens : []),
                roteiro_estruturado: roteiroFinal,
                teoria: rawData.teoria || "Sem teoria disponível.",
                alerta: rawData.alerta || null
            });
            setError(null);

        } catch (err) {
            console.error("Erro Bubble:", err);
            setError("Erro ao processar.");
        }
    }, [msg.dados_ia]);

    // --- RENDERIZADORES CORE ---

    const SafeBlockMath = ({ children }: { children: string }) => {
        if (!children) return null;
        // Limpa cifrões e espaços duvidosos
        const cleanMath = children.replace(/\$/g, '').replace(/\\\\ \n/g, '\\\\ ').trim();
        return (
            <BlockMath 
                errorColor={'#ef4444'} 
                renderError={() => <span className="text-red-400 text-xs font-mono break-all">{cleanMath}</span>}
                settings={{ strict: false, trust: true }} 
            >
                {cleanMath}
            </BlockMath>
        );
    };

    const SafeInlineMath = ({ children }: { children: string }) => {
        const cleanMath = children ? children.replace(/\$/g, '').trim() : '';
        return (
            <InlineMath errorColor={'#ef4444'} settings={{ strict: false, trust: true }}>
                {cleanMath}
            </InlineMath>
        );
    };

    // Parser que mistura Texto + LaTeX Inline
    const renderTextWithMath = (text: string) => {
        if (!text) return null;
        // Divide por delimitadores \(...\), \[...\], $...$
        const parts = text.split(/(\\\(.*?\\\)|\\\[.*?\\\]|\$.*?\$)/g);
        
        return parts.map((part, index) => {
            if ((part.startsWith('\\(') && part.endsWith('\\)')) || (part.startsWith('$') && part.endsWith('$'))) {
                const math = part.replace(/^\\\(|^\\\[|^\$|\\\)$|\\\]$|\$$/g, '');
                return <span key={index} className="text-purple-400 font-bold px-1"><SafeInlineMath>{math}</SafeInlineMath></span>;
            } 
            else if (part.startsWith('\\[') && part.endsWith('\\]')) {
                const math = part.slice(2, -2);
                return <div key={index} className="my-2 overflow-x-auto"><SafeBlockMath>{math}</SafeBlockMath></div>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    // --- NOVO: RENDERIZADOR INTELIGENTE DE PASSOS ---
    // Decide se o passo é uma Equação Pura ou Texto Explicativo com Math
    const RenderSmartStep = ({ step }: { step: string }) => {
        // Heurística: Se tiver letras normais (não comandos LaTeX) e espaços, é texto misto.
        // Se começar com \ ou tiver muitos símbolos, é bloco.
        
        // Remove comandos LaTeX comuns para testar se sobra "texto humano"
        const textCheck = step.replace(/\\[a-zA-Z]+/g, '').replace(/[^a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÍÏÓÔÕÖÚÇÑ ]/g, '');
        const looksLikeSentence = textCheck.length > 5 && step.includes(' ');

        if (looksLikeSentence && !step.trim().startsWith('\\')) {
            // Renderiza como texto explicativo (esquerda)
            return (
                <div className="text-sm text-slate-300 leading-relaxed py-1">
                    {renderTextWithMath(step)}
                </div>
            );
        } else {
            // Renderiza como bloco matemático (centro)
            return (
                <div className="py-2 overflow-x-auto custom-scrollbar">
                    <SafeBlockMath>{step}</SafeBlockMath>
                </div>
            );
        }
    };

    const getDifficultyColor = (diff: string) => {
        const d = (diff || '').toLowerCase();
        if (d.includes('fácil') || d.includes('facil')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        if (d.includes('médio') || d.includes('medio')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        return 'bg-red-500/20 text-red-400 border-red-500/30';
    };

    const getFontSizeClass = (text: string) => {
        if (!text) return 'text-3xl';
        if (text.length < 10) return 'text-4xl';
        if (text.length < 30) return 'text-2xl';
        return 'text-lg';
    };

    if (error || !data) return null; // Fallback silencioso

    const hasMultipleItems = data.itens_rapidos && data.itens_rapidos.length > 0;
    const finalResult = data.resultado_unico || (hasMultipleItems ? null : "Ver Roteiro");

    return (
        <div className="flex flex-col gap-2 max-w-[95%] w-full md:max-w-[480px] animate-fade-in-up self-start">
            
            {/* Header */}
            <div className="flex justify-between items-end pl-1 pr-1 mb-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                        Oráculo Solver
                    </span>
                    <span className="text-[9px] text-slate-600">v3.3</span>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                        <LocalOffer sx={{fontSize: 10}} className="text-slate-400"/>
                        <span className="text-[9px] font-bold text-slate-300 uppercase max-w-[80px] truncate">{data.topico}</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border ${getDifficultyColor(data.dificuldade)}`}>
                        <Speed sx={{fontSize: 10}}/>
                        <span className="text-[9px] font-bold uppercase">{data.dificuldade}</span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl">
                
                {/* Imagem Banner */}
                {msg.imagem_original && (
                    <div 
                        onClick={() => setShowOriginalImage(true)}
                        className="w-full h-32 md:h-40 bg-black/50 relative group cursor-pointer border-b border-purple-500/20 overflow-hidden"
                    >
                        <img 
                            src={msg.imagem_original} 
                            alt="Questão" 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-105" 
                        />
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="text-white text-[12px]" />
                            <span className="text-[10px] text-white font-bold">Ver Original</span>
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
                <div className="p-4 bg-slate-900 min-h-[160px]">
                    {data.alerta && (
                        <div className="mb-4 flex gap-2 bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20 items-start">
                            <WarningAmber className="text-yellow-500 shrink-0 mt-0.5" sx={{fontSize:16}} />
                            <p className="text-[10px] text-yellow-100/90 leading-tight">{data.alerta}</p>
                        </div>
                    )}

                    {/* ABA RÁPIDA */}
                    {activeTab === 'rapida' && (
                        <div className="animate-fade-in h-full flex flex-col justify-center">
                            {hasMultipleItems ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                                    {data.itens_rapidos.map((item: any, idx: number) => (
                                        <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center text-center relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                                            <span className="absolute top-2 left-2 text-[10px] font-black text-cyan-500 bg-cyan-900/20 px-1.5 rounded">{item.label}</span>
                                            <div className="mt-2 text-lg text-white font-bold w-full overflow-x-auto custom-scrollbar">
                                                <SafeBlockMath>{item.valor}</SafeBlockMath>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-6 text-center shadow-inner relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">Resultado Final</p>
                                    <div className={`font-black text-white w-full overflow-x-auto custom-scrollbar py-2 ${getFontSizeClass(finalResult || '')}`}>
                                        <SafeBlockMath>{finalResult || ''}</SafeBlockMath>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ABA ROTEIRO (Com Smart Renderer) */}
                    {activeTab === 'roteiro' && (
                        <div className="space-y-6 animate-fade-in">
                            {data.roteiro_estruturado.length > 0 ? (
                                data.roteiro_estruturado.map((bloco: any, bIdx: number) => (
                                    <div key={bIdx} className="relative">
                                        {/* Título do Bloco */}
                                        {bloco.titulo && (
                                            <div className="flex items-center gap-2 mb-3 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
                                                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                                                <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wide">{bloco.titulo}</h4>
                                            </div>
                                        )}
                                        
                                        {/* Passos do Bloco */}
                                        <div className="space-y-3 pl-2 border-l-2 border-slate-800/50 ml-1">
                                            {bloco.passos.map((step: string, sIdx: number) => (
                                                <div key={sIdx} className="flex gap-3 group items-baseline">
                                                    {/* Contador */}
                                                    <div className="flex flex-col items-center min-w-[20px]">
                                                        <span className="text-[9px] font-mono text-slate-600 select-none group-hover:text-cyan-400 transition-colors">
                                                            {(sIdx + 1).toString().padStart(2, '0')}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Conteúdo Inteligente */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 min-h-[30px] hover:border-cyan-500/20 transition-colors flex items-center">
                                                            <div className="w-full">
                                                                <RenderSmartStep step={step} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 text-xs italic py-4">Verifique a aba Rápida.</p>
                            )}
                        </div>
                    )}

                    {/* ABA TEORIA */}
                    {activeTab === 'teoria' && (
                        <div className="animate-fade-in">
                            <div className="text-xs text-slate-300 leading-7 text-justify whitespace-pre-line font-light prose-invert">
                                {renderTextWithMath(data.teoria)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Fullscreen */}
            {showOriginalImage && (
                <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowOriginalImage(false)}>
                    <img src={msg.imagem_original} className="max-w-full max-h-full object-contain" alt="Original" />
                    <button className="absolute top-4 right-4 text-white bg-white/10 p-2 rounded-full"><ZoomIn/></button>
                </div>
            )}
        </div>
    );
}

function TabButton({ active, onClick, icon, label, color }: any) {
    return (
        <button onClick={onClick} className={`py-3 flex flex-col items-center justify-center gap-1 transition-all relative ${active ? 'bg-slate-900' : 'bg-slate-950 hover:bg-slate-900/50'}`}>
            <div className={`${active ? color : 'text-slate-600'} transition-colors`}>{icon}</div>
            <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'text-white' : 'text-slate-600'}`}>{label}</span>
            {active && <div className={`absolute bottom-0 w-full h-0.5 ${color.replace('text-', 'bg-')} shadow-[0_-2px_6px_currentColor]`}></div>}
        </button>
    )
}