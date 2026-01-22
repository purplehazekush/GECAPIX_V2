require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');

// --- SEGURANÇA ---
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// REMOVIDO: const mongoSanitize = require('express-mongo-sanitize'); // Causava o erro
const xss = require('xss-clean');
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
app.use(cors({
    origin: ["http://localhost:5173", "https://gecapix-v2.vercel.app", /\.vercel\.app$/],
    credentials: true
}));

// 2. Limitadores (Rate Limiting)
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const authLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { error: 'Muitas tentativas de login.' } });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 15, message: { error: 'Mensagens muito rápidas.' } });

app.use('/api', generalLimiter);
app.use(express.json({ limit: '10kb' }));

// 3. SANITIZAÇÃO MANUAL (CORREÇÃO DO ERRO)
// Em vez de usar a biblioteca que quebra, usamos essa função segura
app.use((req, res, next) => {
    const clean = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        for (let key in obj) {
            // Remove chaves que começam com $ (operadores Mongo) ou têm . (acesso profundo)
            if (key.startsWith('$') || key.includes('.')) {
                delete obj[key];
            } else {
                clean(obj[key]); // Recursivo para objetos aninhados
            }
        }
    };
    clean(req.body);
    clean(req.query);
    clean(req.params);
    next();
});

app.use(xss());
app.use(hpp());

// --- BANCO DE DADOS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("--> 🍃 MongoDB Conectado e Blindado!"))
    .catch(err => { console.error("--> ❌ Erro Mongo:", err); process.exit(1); });

// ======================================================
//                      ROTAS DA API
// ======================================================

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

// 4. CHAT
app.get('/api/chat/:materia', chatController.getMensagens);
app.post('/api/chat', chatLimiter, chatController.enviarMensagem);

// 5. ADMINISTRAÇÃO
app.get('/api/admin/validacao', adminController.getFilaValidacao);
app.post('/api/admin/validacao', adminController.moderarUsuario);

// Rotas Legado/Simples (podem ser movidas depois)
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`🛡️  Servidor em http://0.0.0.0:${PORT}`));