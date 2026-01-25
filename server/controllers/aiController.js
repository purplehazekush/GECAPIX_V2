const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); 
const TOKEN = require('../config/tokenomics');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios'); 

// =================================================================================
// ⚙️ CONFIGURAÇÃO DO CLAUDE
// =================================================================================
// O header 'anthropic-version' é OBRIGATÓRIO para evitar erros 500/404 em versões novas
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

        // Desconto para Tecnomantes (Exemplo de lógica de negócio)
        if (user.classe === 'TECNOMANTE') custoCoins = Math.floor(custoCoins * 0.5);

        if ((user.saldo_glue || 0) < custoGlue) return res.status(402).json({ error: "Sem GLUE suficiente." });
        if ((user.saldo_coins || 0) < custoCoins) return res.status(402).json({ error: "Sem Coins suficientes." });


        // =================================================================================
        // 🧠 PREPARAÇÃO DA IA (CLAUDE 4.5 SONNET)
        // =================================================================================

        // A. Download da Imagem (Claude exige Base64, não aceita URL direta confiavelmente)
        let imageMediaType = "image/jpeg";
        let imageBase64 = "";

        try {
            console.log("📥 Baixando imagem para processamento...");
            const imageResponse = await axios.get(imagem_url, { 
                responseType: 'arraybuffer',
                timeout: 15000 // 15 segundos de timeout
            });
            
            const buffer = Buffer.from(imageResponse.data, 'binary');
            imageBase64 = buffer.toString('base64');
            
            if (imageResponse.headers['content-type']) {
                imageMediaType = imageResponse.headers['content-type'];
            }
        } catch (imgErr) {
            console.error("❌ Erro ao baixar imagem:", imgErr.message);
            return res.status(400).json({ error: "Não foi possível acessar a imagem enviada." });
        }

        // B. Definição do Prompt (Engine de Álgebra)
        const systemPrompt = `
            ATUE COMO: Uma engine de álgebra simbólica extremamente rigorosa.
            OBJETIVO: Resolver a questão matemática da imagem passo a passo, como um gabarito oficial.

            --- REGRAS DE OURO ---
            1. GRANULARIDADE MÁXIMA: Não pule etapas. 
               - Se somar frações, mostre o MMC.
               - Se integrar por substituição, declare u, du e os novos limites.
            2. SIMPLICIDADE: Verifique sempre se há um caminho mais curto (ex: simetria, troca de ordem de integração).
            3. LATEX: Use sempre '\\displaystyle' para integrais, frações e limites ficarem legíveis.
            4. FORMATO: Responda APENAS o JSON solicitado.

            --- SCHEMA JSON OBRIGATÓRIO ---
            {
                "topico": "Tópico (ex: Cálculo III)",
                "dificuldade": "Médio",
                "resultado_final": "Resultado em LaTeX",
                "roteiro": [
                    { "texto": "Explicação breve do passo", "latex": "Equação matemática do passo" }
                ]
            }
        `;

        // C. Chamada à API
        console.log("📡 Enviando para Claude Sonnet 4.5...");
        
        const msg = await anthropic.messages.create({
            // ID exato que vimos na sua imagem
            model: "claude-sonnet-4-5-20250929", 
            max_tokens: 2500,
            temperature: 0.1, // Frio para evitar alucinação matemática
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
                            text: "Resolva esta questão demonstrando todo o raciocínio algébrico. Retorne apenas JSON."
                        }
                    ],
                },
                {
                    role: "assistant",
                    content: "{" // PRE-FILL: Força o início do JSON
                }
            ],
        });

        // D. Tratamento da Resposta
        // O Claude devolve o resto do JSON, então concatenamos a chave inicial '{'
        const rawResponse = "{" + msg.content[0].text;
        
        let resultadoAI;
        try {
            // Limpeza de segurança caso ele mande Markdown (```json ... ```)
            let cleanJson = rawResponse;
            if (cleanJson.includes('```json')) {
                cleanJson = cleanJson.replace(/```json/g, "").replace(/```/g, "");
            }
            
            resultadoAI = JSON.parse(cleanJson);

            // Normalização (Garante que 'roteiro' exista mesmo se ele chamar de 'passos')
            if (!resultadoAI.roteiro && resultadoAI.passos) {
                resultadoAI.roteiro = resultadoAI.passos;
            }

        } catch (e) {
            console.error("⚠️ Falha no Parse do JSON da IA:", e);
            console.error("RAW:", rawResponse);
            // Objeto de erro amigável para não quebrar o frontend
            resultadoAI = {
                topico: "Erro de Processamento",
                dificuldade: "Erro",
                resultado_final: "\\text{Erro ao ler resposta da IA}",
                roteiro: [
                    { texto: "A IA retornou um formato inválido.", latex: "\\text{Tente novamente.}" }
                ]
            };
        }

        // =================================================================================
        // 💾 PERSISTÊNCIA (CRÍTICO: SALVAR ANTES DE RESPONDER)
        // =================================================================================
        console.log(`💾 Salvando resultado para usuário: ${user._id}`);

        // 1. Debitar Saldo
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: { extrato: { 
                tipo: 'SAIDA', 
                valor: custoCoins, 
                descricao: `Claude: ${resultadoAI.topico || 'Math'}`, 
                categoria: 'AI_SOLVER', 
                data: new Date() 
            }}
        });

        // 2. Criar a Mensagem no Chat
        // Se isso não rodar, o balão não aparece no frontend!
        if (materia) {
            const novaMsg = await ChatModel.create({
                materia: materia,
                autor_real_id: user._id,
                autor_nome: "Oráculo",
                autor_fake: "Oráculo",
                autor_avatar: "robot_v3", // Verifique se este avatar existe no seu front
                autor_classe: "IA",
                tipo: "resolucao_ia", // OBRIGATÓRIO para o SolutionBubble ativar
                dados_ia: resultadoAI, 
                imagem_original: imagem_url,
                data: new Date()
            });
            console.log("✅ Mensagem salva no MongoDB com ID:", novaMsg._id);
        }

        // 3. Resposta Final para o Cliente
        console.log("🚀 Enviando resposta sucesso para o frontend.");
        res.json({ success: true, data: resultadoAI });

    } catch (error) {
        console.error("❌ ERRO CRÍTICO AI CONTROLLER:", error);
        
        // Log detalhado de erro da Anthropic se disponível
        if (error.error) {
            console.error("Detalhe Anthropic:", JSON.stringify(error.error, null, 2));
        }

        res.status(500).json({ 
            error: "Erro interno no processamento da IA.",
            details: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
};