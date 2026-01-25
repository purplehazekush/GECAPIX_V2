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
        const promptSystem = `
            ATUE COMO: Um monitor de cálculo/física da UFMG focado em gabaritos oficiais.
            OBJETIVO: Gerar a resolução exata que o aluno precisa escrever na prova para ganhar nota total, SEM ENROLAÇÃO.

            ANALISE A IMAGEM E GERE APENAS UM JSON COM ESTA ESTRUTURA:
            {
                "tipo": "MULTIPLA_ESCOLHA" ou "ABERTA",
                
                // 1. SOLUÇÃO RÁPIDA (O que ele olha em 1 segundo)
                "resposta_final": "Somente o resultado final. Ex: '42 m/s' ou 'Letra C'. Use LaTeX.",
                
                // 2. ROTEIRO DE PROVA (O 'caminho das pedras' para transcrever)
                // IMPORTANTE: NÃO explique com texto narrativo ("Primeiro integramos..."). 
                // Coloque APENAS a sequência lógica matemática necessária para validar a questão.
                // Ex: ["F = ma", "10 = 2a", "a = 5 m/s^2"].
                "memoria_calculo": ["passo matemático 1 (LaTeX)", "passo matemático 2 (LaTeX)", ...],
                
                // 3. TEORIA UNIFICADA (Para quem não entendeu nada)
                // Aqui sim você explica o conceito, o porquê das fórmulas e a lógica. Texto corrido.
                "teoria": "Explicação didática e conceitual completa do problema.",
                
                "alerta": "Mensagem curta caso haja múltiplas questões (foque na primeira) ou imagem ruim."
            }

            REGRAS DE OURO:
            - USE LaTeX SEMPRE para matemática. Ex: $\\int_{0}^{1} x^2 dx$.
            - SEJA ECONÔMICO. O aluno tem pressa.
            - Se for múltipla escolha, 'resposta_final' deve ser a Letra + Valor.
        `;

        console.log("🔮 Invocando Oráculo V2...");

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: [
                    { type: "text", text: "Gere o gabarito." },
                    { type: "image_url", image_url: { url: imagem_url } }
                ]}
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, // Temperatura baixa = Mais precisão, menos criatividade
            max_tokens: 1000
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