// client/src/utils/textCleaner.ts

/**
 * Corrige acentuação arcaica e comandos LaTeX quebrados.
 */
export const fixLatexAccents = (text: string): string => {
    let clean = text
        // 1. Correção de Acentos (Legado)
        .replace(/\\c\{c\}/g, 'ç')
        .replace(/\\C\{C\}/g, 'Ç')
        .replace(/\\\^\{([aeiou])\}/g, '$1\u0302')
        .replace(/\\'\{([aeiou])\}/g, '$1\u0301')
        .replace(/\\`\{([aeiou])\}/g, '$1\u0300')
        .replace(/\\~\{([aeioun])\}/g, '$1\u0303')
        
        // 2. Ressurreição de Comandos (boxed{...} -> \boxed{...})
        // O regex olha se NÃO tem barra invertida antes de 'boxed' ou 'text'
        .replace(/(^|[^\\])boxed\{/g, '$1\\boxed{')
        .replace(/(^|[^\\])text\{/g, '$1\\text{')
        
        // 3. Limpeza de espaços extras dentro de chaves vazias
        .replace(/\{\s+\}/g, '{}');

    // 4. Se for um bloco de Resposta encapsulado, desembrulha para o UI nativo
    clean = unwrapBoxedLabels(clean);

    return clean;
};

/**
 * Remove caixas LaTeX desnecessárias em rótulos para que o Frontend
 * possa estilizar com a barra roxa.
 * Ex: "\boxed{\text{Resposta: Letra A}}" vira "Resposta: Letra A"
 */
const unwrapBoxedLabels = (text: string): string => {
    // Regex procura por \boxed{\text{Rótulo: ...}}
    // Captura o conteúdo de dentro ignorando a caixa
    const pattern = /\\boxed\{\s*\\text\{\s*(.+?:.*?)\s*\}\s*\}/;
    const match = text.match(pattern);

    if (match) {
        return match[1]; // Retorna apenas "Resposta: Letra A"
    }

    // Tenta também sem o \text interno: \boxed{Resposta: A}
    const patternSimple = /\\boxed\{\s*(.+?:.*?)\s*\}/;
    const matchSimple = text.match(patternSimple);
    
    if (matchSimple) {
        return matchSimple[1];
    }

    return text;
};

/**
 * Decide se uma string deve ser renderizada como Bloco Matemático ou Texto Puro.
 */
export const detectContentType = (content: string): 'MATH' | 'TEXT' | 'MIXED' => {
    const clean = content.trim();
    
    // Sinais fortes de matemática
    const hasMathSymbols = /[=\\∫∑∂√]/.test(clean);
    
    // Sinais fortes de texto
    const hasSpaces = clean.includes(' ');
    const hasAccents = /[áéíóúãõçÁÉÍÓÚÃÕÇ]/.test(clean);
    
    // CASO 1: Texto explicativo ("Analisando cada alternativa:")
    if (hasAccents || (hasSpaces && !hasMathSymbols && !clean.startsWith('\\'))) {
        return 'TEXT';
    }

    // CASO 2: Texto misturado ("A integral é \( \int x dx \)")
    if (hasSpaces && (clean.includes('\\(') || clean.includes('$'))) {
        return 'MIXED';
    }

    // CASO 3: Matemática Pura
    return 'MATH';
};

/**
 * Remove comandos LaTeX que quebram o fluxo de texto simples.
 */
export const cleanLatexCommands = (text: string): string => {
    let cleaned = text.replace(/\\text\{([^{}]+)\}/g, '$1');
    if ((cleaned.startsWith('$') && cleaned.endsWith('$')) || 
        (cleaned.startsWith('\\(') && cleaned.endsWith('\\)'))) {
        if (cleaned.length > 20 && cleaned.includes(' ')) {
            cleaned = cleaned.substring(2, cleaned.length - 2); 
            cleaned = cleaned.replace(/^\$|\$$/g, ''); 
        }
    }
    return cleaned;
};