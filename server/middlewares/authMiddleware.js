const admin = require('firebase-admin');
const Usuario = require('../models/Usuario');

exports.authMiddleware = async (req, res, next) => {
    try {
        // 1. CHECAGEM DO BOT (Bypass de Segurança)
        const botSecret = req.headers['x-bot-secret'];
        if (botSecret && botSecret === process.env.BOT_SECRET) {
            // Se a chave bater, buscamos o usuário do bot no banco
            const botUser = await Usuario.findOne({ email: 'bot@gecapix.com' });
            if (botUser) {
                req.user = botUser;
                return next(); // Pula a validação do Firebase
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