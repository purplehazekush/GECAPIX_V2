/**
 * Utilitário de Resiliência para LaTeX/Texto
 * Client: src/utils/textCleaner.ts
 */

export const fixLatexAccents = (text: string): string => {
    if (!text) return "";
    let clean = text
        // 1. Acentos Arcaicos (LaTeX clássico -> Unicode)
        .replace(/\\c\{c\}/gi, 'ç')
        .replace(/\\C\{C\}/gi, 'Ç')
        .replace(/\\\^\{([aeiou])\}/gi, '$1\u0302')
        .replace(/\\'\{([aeiou])\}/gi, '$1\u0301')
        .replace(/\\`\{([aeiou])\}/gi, '$1\u0300')
        .replace(/\\~\{([aeioun])\}/gi, '$1\u0303')
        .replace(/\\'([aeiou])/gi, '$1\u0301')

        // 2. Traduções PT-BR -> EN
        .replace(/\\sen\b/g, '\\sin')
        .replace(/\\tg\b/g, '\\tan')
        .replace(/\\cosec\b/g, '\\csc')

        // 3. Ressurreição de Comandos e Limpeza
        .replace(/(^|[^\\])boxed\{/g, '$1\\boxed{')
        .replace(/(^|[^\\])text\{/g, '$1\\text{')
        .replace(/\{\s+\}/g, '{}');

    // 4. Desembrulha rótulos
    clean = unwrapBoxedLabels(clean);

    return clean.trim();
};

const unwrapBoxedLabels = (text: string): string => {
    // Caso 1: \boxed{\text{...}}
    const patternText = /\\boxed\{\s*\\text\{\s*(.+?)\s*\}\s*\}/;
    const matchText = text.match(patternText);
    if (matchText) return matchText[1];

    // Caso 2: \boxed{...} simples
    const patternSimple = /\\boxed\{\s*(.+?)\s*\}/;
    const matchSimple = text.match(patternSimple);
    if (matchSimple && (matchSimple[1].includes(' ') || /[áéíóúçã]/.test(matchSimple[1]))) {
        return matchSimple[1];
    }
    return text;
};

/**
 * Inteligência para decidir: É Math Block, Math Inline ou Texto?
 */
export const detectContentType = (content: string): 'MATH' | 'TEXT' | 'MIXED' => {
    const clean = content.trim();
    
    // Identificadores de Texto
    const hasManySpaces = (clean.match(/ /g) || []).length >= 2;
    const hasAccents = /[áéíóúãõçÁÉÍÓÚÃÕÇ]/.test(clean);
    
    // Regex: Começa com Maiúscula seguida de letras minúsculas (ex: "Logo", "Assim")
    // O {1,} garante que não pegue apenas uma letra (variável "F" de força)
    const startsWithWord = /^[A-ZÀ-Ú][a-zà-ú]{1,}/.test(clean); 

    // Identificadores Matemáticos
    const hasMathSymbols = /[=\\∫∑∂√_^{}]/.test(clean);
    const isEquation = clean.includes('=');
    const hasLatexDelimiters = clean.includes('$') || clean.includes('\\(');

    // CASO 1: É Texto ou Misto?
    // Adicionamos startsWithWord aqui: se começa com "Calculando...", é texto, mesmo que tenha "=" depois.
    if (hasAccents || startsWithWord || (hasManySpaces && !clean.startsWith('\\'))) {
        
        // Se, apesar de ser texto, tiver símbolos matemáticos fortes no meio
        // Ex: "A área é calculada por A = b*h" -> Misto (renderiza texto com inline math)
        if (hasLatexDelimiters || (isEquation && hasMathSymbols)) {
            return 'MIXED';
        }
        return 'TEXT';
    }

    // CASO 2: Matemática Pura
    // Se não caiu no filtro de texto acima e tem símbolos, é bloco matemático
    if (hasMathSymbols || isEquation) {
        return 'MATH';
    }

    // Default (fallback seguro)
    return 'TEXT';
};