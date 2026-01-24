const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');
const OpenAI = require('openai');

// Inicializa OpenAI (Certifique-se de ter OPENAI_API_KEY no .env)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.resolverQuestao = async (req, res) => {
    try {
        const { email, imagem_url } = req.body;
        
        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

        // 1. VERIFICAÇÃO DE SALDO (Dual Currency)
        const custoGlue = TOKEN.COSTS.AI_SOLVER_GLUE;
        const custoCoins = TOKEN.COSTS.AI_SOLVER_COINS;

        if (user.saldo_glue < custoGlue) {
            return res.status(402).json({ error: "Você precisa de GLUE para usar a IA. Compre via Pix." });
        }
        if (user.saldo_coins < custoCoins) {
            return res.status(402).json({ error: "GecaCoins insuficientes para completar a operação." });
        }

        // 2. COBRANÇA ANTECIPADA (Para evitar fraude se a IA demorar)
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -custoGlue, saldo_coins: -custoCoins },
            $push: { extrato: { 
                tipo: 'SAIDA', 
                valor: custoCoins, 
                descricao: 'IA: Resolução de Questão', 
                categoria: 'SYSTEM', // Usando nossas categorias novas
                data: new Date() 
            }}
        });

        // 3. CHAMADA PARA A IA (GPT-4o Vision)
        // O Prompt deve forçar JSON estrito.
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `Você é uma IA especialista em resolver provas de engenharia e exatas. 
                    Sua saída DEVE ser estritamente um JSON válido, sem markdown (backticks), sem texto antes ou depois.
                    
                    Formato do JSON esperado:
                    {
                        "multipla_escolha": "Letra da resposta (ex: A) ou 'N/A' se for discursiva",
                        "resolucao_rapida": "Resolução direta em 1 linha",
                        "resolucao_eficiente": "Passo a passo resumido (máx 3 linhas)",
                        "resolucao_completa": "Explicação detalhada da teoria e cálculo",
                        "dica_extra": "Uma dica de ouro sobre o conceito"
                    }`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Resolva esta questão acadêmica. Retorne apenas o JSON." },
                        { type: "image_url", image_url: { url: imagem_url } }
                    ]
                }
            ],
            max_tokens: 1000,
            response_format: { type: "json_object" } // Força JSON (Feature nova da OpenAI)
        });

        const resultado = JSON.parse(response.choices[0].message.content);

        // 4. RETORNA RESULTADO
        // Opcional: Salvar histórico de resoluções no banco (novo Model 'Resolucao')
        
        res.json({
            success: true,
            saldo_restante_glue: user.saldo_glue - custoGlue,
            data: resultado
        });

    } catch (error) {
        console.error("Erro na IA:", error);
        // Opcional: Reembolsar em caso de erro da API
        res.status(500).json({ error: "A IA falhou. Tente novamente (Seus créditos não foram gastos se falhou aqui)." });
    }
};