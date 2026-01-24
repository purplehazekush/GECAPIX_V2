// server/controllers/pixController.js
const PixModel = require('../models/Pix');
const UsuarioModel = require('../models/Usuario');

// --- 1. GET FEED (Mantido) ---
exports.getFeed = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'todos', q } = req.query;
        const skip = (page - 1) * limit;
        let query = {};

        if (status === 'pendentes') query.$or = [{ item_vendido: { $exists: false } }, { item_vendido: "" }];
        else if (status === 'registrados') query.item_vendido = { $ne: "", $exists: true };
        
        if (q) query.remetente_extraido = { $regex: q, $options: 'i' };

        const pixList = await PixModel.find(query).sort({ data: -1 }).skip(skip).limit(parseInt(limit));
        const total = await PixModel.countDocuments(query);

        res.json({ data: pixList, meta: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ error: "Erro feed" }); }
};

// --- 2. WEBHOOK (Mantido) ---
exports.createWebhook = async (req, res) => {
    try {
        const body = req.body;
        const texto = body.mensagem_texto || body.text || JSON.stringify(body);
        const regex = /"(.*?)" te enviou um Pix de R\$ ([\d,.]+)/;
        const match = texto.match(regex);
        let remetente = "Desconhecido", valor = "0,00";
        if (match) { remetente = match[1]; valor = match[2]; }

        await PixModel.create({
            raw_body: body, mensagem_texto: texto, remetente_extraido: remetente,
            valor_extraido: valor, tipo: 'PIX', vendedor_nome: 'Sistema'
        });
        res.status(200).send('OK');
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// --- 3. VENDA MANUAL (Com Ledger e XP) ---
exports.createManual = async (req, res) => {
    try {
        const { item, valor, quantidade, vendedor_nome, vendedor_email } = req.body;
        const valorFormatado = parseFloat(valor).toFixed(2).replace('.', ',');

        const novaVenda = await PixModel.create({
            tipo: 'DINHEIRO', remetente_extraido: "Venda Balcão (Dinheiro)", valor_extraido: valorFormatado,
            mensagem_texto: `Venda manual: ${quantidade}x ${item}`, item_vendido: item,
            quantidade, vendedor_nome, vendedor_email, data: new Date()
        });

        // Gamification Atômico + Ledger
        if (vendedor_email) {
            await UsuarioModel.updateOne(
                { email: vendedor_email },
                { 
                    $inc: { xp: 5, saldo_coins: 2 },
                    $push: { extrato: { tipo: 'ENTRADA', valor: 2, descricao: 'Comissão Venda Manual', data: new Date() } }
                }
            );
        }
        res.status(201).json({ success: true, doc: novaVenda });
    } catch (error) { res.status(500).json({ error: "Erro venda manual" }); }
};

// --- 4. UPDATE PIX (Mineração com Ledger) ---
exports.updatePix = async (req, res) => {
    try {
        const { item, quantidade, editor_email, vendedor_nome } = req.body;
        
        const pixAtual = await PixModel.findById(req.params.id);
        if (!pixAtual) return res.status(404).json({ error: "Não encontrado" });

        const ehPrimeiraEdicao = !pixAtual.item_vendido;

        pixAtual.historico_edicoes.push({
            alterado_por: editor_email, valor_antigo: pixAtual.valor_extraido,
            item_antigo: pixAtual.item_vendido, data_alteracao: new Date()
        });

        pixAtual.item_vendido = item;
        pixAtual.quantidade = quantidade || 1;
        pixAtual.vendedor_email = editor_email;
        if (vendedor_nome) pixAtual.vendedor_nome = vendedor_nome;

        await pixAtual.save();

        // Gamification: Mineração de Dados
        if (ehPrimeiraEdicao && editor_email) {
            const XP_REWARD = 10;
            const COIN_REWARD = 5;

            await UsuarioModel.updateOne(
                { email: editor_email },
                { 
                    $inc: { xp: XP_REWARD, saldo_coins: COIN_REWARD },
                    $push: { extrato: { tipo: 'ENTRADA', valor: COIN_REWARD, descricao: 'Mineração de Pix', data: new Date() } }
                }
            );
        }
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Erro ao salvar venda" }); }
};