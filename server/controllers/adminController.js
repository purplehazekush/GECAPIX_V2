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


/// 4. PROTOCOLO GÊNESIS (RESET TOTAL BLINDADO)
exports.resetSeason = async (req, res) => {
    try {
        const { confirm } = req.body;
        if (confirm !== "PROTOCOL_GENESIS_EXECUTE") return res.status(400).json({ error: "Confirmação inválida" });

        console.log("⚠️ INICIANDO PROTOCOLO GÊNESIS v2 (UPSERT MODE)...");

        // 1. DEFINIÇÃO ANTECIPADA (Corrige o ReferenceError)
        // Extraímos os emails agora para usar nos filtros logo abaixo
        const systemEmails = Object.values(TOKEN.WALLETS);

        // 2. A GRANDE QUEIMA (Limpeza das Collections)
        await Promise.all([
            require('../models/Trade').deleteMany({}),
            require('../models/LockedBond').deleteMany({}),
            require('../models/MarketOrder').deleteMany({}),
            require('../models/DailyStats').deleteMany({}),
            require('../models/Meme').deleteMany({}),
            require('../models/Spotted').deleteMany({})
        ]);
        
        console.log("✅ Dados transacionais deletados.");

        // 3. REBOOT DOS USUÁRIOS (Drop Inicial)
        const INIT_BALANCE = TOKEN.CAPS.INITIAL_USER_BALANCE || 1000;

        await UsuarioModel.updateMany(
            { email: { $nin: systemEmails } }, // IGNORA as carteiras de sistema
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
        
        console.log("✅ Usuários comuns resetados.");

        // 4. CÁLCULO MATEMÁTICO DO TESOURO
        const totalUsers = await UsuarioModel.countDocuments({ email: { $nin: systemEmails } });
        const distributedToUsers = totalUsers * INIT_BALANCE;
        
        const fixedAllocations = 
            TOKEN.ALLOCATION.LOCKED_TREASURY + 
            TOKEN.ALLOCATION.CASHBACK_FUND + 
            TOKEN.ALLOCATION.CENTRAL_BANK;

        const generalTreasuryBalance = TOKEN.CAPS.TOTAL_SUPPLY - fixedAllocations - distributedToUsers;

        if (generalTreasuryBalance < 0) throw new Error("ERRO CRÍTICO: Alocação excede o Supply Total!");

        // 5. INJEÇÃO DAS CARTEIRAS (USANDO UPSERT PARA EVITAR ERRO DE DUPLICIDADE)
        const walletsToConfig = [
            // 1. TESOURO GERAL
            {
                email: TOKEN.WALLETS.TREASURY,
                nome: "Tesouro Geral",
                role: "admin", status: "ativo", classe: "TECNOMANTE", avatar_slug: "bank",
                saldo_coins: generalTreasuryBalance,
                extrato: [{ tipo: 'ENTRADA', valor: generalTreasuryBalance, descricao: 'Gênesis: Alocação Geral', categoria: 'SYSTEM', data: new Date() }]
            },
            // 2. TESOURO BLOQUEADO
            {
                email: TOKEN.WALLETS.TREASURY_LOCKED,
                nome: "Fundo Soberano",
                role: "admin", status: "ativo", classe: "TECNOMANTE", avatar_slug: "safe",
                bio: "Fundos bloqueados por 6 meses.",
                saldo_coins: TOKEN.ALLOCATION.LOCKED_TREASURY,
                extrato: [{ tipo: 'ENTRADA', valor: TOKEN.ALLOCATION.LOCKED_TREASURY, descricao: 'Gênesis: Alocação Travada', categoria: 'SYSTEM', data: new Date() }]
            },
            // 3. FUNDO DE CASHBACK
            {
                email: TOKEN.WALLETS.CASHBACK,
                nome: "Gecaback",
                role: "admin", status: "ativo", classe: "BARDO", avatar_slug: "gift",
                saldo_coins: TOKEN.ALLOCATION.CASHBACK_FUND,
                extrato: [{ tipo: 'ENTRADA', valor: TOKEN.ALLOCATION.CASHBACK_FUND, descricao: 'Gênesis: Pool Gecaback', categoria: 'SYSTEM', data: new Date() }]
            },
            // 4. BANCO CENTRAL
            {
                email: TOKEN.WALLETS.BANK,
                nome: "Banco Central",
                role: "gm", status: "ativo", classe: "ESPECULADOR", avatar_slug: "robot",
                saldo_coins: TOKEN.ALLOCATION.CENTRAL_BANK,
                saldo_glue: 100000,
                extrato: [{ tipo: 'ENTRADA', valor: TOKEN.ALLOCATION.CENTRAL_BANK, descricao: 'Gênesis: Liquidez Inicial', categoria: 'SYSTEM', data: new Date() }]
            },
            // 5. TAXAS
            {
                email: TOKEN.WALLETS.FEES,
                nome: "Taxas Acumuladas",
                role: "admin", status: "ativo", classe: "ESPECULADOR", avatar_slug: "tax",
                saldo_coins: 0
            },
            // 6. BURN
            {
                email: TOKEN.WALLETS.BURN,
                nome: "Buraco Negro",
                role: "admin", status: "banido", classe: "BRUXO", avatar_slug: "fire",
                saldo_coins: 0
            }
        ];

        console.log("🛠️ Sincronizando carteiras de sistema...");

        for (const wallet of walletsToConfig) {
            // 🔥 A MÁGICA: findOneAndUpdate com upsert: true
            // Se existe, atualiza o saldo para o valor correto do Gênesis.
            // Se não existe, cria do zero.
            await UsuarioModel.findOneAndUpdate(
                { email: wallet.email },
                { $set: wallet },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`   ✅ Sincronizada: ${wallet.nome} | ${wallet.saldo_coins}`);
        }

        // 6. REBOOT SYSTEM STATE
        await SystemState.deleteMany({});
        await SystemState.create({
            season_id: TOKEN.SEASON.ID || 2,
            season_start_date: new Date(),
            current_day: 0,
            last_processed_day: -1,
            
            // Dados Financeiros
            last_apr_liquid: 0.005,
            last_apr_locked: 0.015,
            real_world_cashback_rate: 120, // Cotação Inicial
            
            // AMM
            glue_price_base: 50,
            glue_price_multiplier: 1.05,
            glue_supply_circulating: 0,
            
            total_burned: 0,
            total_fees_collected: 0,
            market_is_open: true,
            referral_pool_available: 0,
            cashback_pool_available: 0
        });

        console.log("✅ SystemState reiniciado.");

        res.json({ 
            success: true, 
            message: "GENESIS COMPLETED. ECONOMY SYNCHRONIZED.",
            stats: {
                users_count: totalUsers,
                treasury: generalTreasuryBalance,
                locked: TOKEN.ALLOCATION.LOCKED_TREASURY
            }
        });

    } catch (e) {
        console.error("❌ ERRO CRÍTICO NO GENESIS:", e);
        res.status(500).json({ error: e.message });
    }
};