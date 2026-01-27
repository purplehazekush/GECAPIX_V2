const UsuarioModel = require('../models/Usuario');
const SystemState = require('../models/SystemState');
const Trade = require('../models/Trade');
const LockedBond = require('../models/LockedBond');
const MarketOrder = require('../models/MarketOrder');
const DailyStats = require('../models/DailyStats');
const Meme = require('../models/Meme');
const Spotted = require('../models/Spotted');
const Quest = require('../models/Quest'); // Se tiver model de progresso separado
const TOKEN = require('../config/tokenomics');// server/controllers/adminController.js

// 1. GET FILA (Apenas pendentes com comprovante)
exports.getFilaValidacao = async (req, res) => {
    try {
        const pendentes = await UsuarioModel.find({
            comprovante_url: { $exists: true, $ne: '' }, 
            status: 'pendente' 
        }).select('nome email curso comprovante_url data_criacao');
        res.json(pendentes);
    } catch (error) { res.status(500).json({ error: "Erro fila" }); }
};

// 2. MODERAR
exports.moderarUsuario = async (req, res) => {
    try {
        const { email, acao } = req.body;
        if (acao === 'aprovar') {
            await UsuarioModel.findOneAndUpdate({ email }, { status: 'ativo' });
        } else {
            // Rejeitar: limpa url, mantem pendente
            await UsuarioModel.findOneAndUpdate({ email }, { status: 'pendente', comprovante_url: '' });
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Erro moderação" }); }
};

// 3. INJETAR RECURSOS (Para testes ou prêmios manuais)
exports.darRecursos = async (req, res) => {
    try {
        const { email, glue, coins } = req.body;
        const user = await UsuarioModel.findOneAndUpdate(
            { email },
            { 
                $inc: { saldo_glue: glue || 0, saldo_coins: coins || 0 },
                $push: { extrato: { tipo: 'ENTRADA', valor: coins || 0, descricao: 'Grant Admin', categoria: 'SYSTEM', data: new Date() } }
            },
            { new: true }
        );
        res.json({ success: true, novo_glue: user.saldo_glue, novo_coins: user.saldo_coins });
    } catch (error) { res.status(500).json({ error: "Erro recursos" }); }
};

// server/controllers/adminController.js

// ... imports ...

// 4. PROTOCOLO GÊNESIS (RESET TOTAL)
exports.resetSeason = async (req, res) => {
    try {
        const { confirm } = req.body;
        if (confirm !== "PROTOCOL_GENESIS_EXECUTE") return res.status(400).json({ error: "Confirmação inválida" });

        console.log("⚠️ INICIANDO PROTOCOLO GÊNESIS...");

        // 1. A GRANDE QUEIMA (Wipeout)
        await Trade.deleteMany({});
        await LockedBond.deleteMany({});
        await MarketOrder.deleteMany({});
        await DailyStats.deleteMany({});
        await Meme.deleteMany({});
        await Spotted.deleteMany({});
        
        console.log("✅ Dados transacionais deletados.");

        // --- VALORES DE SEGURANÇA (FAILSAFE) ---
        // Se o tokenomics.js falhar, usamos estes valores padrão para não gerar NaN
        const INIT_BALANCE = TOKEN.CAPS?.INITIAL_USER_BALANCE || 1000;
        const TOTAL_SUPPLY = TOKEN.CAPS?.TOTAL_SUPPLY || 1_000_000_000;

        // 2. REBOOT DOS USUÁRIOS
        const systemEmails = Object.values(TOKEN.WALLETS);
        
        await UsuarioModel.updateMany(
            { email: { $nin: systemEmails } },
            {
                $set: {
                    saldo_coins: INIT_BALANCE,
                    saldo_glue: 0,
                    saldo_staking_liquido: 0,
                    xp: 0,
                    nivel: 1,
                    badges: [],
                    quest_progress: [],
                    missoes_concluidas: [],
                    extrato: [{ 
                        tipo: 'ENTRADA', 
                        valor: INIT_BALANCE, 
                        descricao: 'Gênesis: Season 2 Start', 
                        categoria: 'SYSTEM', 
                        data: new Date() 
                    }]
                }
            }
        );
        
        console.log(`✅ Usuários resetados (Saldo Inicial: ${INIT_BALANCE}).`);

        // 3. RECRIAR CARTEIRAS DE SISTEMA
        await UsuarioModel.deleteMany({ email: { $in: systemEmails } });

        // Cálculo Matemático Protegido
        const totalUsers = await UsuarioModel.countDocuments({ email: { $nin: systemEmails } });
        const circulatingStart = totalUsers * INIT_BALANCE;
        const treasuryBalance = TOTAL_SUPPLY - circulatingStart;

        console.log(`📊 Auditoria: Supply Total (${TOTAL_SUPPLY}) - Circulante (${circulatingStart}) = Tesouro (${treasuryBalance})`);

        if (isNaN(treasuryBalance)) {
            throw new Error("Erro de cálculo matemático: Treasury Balance resultou em NaN.");
        }

        const walletsToCreate = [
            {
                email: TOKEN.WALLETS.TREASURY,
                nome: "Tesouro Nacional",
                role: "admin",
                status: "ativo",
                saldo_coins: treasuryBalance, // Agora garantido que é número
                classe: "TECNOMANTE",
                avatar_slug: "bank"
            },
            {
                email: TOKEN.WALLETS.FEES,
                nome: "Fundo de Taxas",
                role: "admin",
                status: "ativo",
                saldo_coins: 0,
                classe: "ESPECULADOR",
                avatar_slug: "tax"
            },
            {
                email: TOKEN.WALLETS.BURN,
                nome: "Buraco Negro (Burn)",
                role: "admin",
                status: "banido",
                saldo_coins: 0,
                classe: "BRUXO",
                avatar_slug: "fire"
            },
            {
                email: TOKEN.WALLETS.BANK,
                nome: "Banco Central (Bot)",
                role: "gm",
                status: "ativo",
                saldo_coins: 1000000, 
                saldo_glue: 100000,
                classe: "ESPECULADOR",
                avatar_slug: "robot"
            }
        ];

        await UsuarioModel.insertMany(walletsToCreate);
        console.log("✅ Carteiras do Sistema recriadas.");

        // 4. REBOOT DO BANCO CENTRAL
        await SystemState.deleteMany({});
        
        await SystemState.create({
            season_id: TOKEN.SEASON.ID || 2,
            season_start_date: new Date(),
            current_day: 0,
            glue_price_base: 50,
            glue_price_multiplier: 1.05,
            glue_supply_circulating: 0,
            total_burned: 0,
            total_fees_collected: 0,
            market_is_open: true
        });

        console.log("✅ Banco Central reiniciado.");

        res.json({ 
            success: true, 
            message: "PROTOCOL GENESIS COMPLETED.",
            stats: { users: totalUsers, treasury: treasuryBalance }
        });

    } catch (e) {
        console.error("❌ ERRO CRÍTICO NO GENESIS:", e);
        res.status(500).json({ error: e.message });
    }
};