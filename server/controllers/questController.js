// server/controllers/questController.js
const MISSOES_ATIVAS = [
    { id: 'm1', titulo: 'Primeira Pérola', desc: 'Poste seu primeiro meme na Arena', premio: 100, xp: 50 },
    { id: 'm2', titulo: 'Investidor Anjo', desc: 'Impulsione 3 memes de colegas', premio: 150, xp: 80 },
    { id: 'm3', titulo: 'Networking', desc: 'Indique um amigo para a Arena', premio: 500, xp: 200 }
];

exports.getQuests = async (req, res) => {
    try {
        const { email } = req.query;
        const user = await UsuarioModel.findOne({ email });
        const concluidas = user ? user.missoes_concluidas : [];

        const statusQuests = MISSOES_ATIVAS.map(q => ({
            ...q,
            concluida: concluidas.includes(q.id)
        }));

        res.json(statusQuests); // Verifique se isso aqui está retornando o array!
    } catch (e) { res.status(500).json([]); }
};