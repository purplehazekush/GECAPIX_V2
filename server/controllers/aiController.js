// server/controllers/aiController.js
const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem');
const TOKEN = require('../config/tokenomics');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const { oracleToolDefinition, sanitizarJsonComLatex } = require('../utils/aiTools');
const { ORACLE_SYSTEM_PROMPT } = require('../utils/oraclePrompts'); // <--- AQUI

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
        // 🧠 PROMPT V12: "SELF-CORRECTION & CHAIN OF THOUGHT"
        // =================================================================================
        const systemPrompt = `
            ATUE COMO: O Monitor Chefe de Engenharia da UFMG. Rigoroso e Preciso.
            OBJETIVO: Gerar gabarito à prova de falhas aritméticas.

            --- PROTOCOLO DE PRECISÃO (CRÍTICO) ---
            Antes de preencher o roteiro final, você DEVE calcular passo a passo no campo 'rascunho_verificacao'.
            1. Verifique cada sinal (+/-).
            2. Verifique cada multiplicação de fração (ex: 1/3 * 1/4 = 1/12).
            3. Se for uma integral for trigonométrica, revise a identidade usada. Se nao for uma questão matemática,
            adapte o estilo de escrita, mas garanta que a saída será similar em estrutura da exemplificada aqui
            4. independentemente da matéria, tente aplicar esse mesmo espirito das ordens anteriores.
            5. OPERADORES: Use padrao internacional: \\sin, \\cos, \\tan, \\arcsin (NÃO use \\sen, \\tg).
            6. NÃO coloque frases inteiras dentro de blocos matemáticos. O LaTeX remove os espaços.
               ERRADO: "Analisandocadaalternativa" (ocorre se você puser texto cru em math mode)
               CERTO: "Analisando cada alternativa:" (Texto puro no JSON, fora do LaTeX)
            7. Se precisar de texto DENTRO de uma equação, use '\\\\text{texto com espaços}'.
               Ex: "x = 10 \\\\text{ metros}"
            8. SEPARAÇÃO TEXTO vs MATH:
                - NÃO escreva frases inteiras dentro de blocos matemáticos ($...$).
                - ERRADO: $A integral converge pois o limite é zero$ (Fica tudo junto sem espaços).
                - CORRETO: "A integral converge pois o limite é zero" (Texto JSON) e depois a fórmula $ \\int ... $.

            --- REGRAS DE ACENTUAÇÃO (CRÍTICO) ---
            1. USE UNICODE DIRETO: 'ç', 'ã', 'é', 'ó'.
            2. PROIBIDO usar comandos de escape antigos como: \\\\c{c}, \\\\~{a}, \\\\'e.
               O renderizador web não entende esses comandos antigos.

            --- REGRAS DE VISUALIZAÇÃO (LATEX) ---
            1. Use '\\\\displaystyle' para frações e integrais.
            2. Use '\\\\boxed{}' APENAS no resultado final do bloco.
            3. Use o formato "Rótulo: Math" se precisar explicar (ex: "Substituição: u=x^2").
            4. ESCAPE JSON: Use DUAS barras (\\\\) para comandos LaTeX.

            --- REGRA DE OURO DO JSON (ANTI-CRASH) ---
                Você é uma API JSON. O caractere '\' é especial.
                SEMPRE que escrever LaTeX, você DEVE escapar a barra.
                ERRADO: "\int" -> O Javascript vai travar.
                CERTO: "\\int" -> O Javascript vai ler "\int".
                ERRADO: "\sqrt"
                CERTO: "\\sqrt"

            --- ESTRUTURA JSON ESPERADA ---
            {
                // CAMPO OBRIGATÓRIO PARA PENSAR (O frontend ignora, mas serve para você acertar a conta)
                "rascunho_verificacao": "Texto livre. Passo 1: integral de x é x^2/2. Passo 2: limites 0 a 1... Resultado 1/2.",

                "sucesso": true,
                "topico": "Cálculo",
                "dificuldade": "Difícil",
                
                "resultado_unico": "LaTeX (ex: 1/12) ou null", (apenas math, use unicode se tiver texto)",
                "itens_rapidos": [],

                "roteiro_estruturado": [
                    {
                        "titulo": "Resolução", 
                        "passos": [
                            "I = \\\\displaystyle \\\\int ...",
                            "\\\\boxed{1/12}"
                        ]
                    }
                ],

                "teoria": "Explicação conceitual...",
                "alerta": "Aviso ou null"
            }
        `;

        // =================================================================================
        // 🚀 CHAMADA AO CLAUDE (COM TOOLS E PROMPT IMPORTADO)
        // =================================================================================
        console.log("🔮 Invocando Claude...");

        const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 3000,
            temperature: 0.1,

            // AQUI ESTÁ A MUDANÇA: Usamos a variável importada
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

        // ✅ SUBSTITUA PELO PARSE INTELIGENTE (Solução 1 + 3 Integradas)

        // 1. Verifica se o modelo usou a Tool (O jeito novo e seguro)
        const toolUse = msg.content.find(c => c.type === "tool_use" && c.name === "entregar_gabarito");
        let resultadoAI;

        if (toolUse) {
            console.log("🛠️ Tool Use detectado. JSON estruturado recebido com sucesso.");
            resultadoAI = toolUse.input; // O SDK da Anthropic JÁ entregou o JSON pronto aqui!
        } else {
            // 2. Fallback (Plano B): Se ele mandou texto, usamos o sanitizador
            console.warn("⚠️ Tool Use falhou. Tentando parse manual com Sanitizador...");

            // Tenta achar algum bloco de texto
            const textContent = msg.content.find(c => c.type === "text")?.text || "";

            // Se achou texto, aplica a limpeza e o truque da chave '{'
            if (textContent) {
                // Se não começar com {, adicionamos. Se já começar, mantemos.
                const rawText = textContent.trim().startsWith('{') ? textContent : "{" + textContent;
                const jsonSanitizado = sanitizarJsonComLatex(rawText);

                try {
                    resultadoAI = JSON.parse(jsonSanitizado);
                } catch (e) {
                    console.error("❌ Falha no Parse Manual:", e.message);
                    throw new Error("Falha ao ler resposta da IA"); // Joga pro catch final
                }
            } else {
                throw new Error("IA não retornou nem Tool nem Texto válido.");
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
        // Log detalhado para debug
        if (error.error) console.error("Detalhe Anthropic:", JSON.stringify(error.error, null, 2));

        res.status(500).json({ error: "Erro interno no Oráculo (Claude API)." });
    }
};