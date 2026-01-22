const UsuarioModel = require('../models/Usuario');

exports.getRanking = async (req, res) => {
    try {
        // Removendo todos os filtros (status e role) para garantir que TODOS apareçam
        const rankingXP = await UsuarioModel.find({})
            .select('nome email xp nivel saldo_coins')
            .sort({ xp: -1 })
            .limit(50);

        const rankingCoins = await UsuarioModel.find({})
            .select('nome email saldo_coins nivel xp')
            .sort({ saldo_coins: -1 })
            .limit(50);

        res.json({ xp: rankingXP, coins: rankingCoins });
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar ranking" });
    }
};

exports.getPerfilPublico = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await UsuarioModel.findOne({ 
            $or: [{ _id: id.length === 24 ? id : null }, { codigo_referencia: id.toUpperCase() }] 
        }).select('-__v');

        if (!user) return res.status(404).json({ error: "Membro não encontrado" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar perfil" });
    }
};

// Adicione no arenaController.js
exports.patchUsuariosSemCodigo = async (req, res) => {
    try {
        const usuarios = await UsuarioModel.find({ codigo_referencia: { $exists: false } });
        let alterados = 0;

        for (let user of usuarios) {
            // O save() vai disparar o hook pre('save') que criamos no Model
            await user.save();
            alterados++;
        }

        res.json({ message: `Sucesso! ${alterados} usuários agora têm código.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.updatePerfil = async (req, res) => {
    try {
        console.log("--> RECEBIDO NO BACKEND:", req.body); // LOG 1

        const { 
            email, classe, materias, bio, 
            chave_pix, curso, status_profissional, equipe_competicao, comprovante_url 
        } = req.body;
        
        // Tratamento de Matérias
        let materiasFormatadas = [];
        if (Array.isArray(materias)) {
            materiasFormatadas = materias.map(m => m.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
        } else if (typeof materias === 'string') {
            materiasFormatadas = materias.split(',').map(m => m.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
        }

        console.log("--> MATÉRIAS FORMATADAS:", materiasFormatadas); // LOG 2

        const updateData = {
            classe,
            materias: materiasFormatadas, // Tem que ser um Array de Strings
            bio,
            chave_pix,
            curso,
            status_profissional,
            equipe_competicao
        };

        if (comprovante_url && comprovante_url.length > 5) {
            updateData.comprovante_url = comprovante_url;
        }

        //if (classe) updateData.avatar_seed = `${classe}-${email}`;

        const user = await UsuarioModel.findOneAndUpdate(
            { email },
            { $set: updateData }, // Usando $set para ser explícito
            { new: true } 
        );

        console.log("--> USUÁRIO SALVO:", user.materias); // LOG 3

        res.json(user);
    } catch (error) {
        console.error("Erro CRÍTICO no update perfil:", error);
        res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
};


// ... (seus outros códigos de ranking, perfil, etc)

exports.transferirCoins = async (req, res) => {
    try {
        const { remetenteEmail, destinatarioChave, valor } = req.body;
        
        // 1. Validações Básicas
        if (!remetenteEmail || !destinatarioChave || !valor) {
            return res.status(400).json({ error: "Dados incompletos." });
        }
        
        const valorNumerico = parseInt(valor);
        if (valorNumerico <= 0) {
            return res.status(400).json({ error: "O valor deve ser positivo." });
        }

        // 2. Busca o Remetente
        const remetente = await UsuarioModel.findOne({ email: remetenteEmail });
        if (!remetente) return res.status(404).json({ error: "Remetente não encontrado." });

        if (remetente.saldo_coins < valorNumerico) {
            return res.status(400).json({ error: "Saldo insuficiente." });
        }

        // 3. Busca o Destinatário (Pode ser Email ou Código de Referência/Convite)
        // Tentamos achar por email OU pelo código de convite
        const destinatario = await UsuarioModel.findOne({
            $or: [
                { email: destinatarioChave },
                { codigo_referencia: destinatarioChave.toUpperCase() }
            ]
        });

        if (!destinatario) return res.status(404).json({ error: "Destinatário não encontrado." });

        if (remetente.email === destinatario.email) {
            return res.status(400).json({ error: "Você não pode transferir para si mesmo." });
        }

        // 4. Executa a Transferência (Atômica)
        // Tira de um
        await UsuarioModel.updateOne(
            { _id: remetente._id }, 
            { $inc: { saldo_coins: -valorNumerico } }
        );
        
        // Põe no outro
        await UsuarioModel.updateOne(
            { _id: destinatario._id }, 
            { $inc: { saldo_coins: valorNumerico } }
        );

        res.json({ success: true, novoSaldo: remetente.saldo_coins - valorNumerico });

    } catch (error) {
        console.error("Erro na transferência:", error);
        res.status(500).json({ error: "Erro ao processar transferência." });
    }
};