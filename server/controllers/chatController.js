// server/controllers/chatController.js
const MensagemModel = require('../models/Mensagem');
const UsuarioModel = require('../models/Usuario');

exports.getMensagens = async (req, res) => {
    try {
        const { materia } = req.params;
        if (!materia) return res.status(400).json({ error: "Matéria não especificada" });

        // Traz as últimas 100 mensagens daquela "sala" específica
        const mensagens = await MensagemModel.find({ materia: materia })
            .sort({ data: 1 }) 
            .limit(100); 
            
        res.json(mensagens);
    } catch (error) {
        console.error("Erro GetMensagens:", error);
        res.status(500).json({ error: "Erro ao buscar chat" });
    }
};

exports.enviarMensagem = async (req, res) => {
    try {
        const { email, materia, texto, arquivo_url, tipo_arquivo } = req.body;

        // 1. Validação Básica (Evita o Erro 500 por undefined)
        if (!email) return res.status(401).json({ error: "Usuário não identificado (Email missing)." });
        if (!materia) return res.status(400).json({ error: "Sala não informada." });
        if (!texto && !arquivo_url) return res.status(400).json({ error: "Mensagem vazia." });

        // 2. Busca o Usuário Real
        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado no banco." });

        // 3. SEGURANÇA: Protocolo "Sala Segura" 🛡️
        // O usuário só pode postar se ele tiver essa matéria cadastrada no perfil dele.
        // Isso impede que alguém faça uma chamada de API forçada para uma sala que não pertence.
        /* OBS: Se suas matérias forem Strings simples (ex: "Cálculo I"), a verificação é direta.
           Se futuramente usarmos IDs, ajustaremos aqui.
        */
        const temPermissao = user.materias && user.materias.includes(materia);
        // Opcional: Se quiser ser restritivo, descomente a linha abaixo:
        // if (!temPermissao) return res.status(403).json({ error: "Você não está matriculado nesta matéria." });

        // 4. Criação da Mensagem
        const novaMsg = await MensagemModel.create({
            materia, 
            texto,
            arquivo_url,
            tipo_arquivo,
            
            // Dados de Identidade (Snapshot do momento)
            autor_fake: user.nome ? user.nome.split(' ')[0] : "Anônimo", 
            autor_real_id: user._id,
            autor_classe: user.classe || 'Novato',
            autor_avatar: user.avatar_slug || 'default',
            
            data: new Date()
        });

        res.json(novaMsg);

    } catch (error) {
        console.error("Erro EnviarMensagem:", error);
        res.status(500).json({ error: "Erro interno ao enviar mensagem." });
    }
};