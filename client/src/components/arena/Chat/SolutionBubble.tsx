import { useState, useEffect } from 'react';
import { 
    Bolt, School, Assignment, 
    ExpandMore, ExpandLess, WarningAmber, ErrorOutline
} from '@mui/icons-material';

interface SolutionProps {
    msg: {
        dados_ia: any; // Aceita qualquer coisa para tratarmos internamente
        imagem_original: string;
    };
}

export default function SolutionBubble({ msg }: SolutionProps) {
    // ESTADO LOCAL PARA DADOS PROCESSADOS
    const [data, setData] = useState<any>(null);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // EFEITO: Processa os dados quando a mensagem chega
    useEffect(() => {
        try {
            let rawData = msg.dados_ia;

            // 1. Tenta corrigir se vier como String (Erro comum de serialização)
            if (typeof rawData === 'string') {
                try {
                    rawData = JSON.parse(rawData);
                } catch (e) {
                    throw new Error("Formato de dados inválido.");
                }
            }

            // 2. Verifica se é um objeto válido
            if (!rawData || typeof rawData !== 'object') {
                throw new Error("Dados vazios.");
            }

            // 3. Normalização de Chaves (Caso a IA erre levemente o nome)
            const processedData = {
                tipo_questao: rawData.tipo_questao || "ABERTA",
                // Tenta pegar resumo_topo, se não, tenta resumo, se não, erro.
                resumo_topo: rawData.resumo_topo || rawData.resumo || rawData.resposta_curta || "Resposta Indisponível",
                gabarito_letra: rawData.gabarito_letra || null,
                passo_a_passo: Array.isArray(rawData.passo_a_passo) ? rawData.passo_a_passo : ["Verifique a explicação completa."],
                explicacao_teorica: rawData.explicacao_teorica || rawData.explicacao || "Sem teoria disponível.",
                alerta: rawData.alerta || null
            };

            setData(processedData);
            setError(null);

        } catch (err) {
            console.error("Erro ao processar SolutionBubble:", err);
            setError("Erro ao renderizar resposta.");
        }
    }, [msg.dados_ia]);

    // RENDERIZAÇÃO DE ERRO
    if (error || !data) {
        return (
            <div className="bg-red-900/20 border border-red-500/50 p-3 rounded-xl max-w-[85%] animate-fade-in flex items-center gap-3">
                <ErrorOutline className="text-red-500" />
                <div>
                    <p className="text-xs font-bold text-red-400">Falha na Visualização</p>
                    <p className="text-[10px] text-red-300">O Oráculo falou, mas não entendemos. (Erro de Parse)</p>
                </div>
            </div>
        );
    }

    const isMultipla = data.tipo_questao === 'MULTIPLA_ESCOLHA';
    
    return (
        <div className="flex flex-col gap-2 max-w-[85%] animate-fade-in-up">
            
            {/* CABEÇALHO */}
            <div className="flex items-center gap-2 mb-1 pl-1">
                <span className="text-[10px] font-black uppercase text-purple-400">Oráculo IA</span>
                <span className="text-[9px] text-slate-600">• Solução Verificada</span>
            </div>

            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl overflow-hidden shadow-lg">
                
                {/* 1. ZONA DE IMPACTO */}
                <div className="p-4 bg-gradient-to-r from-slate-900 to-purple-900/20">
                    {data.alerta && (
                        <div className="flex items-center gap-2 mb-3 bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
                            <WarningAmber className="text-yellow-500 text-[14px]" />
                            <p className="text-[10px] text-yellow-200 leading-tight">{data.alerta}</p>
                        </div>
                    )}

                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                                {isMultipla ? 'Gabarito' : 'Resultado Final'}
                            </p>
                            
                            <h2 className="text-2xl font-black text-white tracking-tight break-words">
                                {isMultipla && data.gabarito_letra ? (
                                    <span className="text-emerald-400 text-3xl mr-2">{data.gabarito_letra}</span>
                                ) : null}
                                {data.resumo_topo}
                            </h2>
                        </div>
                        
                        <div className="bg-purple-500/20 p-2 rounded-full">
                            <Bolt className="text-purple-400" />
                        </div>
                    </div>
                </div>

                {/* 2. ZONA EFICIENTE */}
                <div className="px-4 py-3 bg-slate-950 border-t border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 flex items-center gap-1">
                        <Assignment sx={{fontSize:12}} /> Como chegar lá:
                    </p>
                    <ul className="space-y-2">
                        {data.passo_a_passo.map((step: string, idx: number) => (
                            <li key={idx} className="text-xs text-slate-300 flex gap-2 leading-relaxed">
                                <span className="text-purple-500 font-bold select-none">{idx + 1}.</span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 3. BOTÃO DE EXPANSÃO */}
                <button 
                    onClick={() => setExpanded(!expanded)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 border-t border-slate-800 text-[10px] font-bold text-slate-400 uppercase flex items-center justify-center gap-1 transition-colors"
                >
                    {expanded ? 'Esconder Explicação' : 'Ver Explicação Completa'}
                    {expanded ? <ExpandLess sx={{fontSize:14}}/> : <ExpandMore sx={{fontSize:14}}/>}
                </button>

                {/* 4. ZONA COMPLETA */}
                {expanded && (
                    <div className="p-4 bg-slate-950 border-t border-slate-800 animate-fade-in">
                        <div className="flex items-center gap-2 mb-2 text-purple-400">
                            <School sx={{fontSize:16}} />
                            <h3 className="text-xs font-black uppercase">Justificativa Teórica</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-6 whitespace-pre-line text-justify">
                            {data.explicacao_teorica}
                        </p>
                    </div>
                )}
            </div>

            <div className="flex justify-end pr-2">
                <a 
                    href={msg.imagem_original} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[9px] text-slate-600 hover:text-purple-400 underline decoration-dashed"
                >
                    Ver imagem original
                </a>
            </div>
        </div>
    );
}