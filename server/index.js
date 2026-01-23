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

// --- CONTROLLERS ---
const authController = require('./controllers/authController'); 
const pixController = require('./controllers/pixController');
const arenaController = require('./controllers/arenaController');
const memeController = require('./controllers/memeController');
const questController = require('./controllers/questController');
const chatController = require('./controllers/chatController');
const adminController = require('./controllers/adminController');
const productController = require('./controllers/productController');
const configController = require('./controllers/configController');
const statsController = require('./controllers/statsController');

const app = express();

// 1. Configurações Básicas
app.set('trust proxy', 1);
app.use(helmet());

// CORS permissivo para evitar bloqueios de 403/Cors
app.use(cors({
    origin: ["http://localhost:5173", "https://gecapix-v2.vercel.app", /\.vercel\.app$/],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// 2. Limitadores (Rate Limiting)
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const authLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 });
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

// ======================================================
//                      ROTAS DA API
// ======================================================

// Middleware de Log para Debug (Ajuda a ver se a requisição chegou)
app.use((req, res, next) => {
    console.log(`📡 [${req.method}] ${req.url}`);
    next();
});

// 1. AUTH
app.post('/api/auth/login', authLimiter, authController.login);

// 2. PIX & VENDAS
app.get('/api/pix', pixController.getFeed);
app.post('/api/pix', pixController.createWebhook);
app.put('/api/pix/:id', pixController.updatePix);
app.post('/api/vendas/manual', pixController.createManual);

// 3. ARENA & GAMIFICATION
app.get('/api/arena/memes', memeController.getMemes);
app.post('/api/arena/memes', memeController.postMeme);
app.post('/api/arena/memes/votar', memeController.votarMeme);

app.get('/api/arena/ranking', arenaController.getRanking);
app.get('/api/arena/perfil/:id', arenaController.getPerfilPublico);
app.put('/api/arena/perfil', arenaController.updatePerfil);
app.get('/api/arena/quests', questController.getQuests);
app.post('/api/arena/quests/claim', questController.claimQuest);

// 🔥 ROTA FALTANTE ADICIONADA AQUI 🔥
// Certifique-se que no arenaController existe a função 'transferirCoins' (ou o nome que você deu)
app.post('/api/arena/transferir', arenaController.transferirCoins); 

// 4. CHAT
app.get('/api/chat/:materia', chatController.getMensagens);
app.post('/api/chat', chatLimiter, chatController.enviarMensagem);

// 5. ADMINISTRAÇÃO
app.get('/api/admin/validacao', adminController.getFilaValidacao);
app.post('/api/admin/validacao', adminController.moderarUsuario);

// Rotas Legado/Simples
const UsuarioModel = require('./models/Usuario');
app.get('/api/admin/usuarios', async (req, res) => {
    try { const u = await UsuarioModel.find().sort({ nome: 1 }); res.json(u); } 
    catch (e) { res.status(500).json({ error: "Erro" }); }
});
app.put('/api/admin/usuarios', async (req, res) => {
    try { const { email, novoStatus, novoRole } = req.body; 
          const u = await UsuarioModel.findOneAndUpdate({ email }, { status: novoStatus, role: novoRole }, { new: true });
          res.json({ success: true, user: u }); } 
    catch (e) { res.status(500).json({ error: "Erro" }); }
});

// 6. ROTAS ORGANIZADAS
app.get('/api/produtos', productController.getProdutos);
app.post('/api/produtos', productController.createProduto);

app.get('/api/config/modo-aberto', configController.getModoAberto);
app.put('/api/config/modo-aberto', configController.setModoAberto);

app.get('/api/stats', statsController.getStats);

// 7. CRON JOB
cron.schedule('0 21 * * *', () => {
    console.log('⏰ Encerramento diário...');
    memeController.finalizarDiaArena();
}, { timezone: "America/Sao_Paulo" });

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

const PORT = process.env.PORT || 3001;
// MUITO IMPORTANTE: Mudar de app.listen para server.listen
server.listen(PORT, '0.0.0.0', () => console.log(`🛡️  Servidor (HTTP + Socket) em http://0.0.0.0:${PORT}`));