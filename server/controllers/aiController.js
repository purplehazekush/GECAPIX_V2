// server/controllers/aiController.js
const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem');
const TOKEN = require('../config/tokenomics');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const { oracleToolDefinition, sanitizarJsonComLatex } = require('../utils/aiTools');
const { ORACLE_SYSTEM_PROMPT } = require('../utils/oraclePrompts');

// =================================================================================
// ⚙️ CONFIGURAÇÃO DO CLAUDE
// =================================================================================
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultHeaders: { 'anthropic-version': '2023-06-01' }
});

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
            const discount = TOKEN.CLASSES.TECNOMANTE.ORACLE_DISCOUNT
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
            console.log("📥 Baixando imagem para o Claude...");
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
        // 🚀 CHAMADA AO CLAUDE
        // =================================================================================
        console.log("🔮 Invocando Claude...");

        const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929", // Verifique se este modelo está disponível na sua conta
            max_tokens: 3000,
            temperature: 0.1,
            system: ORACLE_SYSTEM_PROMPT,
            tools: [oracleToolDefinition],
            tool_choice: { type: "tool", name: "entregar_gabarito" },
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: imageMediaType,
                                data: imageBase64,
                            },
                        },
                        {
                            type: "text",
                            text: "Resolva esta questão. Use a ferramenta 'entregar_gabarito' para fornecer a resposta."
                        }
                    ],
                }
            ],
        });

        // =================================================================================
        // 🧩 PARSE DA RESPOSTA (CORRIGIDO)
        // =================================================================================

        let resultadoAI;

        // 1. Tenta encontrar o uso da ferramenta (Caminho Feliz - Solução 3)
        const toolUse = msg.content.find(c => c.type === "tool_use" && c.name === "entregar_gabarito");

        if (toolUse) {
            console.log("🛠️ Tool Use detectado. JSON estruturado recebido com sucesso.");
            // O SDK já parseou o JSON para nós dentro de 'input'
            resultadoAI = toolUse.input;
        } else {
            // 2. Fallback (Plano B): Se a IA ignorou a tool e mandou texto
            console.warn("⚠️ Tool Use não encontrado. Tentando parse manual de texto...");

            const textBlock = msg.content.find(c => c.type === "text");
            const textContent = textBlock ? textBlock.text : "";

            if (!textContent) {
                console.error("❌ Conteúdo da mensagem:", JSON.stringify(msg.content, null, 2));
                throw new Error("A IA não retornou nem Tool nem Texto legível.");
            }

            // Sanitização (Solução 1)
            const rawText = textContent.trim().startsWith('{') ? textContent : "{" + textContent;
            const jsonSanitizado = sanitizarJsonComLatex(rawText);

            try {
                resultadoAI = JSON.parse(jsonSanitizado);
            } catch (e) {
                console.error("❌ Falha no Parse Manual:", e.message);
                throw new Error("Erro de sintaxe na resposta da IA.");
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
                    descricao: `Oráculo: ${resultadoAI.topico || 'Geral'}`,
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
        console.error("❌ ERRO CRÍTICO CLAUDE CONTROLLER:", error);
        if (error.error) console.error("Detalhe Anthropic:", JSON.stringify(error.error, null, 2));

        res.status(500).json({ error: "Erro interno no Oráculo (Claude API)." });
    }
};