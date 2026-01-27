// server/controllers/datingController.js
const DatingProfile = require('../models/DatingProfile');
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');
const mongoose = require('mongoose');

// 1. OPT-IN (Criação do Perfil)
exports.optIn = async (req, res) => {
    try {
        const { telefone, genero, altura, biotipo, bebe, fuma, festa, bio, fotos, interessado_em } = req.body;
        const user = req.user; // Vem do authMiddleware

        if (!telefone) return res.status(400).json({ error: "Telefone obrigatório." });
        if (fotos.length > 4) return res.status(400).json({ error: "Máximo 4 fotos." });

        // Verifica se já existe
        let profile = await DatingProfile.findOne({ userId: user._id });
        if (profile) return res.status(400).json({ error: "Perfil já existe." });

        profile = await DatingProfile.create({
            userId: user._id,
            email: user.email,
            nome: user.nome,
            curso: user.curso || 'Não informado',
            telefone,
            genero, altura, biotipo, bebe, fuma, festa,
            bio, fotos, interessado_em
        });

        res.json({ success: true, profile });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao criar perfil." });
    }
};

// 2. BUSCAR CANDIDATOS (COM FILTROS)
exports.getCandidates = async (req, res) => {
    try {
        const myProfile = await DatingProfile.findOne({ userId: req.user._id });
        if (!myProfile) return res.status(404).json({ error: "Perfil não encontrado" });

        // Filtros vindos da Query String (?fuma=Sim&altura=Alto...)
        const { altura, biotipo, bebe, fuma, festa } = req.query;

        // Monta a Query do Mongo
        let query = {
            genero: { $in: myProfile.interessado_em }, // Filtro Base (O que eu curto)
            _id: { $nin: [...myProfile.likes_enviados, myProfile._id] }, // Exclui quem já dei like e eu mesmo
            status: 'ATIVO'
        };

        // Aplica filtros opcionais se não forem "TODOS" ou undefined
        if (altura && altura !== 'TODOS') query.altura = altura;
        if (biotipo && biotipo !== 'TODOS') query.biotipo = biotipo;
        if (bebe && bebe !== 'TODOS') query.bebe = bebe;
        if (fuma && fuma !== 'TODOS') query.fuma = fuma;
        if (festa && festa !== 'TODOS') query.festa = festa;

        const candidates = await DatingProfile.find(query)
            .limit(20) // Aumentei um pouco o limit
            .select('-telefone -likes_recebidos -likes_enviados -matches -correio');

        res.json(candidates);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao buscar." });
    }
};

// 3. DAR LIKE (Normal)
exports.sendLike = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { targetProfileId } = req.body;
        const user = await UsuarioModel.findById(req.user._id).session(session);
        const myProfile = await DatingProfile.findOne({ userId: user._id }).session(session);
        const targetProfile = await DatingProfile.findById(targetProfileId).session(session);

        if (!targetProfile) throw new Error("Usuário não encontrado.");
        
        // Cobrança
        if (user.saldo_coins < TOKEN.DATING.LIKE_COST) throw new Error("Saldo insuficiente.");
        
        user.saldo_coins -= TOKEN.DATING.LIKE_COST;
        user.xp += TOKEN.DATING.LIKE_XP;
        
        // Lógica do Like
        myProfile.likes_enviados.push(targetProfile._id);
        targetProfile.likes_recebidos.push(myProfile._id);

        // CHECK MATCH
        // Se o alvo já me deu like (está na minha lista de likes_recebidos do banco? não, verificamos se EU estou na lista de enviados DELE)
        // Mais fácil: Verificar se o alvo já deu like em mim.
        const isMatch = targetProfile.likes_enviados.includes(myProfile._id.toString());

        if (isMatch) {
            // REGISTRA O MATCH PARA OS DOIS
            myProfile.matches.push(targetProfile._id);
            targetProfile.matches.push(myProfile._id);

            // ENVIA EMAIL SISTEMA PARA MIM
            myProfile.correio.push({
                tipo: 'MATCH',
                remetente_id: targetProfile._id,
                remetente_nome: targetProfile.nome,
                remetente_foto: targetProfile.fotos[0],
                mensagem: `Deu Match! O telefone de ${targetProfile.nome} é: ${targetProfile.telefone}`,
                telefone_revelado: targetProfile.telefone
            });

            // ENVIA EMAIL SISTEMA PARA O CRUSH
            targetProfile.correio.push({
                tipo: 'MATCH',
                remetente_id: myProfile._id,
                remetente_nome: myProfile.nome,
                remetente_foto: myProfile.fotos[0],
                mensagem: `Deu Match! O telefone de ${myProfile.nome} é: ${myProfile.telefone}`,
                telefone_revelado: myProfile.telefone
            });
        }

        await user.save({ session });
        await myProfile.save({ session });
        await targetProfile.save({ session });
        await session.commitTransaction();

        res.json({ success: true, match: isMatch });

    } catch (e) {
        await session.abortTransaction();
        res.status(400).json({ error: e.message });
    } finally {
        session.endSession();
    }
};

// 4. SUPER LIKE (Pago e Poderoso)
exports.sendSuperLike = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { targetProfileId } = req.body;
        const user = await UsuarioModel.findById(req.user._id).session(session);
        const myProfile = await DatingProfile.findOne({ userId: user._id }).session(session);
        const targetProfile = await DatingProfile.findById(targetProfileId).session(session);

        const COST_COINS = TOKEN.DATING.SUPERLIKE_COST_COINS;
        const COST_GLUE = TOKEN.DATING.SUPERLIKE_COST_GLUE;

        if (user.saldo_coins < COST_COINS || user.saldo_glue < COST_GLUE) {
            throw new Error("Saldo insuficiente (Requer Coins + Glue).");
        }

        // 1. Debita do Usuário
        user.saldo_coins -= COST_COINS;
        user.saldo_glue -= COST_GLUE;

        // 2. Distribuição Econômica
        const recipientShare = Math.floor(COST_COINS * TOKEN.DATING.SUPERLIKE_DISTRIBUTION.RECIPIENT);
        const burnShare = Math.floor(COST_COINS * TOKEN.DATING.SUPERLIKE_DISTRIBUTION.BURN);
        const feesShare = COST_COINS - recipientShare - burnShare;

        // Credita o Crush (Incentivo financeiro para ser desejado!)
        await UsuarioModel.updateOne(
            { _id: targetProfile.userId }, 
            { $inc: { saldo_coins: recipientShare }, 
              $push: { extrato: { tipo: 'ENTRADA', valor: recipientShare, descricao: 'Recebeu Super Like', categoria: 'GAME' } } 
            }, 
            { session }
        );

        // Burn & Fees
        await UsuarioModel.updateOne({ email: TOKEN.WALLETS.BURN }, { $inc: { saldo_coins: burnShare } }, { session });
        await UsuarioModel.updateOne({ email: TOKEN.WALLETS.FEES }, { $inc: { saldo_coins: feesShare } }, { session });

        // Update System State (opcional, mas bom pra stats)
        const SystemState = require('../models/SystemState');
        await SystemState.updateOne({ season_id: 2 }, { $inc: { total_burned: burnShare } }, { session });

        // 3. Ação do Super Like (Fura fila e entrega telefone)
        // O Super Like NÃO gera match automático nos apps reais, ele destaca.
        // MAS na sua regra: "vai direto pro email".
        
        // 3. Ação do Super Like
        targetProfile.correio.push({
            tipo: 'SUPERLIKE',
            remetente_id: myProfile._id,
            remetente_nome: myProfile.nome,
            remetente_foto: myProfile.fotos[0],
            mensagem: `🔥 SUPER LIKE! ${myProfile.nome} gostou muito de você. Telefone: ${myProfile.telefone}`,
            telefone_revelado: myProfile.telefone
        });

        // 🔥 CORREÇÃO: Só adiciona aos arrays se AINDA NÃO estiver lá (caso seja um Upgrade)
        if (!myProfile.likes_enviados.includes(targetProfile._id)) {
            myProfile.likes_enviados.push(targetProfile._id);
        }
        if (!targetProfile.likes_recebidos.includes(myProfile._id)) {
            targetProfile.likes_recebidos.push(myProfile._id);
        }

        await user.save({ session });
        await myProfile.save({ session });
        await targetProfile.save({ session });
        await session.commitTransaction();

        res.json({ success: true, message: "Super Like enviado!" });

    } catch (e) {
        await session.abortTransaction();
        res.status(400).json({ error: e.message });
    } finally {
        session.endSession();
    }
};

// 5. LER CORREIO
exports.getMailbox = async (req, res) => {
    try {
        const profile = await DatingProfile.findOne({ userId: req.user._id });
        if (!profile) return res.status(404).json({ error: "Perfil off" });
        res.json(profile.correio.reverse()); // Mais recentes primeiro
    } catch (e) { res.status(500).json({ error: "Erro" }); }
};


// 6. VER QUEM EU JÁ DEI LIKE (Histórico)
exports.getSentLikes = async (req, res) => {
    try {
        const myProfile = await DatingProfile.findOne({ userId: req.user._id });
        if (!myProfile) return res.status(404).json({ error: "Perfil off" });

        // Busca os perfis que estão no array likes_enviados
        const sentLikes = await DatingProfile.find({
            _id: { $in: myProfile.likes_enviados }
        }).select('nome curso fotos genero'); // Traz o básico pra mostrar no grid

        res.json(sentLikes);
    } catch (e) {
        res.status(500).json({ error: "Erro ao buscar histórico." });
    }
};