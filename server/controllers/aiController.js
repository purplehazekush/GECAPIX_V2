// server/controllers/aiController.js
const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); 
const TOKEN = require('../config/tokenomics');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios'); 

// =================================================================================
// ⚙️ CONFIGURAÇÃO DO CLAUDE
// =================================================================================
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY, // Certifique-se que está no .env
});

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;

        // --- 1. VALIDAÇÕES BÁSICAS ---
        if (!email || !imagem_url) {
            return res.status(400).json({ error: "Dados incompletos." });
        }

        const user = await UsuarioModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        // --- 2. VERIFICAÇÃO DE SALDO ---
        const custoGlue = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_GLUE) || 1;
        let custoCoins = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_COINS) || 50;

        if (user.classe === 'TECNOMANTE') custoCoins = Math.floor(custoCoins * 0.5);

        if ((user.saldo_glue || 0) < custoGlue) return res.status(402).json({ error: "Sem GLUE suficiente." });
        if ((user.saldo_coins || 0) < custoCoins) return res.status(402).json({ error: "Sem Coins suficientes." });

        // =================================================================================
        // 🧠 PREPARAÇÃO DA IMAGEM (CLAUDE EXIGE BASE64)
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
            return res.status(400).json({ error: "Erro ao processar imagem." });
        }

        // =================================================================================
        // 🧠 PROMPT V10 (ADAPTADO PARA CLAUDE + NOSSO FRONTEND)
        // =================================================================================
        const systemPrompt = `
            ATUE COMO: O Monitor Chefe de Engenharia da UFMG.
            OBJETIVO: Gerar um gabarito estruturado em JSON para ser lido por um aplicativo React.

            --- REGRAS VISUAIS DE LATEX (CRÍTICO) ---
            1. USE '\\\\displaystyle' no início de frações/integrais.
            2. USE '\\\\boxed{}' no resultado final de CADA bloco de roteiro.
            3. ESCAPE JSON: Use DUAS barras (\\\\) para cada comando LaTeX. Ex: "\\\\int".

            --- ESTRUTURA DO ROTEIRO (CRÍTICO) ---
            O frontend espera um array 'roteiro_estruturado'.
            - CADA ITEM do array é um BLOCO visual.
            - O campo 'passos' DEVE ser apenas equações matemáticas (LaTeX).
            - PROIBIDO texto narrativo dentro de 'passos'. Use a aba 'teoria' para explicar.

            --- FORMATO JSON OBRIGATÓRIO ---
            {
                "sucesso": true,
                "topico": "Ex: Cálculo III",
                "dificuldade": "Fácil / Médio / Difícil",
                
                // VISUALIZAÇÃO RÁPIDA (Escolha UM caso)
                // CASO A: Uma questão única
                "resultado_unico": "LaTeX da resposta final (ex: 42 \\\\text{ m/s})",
                "itens_rapidos": [],
                
                // CASO B: Múltiplos itens (a, b, c)
                "resultado_unico": null,
                "itens_rapidos": [ 
                    { "label": "a)", "valor": "LaTeX da resposta A" },
                    { "label": "b)", "valor": "LaTeX da resposta B" }
                ],

                // ROTEIRO (Passo a passo mudo)
                "roteiro_estruturado": [
                    {
                        "titulo": "Item a) (ou null se for única)", 
                        "passos": [
                            "J = r", 
                            "I = \\\\displaystyle \\\\int r dr",
                            "\\\\boxed{I = r^2/2}"
                        ]
                    }
                ],

                "teoria": "Explicação conceitual completa. Use math inline \\\\( ... \\\\).",
                "alerta": "Aviso curto ou null"
            }
        `;

        // =================================================================================
        // 🚀 CHAMADA AO CLAUDE 3.5 SONNET
        // =================================================================================
        console.log("🔮 Invocando Claude 3.5 Sonnet...");
        
        const msg = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022", // Modelo mais inteligente atual
            max_tokens: 3000,
            temperature: 0.1,
            system: systemPrompt,
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
                            text: "Resolva esta questão seguindo estritamente o formato JSON solicitado."
                        }
                    ],
                },
                {
                    role: "assistant",
                    content: "{" // PRE-FILL: Força o Claude a começar o JSON imediatamente
                }
            ],
        });

        // O Claude devolve o JSON sem a primeira chave '{', então adicionamos de volta
        const rawResponse = "{" + msg.content[0].text;
        console.log("🤖 Claude Response RAW:", rawResponse.substring(0, 100) + "..."); 

        let resultadoAI;
        try {
            resultadoAI = JSON.parse(rawResponse);
        } catch (e) {
            console.error("Erro Parse JSON Claude:", e);
            // Tenta limpar Markdown se o Claude desobedeceu o pre-fill (raro)
            const clean = rawResponse.replace(/```json/g, '').replace(/```/g, '');
            try {
                resultadoAI = JSON.parse(clean);
            } catch (e2) {
                return res.status(500).json({ error: "O Oráculo falou uma língua estranha." });
            }
        }

        // --- 3. PERSISTÊNCIA E COBRANÇA ---
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: { extrato: { 
                tipo: 'SAIDA', 
                valor: custoCoins, 
                descricao: `Oráculo (Claude): ${resultadoAI.topico || 'Geral'}`, 
                categoria: 'SYSTEM', 
                data: new Date() 
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
                dados_ia: resultadoAI, // Salvamos o JSON estruturado do Claude
                imagem_original: imagem_url,
                data: new Date()
            });
        }

        res.json({ success: true, data: resultadoAI });

    } catch (error) {
        console.error("❌ ERRO CRÍTICO CLAUDE CONTROLLER:", error);
        res.status(500).json({ error: "Erro interno ao processar com Claude." });
    }
};