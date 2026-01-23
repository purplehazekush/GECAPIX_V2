// server/models/Mensagem.js
const mongoose = require('mongoose');

const MensagemSchema = new mongoose.Schema({
    materia: { type: String, required: true }, // ex: DCC034
    texto: String,
    arquivo_url: String, // Link do PDF ou Imagem
    tipo_arquivo: String, // 'imagem' ou 'documento'
    
    // Identidade Anônima
    autor_fake: String, // Ex: "Mago Sombrio"
    autor_classe: String, // Para mostrarmos o emoji certo (🧙‍♂️)
    
    // Controle (Oculto dos outros usuários)
    autor_real_id: String, 
    data: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Mensagem || mongoose.model('Mensagem', MensagemSchema);