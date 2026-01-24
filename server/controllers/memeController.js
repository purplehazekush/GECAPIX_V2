// server/controllers/memeController.js
const MemeModel = require('../models/Meme');
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');

// 1. POSTAR MEME (IPO)
exports.postarMeme = async (req, res) => {
    try {
        const { email, legenda, imagem_url } = req.body;
        const user = await UsuarioModel.findOne({ email });
        
        if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

        // Verifica limite diário (Anti-Spam)
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const jaPostou = await MemeModel.findOne({ 
            usuario_id: user._id, 
            data_postagem: { $gte: hoje } 
        });
        
        if (jaPostou) return res.status(403).json({ error: "Você já lançou um IPO hoje!" });

        const novoMeme = await MemeModel.create({
            usuario_id: user._id,
            autor_nome: user.nome,
            autor_avatar: user.avatar_slug,
            imagem_url,
            legenda,
            total_investido: 0
        });

        // XP por criar conteúdo + Ledger
        await UsuarioModel.updateOne({ email }, { 
            $inc: { xp: TOKEN.XP.MEME_POSTADO },
            $push: { extrato: { 
                tipo: 'ENTRADA', 
                valor: 0, 
                descricao: 'XP: IPO Lançado', 
                categoria: 'MEME',
                data: new Date() 
            }}
        });

        res.json(novoMeme);
    } catch (error) {
        console.error("Erro postarMeme:", error);
        res.status(500).json({ error: "Erro ao realizar IPO" });
    }
};

// 2. INVESTIR NO MEME (COMPRAR AÇÃO)
exports.investirMeme = async (req, res) => {
    try {
        const { memeId, email, valor } = req.body;
        const valorInt = parseInt(valor);

        if (valorInt <= 0) return res.status(400).json({ error: "Valor inválido" });

        const user = await UsuarioModel.findOne({ email });
        const meme = await MemeModel.findById(memeId);

        if (!meme || meme.status !== 'ativo') return res.status(400).json({ error: "Mercado fechado para este ativo." });
        if (user.saldo_coins < valorInt) return res.status(400).json({ error: "Saldo insuficiente." });

        // A. Desconta do Usuário (Staking)
        await UsuarioModel.updateOne(
            { email },
            { 
                $inc: { saldo_coins: -valorInt },
                $push: { extrato: { 
                    tipo: 'SAIDA', 
                    valor: valorInt, 
                    descricao: `Buy: $${meme.autor_nome.split(' ')[0].toUpperCase()}`, 
                    categoria: 'MEME',
                    data: new Date() 
                }}
            }
        );

        // B. Adiciona ao Meme (Market Cap)
        meme.investidores.push({ user_email: email, valor: valorInt, data: new Date() });
        meme.total_investido += valorInt;
        await meme.save();

        res.json({ success: true, novo_total: meme.total_investido });

    } catch (error) {
        console.error("Erro investirMeme:", error);
        res.status(500).json({ error: "Erro ao processar ordem de compra" });
    }
};

// 3. LISTAR (PREGÃO E HISTÓRICO)
exports.getMemes = async (req, res) => {
    try {
        const { tipo } = req.query; // 'ativo' ou 'historico'
        
        let query = {};
        if (tipo === 'historico') {
            query = { status: 'fechado', vencedor: true }; // Só mostra os Blue Chips
        } else {
            query = { status: 'ativo' };
        }

        const memes = await MemeModel.find(query).sort({ total_investido: -1 });
        res.json(memes);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar ativos" });
    }
};

// 4. CRON JOB: FECHAMENTO DE MERCADO (Às 21h)
exports.finalizarDiaArena = async () => {
    console.log("🔔 Fechando Mercado de Memes...");
    
    // Pega todos ativos
    const memesAtivos = await MemeModel.find({ status: 'ativo' });
    if (memesAtivos.length === 0) return;

    // Acha o vencedor (Maior Market Cap)
    let vencedor = null;
    if (memesAtivos.length > 0) {
        vencedor = memesAtivos.reduce((prev, current) => (prev.total_investido > current.total_investido) ? prev : current);
        // Se ninguém apostou nada, não tem vencedor
        if (vencedor.total_investido === 0) vencedor = null;
    }

    // Processa Pagamentos
    for (let meme of memesAtivos) {
        meme.status = 'fechado';
        
        if (vencedor && meme._id.equals(vencedor._id)) {
            meme.vencedor = true;
            
            // Paga Investidores (Stake + 20%)
            for (let investidor of meme.investidores) {
                const lucro = Math.floor(investidor.valor * 0.20); // 20% Yield
                const retorno = investidor.valor + lucro;

                await UsuarioModel.updateOne({ email: investidor.user_email }, {
                    $inc: { saldo_coins: retorno },
                    $push: { extrato: { 
                        tipo: 'ENTRADA', 
                        valor: retorno, 
                        descricao: `Dividendo: $${meme.autor_nome.split(' ')[0].toUpperCase()} Winner`, 
                        categoria: 'MEME', 
                        data: new Date() 
                    }}
                });
            }
            
            // Paga o Criador (Royalty)
            await UsuarioModel.updateOne({ _id: meme.usuario_id }, {
                $inc: { saldo_coins: 100, xp: 200 },
                $push: { extrato: { 
                    tipo: 'ENTRADA', 
                    valor: 100, 
                    descricao: 'Royalty: Meme Blue Chip', 
                    categoria: 'MEME', 
                    data: new Date() 
                }}
            });

        } else {
            // Perdedores: Devolve o dinheiro (Reembolso Principal)
            for (let investidor of meme.investidores) {
                await UsuarioModel.updateOne({ email: investidor.user_email }, {
                    $inc: { saldo_coins: investidor.valor },
                    $push: { extrato: { 
                        tipo: 'ENTRADA', 
                        valor: investidor.valor, 
                        descricao: `Reembolso: $${meme.autor_nome.split(' ')[0].toUpperCase()}`, 
                        categoria: 'MEME',
                        data: new Date() 
                    }}
                });
            }
        }
        await meme.save();
    }
    console.log(`🏆 Meme Vencedor: ${vencedor ? vencedor.legenda : 'Nenhum'}`);
};