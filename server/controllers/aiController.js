const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); 
const TOKEN = require('../config/tokenomics');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;
        
        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

        // 1. CUSTOS & DESCONTOS
        const custoGlue = TOKEN.COSTS.AI_SOLVER_GLUE || 1;
        let custoCoins = TOKEN.COSTS.AI_SOLVER_COINS || 50;

        // Bônus de Classe: TECNOMANTE paga menos coins
        if (user.classe === 'TECNOMANTE') {
            const desconto = 0.5; // 50% off
            custoCoins = Math.floor(custoCoins * (1 - desconto));
        }

        // Validação
        if (user.saldo_glue < custoGlue) return res.status(402).json({ error: `Sem GLUE suficiente.` });
        if (user.saldo_coins < custoCoins) return res.status(402).json({ error: `Sem GecaCoins suficientes.` });

        // 2. COBRANÇA
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

        // 3. CHAMADA OPENAI (GPT-4o)
        const promptSystem = `
            Você é o 'Oráculo do Geca', IA da UFMG.
            MISSÃO: Analisar a imagem (questão) e resolver.
            REGRAS:
            1. JSON OBRIGATÓRIO.
            2. Use LaTeX ($...$) para matemática.
            3. Se for lista, resolva a marcada ou a primeira.
            
            JSON SCHEMA:
            {
                "resolucao_rapida": "Resposta final (LaTeX)",
                "multipla_escolha": "Letra (ou N/A)",
                "resolucao_eficiente": "Resumo lógico passo-a-passo",
                "resolucao_completa": "Explicação teórica profunda",
                "dica_extra": "Macete ou curiosidade"
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
            response_format: { type: "json_object" }
        });

        const resultadoAI = JSON.parse(response.choices[0].message.content);

        // 4. SALVAR NO CHAT DA SALA
        if (materia) {
            await ChatModel.create({
                materia: materia,
                autor_real_id: user._id,
                
                // Persona
                autor_fake: "Oráculo IA", 
                autor_avatar: "robot_01",
                
                // Conteúdo Híbrido
                texto: "🔮 Resolução Disponível", // Texto fallback
                dados_ia: resultadoAI, // Objeto JSON puro para o React renderizar
                
                tipo: "resolucao_ia", 
                imagem_original: imagem_url, // Guarda a foto da pergunta
                data: new Date()
            });
        }

        res.json({ success: true, data: resultadoAI });

    } catch (error) {
        console.error("Erro IA:", error);
        res.status(500).json({ error: "O Oráculo falhou. Tente novamente." });
    }
};