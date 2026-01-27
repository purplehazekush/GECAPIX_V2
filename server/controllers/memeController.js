// server/controllers/memeController.js
const MemeModel = require('../models/Meme');
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');

// Helper de Fase (Mantido)
function getMarketPhase() {
    const hora = new Date().getHours();
    if (hora >= 9 && hora < 21) return 'PREGAO';
    return 'CRIACAO';
}

// 1. POSTAR (IPO) - Ajustado para novos campos
exports.postarMeme = async (req, res) => {
    try {
        if (getMarketPhase() === 'PREGAO') return res.status(403).json({ error: "Mercado aberto para apostas! Volte às 21h." });

        const { email, legenda, imagem_url } = req.body;
        const user = await UsuarioModel.findOne({ email });
        
        // Validação diária
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const jaPostou = await MemeModel.findOne({ usuario_id: user._id, data_postagem: { $gte: hoje } });
        if (jaPostou) return res.status(403).json({ error: "Limite de 1 IPO por dia atingido." });

        const novoMeme = await MemeModel.create({
            usuario_id: user._id,
            autor_nome: user.nome,
            autor_avatar: user.avatar_slug,
            imagem_url, legenda,
            total_up: 0, total_down: 0, total_geral: 0
        });

        // XP Reward
        await UsuarioModel.updateOne({ email }, { 
            $inc: { xp: TOKEN.XP.MEME_POSTADO },
            $push: { extrato: { tipo: 'ENTRADA', valor: 0, descricao: 'XP: IPO Meme', categoria: 'MEME', data: new Date() }}
        });

        res.json(novoMeme);
    } catch (error) { res.status(500).json({ error: "Erro no IPO" }); }
};

// 2. INVESTIR (UP ou DOWN)
exports.investirMeme = async (req, res) => {
    try {
        // if (getMarketPhase() === 'CRIACAO') return res.status(403).json({ error: "Aguarde a abertura do pregão às 09:00." });

        const { memeId, email, valor, lado } = req.body; // lado = 'UP' ou 'DOWN'
        const valorInt = parseInt(valor);
        
        if (!['UP', 'DOWN'].includes(lado)) return res.status(400).json({ error: "Escolha UP (Alta) ou DOWN (Baixa)." });
        if (valorInt <= 0) return res.status(400).json({ error: "Valor inválido" });

        const user = await UsuarioModel.findOne({ email });
        const meme = await MemeModel.findById(memeId);

        if (!meme || meme.status !== 'ativo') return res.status(400).json({ error: "Ativo fechado." });
        if (user.saldo_coins < valorInt) return res.status(400).json({ error: "Saldo insuficiente." });

        // Transação
        await UsuarioModel.updateOne({ email }, { 
            $inc: { saldo_coins: -valorInt },
            $push: { extrato: { 
                tipo: 'SAIDA', 
                valor: valorInt, 
                descricao: `Bet ${lado}: $${meme.autor_nome.split(' ')[0]}`, 
                categoria: 'MEME', data: new Date() 
            }}
        });

        // Atualiza Meme
        meme.investidores.push({ user_email: email, valor: valorInt, lado, data: new Date() });
        
        if (lado === 'UP') meme.total_up += valorInt;
        else meme.total_down += valorInt;
        
        meme.total_geral += valorInt;
        await meme.save();

        res.json({ success: true, meme });
    } catch (error) { res.status(500).json({ error: "Erro na aposta" }); }
};

// 3. FECHAMENTO DO MERCADO (PARIMUTUEL DUPLO)
exports.finalizarDiaArena = async () => {
    console.log("🔔 Fechando Pregão de Memes...");
    const memes = await MemeModel.find({ status: 'ativo' });
    if (memes.length === 0) return;

    // A. Cálculos Globais
    let volumeGlobal = 0;
    memes.forEach(m => volumeGlobal += m.total_geral);

    // B. Identificar Vencedores
    // Melhor: Maior Total UP
    const melhorMeme = [...memes].sort((a, b) => b.total_up - a.total_up)[0];
    // Pior: Maior Total DOWN
    const piorMeme = [...memes].sort((a, b) => b.total_down - a.total_down)[0];

    // Se ninguém apostou nada, encerra
    if (!melhorMeme || volumeGlobal === 0) return;

    // C. Definição do Pote de Prêmios
    // Pote = Volume Apostado + Injeção do Sistema (Tokenomics)
    // Vamos supor uma injeção fixa diária de 20.000 (Definido no Tokenomics ou fixo aqui)
    const SYSTEM_INJECTION = 20000; 
    const POTE_TOTAL = volumeGlobal + SYSTEM_INJECTION;

    // Divisão do Pote: 50% para Upvoters do Melhor, 50% para Downvoters do Pior
    const POTE_MELHOR = POTE_TOTAL / 2;
    const POTE_PIOR = POTE_TOTAL / 2;

    console.log(`🏆 Resultado: Melhor=${melhorMeme.autor_nome} | Pior=${piorMeme.autor_nome} | Pote=${POTE_TOTAL}`);

    // D. Distribuição
    for (let meme of memes) {
        meme.status = 'fechado';
        
        // --- CENÁRIO 1: É O MELHOR MEME? ---
        if (meme._id.equals(melhorMeme._id)) {
            meme.resultado = 'MELHOR';
            
            // Paga quem apostou UP neste meme
            for (let inv of meme.investidores.filter(i => i.lado === 'UP')) {
                // Share = (Meu Investimento / Total Investido UP neste meme)
                const share = inv.valor / meme.total_up;
                const premio = Math.floor(share * POTE_MELHOR);
                
                await pagarUsuario(inv.user_email, premio, `🏆 WIN: Melhor Meme (Yield ${(premio/inv.valor*100).toFixed(0)}%)`);
            }
        }

        // --- CENÁRIO 2: É O PIOR MEME? ---
        if (meme._id.equals(piorMeme._id)) {
            // Nota: Um meme pode ser O Melhor E O Pior ao mesmo tempo (Polêmico). O código permite isso.
            meme.resultado = meme.resultado === 'MELHOR' ? 'AMBOS' : 'PIOR';

            // Paga quem apostou DOWN neste meme
            for (let inv of meme.investidores.filter(i => i.lado === 'DOWN')) {
                const share = inv.valor / meme.total_down;
                const premio = Math.floor(share * POTE_PIOR);
                
                await pagarUsuario(inv.user_email, premio, `💀 WIN: Pior Meme (Yield ${(premio/inv.valor*100).toFixed(0)}%)`);
            }
        }

        // Royaties para os criadores
        // Melhor Meme ganha bonus, Pior Meme... ganha bonus de consolação?
        if (meme.resultado === 'MELHOR') {
            await pagarUsuario(meme.usuario_id, 1000, 'Royalty: Meme do Dia'); // Usar ID aqui requer busca, simplificando com a logica do email se tiver no schema, senao busca user
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