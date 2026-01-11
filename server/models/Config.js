const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
    chave: { type: String, unique: true }, // Ex: 'sistema_aberto'
    valor: Boolean
});

module.exports = mongoose.model('Config', ConfigSchema);