require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

// Models
const Usuario = require('../models/Usuario');
const SystemState = require('../models/SystemState');
const Trade = require('../models/Trade');
const LockedBond = require('../models/LockedBond');
const Pix = require('../models/Pix');
const Meme = require('../models/Meme');
const Mensagem = require('../models/Mensagem');
const DailyStats = require('../models/DailyStats');
const Spotted = require('../models/Spotted');
const DatingProfile = require('../models/DatingProfile');
const MarketOrder = require('../models/MarketOrder');
const DynamicConfig = require('../models/DynamicConfig');
const Quest = require('../models/Quest');

const MONGO_URI = process.env.MONGO_URI;

// --- 1. HUMANOS (GOD MODE) ---
// Estes mantêm o acesso, mas resetam saldo para 10k
const GOD_EMAILS = [
    "joaovictorrabelo95@gmail.com",
    "joaovictorrabelo95.xchange@gmail.com"
];

// --- 2. SISTEMA (ALOCAÇÃO DE 1 BILHÃO) ---
// Configuração exata que você pediu
const SYSTEM_WALLETS = [
    { 
        email: "central_bank@gecapix.com", 
        nome: "🏦 BANCO CENTRAL (LIQUIDEZ)", 
        saldo: 120_000_000 
    },
    { 
        email: "cashback@geca.com", 
        nome: "🎁 FUNDO GECABACK", 
        saldo: 380_000_000 
    },
    { 
        email: "locked@gecapix.com", 
        nome: "🔒 FUNDO DE PARCERIAS", 
        saldo: 500_000_000 
    },
    { 
        email: "burn_address@gecapix.com", 
        nome: "🔥 BURACO NEGRO", 
        saldo: 0 
    },
    { 
        email: "trading_fees@gecapix.com", 
        nome: "💸 FEE COLLECTOR", 
        saldo: 0 
    },
    // Carteiras Auxiliares (Saldo 0 ou Operacional)
    { 
        email: "treasury@geca.com", 
        nome: "🏛️ TESOURO GERAL (RESERVA)", 
        saldo: 0 
    },
    { 
        email: "market_maker@gecapix.com", 
        nome: "🤖 MARKET MAKER BOT", 
        saldo: 1_000_000 // Capital de giro operacional para o bot não travar
    }
];

async function resetV4() {
    if (!MONGO_URI) { console.error("❌ Sem MONGO_URI"); process.exit(1); }

    console.log(`
    =============================================
       🧨  PROTOCOL RESET V4: CLEAN SLATE  🧨
    =============================================
    `);
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log("🔌 Conectado. Iniciando limpeza profunda...\n");

        // ====================================================
        // FASE 1: O EXPURGO (Limpeza de Tabelas)
        // ====================================================
        console.log("🗑️  Limpando tabelas...");
        await Promise.all([
            Trade.deleteMany({}),
            LockedBond.deleteMany({}),
            Pix.deleteMany({}),
            Meme.deleteMany({}),
            Mensagem.deleteMany({}),
            DailyStats.deleteMany({}),
            Spotted.deleteMany({}),
            DatingProfile.deleteMany({}),
            MarketOrder.deleteMany({}),
            SystemState.deleteMany({}),
            DynamicConfig.deleteMany({}),
            Quest.deleteMany({})
        ]);
        console.log("✅ Tabelas secundárias zeradas.");

        // ====================================================
        // FASE 2: FILTRO DE USUÁRIOS
        // ====================================================
        console.log("⚖️  Filtrando usuários...");
        
        const systemEmailsList = SYSTEM_WALLETS.map(w => w.email);
        const allowedEmails = [...GOD_EMAILS, ...systemEmailsList];

        // Deleta todo mundo que não está na lista VIP
        const deleted = await Usuario.deleteMany({ email: { $nin: allowedEmails } });
        console.log(`💀 ${deleted.deletedCount} usuários desconhecidos foram deletados.`);

        // ====================================================
        // FASE 3: RESET HUMANOS
        // ====================================================
        console.log("🧠 Resetando Humanos...");
        await Usuario.updateMany(
            { email: { $in: GOD_EMAILS } },
            { 
                $set: {
                    saldo_coins: 10000, 
                    saldo_glue: 50,
                    saldo_staking_liquido: 0,
                    xp: 0,
                    nivel: 10,
                    jogos_hoje: 0,
                    role: 'admin',
                    status: 'ativo',
                    extrato: [{
                        tipo: 'ENTRADA', valor: 10000, 
                        descricao: 'Gênesis V4', categoria: 'SYSTEM', data: new Date()
                    }],
                    // Limpa arrays
                    quest_progress: [],
                    missoes_concluidas: [],
                    badges: []
                }
            }
        );

        // ====================================================
        // FASE 4: A BANCA (Configuração Exata)
        // ====================================================
        console.log("🏦 Configurando Carteiras do Sistema...");

        for (const wallet of SYSTEM_WALLETS) {
            // Upsert: Cria se não existe, Atualiza se existe
            await Usuario.findOneAndUpdate(
                { email: wallet.email },
                {
                    $set: {
                        nome: wallet.nome,
                        role: 'admin',
                        status: 'ativo',
                        classe: 'NOVATO',
                        saldo_coins: wallet.saldo,
                        saldo_glue: 1000000, // Glue infinita pro sistema
                        saldo_staking_liquido: 0,
                        xp: 0,
                        extrato: [{
                            tipo: 'ENTRADA', valor: wallet.saldo, 
                            descricao: 'Alocação Gênesis V4', 
                            categoria: 'SYSTEM', data: new Date()
                        }]
                    }
                },
                { upsert: true, new: true }
            );
            console.log(`   -> ${wallet.nome}: ${wallet.saldo.toLocaleString()} GC`);
        }

        // ====================================================
        // FASE 5: START DO MERCADO (Big Bang)
        // ====================================================
        console.log("📈 Iniciando Mercado...");

        // 1. Estado
        await SystemState.create({
            season_id: 1,
            season_start_date: new Date(),
            current_day: 0,
            glue_price_base: 200,
            glue_price_multiplier: 1.015, // <--- ALTERADO DE 1.20 PARA 1.03 (3%)
            glue_supply_circulating: 0,
            referral_pool_available: 5000,
            cashback_pool_available: 10000,
            market_is_open: true,
            is_active: true,
            last_processed_day: -1 
        });

        // 2. Configs
        await DynamicConfig.create({
            ver: 'v1',
            TAX_RATE: 0.05,
            LOCKED_APR_DAILY: 0.012,
            MARKET_OPEN: true
        });

        // 3. PRIMEIRO TRADE (Bot compra 1 GLUE)
        const botUser = await Usuario.findOne({ email: "market_maker@gecapix.com" });
        if (botUser) {
            await Trade.create({
                userId: botUser._id,
                type: 'BUY',
                amount_glue: 1,
                amount_coins: 200,
                price_start: 200,
                price_end: 200,
                price_high: 200,
                price_low: 200,
                timestamp: new Date()
            });
            await SystemState.updateOne({ season_id: 1 }, { $inc: { glue_supply_circulating: 1 } });
            console.log("   -> 🕯️ Candle #1 Criado pelo Bot.");
        }

        console.log("\n✅ RESET V4 CONCLUÍDO. ECONOMIA ALINHADA.");
        process.exit(0);

    } catch (e) {
        console.error("💥 ERRO:", e);
        process.exit(1);
    }
}

resetV4();