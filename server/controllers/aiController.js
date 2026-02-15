// server/controllers/aiController.js
const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem');
const TOKEN = require('../config/tokenomics');
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const axios = require('axios');

// =================================================================================
// ⚙️ CONFIGURAÇÃO DO GEMINI
// =================================================================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Definição do Schema de Resposta (JSON Controlado)
// Isso substitui a "tool definition" do Claude por "Response Schema" do Gemini
const resolutionSchema = {
  description: "Gabarito detalhado da questão acadêmica",
  type: SchemaType.OBJECT,
  properties: {
    topico: { type: SchemaType.STRING, description: "Tópico principal da questão (ex: Cálculo I, História do Brasil)" },
    resolucao_rapida: { type: SchemaType.STRING, description: "A resposta final direta e curta." },
    multipla_escolha: { type: SchemaType.STRING, description: "Se for questão de marcar, a letra correta (ex: 'B'). Se não, 'N/A'." },
    resolucao_eficiente: { type: SchemaType.STRING, description: "Passo a passo resumido e direto ao ponto." },
    resolucao_completa: { type: SchemaType.STRING, description: "Explicação didática detalhada, cobrindo a teoria por trás." },
    dica_extra: { type: SchemaType.STRING, description: "Uma dica de ouro ou mnemônico para lembrar desse conceito." }
  },
  required: ["topico", "resolucao_rapida", "multipla_escolha", "resolucao_eficiente", "resolucao_completa"]
};

// System Prompt adaptado para o Gemini
const ORACLE_SYSTEM_INSTRUCTION = `
Você é o Oráculo, uma IA suprema de educação focada em exatas e engenharia.
Seu objetivo é resolver questões a partir de imagens com precisão absoluta.
1. Analise a imagem com cuidado (OCR de alta precisão).
2. Se for cálculo, verifique cada etapa.
3. Use LaTeX para fórmulas matemáticas (entre $...$).
4. Seja didático mas direto.
5. Retorne APENAS o JSON estrito conforme o schema.
`;

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;

        // --- 1. VALIDAÇÕES BÁSICAS ---
        if (!email || !imagem_url) {
            return res.status(400).json({ error: "Dados incompletos (email ou imagem faltando)." });
        }

        const user = await UsuarioModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        // --- 2. VERIFICAÇÃO DE SALDO (GLUE/COINS) ---
        const custoGlue = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_GLUE) || 1;
        let custoCoins = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_COINS) || 50;

        if (user.classe === 'TECNOMANTE') {
            const discount = TOKEN.CLASSES.TECNOMANTE.ORACLE_DISCOUNT;
            custoCoins = Math.floor(custoCoins * discount);
        }

        if ((user.saldo_glue || 0) < custoGlue) return res.status(402).json({ error: "Sem GLUE suficiente." });
        if ((user.saldo_coins || 0) < custoCoins) return res.status(402).json({ error: "Sem Coins suficientes." });

        // =================================================================================
        // 🧠 PREPARAÇÃO DA IMAGEM
        // =================================================================================
        let imageMediaType = "image/jpeg";
        let imageBase64 = "";

        try {
            console.log("📥 Baixando imagem para o Gemini...");
            const imageResponse = await axios.get(imagem_url, {
                responseType: 'arraybuffer',
                timeout: 20000
            });

            const buffer = Buffer.from(imageResponse.data, 'binary');
            imageBase64 = buffer.toString('base64');

            if (imageResponse.headers['content-type']) {
                imageMediaType = imageResponse.headers['content-type'];
            }
        } catch (imgErr) {
            console.error("❌ Erro download imagem:", imgErr.message);
            return res.status(400).json({ error: "Erro ao processar imagem para IA." });
        }

        // =================================================================================
        // 🚀 CHAMADA AO GEMINI (MODELO HÍBRIDO)
        // =================================================================================
        console.log("🔮 Invocando Gemini...");

        // Estratégia: Usar Gemini 1.5 Pro (ou 3 Pro se disponível na sua chave) para raciocínio complexo visual.
        // O Flash é ótimo, mas para OCR de fórmulas matemáticas manuscritas, o Pro é mais garantido.
        // Se custo for prioridade máxima, troque para "gemini-1.5-flash".
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-pro", // Pode mudar para "gemini-2.0-flash" para ultra velocidade
            systemInstruction: ORACLE_SYSTEM_INSTRUCTION,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: resolutionSchema,
                temperature: 0.2, // Baixa temperatura para precisão em exatas
            }
        });

        const promptPart = {
            inlineData: {
                data: imageBase64,
                mimeType: imageMediaType
            }
        };

        const result = await model.generateContent([
            "Resolva esta questão detalhadamente seguindo o schema JSON.", 
            promptPart
        ]);

        const response = await result.response;
        const textResponse = response.text();
        
        console.log("🛠️ Resposta Gemini Recebida");

        let resultadoAI;
        try {
            resultadoAI = JSON.parse(textResponse);
        } catch (e) {
            console.error("❌ Erro ao parsear JSON do Gemini:", e);
            // Fallback manual se o JSON vier sujo (raro com responseMimeType definido)
            // Tenta limpar markdown ```json ... ```
            const cleanText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            try {
                resultadoAI = JSON.parse(cleanText);
            } catch (e2) {
                throw new Error("A IA falhou em gerar uma resposta estruturada.");
            }
        }

        // =================================================================================
        // 💾 PERSISTÊNCIA E COBRANÇA
        // =================================================================================

        // 1. Debitar Saldo
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: {
                extrato: {
                    tipo: 'SAIDA',
                    valor: custoCoins,
                    descricao: `Oráculo (Gemini): ${resultadoAI.topico || 'Geral'}`,
                    categoria: 'SYSTEM',
                    data: new Date()
                }
            }
        });

        // 2. Salvar no Chat
        if (materia) {
            await ChatModel.create({
                materia: materia,
                autor_real_id: user._id,
                autor_nome: "Oráculo",
                autor_fake: "Oráculo",
                autor_avatar: "robot_01",
                autor_classe: "IA",
                tipo: "resolucao_ia",
                dados_ia: resultadoAI, // Salvamos o objeto JSON puro
                imagem_original: imagem_url,
                data: new Date()
            });
        }

        res.json({ success: true, data: resultadoAI });

    } catch (error) {
        console.error("❌ ERRO CRÍTICO GEMINI CONTROLLER:", error);
        res.status(500).json({ error: "Erro interno no Oráculo (Gemini API)." });
    }
};