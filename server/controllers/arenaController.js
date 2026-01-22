const UsuarioModel = require('../models/Usuario');

exports.getRanking = async (req, res) => {
    try {
        // Buscamos todos os ativos para o ranking ter volume
        // Removi o filtro de 'membro' para que você (Admin) apareça no topo se for o caso
        const rankingXP = await UsuarioModel.find({ status: 'ativo' })
            .select('nome email xp nivel badges saldo_coins')
            .sort({ xp: -1 })
            .limit(50);

        const rankingCoins = await UsuarioModel.find({ status: 'ativo' })
            .select('nome email saldo_coins nivel xp')
            .sort({ saldo_coins: -1 })
            .limit(50);

        res.json({ xp: rankingXP, coins: rankingCoins });
    } catch (error) {
        console.error("Erro ao gerar ranking:", error);
        res.status(500).json({ error: "Erro ao buscar ranking" });
    }
};

exports.getPerfilPublico = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await UsuarioModel.findOne({ 
            $or: [{ _id: id.length === 24 ? id : null }, { codigo_referencia: id.toUpperCase() }] 
        }).select('-__v');

        if (!user) return res.status(404).json({ error: "Membro não encontrado" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar perfil" });
    }
};