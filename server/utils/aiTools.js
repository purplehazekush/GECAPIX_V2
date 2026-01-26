// server/utils/aiTools.js

/**
 * SOLUÇÃO 1: Sanitizador de LaTeX para JSON
 * Corrige barras invertidas que não estão escapadas corretamente.
 */
exports.sanitizarJsonComLatex = (str) => {
    if (!str) return "";
    
    // 1. Remove blocos de código markdown se existirem
    let fixed = str.replace(/```json/g, '').replace(/```/g, '');

    // 2. Remove quebras de linha reais dentro de strings (JSON não permite)
    // Mas mantém os \n literais se o Claude já tiver escapado
    fixed = fixed.replace(/(?<!\\)\n/g, "\\n");

    // 3. O PULO DO GATO:
    // Encontra barras invertidas (\) que NÃO são seguidas por caracteres de escape válidos do JSON
    // E transforma em dupla barra (\\) para o JSON aceitar como texto literal (LaTeX)
    fixed = fixed.replace(/\\(?![/u"bfnrt\\])/g, "\\\\");

    return fixed;
};

/**
 * SOLUÇÃO 3: Definição da Ferramenta (Function Calling)
 * Força o Claude a preencher este formulário estruturado.
 */
exports.oracleToolDefinition = {
    name: "entregar_gabarito",
    description: "Entrega o gabarito estruturado da questão matemática ou física.",
    input_schema: {
        type: "object",
        properties: {
            rascunho_verificacao: { 
                type: "string", 
                description: "Passo a passo mental para garantir precisão aritmética antes da resposta final." 
            },
            sucesso: { type: "boolean" },
            topico: { type: "string" },
            dificuldade: { type: "string", enum: ["Fácil", "Médio", "Difícil", "Insurrecto"] },
            resultado_unico: { 
                type: "string", 
                description: "O resultado final em LaTeX puro (ex: \\frac{1}{2}). Se for texto, use Unicode." 
            },
            itens_rapidos: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        label: { type: "string" },
                        valor: { type: "string" }
                    }
                }
            },
            roteiro_estruturado: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        titulo: { type: "string" },
                        passos: { 
                            type: "array", 
                            items: { type: "string" } 
                        }
                    }
                }
            },
            teoria: { type: "string" },
            alerta: { type: "string" }
        },
        required: ["rascunho_verificacao", "roteiro_estruturado", "resultado_unico", "sucesso"]
    }
};