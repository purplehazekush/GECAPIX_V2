const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');

// Lista de definições das missões (Poderia estar no banco, mas aqui é mais rápido p/ o MVP)
const MISSOES_ATIVAS = [
    { id: 'm1', titulo: 'Primeira Pérola', desc: 'Poste seu primeiro meme', premio: 100, xp: 50, chave: 'POSTAR_MEME' },
    { id: 'm2', titulo: 'Investidor Anjo', desc: 'Impulsione 3 memes de colegas', premio: 150, xp: 80, chave: 'VOTAR_MEME' },
    { id: 'm3', titulo: 'Networking', desc: 'Indique um amigo para a Arena', premio: 500, xp: 200, chave: 'INDICAR' }
];

exports.getQuests = async (req, res) => {
    try {
        const { email } = req.query;
        const user = await UsuarioModel.findOne({ email });

        // Mapeia as missões marcando quais o usuário já fez
        const statusQuests = MISSOES_ATIVAS.map(q => ({
            ...q,
            concluida: user.missoes_concluidas.includes(q.id)
        }));

        res.json(statusQuests);
    } catch (e) { res.status(500).json({ error: "Erro ao buscar missões" }); }
};