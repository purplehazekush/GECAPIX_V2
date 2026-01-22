const MemeModel = require('../models/Meme');
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');

// --- 1. BUSCAR MEMES ATIVOS (O que aparece no feed hoje) ---
exports.getMemes = async (req, res) => {
    try {
        const memes = await MemeModel.find({ status: 'ativo' }).sort({ investimento_total: -1 });
        res.json(memes);
    } catch (e) { res.status(500).json({ error: "Erro ao buscar memes" }); }
};

// --- 2. POSTAR MEME (Com trava de 1 por dia + Missão m1) ---
exports.postMeme = async (req, res) => {
    try {
        const { email, nome, legenda, imagem_url } = req.body;

        // Lógica de Reset das 21h
        const agora = new Date();
        const limiteReset = new Date();
        limiteReset.setHours(21, 0, 0, 0);
        
        const inicioDoDiaArena = agora > limiteReset ? limiteReset : new Date(limiteReset.getTime() - 24 * 60 * 60 * 1000);

        const jaPostou = await MemeModel.findOne({
            autor_email: email,
            data: { $gte: inicioDoDiaArena }
        });

        if (jaPostou) return res.status(403).json({ error: "Você já postou sua pérola de hoje! Volte após às 21h." });

        // Cria o Meme
        const novoMeme = await MemeModel.create({
            autor_email: email,
            autor_nome: nome,
            legenda,
            imagem_url
        });

        // RECOMPENSAS E MISSÕES
        const user = await UsuarioModel.findOne({ email });
        
        // XP Base por postar
        user.xp += TOKEN.XP.MEME_POSTADO;

        // Verificação da Missão de Primeiro Meme (m1)
        if (!user.missoes_concluidas.includes('m1')) {
            user.missoes_concluidas.push('m1');
            user.saldo_coins += 100; // Prêmio da missão
            user.xp += 50; 
        }

        await user.save();
        res.json(novoMeme);
    } catch (e) { res.status(500).json({ error: "Erro ao postar" }); }
};

// --- 3. VOTAR/INVESTIR (Soma Positiva) ---
exports.votarMeme = async (req, res) => {
    try {
        const { memeId, email_eleitor, quantia } = req.body;
        const valor = parseInt(quantia);

        const eleitor = await UsuarioModel.findOne({ email: email_eleitor });
        if (eleitor.saldo_coins < valor) return res.status(400).json({ error: "Saldo insuficiente" });

        const meme = await MemeModel.findById(memeId);
        if (!meme || meme.status !== 'ativo') return res.status(404).json({ error: "Meme não disponível" });

        // Deduz do eleitor
        eleitor.saldo_coins -= valor;
        await eleitor.save();

        // Registra no meme
        meme.investimento_total += valor;
        meme.votos_count += 1;
        meme.investidores.push({ email_eleitor, quantia: valor });
        await meme.save();

        // Bonus instantâneo para o autor (Inception)
        const bonusAutor = Math.floor(valor * TOKEN.INCEPTION.MULTIPLIER_MEME);
        await UsuarioModel.findOneAndUpdate(
            { email: meme.autor_email },
            { $inc: { saldo_coins: bonusAutor } }
        );

        res.json({ success: true, novo_saldo: eleitor.saldo_coins });
    } catch (e) { res.status(500).json({ error: "Erro ao votar" }); }
};

// --- 4. O FECHAMENTO DAS 21H (A Grande Premiação) ---
exports.finalizarDiaArena = async () => {
    console.log("🏆 Processando encerramento da Arena GECAPIX...");
    try {
        const vencedor = await MemeModel.findOne({ status: 'ativo' }).sort({ investimento_total: -1, votos_count: -1 });

        if (vencedor) {
            // A. Prata da Casa: Prêmio para o autor
            await UsuarioModel.findOneAndUpdate(
                { email: vencedor.autor_email },
                { $inc: { saldo_coins: 500, xp: 200 } } 
            );

            // B. Retorno dos Investidores: 1.5x
            for (let aposta of vencedor.investidores) {
                const retorno = Math.floor(aposta.quantia * 1.5);
                await UsuarioModel.findOneAndUpdate(
                    { email: aposta.email_eleitor },
                    { $inc: { saldo_coins: retorno } }
                );
            }
            
            vencedor.status = 'vencedor';
            await vencedor.save();
        }

        // C. Arquiva o resto para limpar o feed
        await MemeModel.updateMany({ status: 'ativo' }, { status: 'arquivado' });
        console.log("✅ Rodada finalizada com sucesso.");
    } catch (e) { console.error("❌ Erro no encerramento:", e); }
};