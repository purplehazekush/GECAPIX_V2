const UsuarioModel = require('../models/Usuario');
const MarketOrderModel = require('../models/MarketOrder');
const PixController = require('./pixController'); // Reutiliza sua lógica de PIX existente
const TOKEN = require('../config/tokenomics');

// --- 1. MERCADO P2P (ORDERBOOK) ---

// Listar ofertas abertas
exports.getOfertasP2P = async (req, res) => {
    try {
        // Traz as ofertas mais baratas primeiro (Melhor deal pro comprador)
        const ofertas = await MarketOrderModel.find({ status: 'ABERTA' })
            .sort({ preco_coins: 1 }) 
            .limit(50);
        res.json(ofertas);
    } catch (e) { res.status(500).json({ error: "Erro ao buscar ofertas." }); }
};

// Criar oferta (Alguém vendendo GLUE por Coins)
exports.criarOfertaP2P = async (req, res) => {
    try {
        const { email, preco_coins } = req.body;
        const QTD_GLUE = 1; // Venda unitária por padrão para simplificar

        const user = await UsuarioModel.findOne({ email });
        if (user.saldo_glue < QTD_GLUE) return res.status(400).json({ error: "Você não tem GLUE para vender." });

        // 1. Trava o GLUE do vendedor (Custódia)
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_glue: -QTD_GLUE },
            $push: { extrato: { tipo: 'SAIDA', valor: 0, descricao: 'Custódia: Venda P2P', categoria: 'MARKET', data: new Date() } }
        });

        // 2. Cria a Ordem
        const ordem = await MarketOrderModel.create({
            vendedor_id: user._id,
            vendedor_nome: user.nome,
            vendedor_avatar: user.avatar_slug,
            quantidade_glue: QTD_GLUE,
            preco_coins: parseInt(preco_coins)
        });

        res.json(ordem);
    } catch (e) { res.status(500).json({ error: "Erro ao criar oferta." }); }
};

// Comprar oferta (Alguém pagando Coins para receber GLUE)
exports.comprarOfertaP2P = async (req, res) => {
    try {
        const { email, ordemId } = req.body;
        
        // Atomicidade é crucial aqui
        const comprador = await UsuarioModel.findOne({ email });
        const ordem = await MarketOrderModel.findById(ordemId);

        if (!ordem || ordem.status !== 'ABERTA') return res.status(400).json({ error: "Oferta indisponível." });
        if (ordem.vendedor_id === comprador._id.toString()) return res.status(400).json({ error: "Não pode comprar de si mesmo." });
        if (comprador.saldo_coins < ordem.preco_coins) return res.status(400).json({ error: "GecaCoins insuficientes." });

        // 1. Debita Coins do Comprador + Recebe GLUE
        await UsuarioModel.updateOne({ _id: comprador._id }, {
            $inc: { saldo_coins: -ordem.preco_coins, saldo_glue: ordem.quantidade_glue },
            $push: { extrato: { tipo: 'SAIDA', valor: ordem.preco_coins, descricao: `Compra P2P: 1 GLUE`, categoria: 'MARKET', data: new Date() } }
        });

        // 2. Paga Coins ao Vendedor
        await UsuarioModel.updateOne({ _id: ordem.vendedor_id }, {
            $inc: { saldo_coins: ordem.preco_coins },
            $push: { extrato: { tipo: 'ENTRADA', valor: ordem.preco_coins, descricao: `Venda P2P Concluída`, categoria: 'MARKET', data: new Date() } }
        });

        // 3. Fecha Ordem
        ordem.status = 'VENDIDA';
        ordem.comprador_id = comprador._id;
        ordem.data_conclusao = new Date();
        await ordem.save();

        res.json({ success: true, message: "Negócio fechado!" });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Erro na transação." }); 
    }
};

// Cancelar oferta (Devolve o GLUE)
exports.cancelarOfertaP2P = async (req, res) => {
    try {
        const { email, ordemId } = req.body;
        const user = await UsuarioModel.findOne({ email });
        const ordem = await MarketOrderModel.findById(ordemId);

        if (!ordem || ordem.status !== 'ABERTA') return res.status(400).json({ error: "Impossível cancelar." });
        if (ordem.vendedor_id !== user._id.toString()) return res.status(403).json({ error: "Não autorizado." });

        // Devolve o bem
        await UsuarioModel.updateOne({ _id: user._id }, {
            $inc: { saldo_glue: ordem.quantidade_glue },
            $push: { extrato: { tipo: 'ENTRADA', valor: 0, descricao: 'Estorno: Venda Cancelada', categoria: 'MARKET', data: new Date() } }
        });

        ordem.status = 'CANCELADA';
        await ordem.save();

        res.json({ success: true });

    } catch (e) { res.status(500).json({ error: "Erro ao cancelar." }); }
};