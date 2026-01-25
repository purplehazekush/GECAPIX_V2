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
        // 🧠 PROMPT MASTER V6: "BLOCK STRUCTURED SOLVER"
        // =================================================================================
        // ... (imports e validações iguais)

        // =================================================================================
        // 🧠 PROMPT V7: "JSON ESCAPE MASTER"
        // =================================================================================
        const promptSystem = `
            ATUE COMO: Monitor Chefe de Engenharia (UFMG).
            OBJETIVO: Gabarito estruturado, visual e preciso.

            --- REGRAS DE ESCAPE JSON (CRÍTICO!!!) ---
            1. Você está gerando uma string JSON. TODAS as barras invertidas do LaTeX DEVEM ser escapadas.
            2. ERRADO: "\\text{...}" ou "\\int"
            3. CERTO: "\\\\text{...}" e "\\\\int"
            4. O parser vai falhar se você mandar apenas uma barra. USE DUAS BARRAS.

            --- REGRAS VISUAIS DE LATEX ---
            1. USE '\\\\displaystyle' (com duas barras) para frações/integrais.
            2. USE '\\\\boxed{}' para resultados.
            3. Para quebra de linha em equações longas, use "\\\\\\\\" (quatro barras para virar duas no string).

            --- ESTRUTURA JSON ---
            {
                "sucesso": true,
                "topico": "Cálculo",
                "dificuldade": "Difícil",
                
                "resultado_unico": "LaTeX (ex: 2\\\\text{e}) ou null",
                "itens_rapidos": [ { "label": "a)", "valor": "LaTeX" } ],

                "roteiro_estruturado": [
                    {
                        "titulo": "Item a)", 
                        "passos": [
                            "I = \\\\displaystyle \\\\int x dx",
                            "\\\\boxed{I = x^2/2}"
                        ]
                    }
                ],

                "teoria": "Explicação com math inline (\\\\( ... \\\\))",
                "alerta": "Aviso ou null"
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: [
                    { type: "text", text: "Resolva. Lembre-se de escapar as barras (\\\\)." },
                    { type: "image_url", image_url: { url: imagem_url } }
                ]}
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, 
            max_tokens: 2500 
        });

// ... (resto do código igual)

        console.log("🤖 Resposta AI V6:", response.choices[0].message.content); 

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