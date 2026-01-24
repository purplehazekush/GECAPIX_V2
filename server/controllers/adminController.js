// server/controllers/adminController.js
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

// ... (outras funções)

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