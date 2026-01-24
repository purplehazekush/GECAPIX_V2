const MemeModel = require('../models/Meme');
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');

// HELPER: Verifica Fase do Mercado
// 09:00 - 21:00 = PREGÃO (Apostas)
// 21:00 - 09:00 = CRIAÇÃO (Postagem)
function getMarketPhase() {
    const hora = new Date().getHours();
    if (hora >= 9 && hora < 21) return 'PREGAO';
    return 'CRIACAO';
}

// 1. POSTAR MEME (IPO) - Só na fase de CRIAÇÃO
exports.postarMeme = async (req, res) => {
    try {
        if (getMarketPhase() === 'PREGAO') {
            return res.status(403).json({ error: "O Mercado está aberto para apostas! Novos IPOs só após as 21h." });
        }

        const { email, legenda, imagem_url } = req.body;
        const user = await UsuarioModel.findOne({ email });
        
        // Verifica limite diário... (código igual ao anterior)
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const jaPostou = await MemeModel.findOne({ usuario_id: user._id, data_postagem: { $gte: hoje } });
        if (jaPostou) return res.status(403).json({ error: "Você já lançou um IPO hoje!" });

        const novoMeme = await MemeModel.create({
            usuario_id: user._id,
            autor_nome: user.nome,
            autor_avatar: user.avatar_slug,
            imagem_url, legenda, total_investido: 0
        });

        await UsuarioModel.updateOne({ email }, { 
            $inc: { xp: TOKEN.XP.MEME_POSTADO },
            $push: { extrato: { tipo: 'ENTRADA', valor: 0, descricao: 'XP: IPO Lançado', categoria: 'MEME', data: new Date() }}
        });

        res.json(novoMeme);
    } catch (error) { res.status(500).json({ error: "Erro ao realizar IPO" }); }
};

// 2. INVESTIR (COMPRAR AÇÃO) - Só na fase de PREGÃO
exports.investirMeme = async (req, res) => {
    try {
        // PERMITIR TESTES FORA DE HORA? Comente este if se quiser testar agora
        if (getMarketPhase() === 'CRIACAO') {
            return res.status(403).json({ error: "O Pregão está fechado! Apostas só entre 09h e 21h." });
        }

        const { memeId, email, valor } = req.body;
        const valorInt = parseInt(valor);
        if (valorInt <= 0) return res.status(400).json({ error: "Valor inválido" });

        const user = await UsuarioModel.findOne({ email });
        const meme = await MemeModel.findById(memeId);

        if (!meme || meme.status !== 'ativo') return res.status(400).json({ error: "Ativo indisponível." });
        if (user.saldo_coins < valorInt) return res.status(400).json({ error: "Saldo insuficiente." });

        await UsuarioModel.updateOne({ email }, { 
            $inc: { saldo_coins: -valorInt },
            $push: { extrato: { tipo: 'SAIDA', valor: valorInt, descricao: `Buy: $${meme.autor_nome.split(' ')[0].toUpperCase()}`, categoria: 'MEME', data: new Date() }}
        });

        meme.investidores.push({ user_email: email, valor: valorInt, data: new Date() });
        meme.total_investido += valorInt;
        await meme.save();

        res.json({ success: true, novo_total: meme.total_investido });
    } catch (error) { res.status(500).json({ error: "Erro na ordem de compra" }); }
};

// 3. GET MEMES (Mantém igual)
exports.getMemes = async (req, res) => {
    // ... (Código igual ao anterior) ...
    try {
        const { tipo } = req.query;
        let query = (tipo === 'historico') ? { status: 'fechado', vencedor: true } : { status: 'ativo' };
        const memes = await MemeModel.find(query).sort({ total_investido: -1 });
        res.json(memes);
    } catch (e) { res.status(500).json({ error: "Erro" }); }
};

// 4. FECHAMENTO DO MERCADO (LÓGICA PARIMUTUEL)
exports.finalizarDiaArena = async () => {
    console.log("🔔 Fechando Mercado de Memes...");
    const memesAtivos = await MemeModel.find({ status: 'ativo' });
    if (memesAtivos.length === 0) return;

    // 1. Calcula o Pote Total do Dia
    let totalMercado = 0;
    memesAtivos.forEach(m => totalMercado += m.total_investido);

    // 2. Define o Vencedor
    let vencedor = memesAtivos.reduce((prev, current) => (prev.total_investido > current.total_investido) ? prev : current);
    if (vencedor.total_investido === 0) vencedor = null;

    // 3. Distribuição
    for (let meme of memesAtivos) {
        meme.status = 'fechado';
        
        if (vencedor && meme._id.equals(vencedor._id)) {
            meme.vencedor = true;
            
            // Pote dos Perdedores = Tudo - O que foi apostado no vencedor
            const potePerdedores = totalMercado - vencedor.total_investido;
            
            // Paga os Acionistas do Vencedor
            for (let investidor of meme.investidores) {
                // Sua % no vencedor
                const share = investidor.valor / vencedor.total_investido; 
                
                // Seu lucro = Sua % * Pote dos Perdedores
                const lucro = Math.floor(share * potePerdedores);
                
                // Retorno = O que você pôs + Lucro
                const retorno = investidor.valor + lucro;

                await UsuarioModel.updateOne({ email: investidor.user_email }, {
                    $inc: { saldo_coins: retorno },
                    $push: { extrato: { 
                        tipo: 'ENTRADA', valor: retorno, 
                        descricao: `Dividendo: $${meme.autor_nome.split(' ')[0]} (Yield ${(share*potePerdedores/investidor.valor*100).toFixed(0)}%)`, 
                        categoria: 'MEME', data: new Date() 
                    }}
                });
            }
            
            // Royalty Criador (Fixo ou % do pote? Vamos manter fixo 100 por enquanto)
            await UsuarioModel.updateOne({ _id: meme.usuario_id }, {
                $inc: { saldo_coins: 100, xp: 200 },
                $push: { extrato: { tipo: 'ENTRADA', valor: 100, descricao: 'Royalty: Blue Chip', categoria: 'MEME', data: new Date() }}
            });
        }
        // Perdedores: NÃO recebem nada. O dinheiro foi para os vencedores.
        // Isso cria risco real e emoção.
        await meme.save();
    }
    console.log(`🏆 Mercado Fechado. Vencedor: ${vencedor?.legenda}`);
};