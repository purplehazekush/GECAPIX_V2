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
const authMiddleware = require('./middlewares/authMiddleware'); // <--- SEM CHAVES!
const datingController = require('./controllers/datingController'); // <--- IMPORT NOVO
const adminConfigController = require('./controllers/adminConfigController'); // <--- ADICIONE ISSO
const ConfigService = require('./services/ConfigService');

const checkRole = require('./middlewares/roleMiddleware');
const requireActive = require('./middlewares/verificationMiddleware');


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
    .then(() => {
        console.log("--> 🍃 MongoDB Conectado!");
        ConfigService.init(); // <--- ADICIONE ISSO AQUI (Carrega configs na memória ao iniciar)
    })
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

app.get('/api/tokenomics', authMiddleware, requireActive, statsController.getTokenomics);
app.get('/api/tokenomics/history', authMiddleware, requireActive, statsController.getHistoricalStats); // <--- NOVA ROTA
app.get('/api/tokenomics/ledger', authMiddleware, requireActive, statsController.getGlobalTransactions);

// 1. AUTH
app.post('/api/auth/login', authLimiter, authController.login);
app.get('/api/auth/me', authMiddleware, authController.getMe); // FAZ SENTIDO POR AUTH MIDDLEWARE AQUI? CORRIGIR TALVEZ?

app.post('/api/auth/send-verification', authMiddleware, authController.sendVerification);
app.post('/api/auth/confirm-verification', authMiddleware, authController.confirmVerification);

// 2. PIX & VENDAS
app.get('/api/pix', pixController.getFeed);
app.post('/api/pix', pixController.createWebhook);
app.put('/api/pix/:id', pixController.updatePix);
// POST: Admin e GM podem vender manualmente (Regra 2)
app.post('/api/vendas/manual', 
    authMiddleware, 
    checkRole(['admin', 'gm']), // <--- TRAVA DE SEGURANÇA
    pixController.createManual
);


// 3. ARENA & GAMIFICATION
app.get('/api/arena/memes', authMiddleware, requireActive, memeController.getMemes);
app.post('/api/arena/memes', authMiddleware, requireActive, memeController.postarMeme); // Mudou de postMeme para postarMeme
app.post('/api/arena/memes/invest', authMiddleware, requireActive, memeController.investirMeme); // NOVA ROTA DE INVESTIMENTO

app.get('/api/arena/ranking', authMiddleware, requireActive, arenaController.getRanking);
app.get('/api/arena/perfil/:id', authMiddleware, arenaController.getPerfilPublico);
app.put('/api/arena/perfil', authMiddleware, arenaController.updatePerfil);
app.get('/api/arena/quests', authMiddleware, requireActive, questController.getQuests);
app.post('/api/arena/quests/claim', authMiddleware, requireActive, questController.claimQuest);


app.get('/api/arena/spotted', authMiddleware, requireActive, spottedController.getSpotteds);
app.post('/api/arena/spotted', authMiddleware, requireActive, spottedController.postarSpotted);
app.post('/api/arena/spotted/comentar', authMiddleware, requireActive, spottedController.comentarSpotted);

// 🔥 ROTA FALTANTE ADICIONADA AQUI 🔥
// Certifique-se que no arenaController existe a função 'transferirCoins' (ou o nome que você deu)
app.post('/api/arena/transferir', authMiddleware, requireActive, arenaController.transferirCoins);

app.post('/api/arena/ai/solve', authMiddleware, requireActive, aiController.resolverQuestao);

// 4. CHAT
app.get('/api/chat/:materia', chatController.getMensagens);
app.post('/api/chat', chatLimiter, chatController.enviarMensagem);

// 5. ADMINISTRAÇÃO
// Apenas a elite acessa o painel de validação e reset
app.get('/api/admin/validacao', authMiddleware, checkRole(['admin', 'gm']), adminController.getFilaValidacao);
app.post('/api/admin/reset', authMiddleware, checkRole(['admin']), adminController.resetSeason);
app.post('/api/admin/recursos', authMiddleware, checkRole(['admin']), adminController.darRecursos);
app.post('/api/admin/reset', authMiddleware, checkRole(['admin']), adminController.resetSeason);

// Dentro de // 5. ADMINISTRAÇÃO
app.get('/api/admin/users', authMiddleware, checkRole(['admin', 'gm']), adminController.getAllUsers);
app.put('/api/admin/users', authMiddleware, checkRole(['admin']), adminController.updateUserStatus);

// 🔥 NOVAS ROTAS DO PAINEL GECACENTRAL 🔥
app.get('/api/admin/config', authMiddleware, checkRole(['admin']), adminConfigController.getConfig);
app.put('/api/admin/config', authMiddleware, checkRole(['admin']), adminConfigController.updateConfig);
// ROTA DE DEBUG (Apagar em produção)

app.get('/api/exchange/quote', authMiddleware, exchangeController.getQuote);
app.get('/api/exchange/chart', authMiddleware, exchangeController.getChartData);

// 🔥 NOVA ROTA PARA O BOT (Ticker)
// Não precisa de auth pesada se for publica, ou usa o middleware do bot
app.get('/api/exchange/ticker', authMiddleware, exchangeController.getTicker);


// 2. Aplique ele na rota de trade
app.post('/api/exchange/trade', authMiddleware, requireActive, exchangeController.executeTrade);
app.get('/api/exchange/stats', authMiddleware, requireActive, exchangeController.getAdminStats);

// As de admin podem continuar aqui
app.get('/api/exchange/admin', authMiddleware, checkRole(['admin']), exchangeController.getAdminStats);
app.post('/api/exchange/admin', authMiddleware, checkRole(['admin']), exchangeController.adminUpdateParams);
app.post('/api/exchange/admin/toggle', authMiddleware, checkRole(['admin']), exchangeController.toggleMarket);




app.post('/api/exchange/simulate', exchangeController.simulateMarket);


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

// GET: Público (ou apenas logados, dependendo da estratégia)
app.get('/api/produtos', authMiddleware, productController.getProdutos);
// POST: APENAS ADMIN pode criar produtos (Regra 1)
app.post('/api/produtos', 
    authMiddleware, 
    checkRole(['admin']), // <--- TRAVA DE SEGURANÇA
    productController.createProduto
);

app.get('/api/stats', requireActive, statsController.getStats);


app.post('/api/bank/deposit', authMiddleware, requireActive, bankController.depositarLiquido);
app.post('/api/bank/withdraw', authMiddleware, requireActive, bankController.sacarLiquido);
app.post('/api/bank/bond/buy', authMiddleware, requireActive, bankController.comprarTitulo);
app.post('/api/bank/bond/redeem', authMiddleware, requireActive, bankController.resgatarTitulo);
app.get('/api/bank/bonds', authMiddleware, requireActive, bankController.listarTitulos);
app.get('/api/bank/dashboard', authMiddleware, requireActive, bankController.getDashboard);


app.get('/api/store/p2p', requireActive, storeController.getOfertasP2P);
app.post('/api/store/p2p/criar', requireActive, storeController.criarOfertaP2P);
app.post('/api/store/p2p/comprar', requireActive, storeController.comprarOfertaP2P);
app.post('/api/store/p2p/cancelar', requireActive, storeController.cancelarOfertaP2P);

app.post('/api/admin/force-close', async (req, res) => { //CORRIGIR - ADD authMiddleware ou delete a rota
    //if (req.user.role !== 'admin') return res.status(403).send();
    await DailyTreasury.runDailyClosing();
    res.json({ success: true });
});

// 7. GECAMATCH (TINDER)
app.post('/api/dating/optin', authMiddleware, requireActive, datingController.optIn);
app.get('/api/dating/candidates', authMiddleware, requireActive, datingController.getCandidates);
app.post('/api/dating/like', authMiddleware, requireActive, datingController.sendLike);
app.post('/api/dating/superlike', authMiddleware, requireActive, datingController.sendSuperLike);
app.get('/api/dating/mailbox', authMiddleware, requireActive, datingController.getMailbox);
app.get('/api/dating/sent', authMiddleware, requireActive, datingController.getSentLikes);


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

    socket.on('claim_timeout', (data) => gameController.claimTimeout(io, socket, data));

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