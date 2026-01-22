const MensagemModel = require('../models/Mensagem');
const UsuarioModel = require('../models/Usuario');

// Gerador de Nicks Aleatórios
const SUFIXOS = ["Sombrio", "Místico", "Supremo", "Cansado", "do Café", "da Noite", "Vingador"];

exports.getMensagens = async (req, res) => {
    try {
        const { materia } = req.params;
        // Pega as últimas 50 mensagens dessa matéria
        const msgs = await MensagemModel.find({ materia: materia.toUpperCase() })
            .sort({ data: 1 }) // Mais antigas primeiro (ordem de chat)
            .limit(50);
        res.json(msgs);
    } catch (e) { res.status(500).json({ error: "Erro no chat" }); }
};

exports.enviarMensagem = async (req, res) => {
    try {
        const { email, materia, texto, arquivo_url, tipo_arquivo } = req.body;
        
        // Busca dados do usuário para gerar o Fake Name
        const user = await UsuarioModel.findOne({ email });
        
        // Gera identidade: "Classe + Sufixo + 4 digitos do ID"
        // Ex: "Mago Cansado #9281"
        const randomSufixo = SUFIXOS[Math.floor(Math.random() * SUFIXOS.length)];
        const idHash = user._id.toString().slice(-4);
        const nick = `${user.classe || 'Novato'} ${randomSufixo} #${idHash}`;

        const novaMsg = await MensagemModel.create({
            materia: materia.toUpperCase(),
            texto,
            arquivo_url,
            tipo_arquivo,
            autor_fake: nick,
            autor_classe: user.classe || 'Novato',
            autor_real_id: user._id
        });

        res.json(novaMsg);
    } catch (e) { res.status(500).json({ error: "Erro ao enviar" }); }
};