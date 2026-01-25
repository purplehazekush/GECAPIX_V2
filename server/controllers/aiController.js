const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); 
const TOKEN = require('../config/tokenomics');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;
        
        // --- VALIDAÇÕES (Mantidas) ---
        if (!email || !imagem_url) return res.status(400).json({ error: "Dados incompletos." });
        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

        // --- CUSTOS (Mantidos) ---
        const custoGlue = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_GLUE) || 1;
        let custoCoins = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_COINS) || 50;
        if (user.classe === 'TECNOMANTE') custoCoins = Math.floor(custoCoins * 0.5);

        if ((user.saldo_glue || 0) < custoGlue) return res.status(402).json({ error: "Sem GLUE." });
        if ((user.saldo_coins || 0) < custoCoins) return res.status(402).json({ error: "Sem Coins." });

        // =================================================================================
        // 🧠 PROMPT V9: LEI MARCIAL DO LATEX (ZERO TOLERÂNCIA A ERROS)
        // =================================================================================
        const promptSystem = `
            ATUE COMO: O Motor de Renderização de Gabaritos da UFMG.
            OBJETIVO: Gerar JSON estrito para renderização LaTeX.

            --- LEI Nº 1: ESCAPE JSON (PERIGO DE MORTE) ---
            1. Você está gerando uma string JSON. O caractere '\\' é especial.
            2. VOCÊ DEVE USAR DUAS BARRAS ('\\\\') PARA CADA COMANDO LATEX.
            3. Exemplo ERRADO: "\\int", "\\frac", "\\text".
            4. Exemplo CERTO: "\\\\int", "\\\\frac", "\\\\text".
            5. Falhar nisso quebra o sistema.

            --- LEI Nº 2: ROTEIRO MUDO (SILENT MATH) ---
            1. O campo 'roteiro_estruturado' -> 'passos' deve conter EXCLUSIVAMENTE equações matemáticas.
            2. É PROIBIDO escrever frases como: "Aplicando a regra...", "Substituindo...", "Temos que:".
            3. Se precisar de uma palavra chave, coloque dentro de \\\\text{}. Ex: "y = 2x \\\\quad (\\\\text{eq. 1})".
            4. Se você escrever texto solto fora de \\\\text{}, o renderizador VAI QUEBRAR.

            --- LEI Nº 3: VISUALIZAÇÃO ---
            1. Use SEMPRE '\\\\displaystyle' no início de integrais/frações/limites.
            2. Use '\\\\boxed{}' APENAS no resultado final de cada bloco.
            3. NÃO USE markdown ($$, \\[, \\() para envolver as equações no JSON. Mande o código LaTeX puro.

            --- ESTRUTURA DE RESPOSTA (JSON OBRIGATÓRIO) ---
            {
                "sucesso": true,
                "topico": "Cálculo III",
                "dificuldade": "Difícil",
                
                "resultado_unico": "LaTeX puro da resposta final (ou null se tiver itens)",
                "itens_rapidos": [ { "label": "a)", "valor": "LaTeX puro" } ],

                "roteiro_estruturado": [
                    {
                        "titulo": "Item a) (ou null)", 
                        "passos": [
                            "J = \\\\rho^2 \\\\sin \\\\phi",  // <--- ISSO É CERTO (Só matemática)
                            "I = \\\\displaystyle \\\\int ...",
                            "\\\\boxed{Resultado}"
                        ]
                    }
                ],

                "teoria": "AQUI você pode escrever texto explicativo à vontade. Use \\\\( ... \\\\) para math inline.",
                "alerta": "Aviso curto ou null"
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: [
                    { type: "text", text: "Gere o JSON. Verifique triplamente os escapes (\\\\)." },
                    { type: "image_url", image_url: { url: imagem_url } }
                ]}
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, // Criatividade quase zero para garantir obediência
            max_tokens: 2500 
        });

        // Debug no Console do Servidor (Pra você monitorar se ele obedeceu)
        console.log("🤖 JSON V9:", response.choices[0].message.content.substring(0, 500) + "..."); 

        let resultadoAI;
        try {
            resultadoAI = JSON.parse(response.choices[0].message.content);
        } catch (e) {
            console.error("❌ ERRO CRÍTICO DE JSON:", e.message);
            // Tenta salvar o erro no log para debug futuro
            console.error("Conteúdo Falho:", response.choices[0].message.content);
            throw new Error("Erro na formatação da IA. Tente novamente.");
        }

        // --- UPDATE DE SALDO ---
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: { extrato: { 
                tipo: 'SAIDA', valor: custoCoins, descricao: `Oráculo: ${resultadoAI.topico || 'Geral'}`, categoria: 'SYSTEM', data: new Date() 
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
                dados_ia: resultadoAI, 
                imagem_original: imagem_url,
                data: new Date()
            });
        }

        res.json({ success: true, data: resultadoAI });

    } catch (error) {
        console.error("Erro AI Controller:", error);
        res.status(500).json({ error: "Erro interno no Oráculo." });
    }
};