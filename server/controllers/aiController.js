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
        const promptSystem = `
            ATUE COMO: O Monitor Chefe de Engenharia da UFMG.
            OBJETIVO: Gerar gabarito estruturado, visual e organizado por itens.

            --- REGRAS VISUAIS DE LATEX (OBRIGATÓRIO) ---
            1. USE '\\displaystyle' no início de frações/integrais/limites.
            2. USE '\\boxed{}' no resultado final de CADA bloco de roteiro.
            3. USE '\\text{unidade}' para unidades (ex: 10 \\text{ m/s}).
            4. NUNCA use delimitadores markdown ($$, \\[, \\() no JSON. Apenas LaTeX puro.

            --- LÓGICA DE ROTEIRO (CRUCIAL) ---
            - SE FOR UMA ÚNICA QUESTÃO: Gere 1 bloco no 'roteiro_estruturado' com titulo: null.
            - SE FOREM MÚLTIPLOS ITENS (a, b, c...): Gere 1 bloco PARA CADA ITEM. Titulo: "Item a)", "Item b)".
            - CONTEÚDO DOS PASSOS: Apenas a sequência matemática lógica. Sem texto narrativo ("agora fazemos...").

            --- ESTRUTURA JSON ---
            {
                "sucesso": true,
                "topico": "Ex: Cálculo III",
                "dificuldade": "Fácil / Médio / Difícil",
                
                // VISUALIZAÇÃO RÁPIDA (Escolha UMA das opções abaixo)
                "resultado_unico": "LaTeX da resposta final (se for 1 questão)",
                "itens_rapidos": [ { "label": "a)", "valor": "LaTeX" }, { "label": "b)", "valor": "LaTeX" } ],

                // ROTEIRO DETALHADO (Lista de Blocos)
                "roteiro_estruturado": [
                    {
                        "titulo": "Item a) Cálculo da Velocidade", // ou null se for questão única
                        "passos": [
                            "v(t) = \\displaystyle \\int a(t) dt",
                            "v(t) = 2t + C",
                            "\\boxed{v(5) = 10 \\text{ m/s}}"
                        ]
                    }
                ],

                "teoria": "Explicação conceitual completa. Use math inline '\\('",
                "alerta": "Aviso curto ou null."
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: [
                    { type: "text", text: "Resolva. Estruture o roteiro corretamente." },
                    { type: "image_url", image_url: { url: imagem_url } }
                ]}
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, 
            max_tokens: 2500 
        });

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