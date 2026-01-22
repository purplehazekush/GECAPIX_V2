const UsuarioModel = require('../models/Usuario');

exports.getRanking = async (req, res) => {
    try {
        // Removendo todos os filtros (status e role) para garantir que TODOS apareçam
        const rankingXP = await UsuarioModel.find({})
            .select('nome email xp nivel saldo_coins')
            .sort({ xp: -1 })
            .limit(50);

        const rankingCoins = await UsuarioModel.find({})
            .select('nome email saldo_coins nivel xp')
            .sort({ saldo_coins: -1 })
            .limit(50);

        res.json({ xp: rankingXP, coins: rankingCoins });
    } catch (error) {
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