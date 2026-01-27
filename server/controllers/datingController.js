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

// 3. DAR LIKE (COM RECOMPENSA DE MATCH)
exports.sendLike = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { targetProfileId } = req.body;
        
        // Carrega dados
        const user = await UsuarioModel.findById(req.user._id).session(session);
        const myProfile = await DatingProfile.findOne({ userId: user._id }).session(session);
        const targetProfile = await DatingProfile.findById(targetProfileId).session(session);

        if (!targetProfile) throw new Error("Usuário não encontrado.");
        
        // Verifica se já deu like antes (evitar cobrança dupla e bug)
        if (myProfile.likes_enviados.includes(targetProfileId)) {
            throw new Error("Você já curtiu essa pessoa.");
        }

        // Cobrança do Like (Custo)
        if (user.saldo_coins < TOKEN.DATING.LIKE_COST) throw new Error("Saldo insuficiente.");
        
        // 1. Aplica Custo e XP do Like
        user.saldo_coins -= TOKEN.DATING.LIKE_COST;
        user.xp += TOKEN.DATING.LIKE_XP_REWARD || 10;
        
        // 2. Registra o Like
        myProfile.likes_enviados.push(targetProfile._id);
        targetProfile.likes_recebidos.push(myProfile._id);

        // 3. CHECK MATCH (A Mágica)
        // Se eu estou na lista de likes enviados DELE, é match.
        const isMatch = targetProfile.likes_enviados.includes(myProfile._id.toString());

        if (isMatch) {
            // --- A. Registra Match nos Arrays ---
            myProfile.matches.push(targetProfile._id);
            targetProfile.matches.push(myProfile._id);

            // --- B. Chuva de Coins (Recompensa) ---
            const MATCH_BONUS = 250;
            
            // Paga eu
            user.saldo_coins += MATCH_BONUS;
            user.extrato.push({ tipo: 'ENTRADA', valor: MATCH_BONUS, descricao: `Match com ${targetProfile.nome}!`, categoria: 'GAME', data: new Date() });

            // Paga o Crush (Update direto no Usuario model dele)
            await UsuarioModel.updateOne(
                { _id: targetProfile.userId },
                { 
                    $inc: { saldo_coins: MATCH_BONUS },
                    $push: { extrato: { tipo: 'ENTRADA', valor: MATCH_BONUS, descricao: `Match com ${myProfile.nome}!`, categoria: 'GAME', data: new Date() } }
                },
                { session }
            );

            // --- C. Notificações (Correio) ---
            myProfile.correio.push({
                tipo: 'MATCH',
                remetente_id: targetProfile._id,
                remetente_nome: targetProfile.nome,
                remetente_foto: targetProfile.fotos[0],
                mensagem: `❤️ DEU MATCH! Vocês ganharam ${MATCH_BONUS} GC cada! Telefone: ${targetProfile.telefone}`,
                telefone_revelado: targetProfile.telefone
            });

            targetProfile.correio.push({
                tipo: 'MATCH',
                remetente_id: myProfile._id,
                remetente_nome: myProfile.nome,
                remetente_foto: myProfile.fotos[0],
                mensagem: `❤️ DEU MATCH! Vocês ganharam ${MATCH_BONUS} GC cada! Telefone: ${myProfile.telefone}`,
                telefone_revelado: myProfile.telefone
            });
        }

        await user.save({ session });
        await myProfile.save({ session });
        await targetProfile.save({ session });
        
        await session.commitTransaction();
        res.json({ success: true, match: isMatch, coins_reward: isMatch ? 250 : 0 });

    } catch (e) {
        await session.abortTransaction();
        console.error("Erro Like:", e); // Log para debug
        res.status(400).json({ error: e.message });
    } finally {
        session.endSession();
    }
};

// 4. SUPER LIKE (Correção do Histórico)
exports.sendSuperLike = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { targetProfileId } = req.body;
        // ... (carregamento dos models igual ao anterior) ...
        const user = await UsuarioModel.findById(req.user._id).session(session);
        const myProfile = await DatingProfile.findOne({ userId: user._id }).session(session);
        const targetProfile = await DatingProfile.findById(targetProfileId).session(session);

        // ... (verificações de saldo iguais ao anterior) ...
        const COST_COINS = TOKEN.DATING.SUPERLIKE_COST_COINS;
        const COST_GLUE = TOKEN.DATING.SUPERLIKE_COST_GLUE;

        if (user.saldo_coins < COST_COINS || user.saldo_glue < COST_GLUE) {
            throw new Error("Saldo insuficiente (Requer Coins + Glue).");
        }

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

        // 2. Ação do Super Like
        targetProfile.correio.push({
            tipo: 'SUPERLIKE',
            remetente_id: myProfile._id,
            remetente_nome: myProfile.nome,
            remetente_foto: myProfile.fotos[0],
            mensagem: `🔥 SUPER LIKE! ${myProfile.nome} investiu pesado em você. Telefone: ${myProfile.telefone}`,
            telefone_revelado: myProfile.telefone
        });

        // 🔥 CORREÇÃO: ADICIONAR AO HISTÓRICO DO REMETENTE
        // Isso garante que apareça na aba "Likes Enviados" com opção de upgrade desabilitada (pois já é super)
        if (!myProfile.likes_enviados.includes(targetProfile._id.toString())) {
            myProfile.likes_enviados.push(targetProfile._id);
        }
        // Adiciona aos recebidos do alvo para possibilitar o Match futuro se ele der like de volta
        if (!targetProfile.likes_recebidos.includes(myProfile._id.toString())) {
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

// 6. VER QUEM EU JÁ DEI LIKE (Histórico com Status)
exports.getSentLikes = async (req, res) => {
    try {
        const myProfile = await DatingProfile.findOne({ userId: req.user._id });
        if (!myProfile) return res.status(404).json({ error: "Perfil off" });

        // Busca os perfis que estão no array likes_enviados
        // Trazemos o campo 'correio' para verificar se mandamos Super Like
        const sentLikes = await DatingProfile.find({
            _id: { $in: myProfile.likes_enviados }
        }).select('nome curso fotos genero correio'); 

        // Processa para adicionar flag 'isSuper'
        const result = sentLikes.map(p => {
            const superLikeEnviado = p.correio.some(
                msg => msg.tipo === 'SUPERLIKE' && msg.remetente_id === myProfile._id.toString()
            );

            return {
                _id: p._id,
                nome: p.nome,
                curso: p.curso,
                fotos: p.fotos,
                genero: p.genero,
                isSuper: superLikeEnviado // <--- Flag vital para o Frontend
            };
        });

        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao buscar histórico." });
    }
};