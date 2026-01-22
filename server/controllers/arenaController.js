const UsuarioModel = require('../models/Usuario');

// --- 1. BUSCAR RANKING (XP e COINS) ---
exports.getRanking = async (req, res) => {
    try {
        // Top 50 por XP (Patente)
        const rankingXP = await UsuarioModel.find({ status: 'ativo', role: { $ne: 'admin' } }) // Opcional: esconder admins?
            .select('nome email xp nivel badges')
            .sort({ xp: -1 })
            .limit(50);

        // Top 50 por Coins (Riqueza)
        const rankingCoins = await UsuarioModel.find({ status: 'ativo', role: { $ne: 'admin' } })
            .select('nome email saldo_coins nivel')
            .sort({ saldo_coins: -1 })
            .limit(50);

        res.json({ xp: rankingXP, coins: rankingCoins });
    } catch (error) {
        console.error("Erro ranking:", error);
        res.status(500).json({ error: "Erro ao buscar ranking" });
    }
};

// --- 2. PERFIL PÚBLICO (Para ver detalhes de outro usuário) ---
exports.getPerfilPublico = async (req, res) => {
    try {
        const { id } = req.params;
        // Busca pelo ID ou pelo Código de Referência (para ficar bonito na URL)
        const user = await UsuarioModel.findOne({ 
            $or: [{ _id: id }, { codigo_referencia: id }] 
        }).select('-senha -__v'); // Esconde campos sensíveis se existissem

        if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar perfil" });
    }
};