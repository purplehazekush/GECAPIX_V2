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

// Adicione no arenaController.js
exports.patchUsuariosSemCodigo = async (req, res) => {
    try {
        const usuarios = await UsuarioModel.find({ codigo_referencia: { $exists: false } });
        let alterados = 0;

        for (let user of usuarios) {
            // O save() vai disparar o hook pre('save') que criamos no Model
            await user.save();
            alterados++;
        }

        res.json({ message: `Sucesso! ${alterados} usuários agora têm código.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.updatePerfil = async (req, res) => {
    try {
        const { email, classe, materias, bio } = req.body;
        
        // Formata as matérias (remove espaços, tudo maiúsculo)
        const materiasFormatadas = materias 
            ? materias.map(m => m.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')) 
            : [];

        // Gera a semente do avatar para garantir que ele seja sempre o mesmo para essa escolha
        const avatar_seed = `${classe}-${email}`; 

        const user = await UsuarioModel.findOneAndUpdate(
            { email },
            { 
                classe, 
                materias: materiasFormatadas, 
                bio,
                avatar_seed
            },
            { new: true }
        );

        res.json(user);
    } catch (error) {
        console.error("Erro update perfil:", error);
        res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
};