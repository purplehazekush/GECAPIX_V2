require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// --- IMPORTANDO CONTROLLERS ---
// Certifique-se de que criou os arquivos na pasta controllers/ e models/
const authController = require('./controllers/authController'); 
const pixController = require('./controllers/pixController');

// --- IMPORTANDO MODELS (Para as rotas inline abaixo) ---
const ProdutoModel = require('./models/Produto');
const UsuarioModel = require('./models/Usuario');
const ConfigModel = require('./models/Config');
const PixModel = require('./models/Pix'); // Necessário para Stats inline
const arenaController = require('./controllers/arenaController');
const memeController = require('./controllers/memeController');
const questController = require('./controllers/questController'); // 1. ADICIONE ESTE
const cron = require('node-cron'); // 2. ADICIONE O CRON (npm install node-cron)
const chatController = require('./controllers/chatController');


// --- CONFIGURAÇÃO DO APP ---
const app = express();
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:5173", "https://gecapix-v2.vercel.app", /\.vercel\.app$/],
    credentials: true
}));

// --- CONEXÃO MONGODB ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("--> MongoDB Conectado! 🍃");
    } catch (error) {
        console.error("--> Erro MongoDB:", error);
        process.exit(1);
    }
};
connectDB();

// ======================================================
//                      ROTAS DA API
// ======================================================

// 1. AUTENTICAÇÃO (Via Controller)
// OBS: Você precisa ter criado o authController.js conforme conversamos antes
app.post('/api/auth/login', authController.login);

// 2. PIX & VENDAS (Via Controller - Novo!)
app.get('/api/pix', pixController.getFeed);
app.post('/api/pix', pixController.createWebhook);
app.put('/api/pix/:id', pixController.updatePix);
app.post('/api/vendas/manual', pixController.createManual);




// ------------------------------------------------------
// ROTAS ABAIXO: AINDA INLINE (Mova para controllers futuramente)
// ------------------------------------------------------

app.get('/api/arena/memes', memeController.getMemes);
app.post('/api/arena/memes', memeController.postMeme);
app.post('/api/arena/memes/votar', memeController.votarMeme);

app.get('/api/arena/ranking', arenaController.getRanking);
app.get('/api/arena/perfil/:id', arenaController.getPerfilPublico);

// 4. ROTA DE MISSÕES (O QUE ESTAVA FALTANDO!)
app.get('/api/arena/quests', questController.getQuests);

app.put('/api/arena/perfil', arenaController.updatePerfil);

app.get('/api/chat/:materia', chatController.getMensagens);
app.post('/api/chat', chatController.enviarMensagem);

// 5. O AGENDADOR DAS 21H (O ENCERRAMENTO DIÁRIO)
// '0 21 * * *' significa: todo dia, minuto 0, hora 21.
cron.schedule('0 21 * * *', () => {
    memeController.finalizarDiaArena();
}, {
    timezone: "America/Sao_Paulo"
});

// 3. PRODUTOS
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
    } catch (error) { res.status(500).json({ error: "Erro criar produto" }); }
});

// 4. ADMINISTRAÇÃO
app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const usuarios = await UsuarioModel.find().sort({ nome: 1 });
        res.json(usuarios);
    } catch (error) { res.status(500).json({ error: "Erro buscar usuários" }); }
});

app.put('/api/admin/usuarios', async (req, res) => {
    try {
        const { email, novoStatus, novoRole } = req.body;
        const dados = {};
        if (novoStatus) dados.status = novoStatus;
        if (novoRole) dados.role = novoRole;

        const user = await UsuarioModel.findOneAndUpdate({ email }, dados, { new: true });
        res.json({ success: true, user });
    } catch (error) { res.status(500).json({ error: "Erro update user" }); }
});

// 5. CONFIGURAÇÃO (Modo Festa)
app.get('/api/config/modo-aberto', async (req, res) => {
    try {
        let config = await ConfigModel.findOne({ chave: 'sistema_aberto' });
        if (!config) config = await ConfigModel.create({ chave: 'sistema_aberto', valor: false });
        res.json({ aberto: config.valor });
    } catch (error) { res.status(500).json({ error: "Erro config" }); }
});

app.put('/api/config/modo-aberto', async (req, res) => {
    try {
        const { valor } = req.body;
        const config = await ConfigModel.findOneAndUpdate(
            { chave: 'sistema_aberto' }, 
            { valor: valor }, 
            { upsert: true, new: true }
        );
        res.json({ aberto: config.valor });
    } catch (error) { res.status(500).json({ error: "Erro update config" }); }
});

// 6. STATS (Resumido)
app.get('/api/stats', async (req, res) => {
    try {
        const inicioMes = new Date();
        inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
        
        const transacoes = await PixModel.find({ data: { $gte: inicioMes } });
        let faturamentoTotal = 0;
        let statsVendedores = {};

        transacoes.forEach(pix => {
            if (pix.valor_extraido) {
                const valor = parseFloat(pix.valor_extraido.replace('.', '').replace(',', '.')) || 0;
                faturamentoTotal += valor;
                
                if (pix.item_vendido) {
                    const vendedor = pix.vendedor_nome || (pix.vendedor_email ? pix.vendedor_email.split('@')[0] : 'Sistema');
                    if (!statsVendedores[vendedor]) statsVendedores[vendedor] = 0;
                    statsVendedores[vendedor] += valor;
                }
            }
        });

        // Top Vendedor
        const rankingVendedores = Object.entries(statsVendedores).sort((a, b) => b[1] - a[1]);
        const topVendedor = rankingVendedores.length > 0 
            ? { nome: rankingVendedores[0][0], total: rankingVendedores[0][1] }
            : { nome: "--", total: 0 };

        res.json({
            faturamento_mes: faturamentoTotal.toFixed(2),
            total_transacoes: transacoes.length,
            ticket_medio: (transacoes.length ? faturamentoTotal / transacoes.length : 0).toFixed(2),
            top_vendedor: topVendedor,
            ranking: [], // Simplificado para economizar espaço aqui
            heatmap: [],
            distribuicao: []
        });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Erro stats" }); 
    }
});

// --- INICIALIZAÇÃO ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando em http://0.0.0.0:${PORT}`);
});