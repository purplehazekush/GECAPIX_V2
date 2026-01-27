// server/controllers/memeController.js
const MemeModel = require('../models/Meme');
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');

// Helper de Fase
function getMarketPhase() {
    const hora = new Date().getHours();
    if (hora >= 9 && hora < 21) return 'PREGAO';
    return 'CRIACAO';
}

// 1. POSTAR MEME (IPO)
const postarMeme = async (req, res) => {
    try {
        if (getMarketPhase() === 'PREGAO') return res.status(403).json({ error: "Mercado aberto para apostas! Volte às 21h." });

        const { email, legenda, imagem_url } = req.body;
        const user = await UsuarioModel.findOne({ email });
        
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const jaPostou = await MemeModel.findOne({ usuario_id: user._id, data_postagem: { $gte: hoje } });
        if (jaPostou) return res.status(403).json({ error: "Limite de 1 IPO por dia." });

        const novoMeme = await MemeModel.create({
            usuario_id: user._id,
            autor_nome: user.nome,
            autor_avatar: user.avatar_slug,
            imagem_url, legenda,
            total_up: 0, total_down: 0, total_geral: 0
        });

        await UsuarioModel.updateOne({ email }, { 
            $inc: { xp: TOKEN.XP.MEME_POSTADO },
            $push: { extrato: { tipo: 'ENTRADA', valor: 0, descricao: 'XP: IPO Meme', categoria: 'MEME', data: new Date() }}
        });

        res.json(novoMeme);
    } catch (error) { res.status(500).json({ error: "Erro no IPO" }); }
};

// 2. INVESTIR
const investirMeme = async (req, res) => {
    try {
        // if (getMarketPhase() === 'CRIACAO') return res.status(403).json({ error: "Aguarde o pregão." });

        const { memeId, email, valor, lado } = req.body; 
        const valorInt = parseInt(valor);
        
        if (!['UP', 'DOWN'].includes(lado)) return res.status(400).json({ error: "Escolha UP ou DOWN." });
        if (valorInt <= 0) return res.status(400).json({ error: "Valor inválido" });

        const user = await UsuarioModel.findOne({ email });
        const meme = await MemeModel.findById(memeId);

        if (!meme || meme.status !== 'ativo') return res.status(400).json({ error: "Ativo fechado." });
        if (user.saldo_coins < valorInt) return res.status(400).json({ error: "Saldo insuficiente." });

        await UsuarioModel.updateOne({ email }, { 
            $inc: { saldo_coins: -valorInt },
            $push: { extrato: { 
                tipo: 'SAIDA', valor: valorInt, 
                descricao: `Bet ${lado}: $${meme.autor_nome.split(' ')[0]}`, 
                categoria: 'MEME', data: new Date() 
            }}
        });

        meme.investidores.push({ user_email: email, valor: valorInt, lado, data: new Date() });
        
        if (lado === 'UP') meme.total_up += valorInt;
        else meme.total_down += valorInt;
        
        meme.total_geral += valorInt;
        await meme.save();

        res.json({ success: true, meme });
    } catch (error) { res.status(500).json({ error: "Erro na aposta" }); }
};

// 3. GET MEMES
const getMemes = async (req, res) => {
    try {
        const { mode } = req.query;
        let filtro = { status: mode === 'history' ? 'fechado' : 'ativo' };

        // Se quiser ver histórico, ordena por data. Se for live, ordena por volume.
        const sort = mode === 'history' ? { data_postagem: -1 } : { total_geral: -1 };

        const memes = await MemeModel.find(filtro)
            .sort(sort)
            .limit(50);
            
        res.json(memes);
    } catch (e) { res.status(500).json({ error: "Erro ao buscar memes" }); }
};

// 4. FECHAMENTO
const finalizarDiaArena = async () => {
    console.log("🔔 Fechando Pregão de Memes...");
    const memes = await MemeModel.find({ status: 'ativo' });
    if (memes.length === 0) return;

    let volumeGlobal = 0;
    memes.forEach(m => volumeGlobal += m.total_geral);

    const melhorMeme = [...memes].sort((a, b) => b.total_up - a.total_up)[0];
    const piorMeme = [...memes].sort((a, b) => b.total_down - a.total_down)[0];

    if (!melhorMeme || volumeGlobal === 0) return;

    const SYSTEM_INJECTION = 20000; 
    const POTE_TOTAL = volumeGlobal + SYSTEM_INJECTION;
    const POTE_MELHOR = POTE_TOTAL / 2;
    const POTE_PIOR = POTE_TOTAL / 2;

    for (let meme of memes) {
        meme.status = 'fechado';
        
        if (meme._id.equals(melhorMeme._id)) {
            meme.resultado = 'MELHOR';
            for (let inv of meme.investidores.filter(i => i.lado === 'UP')) {
                const share = inv.valor / meme.total_up;
                const premio = Math.floor(share * POTE_MELHOR);
                await pagarUsuario(inv.user_email, premio, `🏆 WIN: Melhor Meme`);
            }
        }

        if (meme._id.equals(piorMeme._id)) {
            meme.resultado = meme.resultado === 'MELHOR' ? 'AMBOS' : 'PIOR';
            for (let inv of meme.investidores.filter(i => i.lado === 'DOWN')) {
                const share = inv.valor / meme.total_down;
                const premio = Math.floor(share * POTE_PIOR);
                await pagarUsuario(inv.user_email, premio, `💀 WIN: Pior Meme`);
            }
        }
        await meme.save();
    }
};

async function pagarUsuario(email, valor, desc) {
    await UsuarioModel.updateOne({ email }, {
        $inc: { saldo_coins: valor },
        $push: { extrato: { tipo: 'ENTRADA', valor, descricao: desc, categoria: 'MEME', data: new Date() }}
    });
}

// 🔥 EXPORTAÇÃO BLINDADA (Isso resolve o erro da linha 152)
module.exports = {
    postarMeme,
    investirMeme,
    getMemes,
    finalizarDiaArena
};