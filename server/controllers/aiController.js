// server/controllers/aiController.js
const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); 
const TOKEN = require('../config/tokenomics');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;
        
        // --- VALIDAÇÕES E CUSTOS ---
        if (!email || !imagem_url) return res.status(400).json({ error: "Dados incompletos." });
        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

        const custoGlue = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_GLUE) || 1;
        let custoCoins = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_COINS) || 50;

        if (user.classe === 'TECNOMANTE') custoCoins = Math.floor(custoCoins * 0.5);

        if ((user.saldo_glue || 0) < custoGlue) return res.status(402).json({ error: "Sem GLUE." });
        if ((user.saldo_coins || 0) < custoCoins) return res.status(402).json({ error: "Sem Coins." });

        // =================================================================================
        // 🧠 PROMPT V5: "TABLE MASTER"
        // =================================================================================
        const promptSystem = `
            ATUE COMO: Monitor Chefe de Engenharia (UFMG).
            OBJETIVO: Gabarito estruturado, visual e preciso.

            --- REGRAS DE FORMATAÇÃO LATEX ---
            1. USE '\\displaystyle' para frações/integrais.
            2. USE '\\text{unidade}' para unidades físicas. Ex: "10 \\text{ m/s}".
            3. NÃO use delimitadores ($$, \\[, \\() no JSON. Apenas o LaTeX puro.

            --- ESTRUTURA DA RESPOSTA (JSON) ---
            {
                "sucesso": true,
                "topico": "Ex: Física I - Dinâmica",
                "dificuldade": "Fácil / Médio / Difícil",
                
                // CAMPO HÍBRIDO:
                // Se for UMA questão: coloque o resultado em 'resultado_principal'. Deixe 'itens' vazio.
                // Se forem MÚLTIPLAS (a, b, c): Deixe 'resultado_principal' null e preencha 'itens'.
                "resultado_principal": "LaTeX da resposta única (ou null)",
                
                "itens": [
                    { "label": "a)", "valor": "LaTeX da resposta A" },
                    { "label": "b)", "valor": "LaTeX da resposta B" }
                ],

                "memoria_calculo": ["Passo 1", "Passo 2"],
                "teoria": "Explicação conceitual.",
                "alerta": "Aviso se imagem ruim ou ambígua."
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: [
                    { type: "text", text: "Resolva. Se houver itens a,b,c, separe-os." },
                    { type: "image_url", image_url: { url: imagem_url } }
                ]}
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, 
            max_tokens: 2500 
        });

        console.log("🤖 Resposta AI V5:", response.choices[0].message.content); 

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