// server/controllers/arenaController.js
const UsuarioModel = require('../models/Usuario');
const RULES = require('../config/gameRules'); // <--- IMPORT DA CONSTITUIÇÃO

// --- RANKING ---
exports.getRanking = async (req, res) => {
    try {
        const rankingXP = await UsuarioModel.find({})
            .select('nome email xp nivel saldo_coins avatar_slug classe')
            .sort({ xp: -1 }).limit(50);

        const rankingCoins = await UsuarioModel.find({})
            .select('nome email saldo_coins nivel xp avatar_slug classe')
            .sort({ saldo_coins: -1 }).limit(50);

        res.json({ xp: rankingXP, coins: rankingCoins });
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar ranking" });
    }
};

// --- PERFIL PÚBLICO ---
exports.getPerfilPublico = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await UsuarioModel.findOne({ 
            $or: [{ _id: id.length === 24 ? id : null }, { codigo_referencia: id.toUpperCase() }] 
        }).select('-__v -extrato'); 

        if (!user) return res.status(404).json({ error: "Membro não encontrado" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar perfil" });
    }
};

exports.transferirCoins = async (req, res) => {
    try {
        const { email_remetente, email_destinatario, valor } = req.body;
        const quantia = parseInt(valor);

        if (quantia <= 0) return res.status(400).json({ error: "Valor inválido" });
        if (email_remetente === email_destinatario) return res.status(400).json({ error: "Não pode transferir para si mesmo" });

        const remetente = await UsuarioModel.findOne({ email: email_remetente });
        const destinatario = await UsuarioModel.findOne({ email: email_destinatario });

        if (!destinatario) return res.status(404).json({ error: "Destinatário não encontrado" });
        if (remetente.saldo_coins < quantia) return res.status(400).json({ error: "Saldo insuficiente" });

        // 1. Tira do Remetente (SINAL NEGATIVO)
        await UsuarioModel.updateOne({ email: email_remetente }, {
            $inc: { saldo_coins: -quantia },
            $push: { extrato: { tipo: 'SAIDA', valor: quantia, descricao: `Envio para ${destinatario.nome}`, categoria: 'TRANSFER', data: new Date() } }
        });

        // 2. Dá pro Destinatário (SINAL POSITIVO +)
        await UsuarioModel.updateOne({ email: email_destinatario }, {
            $inc: { saldo_coins: quantia }, // <--- AQUI ESTAVA O ERRO PROVAVELMENTE
            $push: { extrato: { tipo: 'ENTRADA', valor: quantia, descricao: `Recebido de ${remetente.nome}`, categoria: 'TRANSFER', data: new Date() } }
        });

        res.json({ success: true, message: "Transferência realizada!" });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro na transferência" });
    }
};


// --- UPDATE PERFIL (VERSÃO FINAL COM AVATAR E XP CORRIGIDO) ---
exports.updatePerfil = async (req, res) => {
    try {
        const { 
            email, nome, classe, materias, bio, 
            chave_pix, curso, status_profissional, equipe_competicao, comprovante_url,
            avatar_slug 
        } = req.body;
        
        console.log("--> UPDATE PERFIL:", req.body); // Log para debug

        // Busca usuário atual
        const currentUser = await UsuarioModel.findOne({ email });
        if (!currentUser) return res.status(404).json({ error: "User not found" });

        // 1. RECALCULA NÍVEL (Corrige bug do XP travado)
        // Usa as regras do gameRules.js para definir o nível baseado no XP total
        const levelData = RULES.getLevelData(currentUser.xp);
        
        let materiasFormatadas = [];
        if (Array.isArray(materias)) {
            materiasFormatadas = materias.map(m => m.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
        }

        const updateData = {
            nome: nome || currentUser.nome, // Atualiza Nickname
            classe,
            materias: materiasFormatadas,
            bio,
            chave_pix,
            curso,
            status_profissional,
            equipe_competicao,
            nivel: levelData.level // Salva o nível correto
        };

        // Salva Avatar Novo se vier na requisição
        if (avatar_slug) {
            updateData.avatar_slug = avatar_slug;
        }
        
        if (comprovante_url) updateData.comprovante_url = comprovante_url;

        const user = await UsuarioModel.findOneAndUpdate(
            { email },
            { $set: updateData },
            { new: true }
        );

        res.json(user);
    } catch (error) {
        console.error("Erro update perfil:", error);
        res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
};