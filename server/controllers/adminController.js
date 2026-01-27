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


// 4. PROTOCOLO GÊNESIS (RESET TOTAL)
// server/controllers/adminController.js

exports.resetSeason = async (req, res) => {
    try {
        const { confirm } = req.body;
        if (confirm !== "PROTOCOL_GENESIS_EXECUTE") return res.status(400).json({ error: "Confirmação inválida" });

        console.log("⚠️ INICIANDO PROTOCOLO GÊNESIS...");

        // 1. LIMPEZA TRANSACIONAL
        await Promise.all([
            require('../models/Trade').deleteMany({}),
            require('../models/LockedBond').deleteMany({}),
            require('../models/MarketOrder').deleteMany({}),
            require('../models/DailyStats').deleteMany({}),
            require('../models/Meme').deleteMany({}),
            require('../models/Spotted').deleteMany({})
        ]);
        
        console.log("✅ Collections limpas.");

        // 2. PREPARAR CARTEIRAS DE SISTEMA (Definir ANTES de usar)
        // Definimos aqui quem são as carteiras para poder filtrar os usuários corretamente
        const walletsToCreate = [
            {
                email: TOKEN.WALLETS.TREASURY,
                nome: "Tesouro Geral",
                role: "admin", status: "ativo", classe: "TECNOMANTE", avatar_slug: "bank",
                // Saldo será injetado depois do cálculo
            },
            {
                email: TOKEN.WALLETS.TREASURY_LOCKED,
                nome: "Fundo Soberano",
                role: "admin", status: "ativo", classe: "TECNOMANTE", avatar_slug: "safe",
                saldo_coins: TOKEN.ALLOCATION.LOCKED_TREASURY,
                extrato: [{ tipo: 'ENTRADA', valor: TOKEN.ALLOCATION.LOCKED_TREASURY, descricao: 'Gênesis', data: new Date() }]
            },
            {
                email: TOKEN.WALLETS.CASHBACK,
                nome: "Pool Cashback",
                role: "admin", status: "ativo", classe: "BARDO", avatar_slug: "gift",
                saldo_coins: TOKEN.ALLOCATION.CASHBACK_FUND,
                extrato: [{ tipo: 'ENTRADA', valor: TOKEN.ALLOCATION.CASHBACK_FUND, descricao: 'Gênesis', data: new Date() }]
            },
            {
                email: TOKEN.WALLETS.BANK,
                nome: "Banco Central",
                role: "gm", status: "ativo", classe: "ESPECULADOR", avatar_slug: "robot",
                saldo_coins: TOKEN.ALLOCATION.CENTRAL_BANK,
                saldo_glue: 100000,
                extrato: [{ tipo: 'ENTRADA', valor: TOKEN.ALLOCATION.CENTRAL_BANK, descricao: 'Gênesis', data: new Date() }]
            },
            {
                email: TOKEN.WALLETS.FEES,
                nome: "Taxas Acumuladas",
                role: "admin", status: "ativo", classe: "ESPECULADOR", avatar_slug: "tax",
                saldo_coins: 0
            },
            {
                email: TOKEN.WALLETS.BURN,
                nome: "Buraco Negro",
                role: "admin", status: "banido", classe: "BRUXO", avatar_slug: "fire",
                saldo_coins: 0
            }
        ];

        // Extrai apenas os e-mails para usar nos filtros
        const systemEmails = walletsToCreate.map(w => w.email);

        // 3. REBOOT DOS USUÁRIOS COMUNS
        const INIT_BALANCE = TOKEN.CAPS.INITIAL_USER_BALANCE || 1000;

        await UsuarioModel.updateMany(
            { email: { $nin: systemEmails } }, // Atualiza todos que NÃO SÃO sistema
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
                    extrato: [{ tipo: 'ENTRADA', valor: INIT_BALANCE, descricao: 'Season 2: Airdrop', categoria: 'SYSTEM', data: new Date() }]
                }
            }
        );

        // 4. CÁLCULO FINAL E INSERÇÃO DAS CARTEIRAS
        
        // Remove QUALQUER usuário que tenha esses emails (Garante que não duplica)
        await UsuarioModel.deleteMany({ email: { $in: systemEmails } });

        // Calcula o que sobrou para o Tesouro Geral
        const totalUsers = await UsuarioModel.countDocuments({ email: { $nin: systemEmails } });
        const distributedToUsers = totalUsers * INIT_BALANCE;
        
        const fixedAllocations = 
            TOKEN.ALLOCATION.LOCKED_TREASURY + 
            TOKEN.ALLOCATION.CASHBACK_FUND + 
            TOKEN.ALLOCATION.CENTRAL_BANK;

        const generalTreasuryBalance = TOKEN.CAPS.TOTAL_SUPPLY - fixedAllocations - distributedToUsers;

        if (generalTreasuryBalance < 0) throw new Error("ERRO CRÍTICO: Falta dinheiro para cobrir os usuários!");

        // Atualiza o objeto do Tesouro com o saldo calculado
        const treasuryIndex = walletsToCreate.findIndex(w => w.email === TOKEN.WALLETS.TREASURY);
        if (treasuryIndex >= 0) {
            walletsToCreate[treasuryIndex].saldo_coins = generalTreasuryBalance;
            walletsToCreate[treasuryIndex].extrato = [{ tipo: 'ENTRADA', valor: generalTreasuryBalance, descricao: 'Gênesis', data: new Date() }];
        }

        // AGORA SIM: Insere
        await UsuarioModel.insertMany(walletsToCreate);
        console.log("✅ Carteiras do Sistema recriadas.");

        // 5. REBOOT SYSTEM STATE
        await SystemState.deleteMany({});
        await SystemState.create({
            season_id: TOKEN.SEASON.ID || 2,
            season_start_date: new Date(),
            current_day: 0,
            last_processed_day: -1,
            last_apr_liquid: 0.005, // Começa com 0.5% visualmente
            last_apr_locked: 0.015,
            glue_price_base: 50,
            glue_price_multiplier: 1.05,
            glue_supply_circulating: 0,
            market_is_open: true,
            referral_pool_available: 0,
            cashback_pool_available: 0
        });

        res.json({ 
            success: true, 
            message: "GENESIS COMPLETED.",
            stats: {
                users: totalUsers,
                treasury: generalTreasuryBalance,
                locked: TOKEN.ALLOCATION.LOCKED_TREASURY
            }
        });

    } catch (e) {
        console.error("❌ ERRO RESET:", e);
        res.status(500).json({ error: e.message });
    }
};