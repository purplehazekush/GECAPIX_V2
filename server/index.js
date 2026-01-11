require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// --- MODELOS (DEFINIÇÃO DOS SCHEMAS) ---

// 1. Pix
const PixSchema = new mongoose.Schema({
    raw_body: Object,
    mensagem_texto: String,
    valor_extraido: String,
    remetente_extraido: String,
    item_vendido: { type: String, default: "" },
    quantidade: { type: Number, default: 1 },
    vendedor_email: String,
    historico_edicoes: [{
        alterado_por: String,
        valor_antigo: String,
        item_antigo: String,
        data_alteracao: { type: Date, default: Date.now }
    }],
    data: { type: Date, default: Date.now }
});
const PixModel = mongoose.models.Pix || mongoose.model('Pix', PixSchema);

// 2. Usuario
const UsuarioSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    role: { type: String, default: 'membro' },
    nome: String,
    status: { type: String, default: 'pendente' }
});
const UsuarioModel = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);

// 3. Produto
const ProdutoSchema = new mongoose.Schema({
    nome: String,
    preco: Number,
    ativo: { type: Boolean, default: true }
});
const ProdutoModel = mongoose.models.Produto || mongoose.model('Produto', ProdutoSchema);

// 4. Configuração (O QUE FALTAVA OU ESTAVA FORA DE LUGAR)
const ConfigSchema = new mongoose.Schema({
    chave: { type: String, unique: true },
    valor: Boolean
});
const ConfigModel = mongoose.models.Config || mongoose.model('Config', ConfigSchema);


// --- CONFIGURAÇÃO DO SERVIDOR ---
const app = express();
app.use(express.json());
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://gecapix-v2.vercel.app", // Verifique se o endereço na Vercel é exatamente este
        /\.vercel\.app$/ // Isso aceita qualquer subdomínio da vercel (útil para testes)
    ],
    credentials: true
}));
// ...

// --- CONEXÃO MONGODB ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("--> MongoDB Conectado! 🍃");
    } catch (error) {
        console.error("--> Erro MongoDB:", error);
    }
};
connectDB();

// ================= ROTAS DA API =================

// --- 1. CONFIGURAÇÃO GERAL (Modo Festa) ---
app.get('/api/config/modo-aberto', async (req, res) => {
    try {
        let config = await ConfigModel.findOne({ chave: 'sistema_aberto' });
        // Se não existir, cria o padrão (FECHADO/FALSE)
        if (!config) {
            config = await ConfigModel.create({ chave: 'sistema_aberto', valor: false });
        }
        res.json({ aberto: config.valor });
    } catch (error) {
        console.error("Erro config:", error);
        res.status(500).json({ error: "Erro ao ler config" });
    }
});

app.put('/api/config/modo-aberto', async (req, res) => {
    try {
        const { valor } = req.body;
        // Upsert: Atualiza se existe, cria se não existe
        const config = await ConfigModel.findOneAndUpdate(
            { chave: 'sistema_aberto' },
            { valor: valor },
            { upsert: true, new: true }
        );
        res.json({ aberto: config.valor });
    } catch (error) {
        console.error("Erro update config:", error);
        res.status(500).json({ error: "Erro ao mudar config" });
    }
});

// --- 2. AUTENTICAÇÃO ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, nome } = req.body;
        // ATENÇÃO: COLOQUE SEU EMAIL AQUI
        const EMAILS_ADMINS = ["joaovictorrabelo95@gmail.com", "caiogcosta03@gmail.com"]; 
        
        const totalUsers = await UsuarioModel.countDocuments();
        let user = await UsuarioModel.findOne({ email });

        if (!user) {
            const isVip = EMAILS_ADMINS.includes(email);
            const isFirst = totalUsers === 0;
            user = await UsuarioModel.create({
                email, nome,
                role: (isVip || isFirst) ? 'admin' : 'membro',
                status: (isVip || isFirst) ? 'ativo' : 'pendente'
            });
        } else {
            if (EMAILS_ADMINS.includes(email)) {
                let mudou = false;
                if (user.role !== 'admin') { user.role = 'admin'; mudou = true; }
                if (user.status !== 'ativo') { user.status = 'ativo'; mudou = true; }
                if (mudou) await user.save();
            }
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Erro no Login" });
    }
});

// --- 3. FEED PIX ---
app.get('/api/pix', async (req, res) => {
    try {
        const ultimos = await PixModel.find().sort({ data: -1 }).limit(50);
        res.json(ultimos);
    } catch (error) { res.status(500).json({ error: "Erro ao buscar pix" }); }
});

app.post('/api/pix', async (req, res) => {
    try {
        const body = req.body;
        const texto = body.mensagem_texto || body.text || JSON.stringify(body);
        const regex = /"(.*?)" te enviou um Pix de R\$ ([\d,.]+)/;
        const match = texto.match(regex);
        let remetente = "Desconhecido";
        let valor = "0,00";
        if (match) { remetente = match[1]; valor = match[2]; }

        await PixModel.create({
            raw_body: body,
            mensagem_texto: texto,
            remetente_extraido: remetente,
            valor_extraido: valor
        });
        res.status(200).send('OK');
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/pix/:id', async (req, res) => {
    try {
        const { item, quantidade, editor_email } = req.body;
        const pixAtual = await PixModel.findById(req.params.id);
        if (!pixAtual) return res.status(404).json({ error: "Não encontrado" });

        pixAtual.historico_edicoes.push({
            alterado_por: editor_email,
            valor_antigo: pixAtual.valor_extraido,
            item_antigo: pixAtual.item_vendido
        });
        pixAtual.item_vendido = item;
        pixAtual.quantidade = quantidade || 1;
        pixAtual.vendedor_email = editor_email;
        await pixAtual.save();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Erro ao salvar venda" }); }
});

// --- 4. PRODUTOS ---
app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await ProdutoModel.find({ ativo: true }).sort({ nome: 1 });
        res.json(produtos);
    } catch (error) { res.json([]); }
});

app.post('/api/produtos', async (req, res) => {
    try {
        const { nome, preco } = req.body;
        const novo = await ProdutoModel.create({ nome, preco });
        res.json(novo);
    } catch (error) { res.status(500).json({ error: "Erro ao criar produto" }); }
});

// --- 5. ADMINISTRAÇÃO ---
app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const usuarios = await UsuarioModel.find().sort({ nome: 1 });
        res.json(usuarios);
    } catch (error) { res.status(500).json({ error: "Erro buscar usuários" }); }
});

app.put('/api/admin/usuarios', async (req, res) => {
    try {
        const { email, novoStatus } = req.body;
        const user = await UsuarioModel.findOneAndUpdate(
            { email }, { status: novoStatus }, { new: true }
        );
        res.json({ success: true, user });
    } catch (error) { res.status(500).json({ error: "Erro atualizar usuário" }); }
});

// --- 6. STATS ---
app.get('/api/stats', async (req, res) => {
    try {
        const dataInicio = new Date();
        dataInicio.setDate(1); dataInicio.setHours(0,0,0,0);
        const transacoes = await PixModel.find({ data: { $gte: dataInicio } });

        let faturamentoTotal = 0;
        let statsProdutos = {}; 
        let statsVendedores = {};

        transacoes.forEach(pix => {
            let valorFloat = 0;
            if (pix.valor_extraido) {
                valorFloat = parseFloat(pix.valor_extraido.replace(/\./g, '').replace(',', '.')) || 0;
                faturamentoTotal += valorFloat;
            }
            if (pix.item_vendido) {
                const item = pix.item_vendido.toUpperCase();
                const qtd = pix.quantidade || 1;
                if (!statsProdutos[item]) statsProdutos[item] = { qtd: 0, total: 0 };
                statsProdutos[item].qtd += qtd;
                statsProdutos[item].total += valorFloat; 
                
                const vendedor = pix.vendedor_email ? pix.vendedor_email.split('@')[0] : 'Sistema';
                if (!statsVendedores[vendedor]) statsVendedores[vendedor] = 0;
                statsVendedores[vendedor] += valorFloat;
            }
        });

        const ranking = Object.entries(statsProdutos)
            .map(([nome, dados]) => ({ nome, qtd: dados.qtd, total: dados.total }))
            .sort((a, b) => b.total - a.total).slice(0, 10);

        const rankingVendedores = Object.entries(statsVendedores).sort((a, b) => b[1] - a[1]);
        const topVendedor = rankingVendedores.length > 0 
            ? { nome: rankingVendedores[0][0], total: rankingVendedores[0][1] }
            : { nome: "--", total: 0 };
        const ticketMedio = transacoes.length > 0 ? faturamentoTotal / transacoes.length : 0;

        res.json({
            faturamento_mes: faturamentoTotal.toFixed(2),
            total_transacoes: transacoes.length,
            ticket_medio: ticketMedio.toFixed(2),
            top_vendedor: topVendedor,
            ranking: ranking
        });
    } catch (error) { res.status(500).json({ error: "Erro stats" }); }
});

const PORT = process.env.PORT || 3001;

// Mude a linha do listen para garantir que ele aceite conexões externas na VPS
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando em http://0.0.0.0:${PORT}`);
});