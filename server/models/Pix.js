const mongoose = require('mongoose');

const PixSchema = new mongoose.Schema({
    raw_body: Object,
    mensagem_texto: String,
    valor_extraido: String,
    remetente_extraido: String,
    item_vendido: { type: String, default: "" },
    quantidade: { type: Number, default: 1 },
    vendedor_email: String,
    vendedor_nome: String, 
    tipo: { type: String, default: 'PIX' }, // 'PIX' ou 'DINHEIRO'
    data: { type: Date, default: Date.now },
    historico_edicoes: [{
        alterado_por: String,
        valor_antigo: String,
        item_antigo: String,
        data_alteracao: { type: Date, default: Date.now }
    }],
});

module.exports = mongoose.models.Pix || mongoose.model('Pix', PixSchema);