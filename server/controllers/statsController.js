// server/controllers/statsController.js
const PixModel = require('../models/Pix');
const UsuarioModel = require('../models/Usuario');
const DailyStatsModel = require('../models/DailyStats');
const TOKEN = require('../config/tokenomics'); // Importante para pegar os e-mails
const SystemState = require('../models/SystemState');

exports.getTokenomics = async (req, res) => {
    try {
        const state = await SystemState.findOne({ season_id: 1 }) || {};
        // 1. Supply Total Real (Soma de todos os saldos no banco)
        const aggregator = await UsuarioModel.aggregate([
            { $group: { _id: null, totalSupply: { $sum: "$saldo_coins" } } }
        ]);
        const supply = aggregator[0]?.totalSupply || 0;

        // 2. Mapeamento das Carteiras de Sistema
        const systemEmails = Object.values(TOKEN.WALLETS);
        
        const systemWallets = await UsuarioModel.find({
            email: { $in: systemEmails }
        });

        // Cria um mapa { 'treasury': 233000, 'locked': 500000, ... }
        const walletMap = {};
        systemWallets.forEach(w => {
            // Identifica qual carteira é baseada no e-mail
            const key = Object.keys(TOKEN.WALLETS).find(k => TOKEN.WALLETS[k] === w.email);
            if (key) walletMap[key.toLowerCase()] = w.saldo_coins;
        });

        // Valores de segurança caso alguma carteira não exista ainda
        const val = (key) => walletMap[key.toLowerCase()] || 0;

        // 3. Cálculo do Circulante da Comunidade
        // Circulante = Total - Todas as Carteiras de Sistema
        const totalSystem = systemWallets.reduce((acc, w) => acc + w.saldo_coins, 0);
        const communityCirculating = supply - totalSystem;

        // 4. Top Holders (Baleias Reais)
        // 🔥 EXCLUI AS CARTEIRAS DE SISTEMA DA LISTA
        const whales = await UsuarioModel.find({
            email: { $nin: systemEmails }, // Exclui Treasury, Bank, etc.
            saldo_coins: { $gt: 0 } // Opcional: esconde zerados
        })
        .sort({ saldo_coins: -1 })
        .limit(10)
        .select('nome saldo_coins avatar_slug classe');

        // 5. Total de Holders (Pessoas reais)
        const holders = await UsuarioModel.countDocuments({ 
            email: { $nin: systemEmails },
            saldo_coins: { $gt: 0 }
        });

        res.json({
            supply,
            holders,
            circulating: communityCirculating, // Isso é o que está na mão dos alunos
            // 🔥 Adicionamos a cotação aqui
            cashback_rate: state.real_world_cashback_rate || 120, 
            wallets: {
                treasury: walletMap['treasury'] || 0,
                locked: walletMap['locked'] || 0,
                cashback: walletMap['cashback'] || 0,
                bank: walletMap['central_bank'] || 0,
                fees: walletMap['trading_fees'] || 0,
                burn: walletMap['burn'] || 0
            },
            whales
        });

    } catch (e) {
        console.error("Erro Tokenomics:", e);
        res.status(500).json({ error: "Erro ao calcular tokenomics" });
    }
};

exports.getStats = async (req, res) => {
    try {
        // 1. Define o range de tempo (Início do Mês Atual)
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0,0,0,0);
        
        // 2. Busca TUDO do mês (Para MVP, processar no JS é mais seguro que Agregações complexas de String)
        const transacoes = await PixModel.find({ data: { $gte: inicioMes } });
        
        // 3. Inicializa Variáveis
        let faturamentoTotal = 0;
        let mapVendedores = {}; // { 'Joao': 150.00 }
        let mapProdutos = {};   // { 'Cerveja': { qtd: 5, total: 50.00 } }
        let mapHoras = new Array(24).fill(0); // [0, 0, ..., 0]
        let mapTipo = { 'PIX': 0, 'DINHEIRO': 0 };

        // 4. Loop Único (Alta Performance)
        transacoes.forEach(pix => {
            // A. Tratamento de Valor (String "1.250,50" -> Float 1250.50)
            let valorFloat = 0;
            if (pix.valor_extraido) {
                const limpo = pix.valor_extraido.toString().replace('.', '').replace(',', '.');
                valorFloat = parseFloat(limpo) || 0;
            }
            faturamentoTotal += valorFloat;

            // B. Top Vendedor
            const vendedor = pix.vendedor_nome || "Sistema";
            if (!mapVendedores[vendedor]) mapVendedores[vendedor] = 0;
            mapVendedores[vendedor] += valorFloat;

            // C. Ranking de Produtos
            if (pix.item_vendido) {
                const item = pix.item_vendido;
                if (!mapProdutos[item]) mapProdutos[item] = { qtd: 0, total: 0 };
                mapProdutos[item].qtd += (pix.quantidade || 1);
                mapProdutos[item].total += valorFloat;
            }

            // D. Heatmap (Horas)
            const hora = new Date(pix.data).getHours(); // Ajustar timezone se necessário, aqui pega do server
            if (hora >= 0 && hora < 24) mapHoras[hora]++;

            // E. Distribuição
            const tipo = pix.tipo || 'PIX';
            if (mapTipo[tipo] !== undefined) mapTipo[tipo]++;
            else mapTipo['OUTROS'] = (mapTipo['OUTROS'] || 0) + 1;
        });

        // 5. Formatação Final para o Frontend

        // Top Vendedor: Transforma objeto em array, ordena e pega o primeiro
        const sortedVendedores = Object.entries(mapVendedores)
            .map(([nome, total]) => ({ nome, total }))
            .sort((a, b) => b.total - a.total);
        
        const top_vendedor = sortedVendedores.length > 0 ? sortedVendedores[0] : { nome: '--', total: 0 };

        // Ranking Produtos: Top 5
        const ranking = Object.entries(mapProdutos)
            .map(([nome, dados]) => ({ nome, ...dados }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        // Heatmap: Formato { hour: 0, value: 5 }
        const heatmap = mapHoras.map((val, idx) => ({ hour: idx, value: val }));

        // Distribuição: Formato { name: 'PIX', value: 10 }
        const distribuicao = Object.entries(mapTipo).map(([name, value]) => ({ name, value }));

        res.json({
            faturamento_mes: faturamentoTotal.toFixed(2),
            total_transacoes: transacoes.length,
            ticket_medio: (transacoes.length ? faturamentoTotal / transacoes.length : 0).toFixed(2),
            top_vendedor,
            ranking,
            heatmap,
            distribuicao
        });

    } catch (error) {
        console.error("Erro stats:", error);
        res.status(500).json({ error: "Erro ao calcular estatísticas" });
    }
};


exports.snapshotEconomy = async () => {
    try {
        console.log("📸 Tirando foto da economia...");
        
        // 1. Calcula Supply
        const aggregator = await UsuarioModel.aggregate([
            { $group: { _id: null, totalSupply: { $sum: "$saldo_coins" }, count: { $sum: 1 } } }
        ]);
        const supply = aggregator[0]?.totalSupply || 0;
        
        // 2. Calcula Tesouro
        const admin = await UsuarioModel.findOne({ role: 'admin' });
        const treasury = admin ? admin.saldo_coins : 0;

        // 3. Usuários Ativos (Logaram nas ultimas 24h)
        const ontem = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
        const activeUsers = await UsuarioModel.countDocuments({ ultimo_login: { $gte: ontem } });

        // 4. Salva
        await DailyStatsModel.create({
            total_supply: supply,
            circulating_supply: supply - treasury,
            active_users: activeUsers,
            data: new Date()
        });

        console.log("✅ Snapshot salvo.");
    } catch (e) {
        console.error("❌ Erro snapshot:", e);
    }
};

// Endpoint para o Front pegar o histórico
exports.getHistoricalStats = async (req, res) => {
    try {
        // Pega os ultimos 30 dias
        const history = await DailyStatsModel.find().sort({ data: 1 }).limit(30);
        res.json(history);
    } catch (e) { res.status(500).json({ error: "Erro histórico" }); }
};

// ... (imports)

exports.getGlobalTransactions = async (req, res) => {
    try {
        const limit = 20;
        const page = parseInt(req.query.page) || 0;
        const categoryFilter = req.query.category || 'ALL'; // Recebe filtro do front

        // Pipeline de Agregação (O Cérebro da Ledger)
        const pipeline = [
            { $unwind: "$extrato" }, // 1. Desmonta o array
            
            // 2. "Auto-Tagging" para dados legados (Retrocompatibilidade)
            { 
                $addFields: {
                    "extrato.categoria_inferida": {
                        $cond: {
                            if: { $ifNull: ["$extrato.categoria", false] },
                            then: "$extrato.categoria", // Se já tem categoria, usa ela
                            else: {
                                // Se não tem, adivinha pelo texto
                                $switch: {
                                    branches: [
                                        { case: { $regexMatch: { input: "$extrato.descricao", regex: /Aposta|Vitória|Reembolso|Empate/i } }, then: "GAME" },
                                        { case: { $regexMatch: { input: "$extrato.descricao", regex: /Transferência|Recebido/i } }, then: "P2P" },
                                        { case: { $regexMatch: { input: "$extrato.descricao", regex: /Login|Bônus|Indicou/i } }, then: "SYSTEM" },
                                        { case: { $regexMatch: { input: "$extrato.descricao", regex: /Compra|Loja/i } }, then: "SHOP" },
                                        { case: { $regexMatch: { input: "$extrato.descricao", regex: /Meme/i } }, then: "MEME" }
                                    ],
                                    default: "OUTROS"
                                }
                            }
                        }
                    }
                }
            },

            // 3. Filtro (Se selecionado)
            ...(categoryFilter !== 'ALL' ? [{ $match: { "extrato.categoria_inferida": categoryFilter } }] : []),

            { $sort: { "extrato.data": -1 } },
            { $skip: page * limit },
            { $limit: limit },
            { 
                $project: { 
                    _id: 0,
                    usuario: "$nome",
                    avatar: "$avatar_slug",
                    tipo: "$extrato.tipo",
                    valor: "$extrato.valor",
                    descricao: "$extrato.descricao",
                    categoria: "$extrato.categoria_inferida", // Manda pro front
                    data: "$extrato.data"
                } 
            }
        ];

        const transactions = await UsuarioModel.aggregate(pipeline);
        res.json(transactions);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao buscar ledger" });
    }
};
