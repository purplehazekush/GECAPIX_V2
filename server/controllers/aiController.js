// server/controllers/aiController.js
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

        // 1. DEFINIÇÃO DE CUSTOS
        const custoGlue = TOKEN.COSTS.AI_SOLVER_GLUE;
        let custoCoins = TOKEN.COSTS.AI_SOLVER_COINS;

        // [LÓGICA DE CLASSE: TECNOMANTE]
        if (user.classe === 'TECNOMANTE') {
            // Aplica o desconto definido no tokenomics
            const desconto = TOKEN.CLASSES.TECNOMANTE.ORACLE_DISCOUNT; // ex: 0.5
            custoCoins = Math.floor(custoCoins * (1 - desconto));
        }

        // Validação de Saldo
        if (user.saldo_glue < custoGlue) {
            return res.status(402).json({ error: `Sem GLUE suficiente. (Requer: ${custoGlue})` });
        }
        if (user.saldo_coins < custoCoins) {
            return res.status(402).json({ error: `Sem GecaCoins suficientes. (Requer: ${custoCoins})` });
        }

        // Cobrança
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: { extrato: { 
                tipo: 'SAIDA', 
                valor: custoCoins, 
                descricao: `IA: Oráculo Invocado (${user.classe === 'TECNOMANTE' ? 'Desc. Tecnomante' : 'Taxa Padrão'})`, 
                categoria: 'SYSTEM', 
                data: new Date() 
            }}
        });

        // 2. PROMPT ENGENHEIRO
        // 2. PROMPT ENGENHEIRO (Versão Blindada)
        const promptSystem = `
            Você é o 'Oráculo do Geca', uma IA especialista em engenharia e ciências exatas da UFMG.
            
            MISSÃO: Analisar a imagem enviada (questão de prova, lista ou teoria) e fornecer a resolução.

            REGRAS DE OURO:
            1. SE FOR MÚLTIPLA ESCOLHA: Identifique claramente a letra correta no campo "gabarito".
            2. SE FOR UMA LISTA COM VÁRIAS QUESTÕES: Escolha a PRIMEIRA questão legível ou a que parece estar circulada/marcada. Adicione um aviso no "passo_a_passo" dizendo "Resolvendo a questão X...".
            3. MATEMÁTICA: Use LaTeX para TUDO. Inline: $...$, Bloco: $$...$$.
            4. FORMATO: A resposta DEVE ser um JSON válido.

            JSON SCHEMA (Retorne APENAS isso):
            {
                "resolucao_rapida": "A resposta final direta. Ex: 'Letra C' ou 'x = 42'. Use LaTeX.",
                "passo_a_passo": "Explicação didática dividida em passos lógicos. Use muito LaTeX para equações. Se for lista, avise qual está resolvendo.",
                "gabarito": "Apenas a letra (A, B, C...) ou o valor final numérico/simbólico."
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