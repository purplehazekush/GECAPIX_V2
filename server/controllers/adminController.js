const UsuarioModel = require('../models/Usuario');

// 1. GET FILA (Apenas pendentes com comprovante)
exports.getFilaValidacao = async (req, res) => {
    try {
        const pendentes = await UsuarioModel.find({
            comprovante_url: { $exists: true, $ne: '' }, 
            status: 'pendente' 
        }).select('nome email curso comprovante_url data_criacao');
        res.json(pendentes);
    } catch (error) { res.status(500).json({ error: "Erro fila" }); }
};

// 2. MODERAR
exports.moderarUsuario = async (req, res) => {
    try {
        const { email, acao } = req.body;
        if (acao === 'aprovar') {
            await UsuarioModel.findOneAndUpdate({ email }, { status: 'ativo' });
        } else {
            // Rejeitar: limpa url, mantem pendente
            await UsuarioModel.findOneAndUpdate({ email }, { status: 'pendente', comprovante_url: '' });
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Erro moderação" }); }
};

// 3. INJETAR RECURSOS (Para testes ou prêmios manuais)
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
        res.json({ success: true, novo_glue: user.saldo_glue, novo_coins: user.saldo_coins });
    } catch (error) { res.status(500).json({ error: "Erro recursos" }); }
};

// 4. RESET DE TEMPORADA (Zera tudo)
exports.resetSeason = async (req, res) => {
    try {
        const { confirm } = req.body;
        if (confirm !== "ZERAR_TUDO_SEASON_1") return res.status(400).json({ error: "Senha incorreta" });

        // Zera Usuários
        await UsuarioModel.updateMany({}, {
            saldo_coins: 1000, 
            saldo_staking_liquido: 0,
            xp: 0,
            missoes_concluidas: [],
            quest_progress: [],
            extrato: [{ tipo: 'ENTRADA', valor: 1000, descricao: 'Season 1 Start', data: new Date() }]
        });

        // Limpa Collections Satélites (Mantenha require inline se não tiver importado no topo)
        try { await require('../models/Meme').deleteMany({}); } catch(e){}
        try { await require('../models/Mensagem').deleteMany({}); } catch(e){}
        try { await require('../models/Spotted').deleteMany({}); } catch(e){}
        
        res.json({ success: true, message: "SEASON 1 RESETADA." });
    } catch (e) { res.status(500).json({ error: e.message }); }
};