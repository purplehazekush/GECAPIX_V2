// server/controllers/aiController.js
const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); 
const TOKEN = require('../config/tokenomics');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;
        
        // --- VALIDAÇÕES E CUSTOS (Mantidos iguais) ---
        if (!email || !imagem_url) return res.status(400).json({ error: "Dados incompletos." });

        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário fantasma." });

        const custoGlue = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_GLUE) || 1;
        let custoCoins = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_COINS) || 50;

        if (user.classe === 'TECNOMANTE') custoCoins = Math.floor(custoCoins * 0.5);

        if ((user.saldo_glue || 0) < custoGlue) return res.status(402).json({ error: "Sem GLUE." });
        if ((user.saldo_coins || 0) < custoCoins) return res.status(402).json({ error: "Sem Coins." });

        // --- A MÁGICA DO PROMPT ---
        const promptSystem = `
            ATUE COMO: O melhor aluno de engenharia da UFMG. Prático, direto e genial.
            
            SUA MISSÃO: Analisar a imagem de uma prova ou lista de exercícios.
            
            REGRAS DE OURO:
            1. MÚLTIPLAS QUESTÕES: Se a imagem tiver várias questões, RESOLVA APENAS A PRIMEIRA (ou a que estiver circulada/mais visível). Avise no campo 'alerta'.
            2. FORMATO: Use LaTeX para qualquer fórmula matemática. Ex: $x^2 + y^2$.
            3. ESTILO: O aluno pode estar colando. A resposta principal tem que ser INSTANTÂNEA.
            
            SAÍDA OBRIGATÓRIA (JSON PURO):
            {
                "tipo_questao": "MULTIPLA_ESCOLHA" ou "ABERTA",
                "resumo_topo": "A resposta final exata. (Ex: 'Letra C' ou 'x = 15m/s'). Sem enrolação.",
                "gabarito_letra": "A, B, C, D, E" (ou null se for aberta),
                "passo_a_passo": "Lista de strings com 3 a 5 passos curtos e diretos para chegar no resultado.",
                "explicacao_teorica": "Texto completo explicando o 'porquê' (para quem quer aprender ou justificar).",
                "alerta": "Mensagem curta caso haja múltiplas questões na foto ou imagem ruim (ou null)."
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: [
                    { type: "text", text: "Resolva pra mim. Rápido." },
                    { type: "image_url", image_url: { url: imagem_url } }
                ]}
            ],
            response_format: { type: "json_object" },
            temperature: 0.2 // Baixa temperatura para ser mais preciso e menos criativo
        });

        // Parse Seguro
        let resultadoAI;
        try {
            resultadoAI = JSON.parse(response.choices[0].message.content);
        } catch (e) {
            console.error("Erro JSON AI:", e);
            // Fallback manual caso a AI falhe no JSON (raro com gpt-4o e json_object)
            resultadoAI = {
                tipo_questao: "ABERTA",
                resumo_topo: "Erro na formatação da resposta.",
                passo_a_passo: ["Tente novamente."],
                explicacao_teorica: "A IA não conseguiu estruturar a resposta."
            };
        }

        // --- COBRANÇA E SALVAMENTO (Mantidos) ---
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: { extrato: { 
                tipo: 'SAIDA', valor: custoCoins, descricao: 'Oráculo Solver', categoria: 'SYSTEM', data: new Date() 
            }}
        });

        if (materia) {
            await ChatModel.create({
                materia,
                autor_real_id: user._id,
                autor_fake: "Oráculo",
                autor_avatar: "robot_01", // Certifique-se que esse avatar existe
                autor_classe: "IA",
                tipo: "resolucao_ia",
                dados_ia: resultadoAI, // Salvando o JSON estruturado
                imagem_original: imagem_url,
                data: new Date()
            });
        }

        res.json({ success: true, data: resultadoAI });

    } catch (error) {
        console.error("Erro AI Controller:", error);
        res.status(500).json({ error: "O Oráculo está offline (Erro 500)." });
    }
};