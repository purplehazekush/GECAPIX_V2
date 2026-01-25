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
    apiKey: process.env.ANTHROPIC_API_KEY, // Certifique-se de ter essa chave no .env
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
            // O Claude não baixa URLs públicas sozinho, precisamos enviar o buffer
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
        // 🧠 PROMPT SYSTEM: O CONTRATO RÍGIDO DO FRONTEND
        // =================================================================================
        const systemPrompt = `
            ATUE COMO: O "Oráculo", um monitor de engenharia da UFMG.
            OBJETIVO: Analisar a imagem e retornar um JSON estrito para renderização em React.

            --- REGRAS DE ROTEIRO (CRÍTICO) ---
            1. O campo 'roteiro_estruturado' deve conter APENAS passos matemáticos.
            2. PROIBIDO texto narrativo dentro de 'passos'.
               ERRADO: "Calculando a integral..."
               CERTO: "I = \\\\int x dx"
            3. Se precisar explicar um passo, use o formato "Rótulo: Equação".
               Ex: "Substituição: u = x^2"

            --- REGRAS DE LATEX E JSON ---
            1. Use '\\\\displaystyle' para frações/integrais.
            2. Use '\\\\boxed{}' no resultado final de cada bloco.
            3. CRÍTICO: No JSON, você deve escapar as barras invertidas.
               Para escrever '\\int', você deve enviar "\\\\int" no JSON.

            --- FORMATO JSON ESPERADO ---
            {
                "sucesso": true,
                "topico": "Ex: Física I",
                "dificuldade": "Fácil/Médio/Difícil",
                
                // CASO A: RESULTADO ÚNICO
                "resultado_unico": "LaTeX da resposta final (ex: 42 \\\\text{ m/s})",
                "itens_rapidos": [],
                
                // CASO B: MÚLTIPLOS ITENS (a, b, c)
                // "resultado_unico": null,
                // "itens_rapidos": [ { "label": "a)", "valor": "LaTeX" }, ... ],

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

                "teoria": "Explicação conceitual. Use math inline \\\\( ... \\\\).",
                "alerta": "Aviso curto ou null"
            }
        `;

        // =================================================================================
        // 🚀 CHAMADA AO CLAUDE 3.5 SONNET
        // =================================================================================
        console.log("🔮 Invocando Claude...");
        
        const msg = await anthropic.messages.create({
            // Use o modelo mais recente disponível na sua chave. 
            // 'claude-3-5-sonnet-20241022' é a versão "New Sonnet 3.5".
            // Se sua chave for específica para 'claude-sonnet-4-5', use esse alias.
            model: "claude-sonnet-4-5-20250929", 
            max_tokens: 3000,
            temperature: 0.1, // Temperatura baixa para precisão matemática
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
                            text: "Resolva esta questão. Retorne APENAS o JSON válido."
                        }
                    ],
                },
                {
                    // TRUQUE DO PREFILL: Forçamos o Claude a começar com uma chave.
                    // Isso evita que ele diga "Aqui está o JSON..." antes.
                    role: "assistant",
                    content: "{" 
                }
            ],
        });

        // O Claude devolve o JSON sem a primeira chave '{', então colamos de volta
        const rawResponse = "{" + msg.content[0].text;
        
        console.log("🤖 Resposta Claude RAW (Primeiros 100 chars):", rawResponse.substring(0, 100));

        // --- PARSE E TRATAMENTO DE ERROS ---
        let resultadoAI;
        try {
            resultadoAI = JSON.parse(rawResponse);
        } catch (e) {
            console.error("Erro Parse JSON Claude:", e);
            // Tentativa de limpeza se ele mandou Markdown mesmo com prefill
            const clean = rawResponse.replace(/```json/g, '').replace(/```/g, '');
            try {
                resultadoAI = JSON.parse(clean);
            } catch (e2) {
                // Se falhar, retornamos um JSON de erro estruturado para o frontend exibir bonito
                resultadoAI = {
                    sucesso: false,
                    topico: "Erro de Leitura",
                    dificuldade: "N/A",
                    resultado_unico: "\\text{Erro}",
                    roteiro_estruturado: [],
                    teoria: "O Oráculo não conseguiu processar o formato da resposta. Tente novamente.",
                    alerta: "Erro de Parse JSON"
                };
            }
        }

        // =================================================================================
        // 💾 PERSISTÊNCIA E COBRANÇA
        // =================================================================================
        
        // 1. Debitar Saldo
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: { extrato: { 
                tipo: 'SAIDA', 
                valor: custoCoins, 
                descricao: `Oráculo: ${resultadoAI.topico || 'Geral'}`, 
                categoria: 'SYSTEM', 
                data: new Date() 
            }}
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
        // Log detalhado para debug
        if (error.error) console.error("Detalhe Anthropic:", JSON.stringify(error.error, null, 2));
        
        res.status(500).json({ error: "Erro interno no Oráculo (Claude API)." });
    }
};