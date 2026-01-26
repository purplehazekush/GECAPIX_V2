// server/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');

// --- SEGURANÇA ---
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const admin = require('firebase-admin');
const serviceAccount = require('./config/firebase-admin.json');

// --- CONTROLLERS ---
const authController = require('./controllers/authController');
const pixController = require('./controllers/pixController');
const arenaController = require('./controllers/arenaController');
const memeController = require('./controllers/memeController');
const questController = require('./controllers/questController');
const chatController = require('./controllers/chatController');
const adminController = require('./controllers/adminController');
const productController = require('./controllers/productController');
const statsController = require('./controllers/statsController');
const spottedController = require('./controllers/spottedController');
const aiController = require('./controllers/aiController')
const DailyTreasury = require('./engine/DailyTreasury'); // <--- Importe
const SystemState = require('./models/SystemState'); // <--- Importe
const storeController = require('./controllers/storeController');
const bankController = require('./controllers/bankController');
const exchangeController = require('./controllers/exchangeController')
const { authMiddleware } = require('./middlewares/authMiddleware');

const app = express();

// Inicializa o Firebase Admin antes de qualquer rota ou middleware
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔥 Firebase Admin inicializado com sucesso!");
}
// --- SOCKET.IO SETUP (SUBSTITUI O app.listen) ---
const http = require('http');
const { Server } = require('socket.io');
const gameController = require('./controllers/gameController'); // Vamos criar já já

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "https://gecapix-v2.vercel.app", "http://72.62.87.8"],
        methods: ["GET", "POST"]
    }
});


// 1. Configurações Básicas
app.set('trust proxy', 1);


app.set('io', io); // Agora o controller consegue dar io.emit

app.use(helmet());

// CORS permissivo para evitar bloqueios de 403/Cors
app.use(cors({
    origin: ["http://localhost:5173", "https://gecapix-v2.vercel.app", /\.vercel\.app$/],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// 2. Limitadores (Rate Limiting)
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
const authLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 100 });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 15 });

app.use('/api', generalLimiter);
app.use(express.json({ limit: '10kb' }));

// 3. SANITIZAÇÃO MANUAL (Versão Corrigida e Mais Leve)
app.use((req, res, next) => {
    const clean = (obj) => {
        if (!obj || typeof obj !== 'object') return;

        for (let key in obj) {
            const value = obj[key];

            // Proteção Mongo: Remove chaves que COMEÇAM com $ ou . (ex: $where, .data)
            // A versão anterior removia qualquer ponto no meio (ex: "user.name"), o que quebrava objetos
            if (key.startsWith('$') || key.startsWith('.')) {
                delete obj[key];
                continue;
            }

            // Proteção XSS Simples em Strings
            if (typeof value === 'string') {
                if (value.includes('<') && value.includes('>')) {
                    obj[key] = value.replace(/</g, '').replace(/>/g, '');
                }
            } else {
                clean(value); // Recursivo
            }
        }
    };

    if (req.body) clean(req.body);
    next();
});

app.use(hpp());

// --- BANCO DE DADOS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("--> 🍃 MongoDB Conectado!"))
    .catch(err => { console.error("--> ❌ Erro Mongo:", err); process.exit(1); });

console.log("⏳ Aguardando resposta do servidor...");

// ======================================================
//                      ROTAS DA API
// ======================================================

// Middleware de Log para Debug (Ajuda a ver se a requisição chegou)
app.use((req, res, next) => {
    console.log(`📡 [${req.method}] ${req.url}`);
    next();
});

// 1. Crie esse mini-middleware no seu index.js antes das rotas
const authSimples = async (req, res, next) => {
    // Pegamos o email que o axios vai enviar
    const email = req.headers['x-user-email'];
    if (!email) return res.status(401).json({ error: "Identifique-se primeiro!" });

    const user = await UsuarioModel.findOne({ email });
    if (!user) return res.status(404).json({ error: "Usuário não existe" });

    req.user = user; // Agora o controller sabe quem você é!
    next();
};



app.get('/api/tokenomics', statsController.getTokenomics);
app.get('/api/tokenomics/history', statsController.getHistoricalStats); // <--- NOVA ROTA
app.get('/api/tokenomics/ledger', statsController.getGlobalTransactions);

// 1. AUTH
app.post('/api/auth/login', authLimiter, authController.login);
app.get('/api/auth/me', authMiddleware, authController.getMe);

// 2. PIX & VENDAS
app.get('/api/pix', pixController.getFeed);
app.post('/api/pix', pixController.createWebhook);
app.put('/api/pix/:id', pixController.updatePix);
app.post('/api/vendas/manual', pixController.createManual);


// 3. ARENA & GAMIFICATION
app.get('/api/arena/memes', memeController.getMemes);
app.post('/api/arena/memes', memeController.postarMeme); // Mudou de postMeme para postarMeme
app.post('/api/arena/memes/invest', memeController.investirMeme); // NOVA ROTA DE INVESTIMENTO

app.get('/api/arena/ranking', arenaController.getRanking);
app.get('/api/arena/perfil/:id', arenaController.getPerfilPublico);
app.put('/api/arena/perfil', arenaController.updatePerfil);
app.get('/api/arena/quests', questController.getQuests);
app.post('/api/arena/quests/claim', questController.claimQuest);


app.get('/api/arena/spotted', spottedController.getSpotteds);
app.post('/api/arena/spotted', spottedController.postarSpotted);
app.post('/api/arena/spotted/comentar', spottedController.comentarSpotted);

// 🔥 ROTA FALTANTE ADICIONADA AQUI 🔥
// Certifique-se que no arenaController existe a função 'transferirCoins' (ou o nome que você deu)
app.post('/api/arena/transferir', arenaController.transferirCoins);

app.post('/api/arena/ai/solve', aiController.resolverQuestao);

// 4. CHAT
app.get('/api/chat/:materia', chatController.getMensagens);
app.post('/api/chat', chatLimiter, chatController.enviarMensagem);

// 5. ADMINISTRAÇÃO
app.get('/api/admin/validacao', adminController.getFilaValidacao);
app.post('/api/admin/validacao', adminController.moderarUsuario);
app.post('/api/admin/recursos', adminController.darRecursos);
app.post('/api/admin/reset', adminController.resetSeason);
// ROTA DE DEBUG (Apagar em produção)

app.get('/api/exchange/quote', authMiddleware, exchangeController.getQuote);
app.get('/api/exchange/chart', authMiddleware, exchangeController.getChartData);


// 2. Aplique ele na rota de trade
app.post('/api/exchange/trade', authMiddleware, exchangeController.executeTrade);
app.get('/api/exchange/stats', authMiddleware, exchangeController.getAdminStats);

// As de admin podem continuar aqui
app.get('/api/exchange/admin', exchangeController.getAdminStats);
app.post('/api/exchange/admin', exchangeController.adminUpdateParams);
app.post('/api/exchange/admin/toggle', exchangeController.toggleMarket);


// Rotas Legado/Simples
const UsuarioModel = require('./models/Usuario');
app.get('/api/admin/usuarios', async (req, res) => {
    try { const u = await UsuarioModel.find().sort({ nome: 1 }); res.json(u); }
    catch (e) { res.status(500).json({ error: "Erro" }); }
});
app.put('/api/admin/usuarios', async (req, res) => {
    try {
        const { email, novoStatus, novoRole } = req.body;
        const u = await UsuarioModel.findOneAndUpdate({ email }, { status: novoStatus, role: novoRole }, { new: true });
        res.json({ success: true, user: u });
    }
    catch (e) { res.status(500).json({ error: "Erro" }); }
});

// 6. ROTAS ORGANIZADAS
app.get('/api/produtos', productController.getProdutos);
app.post('/api/produtos', productController.createProduto);

app.get('/api/stats', statsController.getStats);


app.post('/api/bank/deposit', bankController.depositarLiquido);
app.post('/api/bank/withdraw', bankController.sacarLiquido);
app.post('/api/bank/bond/buy', bankController.comprarTitulo);
app.post('/api/bank/bond/redeem', bankController.resgatarTitulo);
app.get('/api/bank/bonds', bankController.listarTitulos);


app.get('/api/store/p2p', storeController.getOfertasP2P);
app.post('/api/store/p2p/criar', storeController.criarOfertaP2P);
app.post('/api/store/p2p/comprar', storeController.comprarOfertaP2P);
app.post('/api/store/p2p/cancelar', storeController.cancelarOfertaP2P);


cron.schedule('0 21 * * *', () => { // Todo dia às 21h
    console.log('⏰ Rotina das 21h...');
    memeController.finalizarDiaArena();
    statsController.snapshotEconomy();
    DailyTreasury.runDailyClosing(); // <--- O MOTOR ECONÔMICO RODA AQUI
}, { timezone: "America/Sao_Paulo" });





// Lógica do Socket (Gerenciador de Salas)
io.on('connection', (socket) => {
    console.log(`🎮 Jogador conectado: ${socket.id}`);

    // --- NOVOS EVENTOS DO LOBBY ---
    socket.on('get_rooms', () => gameController.getRooms(io, socket));

    socket.on('create_room', (data) => gameController.createRoom(io, socket, data));

    socket.on('join_specific_room', (data) => gameController.joinSpecificRoom(io, socket, data));

    // Mantidos (mas join_game agora é legado, o front novo não usa)
    socket.on('make_move', (data) => gameController.makeMove(io, socket, data));
    socket.on('game_win_claim', (data) => gameController.handleWinClaim(io, socket, data));

    // Chat do Jogo
    socket.on('game_chat', (data) => {
        io.to(data.roomId).emit('game_chat', data);
    });

    socket.on('disconnect', () => {
        console.log('❌ Jogador desconectado:', socket.id);
        gameController.handleDisconnect(io, socket);
    });
});

// ROTA PÚBLICA DE STATUS ECONÔMICO (Para o Dashboard)
app.get('/api/tokenomics/status', async (req, res) => {
    try {
        let state = await SystemState.findOne({ season_id: 1 });
        if (!state) {
            // Se não existir, força uma inicialização rápida
            await DailyTreasury.runDailyClosing();
            state = await SystemState.findOne({ season_id: 1 });
        }
        res.json(state);
    } catch (e) { res.status(500).json({ error: "Erro status eco" }); }
});



// INICIALIZAÇÃO NO BOOT (Para garantir que sempre tenha dados)
// Adicione isso antes do server.listen
DailyTreasury.runDailyClosing().then(() => console.log("💰 Economia Sincronizada."));

const PORT = process.env.PORT || 3001;
// MUITO IMPORTANTE: Mudar de app.listen para server.listen
server.listen(PORT, '0.0.0.0', () => console.log(`🛡️  Servidor (HTTP + Socket) em http://0.0.0.0:${PORT}`));