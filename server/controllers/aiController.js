// server/controllers/aiController.js
const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem');
const TOKEN = require('../config/tokenomics');
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const axios = require('axios');

// =================================================================================
// ⚙️ CONFIGURAÇÃO DA ERA GEMINI (HÍBRIDO)
// =================================================================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ⚡ O VELOCISTA (Triagem e OCR)
const modelFlash = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash", // Flash 2.0 é excelente e free tier
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
    }
});

// 🧠 O GÊNIO (Resolução Complexa)
// OBS: Usando 2.0 Flash temporariamente para testes sem cartão. 
// Quando ativar o billing, mude para "gemini-3-pro-preview"
const modelPro = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash", 
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
    }
});

// --- SCHEMAS ---

const segmentationSchema = {
    type: SchemaType.OBJECT,
    properties: {
        questoes: {
            type: SchemaType.ARRAY,
            description: "Lista de questões distintas identificadas na imagem.",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.NUMBER },
                    texto_extraido: { type: SchemaType.STRING },
                    dificuldade: { type: SchemaType.STRING, enum: ["EASY", "HARD"] },
                    topico: { type: SchemaType.STRING }
                },
                required: ["texto_extraido", "dificuldade", "topico"]
            }
        },
        analise_global: { type: SchemaType.STRING, description: "Resumo do que tem na imagem." }
    },
    required: ["questoes"]
};

const resolutionSchema = {
    type: SchemaType.OBJECT,
    properties: {
        resolucao_rapida: { type: SchemaType.STRING, description: "Resultado final em LaTeX (ex: \\\\frac{1}{2})." },
        multipla_escolha: { type: SchemaType.STRING, description: "Letra do gabarito ou N/A." },
        resolucao_eficiente: { type: SchemaType.STRING, description: "Passo a passo direto e otimizado." },
        resolucao_completa: { type: SchemaType.STRING, description: "Explicação didática profunda." },
        dica_extra: { type: SchemaType.STRING }
    },
    required: ["resolucao_rapida", "resolucao_eficiente", "resolucao_completa"]
};

// --- PROMPTS ---

const PROMPT_SEGMENTACAO = `
ANÁLISE DE IMAGEM ACADÊMICA.
1. Identifique QUANTAS questões distintas existem nesta imagem.
2. Para CADA questão:
   - Transcreva o texto/fórmula completo (OCR).
   - Classifique a dificuldade (EASY = Teoria/Básico, HARD = Cálculo/Física/Complexo).
   - Identifique a matéria.
`;

const PROMPT_RESOLVER = `
RESOLVA ESTA QUESTÃO ESPECÍFICA.
Contexto: Você recebeu o texto extraído e a imagem original.
Foque APENAS no texto fornecido abaixo. Ignore outras questões na imagem.
Use LaTeX para matemática. Seja didático.
`;

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body; 

        if (!email || !imagem_url) return res.status(400).json({ error: "Dados incompletos." });
        
        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

        // Custos Unitários
        const custoGlueUnitario = (TOKEN.COSTS?.AI_SOLVER_GLUE) || 1;
        let custoCoinsUnitario = (TOKEN.COSTS?.AI_SOLVER_COINS) || 50;
        if (user.classe === 'TECNOMANTE') custoCoinsUnitario = Math.floor(custoCoinsUnitario * TOKEN.CLASSES.TECNOMANTE.ORACLE_DISCOUNT);

        if ((user.saldo_glue || 0) < custoGlueUnitario) return res.status(402).json({ error: "Sem GLUE suficiente." });

        // 1. Download da Imagem
        let imageBase64 = "";
        let imageMime = "image/jpeg";
        try {
            const imgRes = await axios.get(imagem_url, { responseType: 'arraybuffer' });
            imageBase64 = Buffer.from(imgRes.data, 'binary').toString('base64');
            if (imgRes.headers['content-type']) imageMime = imgRes.headers['content-type'];
        } catch (e) {
            return res.status(400).json({ error: "Erro ao baixar imagem." });
        }

        const imagemPart = { inlineData: { data: imageBase64, mimeType: imageMime } };

        // =====================================================================
        // 🚦 FASE 1: SEGMENTAÇÃO (GEMINI FLASH)
        // =====================================================================
        console.log("⚡ [ORÁCULO] Segmentando imagem...");
        
        const chatSeg = modelFlash.startChat({
            generationConfig: { 
                responseSchema: segmentationSchema,
                responseMimeType: "application/json"
            }
        });

        const resSeg = await chatSeg.sendMessage([PROMPT_SEGMENTACAO, imagemPart]);
        const dadosSeg = JSON.parse(resSeg.response.text());
        
        const listaQuestoes = dadosSeg.questoes || [];
        console.log(`📊 [ORÁCULO] Encontradas: ${listaQuestoes.length} questões.`);

        if (listaQuestoes.length === 0) {
            return res.status(400).json({ error: "Não identifiquei nenhuma questão legível." });
        }

        // --- LIMITAÇÃO TEMPORÁRIA ---
        // Pega apenas a primeira questão para evitar consumo excessivo no teste
        const questoesParaResolver = [listaQuestoes[0]]; 
        const custoTotalGlue = custoGlueUnitario * questoesParaResolver.length;
        const custoTotalCoins = custoCoinsUnitario * questoesParaResolver.length;

        // =====================================================================
        // ⚔️ FASE 2: RESOLUÇÃO (GEMINI PRO/FLASH)
        // =====================================================================
        console.log(`🧠 [ORÁCULO] Resolvendo ${questoesParaResolver.length} questões...`);

        const promises = questoesParaResolver.map(async (q) => {
            const modeloResolver = q.dificuldade === 'HARD' ? modelPro : modelFlash;
            const nomeModelo = q.dificuldade === 'HARD' ? "Gemini Pro" : "Gemini Flash";

            console.log(`   -> Questão ${q.id} (${q.dificuldade}): Enviando para ${nomeModelo}`);

            const chatRes = modeloResolver.startChat({
                generationConfig: { 
                    responseSchema: resolutionSchema,
                    responseMimeType: "application/json" // 🔥 CORREÇÃO AQUI
                }
            });

            const promptFinal = `
                ${PROMPT_RESOLVER}
                --- TEXTO ALVO ---
                ${q.texto_extraido}
                --- TÓPICO ---
                ${q.topico}
            `;

            const resFinal = await chatRes.sendMessage([promptFinal, imagemPart]);
            const jsonFinal = JSON.parse(resFinal.response.text());
            
            return {
                ...jsonFinal,
                topico: q.topico,
                dificuldade: q.dificuldade
            };
        });

        const resultados = await Promise.all(promises);
        const resultadoFinal = resultados[0]; 

        // =====================================================================
        // 💾 SALVA E PAGA
        // =====================================================================
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoTotalGlue, saldo_coins: -custoTotalCoins },
            $push: {
                extrato: {
                    tipo: 'SAIDA',
                    valor: custoTotalCoins,
                    descricao: `Oráculo (${questoesParaResolver.length}x): ${resultadoFinal.topico}`,
                    categoria: 'SYSTEM',
                    data: new Date()
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
                dados_ia: resultadoFinal,
                imagem_original: imagem_url,
                data: new Date()
            });
        }

        res.json({ success: true, data: resultadoFinal });

    } catch (error) {
        console.error("❌ ERRO ORÁCULO:", error);
        res.status(500).json({ error: "A Superinteligência está calibrando seus sensores." });
    }
};