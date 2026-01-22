const MemeModel = require('../models/Meme');
const UsuarioModel = require('../models/Usuario');

exports.getMemes = async (req, res) => {
    try {
        // Ordena por investimento (Tendências) ou Data (Recentes)
        const memes = await MemeModel.find().sort({ investimento_total: -1, data: -1 }).limit(30);
        res.json(memes);
    } catch (e) { res.status(500).json({ error: "Erro ao buscar memes" }); }
};

exports.uploadMeme = async (req, res) => {
    try {
        const { email, nome, legenda, imagem } = req.body;
        const novoMeme = await MemeModel.create({
            autor_email: email,
            autor_nome: nome,
            legenda,
            imagem_url: imagem
        });
        res.json(novoMeme);
    } catch (e) { res.status(500).json({ error: "Erro no upload" }); }
};

exports.votarMeme = async (req, res) => {
    try {
        const { memeId, usuario_email, quantia } = req.body;
        const valor = parseInt(quantia);

        const usuario = await UsuarioModel.findOne({ email: usuario_email });
        if (usuario.saldo_coins < valor) return res.status(400).json({ error: "Saldo insuficiente" });

        // 1. Deduz do usuário
        usuario.saldo_coins -= valor;
        await usuario.save();

        // 2. Adiciona ao meme com BÔNUS DE INCEPTION (1.2x)
        const valorComBonus = Math.floor(valor * 1.2);
        const meme = await MemeModel.findByIdAndUpdate(
            memeId, 
            { $inc: { investimento_total: valorComBonus, votos_count: 1 } },
            { new: true }
        );

        res.json({ success: true, novo_saldo: usuario.saldo_coins, meme });
    } catch (e) { res.status(500).json({ error: "Erro ao votar" }); }
};