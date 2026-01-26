// client/src/utils/textCleaner.ts

/**
 * Remove o wrapper \boxed{...} ou \boxed{\text{...}} para que o Frontend
 * possa renderizar o rótulo com o estilo roxo nativo.
 */
export const unwrapBoxedLabels = (text: string): string => {
    if (!text) return text;

    // 1. Remove \boxed{\text{CONTEUDO}}
    // Captura o que está dentro do text{...} ignorando espaços
    let match = text.match(/^\\boxed\s*\{\s*\\text\s*\{\s*(.*?)\s*\}\s*\}$/);
    if (match && match[1]) return match[1];

    // 2. Remove \boxed{CONTEUDO} simples
    match = text.match(/^\\boxed\s*\{\s*(.*?)\s*\}$/);
    if (match && match[1]) return match[1];

    return text;
};

/**
 * Corrige acentuação arcaica e limpa comandos de texto desnecessários
 * para evitar erros de renderização como "maçã}".
 */
export const fixLatexAccents = (text: string): string => {
    if (!text) return text;

    let clean = text
        // 1. Converte acentos LaTeX antigos para Unicode
        .replace(/\\c\{c\}/gi, 'ç')
        .replace(/\\['`^~]\{([a-zA-Z])\}/g, (_m, accent, char) => {
            const map: any = { "'": '\u0301', "`": '\u0300', "^": '\u0302', "~": '\u0303' };
            return char + (map[accent] || '');
        })
        // Fallback para formatos como \~a ou \'e
        .replace(/\\([~^'`])([a-zA-Z])/g, (_m, accent, char) => {
             const map: any = { "'": '\u0301', "`": '\u0300', "^": '\u0302', "~": '\u0303' };
             return char + (map[accent] || '');
        })
        // Remove espaços vazios em chaves
        .replace(/\{\s+\}/g, '');

    // 2. Remove sobras de comandos \text{} mal fechados
    // Ex: "maçã} \rightarrow" vira "maçã \rightarrow"
    // Removemos chaves de fechamento que não têm par (heurística simples)
    if (clean.includes('}') && !clean.includes('{')) {
        clean = clean.replace(/\}/g, '');
    }

    return clean;
};

/**
 * Detecta se o conteúdo é predominantemente Texto ou Matemática.
 */
export const detectContentType = (content: string): 'MATH' | 'TEXT' | 'MIXED' => {
    const clean = content.trim();
    
    // Se começar com comandos fortes de Math Block
    if (clean.startsWith('\\begin') || clean.startsWith('\\[')) return 'MATH';

    // Comandos matemáticos inconfundíveis
    const hasMathCmd = /\\[a-zA-Z]+/.test(clean) && !clean.includes('\\text');
    const hasMathSymbol = /[=∫∑∂√]/.test(clean);
    
    // Sinais de texto
    const hasSpaces = clean.includes(' ');
    const hasAccents = /[áéíóúãõçÁÉÍÓÚÃÕÇ]/.test(clean);
    
    // Se tem acentos, quase certeza que é texto ou misto
    if (hasAccents) return 'TEXT';

    // Se tem espaços e não tem comandos math complexos, é texto
    if (hasSpaces && !hasMathCmd && !hasMathSymbol) return 'TEXT';

    // Se tem espaços e math, é misto
    if (hasSpaces && (hasMathCmd || hasMathSymbol)) return 'MIXED';

    return 'MATH';
};