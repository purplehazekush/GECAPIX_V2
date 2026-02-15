import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

// Regex poderoso para separar blocos matemáticos de texto
// Captura: $$...$$, \[...\], $...$ e \(...\)
const MATH_REGEX = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\([\s\S]*?\\\))/g;

// Limpeza de LaTeX sujo que as IAs as vezes mandam
const cleanLatex = (str: string) => {
    return str
        .replace(/\\sen\b/g, '\\sin') // Corrige pt-br
        .replace(/\\text\{([^}]+)\}/g, '$1') // Simplifica text
        .replace(/\$/g, ''); // Remove cifrões extras internos
};

// Remove os delimitadores externos (ex: $$, \[, \]) para o Katex renderizar limpo
const stripDelimiters = (mathStr: string) => {
    // Remove $$ ou \[ do início
    let clean = mathStr.replace(/^(\$\$|\\\[|\\\(|\$)/, '');
    // Remove $$ or \] do fim
    clean = clean.replace(/(\$\$|\\\]|\\\)|$)$/, '');
    return clean;
};

export const MathText = ({ content }: { content: string }) => {
    if (!content) return null;

    const parts = content.split(MATH_REGEX);

    return (
        <div className="text-sm text-slate-300 leading-relaxed font-sans space-y-2 whitespace-pre-line">
            {parts.map((part, index) => {
                // Bloco Matemático: $$...$$ ou \[...\]
                if (part.startsWith('$$') || part.startsWith('\\[')) {
                    // Aqui usamos a função segura em vez do regex literal quebravél
                    const math = stripDelimiters(part);
                    return (
                        <div key={index} className="my-2 overflow-x-auto custom-scrollbar bg-slate-950/30 p-2 rounded-lg border border-slate-800/50">
                            <BlockMath>{cleanLatex(math)}</BlockMath>
                        </div>
                    );
                }
                // Matemática Inline: $...$ ou \(...\)
                if (part.startsWith('$') || part.startsWith('\\(')) {
                    const math = stripDelimiters(part);
                    return (
                        <span key={index} className="text-cyan-200 font-medium px-0.5">
                            <InlineMath>{cleanLatex(math)}</InlineMath>
                        </span>
                    );
                }
                // Texto Normal (Suporte básico a negrito **)
                return <span key={index} dangerouslySetInnerHTML={{ 
                    __html: part.replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>') 
                }} />;
            })}
        </div>
    );
};