const mongoose = require('mongoose');

const MensagemSchema = new mongoose.Schema({
    materia: { type: String, required: true },
    texto: String, // Aqui vai o JSON da IA ou o texto do aluno
    
    arquivo_url: String,
    tipo_arquivo: String,
    
    // Identidade
    autor_fake: String, // Nome de exibição (ex: "Mago" ou "Oráculo IA")
    autor_classe: String,
    autor_avatar: String, // <--- ADICIONADO (Para o robô ter ícone)

    // Controle
    autor_real_id: String,
    
    // --- CAMPOS NOVOS PARA A IA ---
    tipo: { type: String, default: 'mensagem' }, // 'mensagem' ou 'resolucao_ia'
    imagem_original: String, // A foto da questão que originou a resposta da IA
    
    data: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Mensagem || mongoose.model('Mensagem', MensagemSchema);