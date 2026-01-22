const MemeModel = require('../models/Meme');
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');

exports.getMemes = async (req, res) => {
    try {
        const memes = await MemeModel.find().sort({ data: -1 }).limit(20);
        res.json(memes);
    } catch (e) { res.status(500).json({ error: "Erro ao buscar memes" }); }
};

exports.postMeme = async (req, res) => {
    try {
        const { email, nome, legenda, imagem_url } = req.body;
        
        const novoMeme = await MemeModel.create({
            autor_email: email,
            autor_nome: nome,
            legenda,
            imagem_url
        });

        // Ganha XP por postar (Tokenomics)
        await UsuarioModel.findOneAndUpdate(
            { email }, 
            { $inc: { xp: TOKEN.XP.MEME_POSTADO } }
        );

        res.json(novoMeme);
    } catch (e) { res.status(500).json({ error: "Erro ao postar" }); }
};

exports.votarMeme = async (req, res) => {
    try {
        const { memeId, email_eleitor, quantia } = req.body;
        const valor = parseInt(quantia);

        const eleitor = await UsuarioModel.findOne({ email: email_eleitor });
        if (eleitor.saldo_coins < valor) return res.status(400).json({ error: "Saldo insuficiente" });

        // Soma Positiva: 1.2x de retorno para o autor do meme
        const bonusAutor = Math.floor(valor * TOKEN.INCEPTION.MULTIPLIER_MEME);
        
        const meme = await MemeModel.findById(memeId);
        
        // Deduz do eleitor e adiciona investimento ao meme
        eleitor.saldo_coins -= valor;
        await eleitor.save();

        meme.investimento_total += valor;
        meme.votos_count += 1;
        await meme.save();

        // Transfere o valor investido para o autor (Circulação de moeda)
        await UsuarioModel.findOneAndUpdate(
            { email: meme.autor_email },
            { $inc: { saldo_coins: bonusAutor } }
        );

        res.json({ success: true, novo_saldo: eleitor.saldo_coins });
    } catch (e) { res.status(500).json({ error: "Erro ao votar" }); }
};