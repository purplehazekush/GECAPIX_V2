const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); // <--- CORREÇÃO DO CAMINHO
const TOKEN = require('../config/tokenomics');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;
        
        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

        // 1. COBRANÇA
        const custoGlue = TOKEN.COSTS.AI_SOLVER_GLUE;
        if (user.saldo_glue < custoGlue) {
            return res.status(402).json({ error: "Sem GLUE suficiente." });
        }

        // Debita GLUE e COINS (Se tiver custo em coins tb)
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue },
            $push: { extrato: { tipo: 'SAIDA', valor: 0, descricao: 'IA: Oráculo Invocado', categoria: 'SYSTEM', data: new Date() }}
        });

        // 2. PROMPT ENGENHEIRO
        const promptSystem = `
            Você é o 'Oráculo do Geca', uma IA especialista em exatas.
            FORMATO DE RESPOSTA: Retorne APENAS um JSON cru (sem markdown, sem \`\`\`).
            
            REGRAS DE MATEMÁTICA:
            - Use sintaxe LaTeX para TODAS as fórmulas matemáticas.
            - Envolva expressões inline com um cifrão: $E=mc^2$
            - Envolva blocos de equação com dois cifrões: $$ \\int_0^\\infty x^2 dx $$
            
            JSON Schema:
            {
                "resolucao_rapida": "Resposta final direta (ex: x = 42) com LaTeX se precisar",
                "passo_a_passo": "Explicação didática. Use LaTeX para as contas.",
                "gabarito": "Letra ou Valor Final"
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { 
                    role: "user", 
                    content: [
                        { type: "text", text: "Resolva esta questão acadêmica:" },
                        { type: "image_url", image_url: { url: imagem_url } }
                    ] 
                }
            ],
            response_format: { type: "json_object" }
        });

        const resultadoAI = JSON.parse(response.choices[0].message.content);

        // 3. SALVAR NO CHAT
        await ChatModel.create({
            materia: materia,
            autor_real_id: user._id,
            
            // Identidade da IA
            autor_fake: "Oráculo IA", 
            autor_avatar: "robot_01",
            
            // Conteúdo
            texto: JSON.stringify(resultadoAI), 
            tipo: "resolucao_ia", 
            imagem_original: imagem_url,
            
            data: new Date()
        });

        res.json({ success: true });

    } catch (error) {
        console.error("Erro IA:", error);
        res.status(500).json({ error: "O Oráculo falhou. Tente novamente." });
    }
};