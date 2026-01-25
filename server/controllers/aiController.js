const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); 
const TOKEN = require('../config/tokenomics');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios'); // Necessário para baixar a imagem

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;

        // --- VALIDAÇÕES E CUSTOS (Mantidos) ---
        if (!email || !imagem_url) return res.status(400).json({ error: "Dados incompletos." });
        const user = await UsuarioModel.findOne({ email });
        // ... (verificações de saldo glue/coins) ...

        // =================================================================================
        // 🧠 CLAUDE 3.5 SONNET - SETUP
        // =================================================================================

        // 1. O Prompt "Compilador Algébrico" (V14 - Especial para Claude)
        // O Claude adora system prompts detalhados.
        const systemPrompt = `
            ATUE COMO: Uma engine de álgebra simbólica humana.
            OBJETIVO: Resolver a questão da imagem com granularidade extrema.

            --- REGRAS DE OURO (Siga ou falhe) ---
            1. NÃO PULE ETAPAS. Se você vai somar frações, mostre o MMC. Se vai integrar por partes, mostre u, du, v, dv.
            2. SEMPRE VERIFIQUE: Existe um jeito mais simples? (Ex: Trocar ordem de integração, coordenadas polares).
            3. Use LaTeX com '\\displaystyle' para integrais, limites e frações.
            4. Se houver texto explicativo, seja breve e direto (estilo engenheiro).

            --- FORMATO DE SAÍDA (JSON) ---
            Você deve responder APENAS um JSON válido seguindo este schema exato:
            {
                "topico": "Cálculo III",
                "resultado_final": "LaTeX do resultado",
                "roteiro": [
                    { "texto": "Pequena nota do passo (opcional)", "latex": "Equação do passo" },
                    { "texto": "Explicando a substituição...", "latex": "u = ... \\implies du = ..." }
                ]
            }
        `;

        // 2. Converter URL da imagem para Base64 (Claude exige isso)
        let imageMediaType = "image/jpeg";
        let imageBase64 = "";
        
        try {
            const imageResponse = await axios.get(imagem_url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(imageResponse.data, 'binary');
            imageBase64 = buffer.toString('base64');
            
            // Tenta detectar mime-type pelo header ou extensão, fallback para jpeg
            const contentType = imageResponse.headers['content-type'];
            if (contentType) imageMediaType = contentType;
        } catch (imgErr) {
            console.error("Erro ao baixar imagem:", imgErr);
            return res.status(400).json({ error: "Falha ao processar a imagem." });
        }

        // 3. Chamada à API
        const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 2000, // Sobra espaço para resoluções longas
            temperature: 0.1, // Frio e preciso
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
                            text: "Resolva passo a passo, demonstrando o raciocínio algébrico linha a linha. Retorne apenas JSON."
                        }
                    ],
                },
                {
                    role: "assistant",
                    content: "{" // PRE-FILL: Força o Claude a começar um JSON imediatamente
                }
            ],
        });

        // 4. Parse do Resultado (Truque do Pre-fill)
        // O Claude vai devolver o resto do JSON (sem a primeira chave '{'), então concatenamos.
        const rawResponse = "{" + msg.content[0].text;
        
        let resultadoAI;
        try {
            resultadoAI = JSON.parse(rawResponse);
        } catch (e) {
            console.error("Erro Parse JSON Claude:", e);
            // Fallback: Tentar limpar caso ele tenha mandado markdown ```json
            const clean = rawResponse.replace(/```json/g, "").replace(/```/g, "");
            resultadoAI = JSON.parse(clean);
        }

        // --- PERSISTÊNCIA (Seu código original) ---
        // ... updates no mongo ...

        res.json({ success: true, data: resultadoAI });

    } catch (error) {
        console.error("Erro AI Controller (Claude):", error);
        res.status(500).json({ error: "Erro no raciocínio da IA." });
    }
};