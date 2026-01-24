const mongoose = require('mongoose');

const LockedBondSchema = new mongoose.Schema({
    owner_id: { type: String, required: true },
    valor_inicial: { type: Number, required: true },
    valor_atual: { type: Number, required: true }, // Vai subindo com o rendimento diário

    data_compra: { type: Date, default: Date.now },
    data_vencimento: { type: Date, required: true },

    status: { type: String, default: 'ATIVO' }, // ATIVO, RESGATADO, QUEBRADO
    apr_contratada: { type: Number, required: true } // Taxa do dia da compra
});

module.exports = mongoose.model('LockedBond', LockedBondSchema);