const MensagemModel = require('../models/Mensagem');
const UsuarioModel = require('../models/Usuario');

exports.getMensagens = async (req, res) => {
    try {
        const { materia } = req.params;
        
        // FILTRO RÍGIDO: Só traz mensagens onde o campo 'materia' é EXATAMENTE igual ao da URL
        const mensagens = await MensagemModel.find({ materia: materia })
            .sort({ data: 1 }) // Mais antigas primeiro (Chat style)
            .limit(100); // Limita às últimas 100 para não pesar
            
        res.json(mensagens);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar chat" });
    }
};

exports.enviarMensagem = async (req, res) => {
    try {
        const { email, materia, texto, arquivo_url, tipo_arquivo } = req.body;
        const user = await UsuarioModel.findOne({ email });

        if (!user) return res.status(404).json({ error: "Usuario nao encontrado" });

        const novaMsg = await MensagemModel.create({
            materia, // <--- Importante: Salvando a matéria correta
            texto,
            arquivo_url,
            tipo_arquivo,
            autor_fake: user.nome.split(' ')[0], // Primeiro nome
            autor_real_id: user._id,
            autor_classe: user.classe || 'Novato', // RPG
            autor_avatar: user.avatar_slug,
            data: new Date()
        });

        res.json(novaMsg);
    } catch (error) {
        res.status(500).json({ error: "Erro ao enviar" });
    }
};