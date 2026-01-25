const mongoose = require('mongoose');

const MensagemSchema = new mongoose.Schema({
    materia: { type: String, required: true },
    texto: String, 
    
    // Arquivos (Upload do Aluno)
    arquivo_url: String,
    tipo_arquivo: String, // 'imagem', 'documento'
    
    // Identidade
    autor_fake: String, 
    autor_classe: String,
    autor_avatar: String, 
    autor_real_id: String,
    
    // --- CAMPOS DA IA ---
    tipo: { type: String, default: 'mensagem' }, // 'mensagem', 'resolucao_ia'
    
    // Use 'Mixed' para salvar JSON arbitrário sem esquema fixo
    dados_ia: mongoose.Schema.Types.Mixed, 
    
    imagem_original: String, // Foto da pergunta
    
    data: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Mensagem || mongoose.model('Mensagem', MensagemSchema);