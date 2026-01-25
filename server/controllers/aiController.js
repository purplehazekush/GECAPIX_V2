const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); 
const TOKEN = require('../config/tokenomics');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios'); 

// FIX 1: Explicitly set the header version to avoid API mismatches
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  defaultHeaders: { 'anthropic-version': '2023-06-01' }
});

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;

        if (!email || !imagem_url) return res.status(400).json({ error: "Dados incompletos." });
        
        // --- Verify User & Balance (Simplified for snippet) ---
        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found" });

        // =================================================================================
        // 🧠 CLAUDE 4.5 SONNET SETUP
        // =================================================================================

        const systemPrompt = `
            ATUE COMO: Uma engine de álgebra simbólica humana.
            OBJETIVO: Resolver a questão da imagem com granularidade extrema.

            --- REGRAS DE OURO ---
            1. NÃO PULE ETAPAS. Mostre MMC, u/du/v/dv, etc.
            2. Verifique se há caminhos mais simples.
            3. Use LaTeX com '\\displaystyle'.
            4. Responda APENAS JSON.

            --- FORMATO JSON ---
            {
                "topico": "Cálculo III",
                "resultado_final": "LaTeX do resultado",
                "roteiro": [
                    { "texto": "Explicação...", "latex": "Equação..." }
                ]
            }
        `;

        // FIX 2: Better Image Downloading Logic
        let imageMediaType = "image/jpeg";
        let imageBase64 = "";
        
        try {
            const imageResponse = await axios.get(imagem_url, { 
                responseType: 'arraybuffer',
                timeout: 10000 // 10s timeout to avoid hanging
            });
            
            const buffer = Buffer.from(imageResponse.data);
            imageBase64 = buffer.toString('base64');
            
            if (imageResponse.headers['content-type']) {
                imageMediaType = imageResponse.headers['content-type'];
            }
        } catch (imgErr) {
            console.error("❌ Erro ao baixar imagem:", imgErr.message);
            return res.status(400).json({ error: "Falha ao processar a imagem. Verifique o link." });
        }

        // 3. API Call
        console.log("📡 Sending request to Claude...");
        
        const msg = await anthropic.messages.create({
            // Ensure this model ID matches EXACTLY what is in your Anthropic Console
            model: "claude-sonnet-4-5-20250929", 
            max_tokens: 2000,
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
                            text: "Resolva passo a passo, demonstrando o raciocínio algébrico linha a linha. Retorne apenas JSON."
                        }
                    ],
                },
                {
                    role: "assistant",
                    content: "{" 
                }
            ],
        });

        // 4. Parse Result
        const rawResponse = "{" + msg.content[0].text;
        let resultadoAI;
        
        try {
            resultadoAI = JSON.parse(rawResponse);
        } catch (e) {
            console.error("⚠️ JSON Parse Warning - Cleaning output...");
            const clean = rawResponse.replace(/```json/g, "").replace(/```/g, "");
            resultadoAI = JSON.parse(clean);
        }

        // --- PERSISTENCE ---
        // Save to DB logic here...

        res.json({ success: true, data: resultadoAI });

    } catch (error) {
        // FIX 3: Detailed Logging for VPS
        console.error("❌ CRITICAL CLAUDE ERROR:", error);
        if (error.error && error.error.message) {
            console.error(">> Message:", error.error.message); // This usually contains the "Model not found" or "Credit" error
        }
        
        res.status(500).json({ 
            error: "Erro no raciocínio da IA.",
            debug: error.message 
        });
    }
};