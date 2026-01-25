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
        // 🧠 PROMPT V8: "SILENT MATH & ROBUST JSON"
        // =================================================================================
        const promptSystem = `
            ATUE COMO: Gabarito Oficial de Engenharia (UFMG).
            OBJETIVO: Solução direta, sem enrolação, focada na transcrição para a prova.

            --- REGRAS DE ROTEIRO (CRÍTICO) ---
            1. O campo 'roteiro_estruturado' deve conter APENAS passos matemáticos/algébricos.
            2. PROIBIDO texto narrativo ("Calculamos agora...", "Substituindo...", "O Jacobiano é...").
            3. Use notação matemática direta. 
               ERRADO: "A derivada de x é 2x"
               CERTO: "\\\\frac{d}{dx} = 2x"
            4. Se precisar definir variáveis (ex: Jacobiano), faça como equação: "J = r^2 \\\\sin \\\\phi".

            --- REGRAS DE ESCAPE JSON ---
            1. ESCAPE TODAS AS BARRAS: Use "\\\\" para cada barra invertida do LaTeX.

            --- ESTRUTURA JSON ---
            {
                "sucesso": true,
                "topico": "Cálculo III",
                "dificuldade": "Difícil",
                
                "resultado_unico": "LaTeX da resposta final (ou null)",
                "itens_rapidos": [ { "label": "a)", "valor": "LaTeX" } ],

                "roteiro_estruturado": [
                    {
                        "titulo": "Item a) (ou null)", 
                        "passos": [
                            // APENAS EQUAÇÕES. SEM FRASES.
                            "\\\\rho^2 = x^2 + y^2",
                            "I = \\\\displaystyle \\\\int_{0}^{1} ...",
                            "\\\\boxed{2\\\\text{e}}"
                        ]
                    }
                ],

                // AQUI VOCÊ PODE FALAR À VONTADE:
                "teoria": "Explique o método, o jacobiano, os limites e a lógica aqui. Use math inline \\\\( ... \\\\).",
                
                "alerta": "Aviso curto ou null"
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: [
                    { type: "text", text: "Resolva. Roteiro deve ser MUDO (só contas). Teoria completa na aba teoria." },
                    { type: "image_url", image_url: { url: imagem_url } }
                ]}
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, 
            max_tokens: 2500 
        });

        console.log("🤖 Resposta AI V8:", response.choices[0].message.content); 

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
            $push: { extrato: { 
                tipo: 'SAIDA', valor: custoCoins, descricao: `Oráculo: ${resultadoAI.topico || 'Geral'}`, categoria: 'SYSTEM', data: new Date() 
            }}
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