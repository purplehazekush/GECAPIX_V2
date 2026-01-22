const PixModel = require('../models/Pix');
const UsuarioModel = require('../models/Usuario');

// --- 1. LISTAR FEED (Com Paginação e Filtros) ---
exports.getFeed = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'todos', q } = req.query;
        const skip = (page - 1) * limit;

        let query = {};

        // Filtro por Status
        if (status === 'pendentes') {
            query.$or = [{ item_vendido: { $exists: false } }, { item_vendido: "" }, { item_vendido: null }];
        } else if (status === 'registrados') {
            query.item_vendido = { $ne: "", $exists: true };
        }

        // Filtro por Busca (Nome do Remetente)
        if (q) {
            query.remetente_extraido = { $regex: q, $options: 'i' };
        }

        const pixList = await PixModel.find(query)
            .sort({ data: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await PixModel.countDocuments(query);

        res.json({
            data: pixList,
            meta: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Erro getFeed:", error);
        res.status(500).json({ error: "Erro ao buscar feed" });
    }
};

// --- 2. WEBHOOK (Recebe notificação do Banco) ---
exports.createWebhook = async (req, res) => {
    try {
        const body = req.body;
        const texto = body.mensagem_texto || body.text || JSON.stringify(body);
        
        // Regex para extrair dados da notificação do banco
        // Ajuste conforme a mensagem real do seu app de banco
        const regex = /"(.*?)" te enviou um Pix de R\$ ([\d,.]+)/;
        const match = texto.match(regex);
        
        let remetente = "Desconhecido";
        let valor = "0,00";
        
        if (match) { 
            remetente = match[1]; 
            valor = match[2]; 
        }

        await PixModel.create({
            raw_body: body,
            mensagem_texto: texto,
            remetente_extraido: remetente,
            valor_extraido: valor,
            tipo: 'PIX',
            vendedor_nome: 'Sistema'
        });
        
        res.status(200).send('OK');
    } catch (error) {
        console.error("Erro webhook:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- 3. VENDA MANUAL (Dinheiro) ---
exports.createManual = async (req, res) => {
    try {
        const { item, valor, quantidade, vendedor_nome, vendedor_email } = req.body;
        
        const valorFormatado = parseFloat(valor).toFixed(2).replace('.', ',');

        const novaVenda = await PixModel.create({
            tipo: 'DINHEIRO',
            remetente_extraido: "Venda Balcão (Dinheiro)",
            valor_extraido: valorFormatado,
            mensagem_texto: `Venda manual: ${quantidade}x ${item}`,
            item_vendido: item,
            quantidade: quantidade,
            vendedor_nome: vendedor_nome,
            vendedor_email: vendedor_email,
            data: new Date()
        });

        // --- GAMIFICATION: DAR XP PARA QUEM REGISTROU ---
        if (vendedor_email) {
            const operador = await UsuarioModel.findOne({ email: vendedor_email });
            if (operador) {
                // 1 Venda Manual = 5 XP + 2 Coins
                operador.xp += 5;
                operador.saldo_coins += 2;
                await operador.save();
            }
        }

        res.status(201).json({ success: true, doc: novaVenda });
    } catch (error) {
        console.error("Erro venda manual:", error);
        res.status(500).json({ error: "Erro ao registrar venda" });
    }
};

// --- 4. ATUALIZAR PIX (Identificar Venda + Gamification) ---
exports.updatePix = async (req, res) => {
    try {
        const { item, quantidade, editor_email, vendedor_nome } = req.body;
        
        const pixAtual = await PixModel.findById(req.params.id);
        if (!pixAtual) return res.status(404).json({ error: "Não encontrado" });

        // Verifica se é a primeira vez que está sendo vendido (para não dar XP duplo)
        const ehPrimeiraEdicao = !pixAtual.item_vendido;

        // Histórico
        pixAtual.historico_edicoes.push({
            alterado_por: editor_email,
            valor_antigo: pixAtual.valor_extraido,
            item_antigo: pixAtual.item_vendido,
            data_alteracao: new Date()
        });

        // Atualiza Dados
        pixAtual.item_vendido = item;
        pixAtual.quantidade = quantidade || 1;
        pixAtual.vendedor_email = editor_email;
        
        // Garante que o nome seja salvo
        if (vendedor_nome) {
            pixAtual.vendedor_nome = vendedor_nome;
        }

        await pixAtual.save();

        // --- GAMIFICATION (MINERAÇÃO) ---
        if (ehPrimeiraEdicao && editor_email) {
            const operador = await UsuarioModel.findOne({ email: editor_email });
            
            if (operador) {
                // Regra de Negócio:
                // Cada venda identificada no sistema = 10 XP + 5 GecaCoins
                const XP_REWARD = 10;
                const COIN_REWARD = 5;

                operador.xp += XP_REWARD;
                operador.saldo_coins += COIN_REWARD;
                
                await operador.save();
                console.log(`[GAME] ${operador.nome} ganhou ${XP_REWARD} XP pela venda.`);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Erro update pix:", error);
        res.status(500).json({ error: "Erro ao salvar venda" });
    }
};