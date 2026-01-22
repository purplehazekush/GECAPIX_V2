const UsuarioModel = require('../models/Usuario');

// Lista quem mandou comprovante mas ainda não foi validado
exports.getFilaValidacao = async (req, res) => {
    try {
        const pendentes = await UsuarioModel.find({
            comprovante_url: { $exists: true, $ne: '' }, // Tem foto
            validado: { $ne: true } // Não está validado
        }).select('nome email curso comprovante_url classe data_criacao'); // Traz só o necessário

        res.json(pendentes);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar fila" });
    }
};

// Aprova ou Rejeita
exports.moderarUsuario = async (req, res) => {
    try {
        const { email, acao } = req.body; // acao: 'aprovar' ou 'rejeitar'

        if (acao === 'aprovar') {
            await UsuarioModel.findOneAndUpdate({ email }, { validado: true });
        } else {
            // Se rejeitar, limpamos a URL para ele ter que mandar de novo
            await UsuarioModel.findOneAndUpdate({ email }, { 
                validado: false,
                comprovante_url: '' 
            });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erro na moderação" });
    }
};