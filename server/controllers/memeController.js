const MemeModel = require('../models/Meme');
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');

// --- 1. GET MEMES (Mantido) ---
exports.getMemes = async (req, res) => {
    try {
        const memes = await MemeModel.find({ status: 'ativo' }).sort({ investimento_total: -1 });
        res.json(memes);
    } catch (e) { res.status(500).json({ error: "Erro ao buscar memes" }); }
};

// --- 2. POSTAR MEME (Mantido lógica, adicionado Ledger na recompensa) ---
exports.postMeme = async (req, res) => {
    try {
        const { email, nome, legenda, imagem_url } = req.body;

        // Reset Diário
        const agora = new Date();
        const limiteReset = new Date(); limiteReset.setHours(21, 0, 0, 0);
        const inicioDoDiaArena = agora > limiteReset ? limiteReset : new Date(limiteReset.getTime() - 24 * 60 * 60 * 1000);

        const jaPostou = await MemeModel.findOne({ autor_email: email, data: { $gte: inicioDoDiaArena } });
        if (jaPostou) return res.status(403).json({ error: "Limite de 1 meme por dia atingido." });

        const novoMeme = await MemeModel.create({ autor_email: email, autor_nome: nome, legenda, imagem_url });

        // Recompensa com Ledger
        const user = await UsuarioModel.findOne({ email });
        let coinsGanhos = 0;

        // Lógica Missão m1
        if (!user.missoes_concluidas.includes('m1')) {
            await UsuarioModel.updateOne({ email }, { 
                $push: { 
                    missoes_concluidas: 'm1',
                    extrato: { tipo: 'ENTRADA', valor: 100, descricao: 'Missão: Primeira Pérola', data: new Date() }
                },
                $inc: { saldo_coins: 100, xp: 50 + TOKEN.XP.MEME_POSTADO }
            });
        } else {
            // Só XP do post normal
             await UsuarioModel.updateOne({ email }, { $inc: { xp: TOKEN.XP.MEME_POSTADO } });
        }

        res.json(novoMeme);
    } catch (e) { res.status(500).json({ error: "Erro ao postar" }); }
};

// --- 3. VOTAR (BLINDADO COM LEDGER) ---
exports.votarMeme = async (req, res) => {
    try {
        const { memeId, email_eleitor, quantia } = req.body;
        const valor = parseInt(quantia);

        // Verifica saldo antes
        const eleitor = await UsuarioModel.findOne({ email: email_eleitor });
        if (eleitor.saldo_coins < valor) return res.status(400).json({ error: "Saldo insuficiente" });

        const meme = await MemeModel.findById(memeId);
        if (!meme || meme.status !== 'ativo') return res.status(404).json({ error: "Meme indisponível" });

        // 1. Deduz do Eleitor (Atômico + Ledger)
        await UsuarioModel.updateOne(
            { email: email_eleitor, saldo_coins: { $gte: valor } },
            { 
                $inc: { saldo_coins: -valor },
                $push: { extrato: { tipo: 'SAIDA', valor: valor, descricao: `Investimento Meme #${memeId.slice(-4)}`, data: new Date() } }
            }
        );

        // 2. Atualiza Meme
        meme.investimento_total += valor;
        meme.votos_count += 1;
        meme.investidores.push({ email_eleitor, quantia: valor });
        await meme.save();

        // 3. Bonus Autor (Inception) - Atômico + Ledger
        const bonusAutor = Math.floor(valor * TOKEN.INCEPTION.MULTIPLIER_MEME);
        if (bonusAutor > 0) {
            await UsuarioModel.updateOne(
                { email: meme.autor_email },
                { 
                    $inc: { saldo_coins: bonusAutor },
                    $push: { extrato: { tipo: 'ENTRADA', valor: bonusAutor, descricao: `Dividendo Meme #${memeId.slice(-4)}`, data: new Date() } }
                }
            );
        }

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Erro ao votar" }); }
};

// --- 4. ENCERRAMENTO (COM LEDGER) ---
exports.finalizarDiaArena = async () => {
    console.log("🏆 Processando encerramento da Arena...");
    try {
        const vencedor = await MemeModel.findOne({ status: 'ativo' }).sort({ investimento_total: -1, votos_count: -1 });

        if (vencedor) {
            // Prêmio Autor
            await UsuarioModel.updateOne(
                { email: vencedor.autor_email },
                { 
                    $inc: { saldo_coins: 500, xp: 200 },
                    $push: { extrato: { tipo: 'ENTRADA', valor: 500, descricao: '🏆 VENCEDOR DA ARENA', data: new Date() } }
                } 
            );

            // Retorno Investidores
            for (let aposta of vencedor.investidores) {
                const retorno = Math.floor(aposta.quantia * 1.5);
                await UsuarioModel.updateOne(
                    { email: aposta.email_eleitor },
                    { 
                        $inc: { saldo_coins: retorno },
                        $push: { extrato: { tipo: 'ENTRADA', valor: retorno, descricao: `Lucro Aposta Vencedora`, data: new Date() } }
                    }
                );
            }
            
            vencedor.status = 'vencedor';
            await vencedor.save();
        }

        await MemeModel.updateMany({ status: 'ativo' }, { status: 'arquivado' });
        console.log("✅ Rodada finalizada.");
    } catch (e) { console.error("❌ Erro no encerramento:", e); }
};