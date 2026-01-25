// server/controllers/aiController.js
const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); 
const TOKEN = require('../config/tokenomics');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;
        
        // --- VALIDAÇÕES (Mantidas) ---
        if (!email || !imagem_url) return res.status(400).json({ error: "Dados incompletos." });

        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

        // --- CUSTOS (Mantidos) ---
        const custoGlue = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_GLUE) || 1;
        let custoCoins = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_COINS) || 50;

        if (user.classe === 'TECNOMANTE') custoCoins = Math.floor(custoCoins * 0.5);

        if ((user.saldo_glue || 0) < custoGlue) return res.status(402).json({ error: "Sem GLUE." });
        if ((user.saldo_coins || 0) < custoCoins) return res.status(402).json({ error: "Sem Coins." });

        // =================================================================================
        // 🧠 ENGENHARIA DE PROMPT V2: O "SHARP SHOOTER" ACADÊMICO
        // =================================================================================
        // =================================================================================
        // 🧠 PROMPT V3: O "MULTITASKER" RESILIENTE
        // =================================================================================
        const promptSystem = `
            ATUE COMO: Monitor de exatas da UFMG.
            OBJETIVO: Gerar gabarito prático para prova.

            CONTEXTO DA IMAGEM:
            - Pode conter UMA questão ou MÚLTIPLAS (a, b, c...).
            - Pode ser texto manuscrito ou digitado.

            ESTRATÉGIA DE RESPOSTA (RESILIÊNCIA):
            1. SE TIVER APENAS UMA QUESTÃO: Resolva normalmente.
            2. SE TIVER MÚLTIPLAS (Ex: a, b, c):
               - No campo 'resposta_final', liste os resultados de TODAS de forma compacta (Ex: "a) 10, b) 20").
               - No campo 'memoria_calculo', resolva passo-a-passo APENAS A MAIS COMPLEXA ou A PRIMEIRA.
               - No campo 'alerta', avise: "Resolvi a (a) detalhada. As outras estão no resultado final."

            SAÍDA JSON OBRIGATÓRIA:
            {
                "tipo": "MULTIPLA_ESCOLHA" ou "ABERTA",
                "resposta_final": "O resultado final. Se houver itens, liste: a) ..., b) ... (Use LaTeX)",
                "memoria_calculo": ["Passo 1 (LaTeX)", "Passo 2 (LaTeX)"], 
                "teoria": "Explicação conceitual. Se usar matemática aqui, envolva em \\( ... \\) para inline e \\[ ... \\] para bloco.",
                "alerta": "Aviso curto caso tenha ignorado itens ou imagem ruim."
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: [
                    { type: "text", text: "Resolva." },
                    { type: "image_url", image_url: { url: imagem_url } }
                ]}
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, 
            max_tokens: 1200 // Limite de segurança financeira e técnica
        });

        // Debug para garantir que o formato está vindo certo
        console.log("🤖 Resposta RAW:", response.choices[0].message.content);

        let resultadoAI;
        try {
            resultadoAI = JSON.parse(response.choices[0].message.content);
        } catch (e) {
            console.error("Erro Parse JSON:", e);
            throw new Error("Erro na formatação da IA");
        }

        // --- COBRANÇA E PERSISTÊNCIA ---
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: { extrato: { 
                tipo: 'SAIDA', valor: custoCoins, descricao: 'Oráculo V2', categoria: 'SYSTEM', data: new Date() 
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
                
                // Salvamos o objeto estruturado. O Frontend vai decidir como mostrar (Abas, Botões, etc)
                dados_ia: resultadoAI, 
                
                imagem_original: imagem_url, // <--- A URL DA IMAGEM ESTÁ AQUI PARA O THUMBNAIL
                data: new Date()
            });
        }

        res.json({ success: true, data: resultadoAI });

    } catch (error) {
        console.error("Erro AI Controller:", error);
        res.status(500).json({ error: "Erro interno no Oráculo." });
    }
};