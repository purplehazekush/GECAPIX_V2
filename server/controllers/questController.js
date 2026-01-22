const QuestModel = require('../models/Quest');
const UsuarioModel = require('../models/Usuario');

exports.getQuestsDisponiveis = async (req, res) => {
    try {
        // Por enquanto, retorna uma lista fixa de missões para o MVP
        const quests = [
            { id: 'q1', titulo: 'Primeiro Gole', desc: 'Realize sua primeira compra no bar.', coins: 100, xp: 50, tipo: 'conquista' },
            { id: 'q2', titulo: 'Influenciador', desc: 'Indique 1 amigo para a Arena.', coins: 500, xp: 200, tipo: 'semanal' },
            { id: 'q3', titulo: 'Pérola do Dia', desc: 'Poste um meme no mural.', coins: 50, xp: 30, tipo: 'diaria' }
        ];
        res.json(quests);
    } catch (e) { res.status(500).send(e); }
};