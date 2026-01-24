const SpottedModel = require('../models/Spotted');
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');

exports.getSpotteds = async (req, res) => {
    try {
        const posts = await SpottedModel.find().sort({ data: -1 }).limit(50);
        res.json(posts);
    } catch (e) { res.status(500).json({ error: "Erro ao buscar spotted" }); }
};

exports.postarSpotted = async (req, res) => {
    try {
        const { email, mensagem, imagem_url } = req.body;
        const user = await UsuarioModel.findOne({ email });
        if(!user) return res.status(404).json({error: "User not found"});

        // Limite diário de XP (mas pode postar mais sem XP se quiser, ou bloqueia?)
        // Vamos bloquear 1 post por dia pra evitar spam, já que é gratuito
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const jaPostou = await SpottedModel.findOne({ autor_id: user._id, data: { $gte: hoje } });
        
        if (jaPostou) return res.status(403).json({ error: "Limite de 1 Spotted por dia." });

        const novoSpotted = await SpottedModel.create({
            autor_id: user._id,
            mensagem,
            imagem_url
        });

        // Dar XP
        await UsuarioModel.updateOne({ email }, { $inc: { xp: TOKEN.XP.SPOTTED_POST } });

        res.json(novoSpotted);
    } catch (e) { res.status(500).json({ error: "Erro ao postar" }); }
};

exports.comentarSpotted = async (req, res) => {
    try {
        const { spottedId, email, texto } = req.body;
        const custo = TOKEN.COSTS.SPOTTED_COMMENT;

        const user = await UsuarioModel.findOne({ email });
        if (user.saldo_coins < custo) return res.status(400).json({ error: "Sem saldo para fofocar." });

        // Cobra o usuário
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_coins: -custo },
            $push: { extrato: { tipo: 'SAIDA', valor: custo, descricao: 'Comentário Spotted', categoria: 'SYSTEM', data: new Date() }}
        });

        // Adiciona Comentário
        const post = await SpottedModel.findById(spottedId);
        post.comentarios.push({
            user_nome: user.nome, // Comentário não é anônimo? "Fulano comentou". Ou quer anônimo também?
            // Geralmente spotted o post é anonimo, os comments não.
            user_avatar: user.avatar_slug,
            texto
        });
        await post.save();

        res.json(post);
    } catch (e) { res.status(500).json({ error: "Erro ao comentar" }); }
};