// server/controllers/aiController.js
const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem');
const TOKEN = require('../config/tokenomics');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;

        // --- VALIDAÇÕES E CUSTOS (Mantidos) ---
        if (!email || !imagem_url) return res.status(400).json({ error: "Dados incompletos." });
        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

        const custoGlue = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_GLUE) || 1;
        let custoCoins = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_COINS) || 50;

        if (user.classe === 'TECNOMANTE') custoCoins = Math.floor(custoCoins * 0.5);

        if ((user.saldo_glue || 0) < custoGlue) return res.status(402).json({ error: "Sem GLUE." });
        if ((user.saldo_coins || 0) < custoCoins) return res.status(402).json({ error: "Sem Coins." });

        // =================================================================================
        // 🧠 PROMPT V9: "LABELED MATH"
        // =================================================================================
        const promptSystem = `
    ATUE COMO: Professor Sênior de Engenharia da UFMG (Cálculo/Física), conhecido por ser extremamente rigoroso e didático.
    CONTEXTO: Você está ensinando alunos que têm dificuldade em visualizar "pulos" algébricos.
    
    OBJETIVO MÁXIMO: Gerar a resolução com o MAIOR NÍVEL DE DETALHAMENTO ALGÉBRICO POSSÍVEL.
    
    --- 🚫 REGRAS DE PROIBIÇÃO (CRÍTICAS) ---
    1. PROIBIDO "SIMPLIFICAR" SEM MOSTRAR: Nunca diga "simplificando a equação, temos...". Você DEVE mostrar a linha da equação antes da simplificação e a linha imediatamente após.
    2. PROIBIDO PULAR ARITMÉTICA BÁSICA EM ÁLGEBRA: Se for somar frações, mostre o MMC. Se for fazer distributiva, mostre a expansão.
    3. PROIBIDO OMITIR DEFINIÇÕES: Em integrais ou derivadas, declare explicitamente quem é 'u', 'du', 'dv', etc. antes de aplicar.

    --- ⚙️ DIRETRIZES DE FORMATAÇÃO (LATEX & JSON) ---
    1. Use SEMPRE '\\displaystyle' no início de integrais, limites e frações para ficarem grandes e legíveis.
    2. ESCAPE OBRIGATÓRIO: Para o JSON ser válido, toda barra invertida do LaTeX deve ser dupla. Exemplo: use "\\\\frac" em vez de "\frac".
    3. RÓTULOS: Quando aplicar uma propriedade, use o prefixo "Label:". Ex: "Label: Regra da Cadeia".

    --- ESTRUTURA DE RESPOSTA (JSON STRICT) ---
    Retorne APENAS um objeto JSON cru (sem markdown de código em volta), seguindo estritamente este schema:

    {
        "sucesso": true,
        "topico": "Classifique o tema (ex: Cálculo II - Integrais)",
        "dificuldade": "Fácil / Médio / Difícil",
        
        "resultado_unico": "A resposta final em LaTeX (ex: \\\\boxed{x=10}) ou null",
        
        "itens_rapidos": [ 
            { "label": "a)", "valor": "Resumo LaTeX da letra A" } 
        ],

        "roteiro_estruturado": [
            {
                "titulo": "Nome descritivo da etapa (ex: 'Passo 1: Montagem da Integral')", 
                "passos": [
                    "Texto explicativo curto.",
                    "LaTeX da equação inicial.",
                    "Texto: 'Aplicando a propriedade distributiva...'",
                    "LaTeX intermediário mostrando a distributiva.",
                    "Texto: 'Isolando a variável x...'",
                    "LaTeX com x isolado.",
                    "Label: Teorema Fundamental do Cálculo",
                    "LaTeX da aplicação do teorema."
                ]
            }
        ],

        "teoria": "Uma nota de rodapé técnica curta (max 2 linhas) sobre o conceito chave usado.",
        "alerta": "Preencha apenas se a imagem estiver ilegível ou ambígua. Caso contrário, null."
    }
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                {
                    role: "user", content: [
                        { type: "text", text: "Resolva. Use 'Label: Equação' se precisar explicar passos no roteiro." },
                        { type: "image_url", image_url: { url: imagem_url } }
                    ]
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 2500
        });

        // Debug Log
        console.log("🤖 Resposta AI V9:", response.choices[0].message.content);

        let resultadoAI;
        try {
            resultadoAI = JSON.parse(response.choices[0].message.content);
        } catch (e) {
            console.error("Erro Parse JSON:", e);
            throw new Error("Erro formatação AI");
        }

        // --- PERSISTÊNCIA ---
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: {
                extrato: {
                    tipo: 'SAIDA', valor: custoCoins, descricao: `Oráculo: ${resultadoAI.topico || 'Geral'}`, categoria: 'SYSTEM', data: new Date()
                }
            }
        });

        if (materia) {
            await ChatModel.create({
                materia,
                autor_real_id: user._id,
                autor_fake: "Oráculo",
                autor_avatar: "robot_01",
                autor_classe: "IA",
                tipo: "resolucao_ia",
                dados_ia: resultadoAI,
                imagem_original: imagem_url,
                data: new Date()
            });
        }

        res.json({ success: true, data: resultadoAI });

    } catch (error) {
        console.error("Erro AI Controller:", error);
        res.status(500).json({ error: "Erro interno no Oráculo." });
    }
};