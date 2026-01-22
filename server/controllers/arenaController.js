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
        console.log("--> RECEBIDO NO BACKEND:", req.body); // LOG 1

        const { 
            email, classe, materias, bio, 
            chave_pix, curso, status_profissional, equipe_competicao, comprovante_url 
        } = req.body;
        
        // Tratamento de Matérias
        let materiasFormatadas = [];
        if (Array.isArray(materias)) {
            materiasFormatadas = materias.map(m => m.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
        } else if (typeof materias === 'string') {
            materiasFormatadas = materias.split(',').map(m => m.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
        }

        console.log("--> MATÉRIAS FORMATADAS:", materiasFormatadas); // LOG 2

        const updateData = {
            classe,
            materias: materiasFormatadas, // Tem que ser um Array de Strings
            bio,
            chave_pix,
            curso,
            status_profissional,
            equipe_competicao
        };

        if (comprovante_url && comprovante_url.length > 5) {
            updateData.comprovante_url = comprovante_url;
        }

        if (classe) updateData.avatar_seed = `${classe}-${email}`;

        const user = await UsuarioModel.findOneAndUpdate(
            { email },
            { $set: updateData }, // Usando $set para ser explícito
            { new: true } 
        );

        console.log("--> USUÁRIO SALVO:", user.materias); // LOG 3

        res.json(user);
    } catch (error) {
        console.error("Erro CRÍTICO no update perfil:", error);
        res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
};