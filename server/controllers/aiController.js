const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem');
const TOKEN = require('../config/tokenomics');
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const axios = require('axios');

// =================================================================================
// ⚙️ CONFIGURAÇÃO DO ORÁCULO GEMINI 3
// =================================================================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuração do Modelo (Use 'gemini-3-pro-preview' se tiver billing, senão 'gemini-2.0-flash')
const MODEL_NAME = "gemini-2.0-flash"; // Altere para "gemini-3-pro-preview" quando quiser potência máxima

const model = genAI.getGenerativeModel({ 
    model: MODEL_NAME,
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1 // Criatividade baixa para precisão matemática
    }
});

// --- NOVO SCHEMA: "A PROVA PERFEITA" ---
const oracleSchema = {
    type: SchemaType.OBJECT,
    properties: {
        titulo_elegante: { type: SchemaType.STRING, description: "Um título curto e acadêmico para a questão (ex: 'Integral por Partes com Logaritmo')." },
        
        estrategia_analitica: { 
            type: SchemaType.STRING, 
            description: "O 'Pulo do Gato'. Explique QUAL método vai usar e POR QUE ele é o melhor antes de começar a conta." 
        },
        
        resolucao_narrativa: { 
            type: SchemaType.ARRAY,
            description: "A resolução passo-a-passo. Cada item do array é um parágrafo ou bloco lógico. Misture texto explicativo com LaTeX ($...$).",
            items: { type: SchemaType.STRING }
        },

        resultado_destaque: { type: SchemaType.STRING, description: "A resposta final em LaTeX puro, pronta para ser exibida em destaque." },
        
        gabarito_letra: { type: SchemaType.STRING, description: "Se for múltipla escolha, a letra (A, B, C...). Se não, 'N/A'." },
        
        verificacao_rapida: { type: SchemaType.STRING, description: "Uma frase curta provando que o resultado faz sentido (ex: 'A unidade está em Joules, conforme esperado')." }
    },
    required: ["titulo_elegante", "estrategia_analitica", "resolucao_narrativa", "resultado_destaque"]
};

// --- PROMPTS ---

const PROMPT_SEGMENTACAO = `
ANÁLISE INICIAL.
Identifique APENAS se há questões legíveis na imagem.
Se houver múltiplas, foque na primeira ou na que parece ser a principal/mais complexa.
Retorne um resumo do que foi encontrado.
`;

const PROMPT_RESOLVER = `
VOCÊ É UM PROFESSOR DOUTOR PRESTANDO UM EXAME DE ADMISSÃO.
Sua reputação depende de uma resolução ELEGANTE, PRECISA e HUMANA.

DIRETRIZES:
1. **Nada de Robô:** Não use listas secas. Escreva como alguém explicando para um aluno brilhante. Use conectivos ("Portanto", "Note que", "Aplicando a regra...").
2. **LaTeX Impecável:** - Use '$' para matemática inline e '$$' para blocos destacados.
   - Use '\\\\' (dupla barra) para escapar comandos LaTeX no JSON.
   - Exemplo: "A integral de $\\sin(x)$ é $-\\cos(x)$."
3. **Estratégia Primeiro:** Antes de resolver, pare e pense: "Qual o caminho mais inteligente?". Escreva isso no campo 'estrategia_analitica'.
4. **Passo a Passo:** Quebre a lógica em parágrafos no array 'resolucao_narrativa'.

IMAGEM FORNECIDA: Resolva a questão apresentada.
`;

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body; 

        // Validações Básicas
        if (!email || !imagem_url) return res.status(400).json({ error: "Dados incompletos." });
        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

        // Custos
        const custoGlue = (TOKEN.COSTS?.AI_SOLVER_GLUE) || 1;
        let custoCoins = (TOKEN.COSTS?.AI_SOLVER_COINS) || 50;
        if (user.classe === 'TECNOMANTE') custoCoins = Math.floor(custoCoins * TOKEN.CLASSES.TECNOMANTE.ORACLE_DISCOUNT);

        if ((user.saldo_glue || 0) < custoGlue) return res.status(402).json({ error: "Sem GLUE suficiente." });

        // Download Imagem
        let imageBase64 = "";
        let imageMime = "image/jpeg";
        try {
            const imgRes = await axios.get(imagem_url, { responseType: 'arraybuffer' });
            imageBase64 = Buffer.from(imgRes.data, 'binary').toString('base64');
            if (imgRes.headers['content-type']) imageMime = imgRes.headers['content-type'];
        } catch (e) { return res.status(400).json({ error: "Erro ao baixar imagem." }); }

        const imagemPart = { inlineData: { data: imageBase64, mimeType: imageMime } };

        // =====================================================================
        // 🔮 O RITUAL ÚNICO (GEMINI)
        // =====================================================================
        console.log("🧠 [ORÁCULO] Invocando a Sabedoria Suprema...");

        // Nota: Removemos a etapa de segmentação separada por enquanto para focar na qualidade da resolução única.
        // O Gemini vai olhar a imagem e resolver a questão principal com profundidade máxima.
        
        const chatSession = model.startChat({
            generationConfig: { 
                responseSchema: oracleSchema,
                responseMimeType: "application/json"
            }
        });

        const result = await chatSession.sendMessage([PROMPT_RESOLVER, imagemPart]);
        const jsonFinal = JSON.parse(result.response.text());

        console.log(`✅ [ORÁCULO] Solução gerada: ${jsonFinal.titulo_elegante}`);

        // =====================================================================
        // 💾 SALVA E PAGA
        // =====================================================================
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: {
                extrato: {
                    tipo: 'SAIDA', valor: custoCoins,
                    descricao: `Oráculo: ${jsonFinal.titulo_elegante}`,
                    categoria: 'SYSTEM', data: new Date()
                }
            }
        });

        if (materia) {
            await ChatModel.create({
                materia,
                autor_real_id: user._id,
                autor_nome: "Oráculo",
                autor_fake: "Oráculo",
                autor_avatar: "robot_01",
                autor_classe: "IA",
                tipo: "resolucao_ia",
                dados_ia: jsonFinal, // Salvamos o novo formato
                imagem_original: imagem_url,
                data: new Date()
            });
        }

        res.json({ success: true, data: jsonFinal });

    } catch (error) {
        console.error("❌ ERRO ORÁCULO:", error);
        res.status(500).json({ error: "O Oráculo está meditando. Tente novamente." });
    }
};