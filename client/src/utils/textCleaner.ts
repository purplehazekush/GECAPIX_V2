// client/src/utils/textCleaner.ts

/**
 * Corrige acentuação arcaica do LaTeX para Unicode nativo.
 * Ex: 'ma\c{c}\~{a}' -> 'maçã'
 */
export const fixLatexAccents = (text: string): string => {
    return text
        .replace(/\\c\{c\}/g, 'ç')      // \c{c} -> ç
        .replace(/\\C\{C\}/g, 'Ç')      // \C{C} -> Ç
        .replace(/\\\^\{([aeiou])\}/g, '$1\u0302') // \^{a} -> â (combinação)
        .replace(/\\'\{([aeiou])\}/g, '$1\u0301')  // \'{a} -> á
        .replace(/\\`\{([aeiou])\}/g, '$1\u0300')  // \`{a} -> à
        .replace(/\\~\{([aeioun])\}/g, '$1\u0303') // \~{a} -> ã
        .replace(/\\(["'`^~])\{([a-zA-Z])\}/g, (_match, accent, char) => {
            // Fallback genérico para acentos
            const map: Record<string, string> = {
                "'": '\u0301', // agudo
                "`": '\u0300', // grave
                "^": '\u0302', // circunflexo
                "~": '\u0303', // til
                '"': '\u0308', // trema
            };
            return char + (map[accent] || '');
        })
        // Remove comandos de texto desnecessários se estiverem no início/fim de linha
        .replace(/^\\text\{(.+?)\}$/, '$1'); 
};

/**
 * Remove comandos LaTeX que quebram o fluxo de texto simples.
 */
export const cleanLatexCommands = (text: string): string => {
    // Remove \text{...} mas mantém o conteúdo
    let cleaned = text.replace(/\\text\{([^{}]+)\}/g, '$1');
    
    // Remove delimitadores de math mode se estiverem cercando o texto todo incorretamente
    if ((cleaned.startsWith('$') && cleaned.endsWith('$')) || 
        (cleaned.startsWith('\\(') && cleaned.endsWith('\\)'))) {
        // Verifica se é uma frase longa (provavelmente texto errado em math mode)
        if (cleaned.length > 20 && cleaned.includes(' ')) {
            cleaned = cleaned.substring(2, cleaned.length - 2); // Remove \( e \)
            cleaned = cleaned.replace(/^\$|\$$/g, ''); // Remove $ e $
        }
    }
    
    return cleaned;
};

/**
 * Decide se uma string deve ser renderizada como Bloco Matemático ou Texto Puro.
 */
export const detectContentType = (content: string): 'MATH' | 'TEXT' | 'MIXED' => {
    const clean = content.trim();
    
    // Sinais fortes de matemática
    const hasMathSymbols = /[=\\∫∑∂√]/.test(clean);
    
    // Sinais fortes de texto
    // Se tem espaços, acentos, pontuação de frase e NÃO começa com comando math
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