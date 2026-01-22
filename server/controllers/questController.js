const UsuarioModel = require('../models/Usuario');

const MISSOES_ATIVAS = [
    { id: 'm1', titulo: 'Primeira Pérola', desc: 'Poste seu primeiro meme na Arena', premio: 100, xp: 50 },
    { id: 'm2', titulo: 'Investidor Anjo', desc: 'Impulsione 3 memes de colegas', premio: 150, xp: 80 },
    { id: 'm3', titulo: 'Networking', desc: 'Indique um amigo para a Arena', premio: 500, xp: 200 }
];

exports.getQuests = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.json(MISSOES_ATIVAS.map(q => ({ ...q, concluida: false })));

        const user = await UsuarioModel.findOne({ email });
        
        // Se o usuário não existir no banco ainda, manda as missões como não concluídas
        const concluidas = user?.missoes_concluidas || [];

        const statusQuests = MISSOES_ATIVAS.map(q => ({
            ...q,
            concluida: concluidas.includes(q.id)
        }));

        res.json(statusQuests);
    } catch (e) {
        res.status(500).json({ error: "Erro ao buscar missões" });
    }
};