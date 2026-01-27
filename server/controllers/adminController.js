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

// 4. RESET DE TEMPORADA (Zera tudo)
// 4. PROTOCOLO GÊNESIS (RESET TOTAL)
exports.resetSeason = async (req, res) => {
    try {
        const { confirm } = req.body;
        // Senha de segurança para não rodar sem querer
        if (confirm !== "PROTOCOL_GENESIS_EXECUTE") return res.status(400).json({ error: "Confirmação inválida" });

        console.log("⚠️ INICIANDO PROTOCOLO GÊNESIS...");

        // 1. A GRANDE QUEIMA (Wipeout)
        await Trade.deleteMany({});
        await LockedBond.deleteMany({});
        await MarketOrder.deleteMany({});
        await DailyStats.deleteMany({});
        await Meme.deleteMany({});
        await Spotted.deleteMany({});
        // Se usar model de chat, limpar aqui também
        
        console.log("✅ Dados transacionais deletados.");

        // 2. REBOOT DOS USUÁRIOS
        // Zera todos os usuários normais (excluindo as carteiras de sistema por enquanto)
        const systemEmails = Object.values(TOKEN.WALLETS);
        
        await UsuarioModel.updateMany(
            { email: { $nin: systemEmails } }, // Não toca nas carteiras de sistema ainda
            {
                $set: {
                    saldo_coins: TOKEN.CAPS.INITIAL_USER_BALANCE,
                    saldo_glue: 0,
                    saldo_staking_liquido: 0,
                    xp: 0,
                    nivel: 1,
                    badges: [], // Limpa conquistas
                    quest_progress: [],
                    missoes_concluidas: [],
                    extrato: [{ 
                        tipo: 'ENTRADA', 
                        valor: TOKEN.CAPS.INITIAL_USER_BALANCE, 
                        descricao: 'Gênesis: Season 2 Start', 
                        categoria: 'SYSTEM', 
                        data: new Date() 
                    }]
                }
            }
        );
        
        console.log("✅ Usuários resetados para nível 1 e saldo inicial.");

        // 3. RECRIAR CARTEIRAS DE SISTEMA (Accounting)
        // Primeiro deletamos as antigas para garantir pureza
        await UsuarioModel.deleteMany({ email: { $in: systemEmails } });

        // Calcula Saldo do Tesouro: Total Supply - (Usuários * Saldo Inicial)
        const totalUsers = await UsuarioModel.countDocuments({ email: { $nin: systemEmails } });
        const circulatingStart = totalUsers * TOKEN.CAPS.INITIAL_USER_BALANCE;
        const treasuryBalance = TOKEN.CAPS.TOTAL_SUPPLY - circulatingStart;

        const walletsToCreate = [
            {
                email: TOKEN.WALLETS.TREASURY,
                nome: "Tesouro Nacional",
                role: "admin",
                status: "ativo",
                saldo_coins: treasuryBalance,
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
                status: "banido", // Ninguém acessa
                saldo_coins: 0,
                classe: "BRUXO",
                avatar_slug: "fire"
            },
            {
                email: TOKEN.WALLETS.BANK,
                nome: "Banco Central (Bot)",
                role: "gm",
                status: "ativo",
                saldo_coins: 1000000, // Liquidez para o Market Maker operar
                saldo_glue: 100000,   // Estoque de Glue
                classe: "ESPECULADOR",
                avatar_slug: "robot"
            }
        ];

        await UsuarioModel.insertMany(walletsToCreate);
        console.log("✅ Carteiras do Sistema recriadas e auditadas.");

        // 4. REBOOT DO BANCO CENTRAL
        await SystemState.deleteMany({}); // Limpa estado antigo
        
        await SystemState.create({
            season_id: TOKEN.SEASON.ID,
            season_start_date: new Date(),
            current_day: 0,
            
            glue_price_base: 50, // Preço inicial limpo
            glue_price_multiplier: 1.05, // Reset do multiplicador
            glue_supply_circulating: 0, // Reset do supply de GLUE
            
            total_burned: 0,
            total_fees_collected: 0,
            
            market_is_open: true
        });

        console.log("✅ Banco Central reiniciado: Dia 0.");

        res.json({ 
            success: true, 
            message: "PROTOCOL GENESIS COMPLETED. ECONOMY RESET.",
            stats: {
                users_reset: totalUsers,
                treasury_balance: treasuryBalance
            }
        });

    } catch (e) {
        console.error("❌ ERRO CRÍTICO NO GENESIS:", e);
        res.status(500).json({ error: e.message });
    }
};