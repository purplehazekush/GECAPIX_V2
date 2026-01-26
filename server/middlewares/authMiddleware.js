// server/middlewares/authMiddleware.js
const admin = require('firebase-admin');
const Usuario = require('../models/Usuario');

exports.authMiddleware = async (req, res, next) => {
    try {
        const botSecretHeader = req.headers['x-bot-secret'];
        
        // Log para ver o que o servidor está recebendo (veja no pm2 logs)
        console.log("Header recebido:", botSecretHeader);
        console.log("Secret esperada:", process.env.BOT_SECRET);

        if (botSecretHeader && botSecretHeader === process.env.BOT_SECRET) {
            // O e-mail do bot tem que ser EXATAMENTE o que está no banco
            const botUser = await Usuario.findOne({ email: 'joaovictorrabelo95@gmail.com' });
            
            if (botUser) {
                req.user = botUser;
                return next();
            } else {
                console.log("❌ Bot Secret ok, mas usuário bot@gecapix.com não existe no banco!");
            }
        }

        // 2. VALIDAÇÃO REAL DO USUÁRIO (Firebase Token)
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        const user = await Usuario.findOne({ email: decodedToken.email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

        req.user = user;
        next();
    } catch (error) {
        console.error("Erro na validação do Token:", error.message);
        res.status(401).json({ error: "Autenticação falhou." });
    }
};