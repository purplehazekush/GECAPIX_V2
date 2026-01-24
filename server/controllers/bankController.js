// server/controllers/bankController.js
const UsuarioModel = require('../models/Usuario');
const LockedBondModel = require('../models/LockedBond');
const SystemState = require('../models/SystemState');
const TOKEN = require('../config/tokenomics');

// --- 1. STAKING LÍQUIDO ---

exports.depositarLiquido = async (req, res) => {
    try {
        const { email, valor } = req.body;
        const amount = parseInt(valor);
        if (amount <= 0) return res.status(400).json({ error: "Valor inválido" });

        const user = await UsuarioModel.findOne({ email });
        if (user.saldo_coins < amount) return res.status(400).json({ error: "Saldo insuficiente" });

        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_coins: -amount, saldo_staking_liquido: amount },
            $push: { extrato: { tipo: 'SAIDA', valor: amount, descricao: 'Depósito: Renda Fixa', categoria: 'BANK', data: new Date() } }
        });

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Erro no depósito" }); }
};

exports.sacarLiquido = async (req, res) => {
    try {
        const { email, valor } = req.body;
        const amount = parseInt(valor);
        const user = await UsuarioModel.findOne({ email });
        
        if (user.saldo_staking_liquido < amount) return res.status(400).json({ error: "Saldo em staking insuficiente" });

        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_coins: amount, saldo_staking_liquido: -amount },
            $push: { extrato: { tipo: 'ENTRADA', valor: amount, descricao: 'Resgate: Renda Fixa', categoria: 'BANK', data: new Date() } }
        });

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Erro no saque" }); }
};

// --- 2. STAKING LOCKED (TÍTULOS) ---

exports.comprarTitulo = async (req, res) => {
    console.log("💰 [BANK] Tentativa de compra:", req.body);
    try {
        const { email, valor } = req.body;
        
        // FAILSAFE: Se o tokenomics não carregar, usa valor padrão (1.5%)
        const APR_DIARIO = TOKEN.BANK?.LOCKED_APR_DAILY || 0.015;
        const DIAS_TRAVA = TOKEN.BANK?.LOCKED_PERIOD_DAYS || 30;

        const amount = parseInt(valor);
        const user = await UsuarioModel.findOne({ email });

        if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
        if (user.saldo_coins < amount) return res.status(400).json({ error: "Saldo insuficiente" });

        // Calcula Vencimento
        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + DIAS_TRAVA);

        // 1. Cria o Título (Agora com garantia de valor no APR)
        const titulo = await LockedBondModel.create({
            owner_id: user._id,
            valor_inicial: amount,
            valor_atual: amount,
            data_vencimento: vencimento,
            apr_contratada: APR_DIARIO // <--- Agora nunca será undefined
        });

        // 2. Debita Usuário
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_coins: -amount },
            $push: { extrato: { tipo: 'SAIDA', valor: amount, descricao: `Compra: Título Público`, categoria: 'INVEST', data: new Date() } }
        });

        res.json(titulo);

    } catch (e) { 
        console.error("❌ ERRO COMPRA TÍTULO:", e);
        res.status(500).json({ error: "Erro ao processar investimento." }); 
    }
};

exports.listarTitulos = async (req, res) => {
    try {
        const { email } = req.query;
        const user = await UsuarioModel.findOne({ email });
        // Busca apenas ativos
        const titulos = await LockedBondModel.find({ owner_id: user._id, status: 'ATIVO' });
        res.json(titulos);
    } catch (e) { res.status(500).json({ error: "Erro ao listar" }); }
};

exports.resgatarTitulo = async (req, res) => {
    try {
        const { email, tituloId } = req.body;
        const user = await UsuarioModel.findOne({ email });
        const titulo = await LockedBondModel.findById(tituloId);

        if (!titulo || titulo.status !== 'ATIVO') return res.status(400).json({ error: "Título inválido ou já resgatado" });
        if (titulo.owner_id !== user._id.toString()) return res.status(403).json({ error: "Não autorizado" });

        const hoje = new Date();
        // Failsafe nas configurações
        const DIAS_TOTAIS = TOKEN.BANK?.LOCKED_PERIOD_DAYS || 30;
        const PENALTY_MAX = TOKEN.BANK?.PENALTY_MAX || 0.40;
        const PENALTY_MIN = TOKEN.BANK?.PENALTY_MIN || 0.10;

        const diasPassados = Math.floor((hoje - titulo.data_compra) / (1000 * 60 * 60 * 24));
        const diasRestantes = Math.max(0, DIAS_TOTAIS - diasPassados);
        
        let valorFinal = titulo.valor_atual;
        let penalty = 0;
        let isEarly = false;

        // Multa por saída antecipada
        if (hoje < titulo.data_vencimento) {
            isEarly = true;
            const taxa = PENALTY_MIN + (PENALTY_MAX - PENALTY_MIN) * (diasRestantes / DIAS_TOTAIS);
            penalty = Math.floor(valorFinal * taxa);
            valorFinal = valorFinal - penalty;

            // Burn & Fees
            const burnPart = Math.floor(penalty * 0.5);
            const feesPart = penalty - burnPart;
            
            await SystemState.updateOne({ season_id: 1 }, {
                $inc: { total_burned: burnPart, total_fees_collected: feesPart }
            });
        }

        // Credita Usuário
        await UsuarioModel.updateOne({ email }, {
            $inc: { saldo_coins: valorFinal },
            $push: { extrato: { 
                tipo: 'ENTRADA', 
                valor: valorFinal, 
                descricao: isEarly ? `Resgate Antecipado (Multa -${penalty})` : 'Vencimento Título Público', 
                categoria: 'INVEST', 
                data: new Date() 
            }}
        });

        titulo.status = isEarly ? 'QUEBRADO' : 'RESGATADO';
        await titulo.save();

        res.json({ success: true, valor_recebido: valorFinal, multa: penalty });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Erro no resgate" }); 
    }
};