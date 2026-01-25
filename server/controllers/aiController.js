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
            ATUE COMO: Gabarito Oficial de Engenharia (UFMG).
            OBJETIVO: Solução direta e estruturada.

            --- REGRAS DE ROTEIRO (CRÍTICO) ---
            1. O campo 'roteiro_estruturado' deve focar na ÁLGEBRA. - É fundamental que todos os passos necessários para
            um professor categorizar aquela questao como certa sejam registrados (resposta completa em forma de roteiro - 
            a avaliação de quao bem foi feita a tarefa é quão bem demonstrados estão os passos algébricos)
            2. Se precisar rotular um passo (ex: mudança de coordenadas), use o formato "Rótulo: Equação".
               Exemplo CERTO: "Coordenadas Esféricas: x = \\\\rho \\\\sin \\\\phi"
               Exemplo ERRADO: "Agora usamos coordenadas esféricas onde x é..."
            3. Para integrais e frações, USE SEMPRE '\\\\displaystyle'.

            --- REGRAS DE ESCAPE JSON ---
            1. ESCAPE TODAS AS BARRAS: Use "\\\\" para LaTeX.

            --- ESTRUTURA JSON ---
            {
                "sucesso": true,
                "topico": "Cálculo",
                "dificuldade": "Médio",
                
                "resultado_unico": "LaTeX ou null",
                "itens_rapidos": [ { "label": "a)", "valor": "LaTeX" } ],

                "roteiro_estruturado": [
                    {
                        "titulo": "Item a) (ou null)", 
                        "passos": [
                            "Coordenadas: x = r \\\\cos \\\\theta",  <-- O FRONTEND VAI DETECTAR OS DOIS PONTOS
                            "J = r",
                            "I = \\\\displaystyle \\\\int ...",
                            "\\\\boxed{Resultado}"
                        ]
                    }
                ],

                "teoria": "Explicação completa.",
                "alerta": "Aviso ou null"
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: [
                    { type: "text", text: "Resolva. Use 'Label: Equação' se precisar explicar passos no roteiro." },
                    { type: "image_url", image_url: { url: imagem_url } }
                ]}
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