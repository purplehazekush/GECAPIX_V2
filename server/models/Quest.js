const mongoose = require('mongoose');

const QuestSchema = new mongoose.Schema({
    titulo: String,
    descricao: String,
    recompensa_coins: Number,
    recompensa_xp: Number,
    tipo: { type: String, enum: ['diaria', 'semanal', 'conquista'] },
    chave_logica: String // Ex: 'fazer_pix', 'indicar_amigo'
});

module.exports = mongoose.models.Quest || mongoose.model('Quest', QuestSchema);