// server/middlewares/authMiddleware.js
const admin = require('firebase-admin');
const Usuario = require('../models/Usuario');
const TOKEN = require('../config/tokenomics'); 

// 🔥 CORREÇÃO AQUI: Use module.exports direto
module.exports = async (req, res, next) => {
    try {
        // --- 1. PORTA DO BOT (Backdoor Seguro) ---
        const botSecret = req.headers['x-bot-secret'];
        
        if (botSecret && botSecret === process.env.BOT_SECRET) {
            const botEmail = TOKEN.WALLETS.BANK; 
            const botUser = await Usuario.findOne({ email: botEmail });
            
            if (botUser) {
                req.user = botUser;
                return next(); 
            }
            console.warn(`⚠️ Bot tentou logar com secret correto mas email ${botEmail} não existe.`);
        }

        // --- 2. VALIDAÇÃO REAL DO USUÁRIO ---
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