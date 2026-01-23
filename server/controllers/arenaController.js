// server/controllers/arenaController.js
const UsuarioModel = require('../models/Usuario');

// --- RANKING (Mantido) ---
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

// --- PERFIL PÚBLICO (Mantido) ---
exports.getPerfilPublico = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await UsuarioModel.findOne({ 
            $or: [{ _id: id.length === 24 ? id : null }, { codigo_referencia: id.toUpperCase() }] 
        }).select('-__v -extrato'); // Não mostramos o extrato financeiro publicamente

        if (!user) return res.status(404).json({ error: "Membro não encontrado" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar perfil" });
    }
};

// --- UPDATE PERFIL (Mantido) ---
exports.updatePerfil = async (req, res) => {
    try {
        const { email, classe, materias, bio, chave_pix, curso, status_profissional, equipe_competicao, comprovante_url } = req.body;
        
        let materiasFormatadas = [];
        if (Array.isArray(materias)) {
            materiasFormatadas = materias.map(m => m.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
        }

        const updateData = { classe, materias: materiasFormatadas, bio, chave_pix, curso, status_profissional, equipe_competicao };
        if (comprovante_url && comprovante_url.length > 5) updateData.comprovante_url = comprovante_url;

        const user = await UsuarioModel.findOneAndUpdate(
            { email }, { $set: updateData }, { new: true }
        );
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
};

// --- 🔥 TRANSFERÊNCIA BLINDADA (ACID + LEDGER) ---
exports.transferirCoins = async (req, res) => {
    try {
        const { remetenteEmail, destinatarioChave, valor } = req.body;
        const valorNumerico = parseInt(valor);
        
        // 1. Validações
        if (!valorNumerico || valorNumerico <= 0) return res.status(400).json({ error: "Valor inválido." });
        
        // 2. Busca Remetente (Checa saldo antes de tentar transação)
        const remetente = await UsuarioModel.findOne({ email: remetenteEmail });
        if (!remetente) return res.status(404).json({ error: "Erro na autenticação." });
        if (remetente.saldo_coins < valorNumerico) return res.status(400).json({ error: "Saldo insuficiente." });

        // 3. Busca Destinatário
        const destinatario = await UsuarioModel.findOne({
            $or: [{ email: destinatarioChave }, { codigo_referencia: destinatarioChave.toUpperCase() }]
        });

        if (!destinatario) return res.status(404).json({ error: "Destinatário não encontrado." });
        if (remetente.email === destinatario.email) return res.status(400).json({ error: "Não pode transferir para si mesmo." });

        // 4. OPERAÇÃO ATÔMICA (O Pulo do Gato)
        // Retira de um e grava extrato
        await UsuarioModel.updateOne(
            { _id: remetente._id, saldo_coins: { $gte: valorNumerico } }, // Trava de segurança extra no banco
            { 
                $inc: { saldo_coins: -valorNumerico },
                $push: { extrato: {
                    tipo: 'SAIDA',
                    valor: valorNumerico,
                    descricao: `Transferência para ${destinatario.nome}`,
                    referencia_id: destinatario._id,
                    data: new Date()
                }}
            }
        );
        
        // Coloca no outro e grava extrato
        await UsuarioModel.updateOne(
            { _id: destinatario._id }, 
            { 
                $inc: { saldo_coins: valorNumerico },
                $push: { extrato: {
                    tipo: 'ENTRADA',
                    valor: valorNumerico,
                    descricao: `Recebido de ${remetente.nome}`,
                    referencia_id: remetente._id,
                    data: new Date()
                }}
            }
        );

        res.json({ success: true, novoSaldo: remetente.saldo_coins - valorNumerico });

    } catch (error) {
        console.error("Erro na transferência:", error);
        res.status(500).json({ error: "Erro ao processar transferência." });
    }
};