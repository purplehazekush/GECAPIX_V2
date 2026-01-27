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
exports.resetSeason = async (req, res) => {
    try {
        const { confirm } = req.body;
        if (confirm !== "PROTOCOL_GENESIS_EXECUTE") return res.status(400).json({ error: "Confirmação inválida" });

        console.log("⚠️ INICIANDO PROTOCOLO GÊNESIS (ALOCAÇÃO DETALHADA)...");

        // 1. A GRANDE QUEIMA (Limpeza das Collections)
        await Promise.all([
            require('../models/Trade').deleteMany({}),
            require('../models/LockedBond').deleteMany({}),
            require('../models/MarketOrder').deleteMany({}),
            require('../models/DailyStats').deleteMany({}),
            require('../models/Meme').deleteMany({}),
            require('../models/Spotted').deleteMany({})
        ]);
        
        console.log("✅ Dados transacionais deletados.");

        // 2. REBOOT DOS USUÁRIOS (Drop Inicial)
        const systemEmails = Object.values(TOKEN.WALLETS);
        const INIT_BALANCE = TOKEN.CAPS.INITIAL_USER_BALANCE || 1000;

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
                        descricao: 'Season 2: Airdrop Inicial', 
                        categoria: 'SYSTEM', 
                        data: new Date() 
                    }]
                }
            }
        );

        // 3. ENGENHARIA FINANCEIRA (Criação das Carteiras)
        
        // Remove carteiras antigas para recriar limpo
        // Cálculos
        const totalUsers = await UsuarioModel.countDocuments({ email: { $nin: systemEmails } });
        const distributedToUsers = totalUsers * INIT_BALANCE;
        
        // Somas fixas
        const fixedAllocations = 
            TOKEN.ALLOCATION.LOCKED_TREASURY + 
            TOKEN.ALLOCATION.CASHBACK_FUND + 
            TOKEN.ALLOCATION.CENTRAL_BANK;

        const generalTreasuryBalance = TOKEN.CAPS.TOTAL_SUPPLY - fixedAllocations - distributedToUsers;

        const walletsToCreate = [
            // 1. TESOURO GERAL (O Resto)
            {
                email: TOKEN.WALLETS.TREASURY,
                nome: "Tesouro Geral", // Nome ajustado
                role: "admin",
                status: "ativo",
                saldo_coins: generalTreasuryBalance,
                classe: "TECNOMANTE",
                avatar_slug: "bank",
                extrato: [{ tipo: 'ENTRADA', valor: generalTreasuryBalance, descricao: 'Gênesis', categoria: 'SYSTEM', data: new Date() }]
            },
            // 2. TESOURO BLOQUEADO (500kk)
            {
                email: TOKEN.WALLETS.TREASURY_LOCKED, // Certifique-se que esta chave existe no tokenomics!
                nome: "Fundo Soberano", // Nome ajustado
                role: "admin",
                status: "ativo",
                saldo_coins: TOKEN.ALLOCATION.LOCKED_TREASURY,
                classe: "TECNOMANTE",
                avatar_slug: "safe",
                extrato: [{ tipo: 'ENTRADA', valor: TOKEN.ALLOCATION.LOCKED_TREASURY, descricao: 'Gênesis', categoria: 'SYSTEM', data: new Date() }]
            },
            // 3. FUNDO DE CASHBACK (165kk)
            {
                email: TOKEN.WALLETS.CASHBACK,
                nome: "Pool Cashback",
                role: "admin",
                status: "ativo",
                saldo_coins: TOKEN.ALLOCATION.CASHBACK_FUND,
                classe: "BARDO",
                avatar_slug: "gift",
                extrato: [{ tipo: 'ENTRADA', valor: TOKEN.ALLOCATION.CASHBACK_FUND, descricao: 'Gênesis', categoria: 'SYSTEM', data: new Date() }]
            },
            // 4. BANCO CENTRAL (100kk)
            {
                email: TOKEN.WALLETS.BANK,
                nome: "Banco Central",
                role: "gm",
                status: "ativo",
                saldo_coins: TOKEN.ALLOCATION.CENTRAL_BANK,
                saldo_glue: 100000,
                classe: "ESPECULADOR",
                avatar_slug: "robot",
                extrato: [{ tipo: 'ENTRADA', valor: TOKEN.ALLOCATION.CENTRAL_BANK, descricao: 'Gênesis', categoria: 'SYSTEM', data: new Date() }]
            },
            // 5. TAXAS (Começa zerado)
            {
                email: TOKEN.WALLETS.FEES,
                nome: "Taxas Acumuladas",
                role: "admin",
                status: "ativo",
                saldo_coins: 0,
                classe: "ESPECULADOR",
                avatar_slug: "tax"
            },
            // 6. BURN (Começa zerado)
            {
                email: TOKEN.WALLETS.BURN,
                nome: "Buraco Negro",
                role: "admin",
                status: "banido",
                saldo_coins: 0,
                classe: "BRUXO",
                avatar_slug: "fire"
            }
        ];

        await UsuarioModel.insertMany(walletsToCreate);
        console.log("✅ Carteiras do Sistema alocadas com sucesso.");

        // 4. REBOOT DO ESTADO DO SISTEMA
        await SystemState.deleteMany({});
        
        await SystemState.create({
            season_id: TOKEN.SEASON.ID || 1,
            season_start_date: new Date(),
            current_day: 0,
            last_processed_day: -1, // Importante para o DailyTreasury rodar hoje a noite (ou agora)
            
            glue_price_base: 1000,
            glue_price_multiplier: 1.10,
            glue_supply_circulating: 0,
            
            total_burned: 0,
            total_fees_collected: 0,
            market_is_open: true,

            // Inicializa os potes com zero, o DailyTreasury vai encher eles logo em seguida
            referral_pool_available: 0,
            cashback_pool_available: 0
        });

        console.log("✅ SystemState reiniciado.");

        res.json({ 
            success: true, 
            message: "PROTOCOL GENESIS COMPLETED. ALLOCATION DONE.",
            stats: {
                users_count: totalUsers,
                general_treasury: generalTreasuryBalance,
                locked_funds: TOKEN.ALLOCATION.LOCKED_TREASURY
            }
        });

    } catch (e) {
        console.error("❌ ERRO CRÍTICO NO GENESIS:", e);
        res.status(500).json({ error: e.message });
    }
};