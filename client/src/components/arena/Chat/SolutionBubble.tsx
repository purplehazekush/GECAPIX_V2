import { useState } from 'react';
import { 
    Bolt, School, Assignment, 
    ExpandMore, ExpandLess, WarningAmber 
} from '@mui/icons-material';

// Se você não tiver um renderizador de LaTeX instalado, o texto aparecerá cru ($x^2$).
// Recomendação futura: instalar 'react-latex-next' ou 'katex'.
// Por enquanto, vamos exibir como texto, mas formatado visualmente.

interface SolutionProps {
    msg: {
        dados_ia: {
            tipo_questao: string;
            resumo_topo: string;
            gabarito_letra?: string;
            passo_a_passo: string[];
            explicacao_teorica: string;
            alerta?: string;
        };
        imagem_original: string;
    };
}

export default function SolutionBubble({ msg }: SolutionProps) {
    const data = msg.dados_ia;
    const [expanded, setExpanded] = useState(false);
    const [showTheory, setShowTheory] = useState(false);

    // Verifica se é múltipla escolha para mudar a cor
    const isMultipla = data.tipo_questao === 'MULTIPLA_ESCOLHA';
    
    return (
        <div className="flex flex-col gap-2 max-w-[85%] animate-fade-in-up">
            
            {/* CABEÇALHO DO ORÁCULO */}
            <div className="flex items-center gap-2 mb-1 pl-1">
                <span className="text-[10px] font-black uppercase text-purple-400">Oráculo IA</span>
                <span className="text-[9px] text-slate-600">• Solução Verificada</span>
            </div>

            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl overflow-hidden shadow-lg">
                
                {/* 1. ZONA DE IMPACTO (O que o aluno vê escondido) */}
                <div className="p-4 bg-gradient-to-r from-slate-900 to-purple-900/20">
                    {/* Alerta de múltiplas questões */}
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
                            
                            {/* A RESPOSTA GIGANTE */}
                            <h2 className="text-2xl font-black text-white tracking-tight">
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

                {/* 2. ZONA EFICIENTE (O "Passo a Passo") */}
                <div className="px-4 py-3 bg-slate-950 border-t border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 flex items-center gap-1">
                        <Assignment sx={{fontSize:12}} /> Como chegar lá:
                    </p>
                    <ul className="space-y-2">
                        {data.passo_a_passo?.map((step, idx) => (
                            <li key={idx} className="text-xs text-slate-300 flex gap-2 leading-relaxed">
                                <span className="text-purple-500 font-bold select-none">{idx + 1}.</span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 3. BOTÃO DE EXPANSÃO (Justificativa/Teoria) */}
                <button 
                    onClick={() => setExpanded(!expanded)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 border-t border-slate-800 text-[10px] font-bold text-slate-400 uppercase flex items-center justify-center gap-1 transition-colors"
                >
                    {expanded ? 'Esconder Explicação' : 'Ver Explicação Completa'}
                    {expanded ? <ExpandLess sx={{fontSize:14}}/> : <ExpandMore sx={{fontSize:14}}/>}
                </button>

                {/* 4. ZONA COMPLETA (Escondida por padrão) */}
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

            {/* Link para imagem original (caso queira conferir) */}
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