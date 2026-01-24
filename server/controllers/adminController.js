// server/controllers/adminController.js
const UsuarioModel = require('../models/Usuario');

// 1. GET FILA (Apenas pendentes com comprovante)
exports.getFilaValidacao = async (req, res) => {
    try {
        const pendentes = await UsuarioModel.find({
            comprovante_url: { $exists: true, $ne: '' }, 
            status: 'pendente' // <--- Filtro chave
        }).select('nome email curso comprovante_url data_criacao');

        res.json(pendentes);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar fila" });
    }
};

// 2. MODERAR (Aprovar = Ativo)
exports.moderarUsuario = async (req, res) => {
    try {
        const { email, acao } = req.body;

        if (acao === 'aprovar') {
            // Ativa o aluno e dá o bônus de boas-vindas se for a primeira vez
            // (Opcional: dar um XP extra de "Verificado")
            await UsuarioModel.findOneAndUpdate(
                { email }, 
                { status: 'ativo' }
            );
        } else {
            // Rejeita: Volta o comprovante pra nulo mas mantem pendente pra ele reenviar
            await UsuarioModel.findOneAndUpdate(
                { email }, 
                { status: 'pendente', comprovante_url: '' } 
            );
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erro na moderação" });
    }
};

// INJETAR RECURSOS (GLUE/COINS)
exports.darRecursos = async (req, res) => {
    try {
        const { email, glue, coins } = req.body;
        
        const user = await UsuarioModel.findOneAndUpdate(
            { email },
            { 
                $inc: { saldo_glue: glue || 0, saldo_coins: coins || 0 },
                $push: { extrato: { tipo: 'ENTRADA', valor: coins || 0, descricao: 'Grant Admin', categoria: 'SYSTEM', data: new Date() } }
            },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
        res.json({ success: true, novo_glue: user.saldo_glue, novo_coins: user.saldo_coins });
    } catch (error) {
        res.status(500).json({ error: "Erro ao dar recursos" });
    }
};

exports.resetSeason = async (req, res) => {
    try {
        const { confirm } = req.body;
        if (confirm !== "ZERAR_TUDO_SEASON_1") return res.status(400).json({ error: "Senha incorreta" });

        // 1. Reseta Saldos e XP de TODOS
        await require('../models/Usuario').updateMany({}, {
            saldo_coins: 1000, // Começa com 1k
            saldo_staking_liquido: 0,
            xp: 0,
            missoes_concluidas: [],
            quest_progress: [],
            extrato: [{ tipo: 'ENTRADA', valor: 1000, descricao: 'Season 1 Start', data: new Date() }]
        });

        // 2. Limpa Memes, Chat, Títulos
        await require('../models/Meme').deleteMany({});
        await require('../models/Mensagem').deleteMany({});
        await require('../models/LockedBond').deleteMany({});

        res.json({ success: true, message: "SEASON 1 RESETADA COM SUCESSO." });
    } catch (e) { res.status(500).json({ error: e.message }); }
};