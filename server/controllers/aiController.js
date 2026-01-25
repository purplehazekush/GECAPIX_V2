// server/controllers/aiController.js
const UsuarioModel = require('../models/Usuario');
const ChatModel = require('../models/Mensagem'); 
const TOKEN = require('../config/tokenomics');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url, materia } = req.body;
        
        // --- VALIDAÇÕES E CUSTOS (Mantidos) ---
        if (!email || !imagem_url) return res.status(400).json({ error: "Dados incompletos." });

        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

        const custoGlue = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_GLUE) || 1;
        let custoCoins = (TOKEN.COSTS && TOKEN.COSTS.AI_SOLVER_COINS) || 50;

        if (user.classe === 'TECNOMANTE') custoCoins = Math.floor(custoCoins * 0.5);

        if ((user.saldo_glue || 0) < custoGlue) return res.status(402).json({ error: "Sem GLUE." });
        if ((user.saldo_coins || 0) < custoCoins) return res.status(402).json({ error: "Sem Coins." });

        // =================================================================================
        // 🧠 PROMPT MASTER V4: O "TECHNO-SOLVER" (Visualização Aprimorada)
        // =================================================================================
        const promptSystem = `
            ATUE COMO: O Monitor Chefe de Engenharia da UFMG.
            OBJETIVO: Entregar um gabarito PERFEITO, visualmente limpo e didático.

            --- REGRAS VISUAIS DE LATEX (OBRIGATÓRIO) ---
            1. USE SEMPRE '\\displaystyle' no início de fórmulas com frações, integrais ou somatórios. Isso as torna grandes e legíveis.
               Ex: "\\displaystyle \\int_{a}^{b} f(x) dx" em vez de "\\int f(x) dx".
            2. USE '\\boxed{}' para destacar o resultado final de cada passo importante no roteiro.
            3. USE '\\implies' para conectar passos lógicos.
            4. VETORES: Use '\\mathbf{v}' ou '\\vec{v}'.
            5. NÃO USE delimitadores de bloco ($$, \\[, \\() no JSON. Apenas o código LaTeX puro.

            --- REGRAS DE COMPORTAMENTO ---
            1. SE A IMAGEM NÃO FOR UMA QUESTÃO (ex: selfie, paisagem, borrão):
               Retorne 'sucesso': false e 'alerta': "Imagem inválida. Envie uma questão acadêmica."
            
            2. MÚLTIPLAS QUESTÕES (a, b, c...):
               No campo 'resposta_final', condense usando notação de linha.
               Ex: "a) 10 \\quad b) 20 \\quad c) 5kg".
            
            3. TÓPICO E DIFICULDADE:
               Classifique a questão para dar contexto ao aluno.

            --- ESTRUTURA JSON DE RESPOSTA ---
            Retorne APENAS o JSON:
            {
                "sucesso": true,
                "topico": "Ex: Cálculo I, Termodinâmica, Resistência...",
                "dificuldade": "Fácil / Médio / Difícil / Insana",
                "tipo": "MULTIPLA_ESCOLHA" ou "ABERTA",
                
                "resposta_final": "Resultado direto. Se for múltipla escolha: 'Letra X - Valor'. Use LaTeX grande.",
                
                "memoria_calculo": [
                    "Passo 1 (LaTeX com \\displaystyle)",
                    "Passo 2 (LaTeX com \\displaystyle e \\boxed{} no fim se relevante)"
                ],
                
                "teoria": "Explicação conceitual. Use '\\(' para math inline.",
                "alerta": "Null ou aviso curto."
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: promptSystem },
                { role: "user", content: [
                    { type: "text", text: "Resolva com excelência visual." },
                    { type: "image_url", image_url: { url: imagem_url } }
                ]}
            ],
            response_format: { type: "json_object" },
            temperature: 0.1, 
            max_tokens: 2500 // Aumentado para garantir completude em questões complexas
        });

        // Parse e Validação
        console.log("🤖 Resposta AI:", response.choices[0].message.content); // Debug

        let resultadoAI;
        try {
            resultadoAI = JSON.parse(response.choices[0].message.content);
        } catch (e) {
            console.error("Erro Parse JSON:", e);
            throw new Error("Erro na formatação da IA");
        }

        // --- COBRANÇA ---
        // Se a IA disser que não é uma questão (sucesso: false), NÃO COBRAMOS?
        // Decisão de negócio: Por enquanto cobramos o processamento, mas é barato.
        // Se quiser reembolsar, adicione um 'if (!resultadoAI.sucesso) return res.json(...)' antes do update.
        
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