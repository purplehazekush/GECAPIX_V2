const SpottedModel = require('../models/Spotted');
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');

// ... imports

exports.getSpotteds = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const periodo = req.query.periodo || 'all'; // 'today', 'week', 'month', 'all'
        const sort = req.query.sort || 'newest'; // 'newest', 'hot'

        let query = {};

        // 1. Filtro de Data
        const now = new Date();
        if (periodo === 'today') {
            const startOfDay = new Date(now.setHours(0,0,0,0));
            query.data = { $gte: startOfDay };
        } else if (periodo === 'week') {
            const startOfWeek = new Date(now.setDate(now.getDate() - 7));
            query.data = { $gte: startOfWeek };
        } else if (periodo === 'month') {
            const startOfMonth = new Date(now.setMonth(now.getMonth() - 1));
            query.data = { $gte: startOfMonth };
        }

        // 2. Ordenação
        let sortOption = { data: -1 }; // Padrão: Mais novos primeiro
        if (sort === 'hot') {
            // Ordena pelo tamanho do array de comentários (gambiarra performática no Mongo)
            // Para produção massiva, ideal seria ter um campo contador 'comentarios_count',
            // mas para MVP isso funciona:
            sortOption = { "comentarios": -1, data: -1 }; 
        }

        // 3. Busca Paginada
        const posts = await SpottedModel.find(query)
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(limit);

        // Retorna também se tem mais páginas para o botão "Load More" sumir se acabar
        const total = await SpottedModel.countDocuments(query);
        const hasMore = (page * limit) < total;

        res.json({ posts, hasMore, total });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Erro ao buscar spotteds" }); 
    }
};

// ... restante das funções (postar, comentar) mantém igual

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