const SpottedModel = require('../models/Spotted');
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');

// 1. GET SPOTTEDS (Filtros e Paginação)
exports.getSpotteds = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const periodo = req.query.periodo || 'all'; // 'today', 'week', 'month', 'all'
        const sort = req.query.sort || 'newest'; // 'newest', 'hot'

        let query = {};

        // Filtro de Data
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

        // Ordenação
        let sortOption = { data: -1 }; // Padrão: Mais novos
        if (sort === 'hot') {
            // Ordena por quantidade de comentários (aproximado)
            sortOption = { "comentarios": -1, data: -1 }; 
        }

        const posts = await SpottedModel.find(query)
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await SpottedModel.countDocuments(query);
        const hasMore = (page * limit) < total;

        res.json({ posts, hasMore, total });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Erro ao buscar spotteds" }); 
    }
};

// 2. POSTAR (Com Limite Diário e Custo)
exports.postarSpotted = async (req, res) => {
    try {
        const { email, mensagem, imagem_url } = req.body;
        const user = await UsuarioModel.findOne({ email });
        
        if(!user) return res.status(404).json({error: "User not found"});

        // Limite Diário (1 grátis/dia ou pago? Aqui deixamos 1 por dia)
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const jaPostou = await SpottedModel.findOne({ autor_id: user._id, data: { $gte: hoje } });
        
        if (jaPostou) return res.status(403).json({ error: "Limite diário atingido! Volte amanhã." });

        // Salvar
        const novoSpotted = await SpottedModel.create({
            autor_id: user._id,
            mensagem,
            imagem_url, // <--- Recebe do Front (Cloudinary)
            data: new Date(),
            likes: 0,
            comentarios: []
        });

        // Dar XP
        await UsuarioModel.updateOne({ email }, { $inc: { xp: TOKEN.XP.SPOTTED_POST || 30 } });

        res.json(novoSpotted);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Erro ao postar" }); 
    }
};

// 3. COMENTAR (Pago)
exports.comentarSpotted = async (req, res) => {
    try {
        const { spottedId, email, texto } = req.body;
        const custo = TOKEN.COSTS.SPOTTED_COMMENT || 5;

        const user = await UsuarioModel.findOne({ email });
        if (user.saldo_coins < custo) return res.status(400).json({ error: "Sem saldo para fofocar." });

        // Cobra
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_coins: -custo },
            $push: { extrato: { tipo: 'SAIDA', valor: custo, descricao: 'Comentário Spotted', categoria: 'SOCIAL', data: new Date() }}
        });

        // Adiciona Comentário (Não anônimo no comentário)
        const post = await SpottedModel.findById(spottedId);
        if (!post) return res.status(404).json({ error: "Post sumiu" });

        post.comentarios.push({
            user_nome: user.nome.split(' ')[0], 
            user_avatar: user.avatar_slug,
            texto,
            data: new Date()
        });
        await post.save();

        res.json(post);
    } catch (e) { res.status(500).json({ error: "Erro ao comentar" }); }
};