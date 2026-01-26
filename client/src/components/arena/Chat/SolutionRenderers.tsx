import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { fixLatexAccents, detectContentType } from '../../../utils/textCleaner';

// --- COMPONENTES ATÓMICOS ---

/**
 * Bloco Matemático Seguro: Se o LaTeX quebrar, mostra o erro vermelho em vez de travar a tela.
 */
export const SafeBlockMath = ({ children }: { children: string }) => {
    if (!children) return null;
    const cleanMath = fixLatexAccents(children.replace(/\$/g, ''));

    return (
        <div className="my-1 overflow-x-auto custom-scrollbar">
            <BlockMath 
                errorColor={'#ef4444'} 
                renderError={() => (
                    <div className="text-red-400 text-[10px] font-mono border border-red-500/30 p-1 rounded bg-red-900/10">
                        ⚠️ Math Error: {cleanMath}
                    </div>
                )}
                settings={{ strict: false, trust: true }} 
            >
                {cleanMath}
            </BlockMath>
        </div>
    );
};

/**
 * Matemática Inline Segura (dentro do texto)
 */
export const SafeInlineMath = ({ children }: { children: string }) => {
    const cleanMath = fixLatexAccents(children.replace(/\$/g, ''));
    return (
        <span className="text-purple-300 font-bold px-0.5">
            <InlineMath errorColor={'#ef4444'} settings={{ strict: false, trust: true }}>
                {cleanMath}
            </InlineMath>
        </span>
    );
};

// --- COMPONENTES INTELIGENTES ---

/**
 * Renderiza texto que pode conter matemática misturada ($...$ ou \(...\))
 */
export const RenderTextWithMath = ({ text }: { text: string }) => {
    if (!text) return null;
    const cleanText = fixLatexAccents(text);
    
    // Divide o texto onde encontrar delimitadores matemáticos
    const parts = cleanText.split(/(\\\(.*?\\\)|\\\[.*?\\\]|\$.*?\$)/g);
    
    return (
        <>
            {parts.map((part, index) => {
                if ((part.startsWith('\\(') && part.endsWith('\\)')) || 
                    (part.startsWith('$') && part.endsWith('$'))) {
                    const math = part.replace(/^\\\(|^\\\[|^\$|\\\)$|\\\]$|\$$/g, '');
                    return <SafeInlineMath key={index}>{math}</SafeInlineMath>;
                } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
                    const math = part.slice(2, -2);
                    return <SafeBlockMath key={index}>{math}</SafeBlockMath>;
                }
                return <span key={index}>{part}</span>;
            })}
        </>
    );
};

/**
 * Decide automaticamente se renderiza como Texto, Math Block ou Misto.
 */
export const RenderAutoContent = ({ content }: { content: string }) => {
    const type = detectContentType(content);

    if (type === 'MATH') {
        return <SafeBlockMath>{content}</SafeBlockMath>;
    }
    
    return (
        <div className="text-sm text-slate-300 leading-relaxed py-1 whitespace-pre-wrap font-sans">
            <RenderTextWithMath text={content} />
        </div>
    );
};

/**
 * Renderiza um passo do roteiro, detectando se há rótulos (ex: "Passo 1: ...")
 * para dar destaque visual.
 */
export const RenderSmartStep = ({ step }: { step: string }) => {
    const content = fixLatexAccents(step);
    
    // Detecção de Rótulo "Label: Conteúdo"
    const colonIndex = content.indexOf(':');
    const preColon = content.substring(0, colonIndex);
    // Validação para não confundir com math (ex: 1:2 ou maps a:b)
    const isLabel = colonIndex > -1 && colonIndex < 40 && !preColon.includes('\\') && !preColon.includes('=');

    if (isLabel) {
        const label = content.substring(0, colonIndex + 1);
        const rest = content.substring(colonIndex + 1).trim();
        
        return (
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 py-1 border-l-2 border-purple-500/30 pl-3 bg-purple-500/5 rounded-r-lg mb-2">
                <span className="text-xs font-bold text-purple-300 whitespace-nowrap shrink-0 font-sans">
                    {label}
                </span>
                <div className="flex-1 overflow-hidden">
                    <RenderAutoContent content={rest} />
                </div>
            </div>
        );
    }

    return <RenderAutoContent content={content} />;
};