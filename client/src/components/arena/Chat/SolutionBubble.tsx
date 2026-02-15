import { useState, useEffect } from 'react';
import { WarningAmber, Lightbulb } from '@mui/icons-material';
import { MathText } from './SolutionPart/MathText';
import { SolutionHeader } from './SolutionPart/SolutionHeader';

interface SolutionProps {
    msg: {
        dados_ia: any;
        imagem_original: string;
    };
}

export default function SolutionBubble({ msg }: SolutionProps) {
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'rapida' | 'passos' | 'completa'>('rapida');
    const [showFullImage, setShowFullImage] = useState(false);

    useEffect(() => {
        if (!msg.dados_ia) return;
        
        let raw = msg.dados_ia;
        // Parse defensivo se vier como string
        if (typeof raw === 'string') {
            try { raw = JSON.parse(raw); } catch { raw = {}; }
        }

        // Adaptador Gemini (Novo) vs Claude (Velho)
        setData({
            topico: raw.topico || "Geral",
            dificuldade: raw.dificuldade || "N/A",
            
            // Se for Gemini, usa 'resolucao_rapida'. Se for velho, 'resultado_unico'.
            resumo: raw.resolucao_rapida || raw.resultado_unico || "Ver solução completa",
            gabarito: raw.multipla_escolha || "N/A",
            
            // Se for Gemini, usa 'resolucao_eficiente'. Se for velho, converte array em texto.
            passos: raw.resolucao_eficiente || (Array.isArray(raw.roteiro_estruturado) 
                ? raw.roteiro_estruturado.map((b: any) => `**${b.titulo}**\n${b.passos.join('\n')}`).join('\n\n') 
                : ""),
                
            completa: raw.resolucao_completa || raw.teoria || "",
            dica: raw.dica_extra || null,
            alerta: raw.alerta || null
        });
    }, [msg.dados_ia]);

    if (!data) return <div className="text-xs text-slate-500 animate-pulse">Decifrando...</div>;

    return (
        <div className="flex flex-col gap-2 max-w-[95%] w-full md:max-w-[500px] animate-fade-in-up self-start">
            
            <SolutionHeader 
                topico={data.topico} 
                dificuldade={data.dificuldade} 
                activeTab={activeTab} 
                onTabChange={setActiveTab}
                hasImage={!!msg.imagem_original}
                onExpandImage={() => setShowFullImage(true)}
            />

            <div className="bg-slate-900 border-x border-b border-slate-800 rounded-b-2xl p-5 min-h-[150px]">
                
                {data.alerta && (
                    <div className="mb-4 flex gap-2 bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20 items-start">
                        <WarningAmber className="text-yellow-500 shrink-0 mt-0.5" sx={{fontSize:16}} />
                        <p className="text-[10px] text-yellow-100/90 leading-tight">{data.alerta}</p>
                    </div>
                )}

                {/* ABA 1: RESUMO */}
                {activeTab === 'rapida' && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 py-2 animate-fade-in">
                        <div className="text-center w-full">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Resultado Final</p>
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 w-full overflow-x-auto text-xl font-black text-white">
                                <MathText content={data.resumo} />
                            </div>
                        </div>
                        {data.gabarito !== 'N/A' && (
                            <div className="flex flex-col items-center">
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Gabarito</p>
                                <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center font-black text-white shadow-lg shadow-cyan-600/30">
                                    {data.gabarito}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ABA 2: PASSOS */}
                {activeTab === 'passos' && (
                    <div className="animate-fade-in">
                        <MathText content={data.passos} />
                    </div>
                )}

                {/* ABA 3: AULA COMPLETA */}
                {activeTab === 'completa' && (
                    <div className="animate-fade-in">
                        <MathText content={data.completa} />
                        {data.dica && (
                            <div className="mt-6 bg-gradient-to-r from-yellow-900/20 to-transparent border-l-4 border-yellow-500 pl-3 py-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <Lightbulb className="text-yellow-400" sx={{fontSize:16}} />
                                    <span className="text-[10px] font-bold text-yellow-400 uppercase">Dica do Oráculo</span>
                                </div>
                                <p className="text-xs text-yellow-100/80 italic">{data.dica}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Imagem Full */}
            {showFullImage && (
                <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowFullImage(false)}>
                    <img src={msg.imagem_original} className="max-w-full max-h-full object-contain" alt="Original" />
                </div>
            )}
        </div>
    );
}