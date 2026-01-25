// client/src/components/arena/Chat/SolutionBubble.tsx
import { useState, useEffect } from 'react';
import { 
    Bolt, School, Assignment, 
    WarningAmber, ErrorOutline,
    ZoomIn} from '@mui/icons-material';

// Importando estilos e componentes do KaTeX
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

interface SolutionProps {
    msg: {
        dados_ia: any;
        imagem_original: string;
    };
}

export default function SolutionBubble({ msg }: SolutionProps) {
    // Estado dos Dados
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Estado da Interface
    const [activeTab, setActiveTab] = useState<'rapida' | 'roteiro' | 'teoria'>('rapida');
    const [showOriginalImage, setShowOriginalImage] = useState(false);

    // PROCESSAMENTO DE DADOS (Blindagem)
    useEffect(() => {
        try {
            let rawData = msg.dados_ia;

            // 1. Parse se for string
            if (typeof rawData === 'string') {
                rawData = JSON.parse(rawData);
            }

            // 2. Validação
            if (!rawData || typeof rawData !== 'object') {
                throw new Error("Dados vazios.");
            }

            // 3. Normalização (Garante que as abas funcionem mesmo se a AI alucinar chaves)
            setData({
                tipo: rawData.tipo || "ABERTA",
                resposta_final: rawData.resposta_final || rawData.resumo_topo || "Ver Roteiro",
                memoria_calculo: Array.isArray(rawData.memoria_calculo) ? rawData.memoria_calculo : [],
                teoria: rawData.teoria || rawData.explicacao_teorica || "Sem teoria disponível.",
                alerta: rawData.alerta || null
            });
            setError(null);

        } catch (err) {
            console.error("Erro render SolutionBubble:", err);
            setError("Erro ao processar resposta.");
        }
    }, [msg.dados_ia]);

    // RENDERIZAÇÃO DE ERRO
    if (error || !data) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 p-3 rounded-xl max-w-[90%] animate-fade-in flex items-center gap-3">
                <ErrorOutline className="text-red-500" />
                <p className="text-xs text-red-300">O Oráculo sussurrou algo ininteligível.</p>
            </div>
        );
    }

    const isMultipla = data.tipo === 'MULTIPLA_ESCOLHA';

    return (
        <div className="flex flex-col gap-2 max-w-[95%] w-full md:max-w-[400px] animate-fade-in-up self-start">
            
            {/* --- CABEÇALHO DO ORÁCULO --- */}
            <div className="flex justify-between items-end pl-1 pr-1">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                        Oráculo IA
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono">v2.0</span>
                </div>

                {/* MINIATURA DA IMAGEM ORIGINAL (Clicável) */}
                {msg.imagem_original && (
                    <button 
                        onClick={() => setShowOriginalImage(true)}
                        className="relative group overflow-hidden rounded-lg border border-slate-700 w-12 h-8 bg-slate-800 flex items-center justify-center transition-all hover:border-purple-500"
                    >
                        <img 
                            src={msg.imagem_original} 
                            alt="Questão" 
                            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn sx={{ fontSize: 14 }} className="text-white" />
                        </div>
                    </button>
                )}
            </div>

            {/* --- O BALÃO PRINCIPAL --- */}
            <div className="bg-slate-900 border border-purple-500/40 rounded-2xl overflow-hidden shadow-[0_4px_20px_-5px_rgba(168,85,247,0.3)]">
                
                {/* 1. SELETOR DE ABAS (Top Navigation) */}
                <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/50">
                    <button 
                        onClick={() => setActiveTab('rapida')}
                        className={`py-3 text-[10px] font-black uppercase tracking-wider transition-colors relative ${
                            activeTab === 'rapida' ? 'text-white' : 'text-slate-600 hover:text-slate-400'
                        }`}
                    >
                        <Bolt sx={{ fontSize: 14 }} className={`mb-0.5 ${activeTab === 'rapida' ? 'text-yellow-400' : ''}`} />
                        <span className="block">Rápida</span>
                        {activeTab === 'rapida' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-400 shadow-[0_-2px_8px_rgba(250,204,21,0.5)]"></div>}
                    </button>

                    <button 
                        onClick={() => setActiveTab('roteiro')}
                        className={`py-3 text-[10px] font-black uppercase tracking-wider transition-colors relative ${
                            activeTab === 'roteiro' ? 'text-white' : 'text-slate-600 hover:text-slate-400'
                        }`}
                    >
                        <Assignment sx={{ fontSize: 14 }} className={`mb-0.5 ${activeTab === 'roteiro' ? 'text-cyan-400' : ''}`} />
                        <span className="block">Roteiro</span>
                        {activeTab === 'roteiro' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400 shadow-[0_-2px_8px_rgba(34,211,238,0.5)]"></div>}
                    </button>

                    <button 
                        onClick={() => setActiveTab('teoria')}
                        className={`py-3 text-[10px] font-black uppercase tracking-wider transition-colors relative ${
                            activeTab === 'teoria' ? 'text-white' : 'text-slate-600 hover:text-slate-400'
                        }`}
                    >
                        <School sx={{ fontSize: 14 }} className={`mb-0.5 ${activeTab === 'teoria' ? 'text-purple-400' : ''}`} />
                        <span className="block">Teoria</span>
                        {activeTab === 'teoria' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-400 shadow-[0_-2px_8px_rgba(168,85,247,0.5)]"></div>}
                    </button>
                </div>

                {/* 2. ÁREA DE CONTEÚDO */}
                <div className="p-4 min-h-[120px] bg-slate-900 relative">
                    
                    {/* ALERTA DE MÚLTIPLAS QUESTÕES (Aparece em todas as abas se existir) */}
                    {data.alerta && (
                        <div className="mb-4 flex items-start gap-2 bg-yellow-500/5 p-2 rounded border border-yellow-500/10">
                            <WarningAmber className="text-yellow-500 mt-0.5" sx={{fontSize: 14}} />
                            <p className="text-[10px] text-yellow-200/80 leading-tight">{data.alerta}</p>
                        </div>
                    )}

                    {/* --- ABA 1: RÁPIDA (Foco Total) --- */}
                    {activeTab === 'rapida' && (
                        <div className="flex flex-col items-center justify-center h-full py-2 animate-fade-in">
                            <p className="text-[9px] text-slate-500 font-bold uppercase mb-2 tracking-widest">
                                {isMultipla ? 'Gabarito Sugerido' : 'Resultado Final'}
                            </p>
                            
                            <div className="text-2xl md:text-3xl font-black text-white text-center tracking-tight">
                                {/* Tenta renderizar LaTeX se detectar cifrão, senão texto puro */}
                                {data.resposta_final.includes('$') || data.resposta_final.includes('\\') ? (
                                    <div className="latex-render-huge text-emerald-400">
                                        <BlockMath>{data.resposta_final.replace(/\$/g, '')}</BlockMath>
                                    </div>
                                ) : (
                                    <span className="text-emerald-400">{data.resposta_final}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- ABA 2: ROTEIRO (Passo a Passo Matemático) --- */}
                    {activeTab === 'roteiro' && (
                        <div className="space-y-3 animate-fade-in">
                            {data.memoria_calculo && data.memoria_calculo.length > 0 ? (
                                data.memoria_calculo.map((step: string, idx: number) => (
                                    <div key={idx} className="flex items-start gap-3 group">
                                        <span className="text-[10px] font-mono text-slate-600 mt-2 select-none group-hover:text-cyan-400 transition-colors">
                                            {(idx + 1).toString().padStart(2, '0')}
                                        </span>
                                        <div className="flex-1 bg-slate-950/50 rounded-lg px-3 py-1 border border-slate-800/50 text-sm text-slate-200 overflow-x-auto custom-scrollbar">
                                            {/* Renderiza o passo. Removemos $ extras para o BlockMath não bugar */}
                                            <BlockMath>{step.replace(/\$/g, '')}</BlockMath>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 text-center italic py-4">
                                    Nenhum cálculo intermediário necessário.
                                </p>
                            )}
                        </div>
                    )}

                    {/* --- ABA 3: TEORIA (Texto Explicativo) --- */}
                    {activeTab === 'teoria' && (
                        <div className="animate-fade-in">
                            <div className="prose prose-invert prose-sm max-w-none">
                                <p className="text-xs text-slate-300 leading-6 text-justify whitespace-pre-line">
                                    {data.teoria}
                                </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                                <p className="text-[9px] text-slate-600 italic">
                                    Explicação gerada pelo Oráculo v2.0
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DE IMAGEM ORIGINAL (Full Screen) */}
            {showOriginalImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setShowOriginalImage(false)}
                >
                    <img 
                        src={msg.imagem_original} 
                        className="max-w-full max-h-full rounded-lg shadow-2xl" 
                        alt="Original" 
                    />
                    <button className="absolute top-4 right-4 text-white p-2 bg-white/10 rounded-full">
                        <ZoomIn />
                    </button>
                </div>
            )}
        </div>
    );
}