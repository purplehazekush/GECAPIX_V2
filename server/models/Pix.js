const mongoose = require('mongoose');

const PixSchema = new mongoose.Schema({
    raw_body: Object,      // O JSON bruto que vem do banco
    mensagem_texto: String, // O texto da notificação
    
    // Dados extraídos via Regex
    valor_extraido: String,
    remetente_extraido: String,
    
    // Dados de Gestão (O que vamos editar no Front)
    item_vendido: { type: String, default: "" },
    quantidade: { type: Number, default: 1 },
    vendedor_email: String, // Quem marcou a venda
    
    // Auditoria
    historico_edicoes: [{
        alterado_por: String,
        valor_antigo: String,
        item_antigo: String,
        data_alteracao: { type: Date, default: Date.now }
    }],
    
    data: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Pix', PixSchema);