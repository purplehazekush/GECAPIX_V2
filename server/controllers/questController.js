const UsuarioModel = require('../models/Usuario');

const MISSOES_ATIVAS = [
    { id: 'm1', titulo: 'Primeira Pérola', desc: 'Poste seu primeiro meme na Arena', premio: 100, xp: 50 },
    { id: 'm2', titulo: 'Investidor Anjo', desc: 'Impulsione um meme de colega', premio: 150, xp: 80 },
    { id: 'm3', titulo: 'Networking', desc: 'Indique um amigo para a Arena', premio: 500, xp: 200 }
];

exports.getQuests = async (req, res) => {
    try {
        const { email } = req.query;
        
        // Busca o usuário
        const user = await UsuarioModel.findOne({ email });
        
        // GARANTIA: Se o user não existe ou não tem o array, usamos um array vazio []
        // Isso evita o erro de .includes() em undefined
        const concluidas = (user && user.missoes_concluidas) ? user.missoes_concluidas : [];

        const statusQuests = MISSOES_ATIVAS.map(q => ({
            ...q,
            concluida: concluidas.includes(q.id)
        }));

        res.json(statusQuests);
    } catch (e) {
        // Log detalhado no servidor para você saber o que houve
        console.error("ERRO CRÍTICO EM QUESTS:", e);
        res.status(500).json({ error: "Erro interno ao processar missões" });
    }
};