// server/controllers/aiController.js
const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); 
const TOKEN = require('../config/tokenomics'); // Certifique-se que esse arquivo existe ou defina defaults
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;
        
        // Validação Inicial
        if (!email) return res.status(400).json({ error: "Email obrigatório." });
        if (!imagem_url) return res.status(400).json({ error: "Imagem obrigatória." });

        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

        // --- 1. CÁLCULO DE CUSTOS ---
        const custoGlue = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_GLUE) || 1;
        let custoCoins = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_COINS) || 50;

        // Bônus Tecnomante
        if (user.classe === 'TECNOMANTE') {
            custoCoins = Math.floor(custoCoins * 0.5);
        }

        // Validação de Saldo
        if ((user.saldo_glue || 0) < custoGlue) return res.status(402).json({ error: "Sem GLUE suficiente." });
        if ((user.saldo_coins || 0) < custoCoins) return res.status(402).json({ error: "Sem Coins suficientes." });

        // --- 2. CHAMADA AI (GPT-4o) ---
        // Adicionei instrução explicita para JSON puro
        const promptSystem = `
            Você é o Oráculo do Geca (Engenharia UFMG).
            Analise a imagem acadêmica. 
            Responda APENAS UM JSON válido (sem markdown, sem \`\`\`json).
            Formato:
            {
                "resolucao_rapida": "Resposta final direta (LaTeX permitido)",
                "multipla_escolha": "Letra ou Valor (ou 'N/A')",
                "resolucao_eficiente": "Passo a passo resumido e didático",
                "resolucao_completa": "Explicação detalhada teórica",
                "dica_extra": "Curiosidade, macete ou cuidado comum"
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: [
                    { type: "text", text: "Resolva esta questão:" },
                    { type: "image_url", image_url: { url: imagem_url } }
                ]}
            ],
            response_format: { type: "json_object" },
            max_tokens: 1000
        });

        // Parse Seguro com Fallback
        let resultadoAI;
        try {
            const rawContent = response.choices[0].message.content;
            resultadoAI = JSON.parse(rawContent);
        } catch (e) {
            console.error("Erro Parse JSON AI:", e);
            return res.status(500).json({ error: "O Oráculo gaguejou (Erro de Formatação)." });
        }

        // --- 3. COBRANÇA (Transação Atômica Simples) ---
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: { extrato: { 
                tipo: 'SAIDA', 
                valor: custoCoins, 
                descricao: `Oráculo: ${materia || 'Geral'}`, 
                categoria: 'SYSTEM', 
                data: new Date() 
            }}
        });

        // --- 4. SALVAR NO CHAT (Se estiver numa sala) ---
        if (materia) {
            await ChatModel.create({
                materia: materia,
                autor_real_id: user._id,
                autor_fake: "Oráculo IA", 
                autor_avatar: "robot_01", // Certifique-se de ter esse asset ou mude para um existente
                autor_classe: "SISTEMA",
                texto: "🔮 Resolução Invocada", 
                dados_ia: resultadoAI,
                tipo: "resolucao_ia", 
                imagem_original: imagem_url,
                data: new Date()
            });
        }

        res.json({ success: true, data: resultadoAI });

    } catch (error) {
        console.error("Erro Crítico AI:", error);
        res.status(500).json({ error: "Erro interno no Oráculo." });
    }
};