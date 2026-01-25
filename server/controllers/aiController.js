const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); 
const TOKEN = require('../config/tokenomics');
const OpenAI = require('openai');

// Inicializa OpenAI com a chave do .env
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;
        
        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

        // --- 1. CÁLCULO DE CUSTOS ---
        const custoGlue = TOKEN.COSTS?.AI_SOLVER_GLUE || 1;
        let custoCoins = TOKEN.COSTS?.AI_SOLVER_COINS || 50;

        // Bônus Tecnomante
        if (user.classe === 'TECNOMANTE') {
            const desconto = 0.5;
            custoCoins = Math.floor(custoCoins * (1 - desconto));
        }

        // Validação de Saldo
        if ((user.saldo_glue || 0) < custoGlue) return res.status(402).json({ error: "Sem GLUE suficiente." });
        if ((user.saldo_coins || 0) < custoCoins) return res.status(402).json({ error: "Sem Coins suficientes." });

        // --- 2. CHAMADA AI (GPT-4o) ---
        const promptSystem = `
            Você é o Oráculo do Geca (Engenharia UFMG).
            Analise a imagem. Responda APENAS UM JSON válido:
            {
                "resolucao_rapida": "Resposta final (Use LaTeX)",
                "multipla_escolha": "Letra ou Valor",
                "resolucao_eficiente": "Passo a passo resumido",
                "resolucao_completa": "Explicação detalhada",
                "dica_extra": "Curiosidade ou macete"
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: [
                    { type: "text", text: "Resolva:" },
                    { type: "image_url", image_url: { url: imagem_url } }
                ]}
            ],
            response_format: { type: "json_object" }
        });

        // Parse Seguro
        let resultadoAI;
        try {
            resultadoAI = JSON.parse(response.choices[0].message.content);
        } catch (e) {
            return res.status(500).json({ error: "O Oráculo falou uma língua estranha (Erro JSON)." });
        }

        // --- 3. COBRANÇA ---
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: { extrato: { 
                tipo: 'SAIDA', 
                valor: custoCoins, 
                descricao: `IA: Oráculo (${user.classe})`, 
                categoria: 'SYSTEM', 
                data: new Date() 
            }}
        });

        // --- 4. SALVAR NO CHAT ---
        if (materia) {
            await ChatModel.create({
                materia: materia,
                autor_real_id: user._id,
                
                autor_fake: "Oráculo IA", 
                autor_avatar: "robot_01",
                
                texto: "🔮 Resolução Disponível", // Fallback
                dados_ia: resultadoAI,          // O JSON real vai aqui
                
                tipo: "resolucao_ia", 
                imagem_original: imagem_url,
                data: new Date()
            });
        }

        res.json({ success: true, data: resultadoAI });

    } catch (error) {
        console.error("Erro IA:", error);
        res.status(500).json({ error: "Erro interno no Oráculo." });
    }
};