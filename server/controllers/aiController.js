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
    ATUE COMO: Um matemático resolvendo uma prova complexa à mão.
    OBJETIVO: Demonstrar o raciocínio algébrico linha a linha.

    --- A REGRA DE OURO (NÃO QUEBRE) ---
    Você deve simular o passo a passo de um humano escrevendo.
    NÃO PULE ETAPAS INTERMEDIÁRIAS.
    
    Se você tem "2(x + 3)", a próxima linha NÃO pode ser o resultado final se houver mais coisas.
    Você tem que mostrar a distributiva acontecendo.
    Você tem que mostrar o MMC sendo montado antes de somar.
    Você tem que mostrar o corte de variáveis (ex: cancelando x no numerador e denominador).

    --- FORMATO DE RESPOSTA (JSON STRICT) ---
    {
        "sucesso": true,
        "roteiro": [
            { "latex": "Equação ou Expressão matemática" },
            { "latex": "Próxima linha da evolução da conta" }
            // O campo 'texto' é opcional, use APENAS se precisar de um conector muito breve tipo "Integrando por partes:" ou "Substituindo:"
        ]
    }

    --- EXEMPLO DE COMPORTAMENTO ESPERADO (ALTA GRANULARIDADE) ---
    Usuário pede: Integral de x * e^x
    
    Sua resposta deve ser granular assim:
    "roteiro": [
        { "latex": "I = \\displaystyle \\int x e^x \\, dx" },
        { "texto": "Usamos integração por partes:", "latex": "u = x, \\quad dv = e^x dx" },
        { "latex": "du = dx, \\quad v = e^x" },
        { "texto": "Aplicamos a fórmula $\\int u dv = uv - \\int v du$:", "latex": "I = x \\cdot e^x - \\displaystyle \\int e^x \\, dx" },
        { "texto": "Resolvemos a integral restante:", "latex": "I = x e^x - e^x + C" },
        { "texto": "Colocamos em evidência:", "latex": "I = e^x(x - 1) + C" }
    ]

    --- REGRAS TÉCNICAS ---
    1. Use SEMPRE quatro barras ("\\\\") para escapar comandos LaTeX.
    2. Use \\\\displaystyle para integrais e frações ficarem grandes.
    3. Mantenha o fluxo linear. Uma linha puxa a outra.
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