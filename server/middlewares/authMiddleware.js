const admin = require('firebase-admin');
const Usuario = require('../models/Usuario');

module.exports = async (req, res, next) => {
    try {
        // --- 1. PORTA DOS FUNDOS (BOT) ---
        const botSecret = req.headers['x-bot-secret'];
        
        // Verifica se o segredo bate com o .env
        if (botSecret && botSecret === process.env.BOT_SECRET) {
            // 🔥 AQUI ESTÁ A MÁGICA:
            // Vincula a requisição ao usuário oficial do Bot
            const botUser = await Usuario.findOne({ email: "market_maker@gecapix.com" });
            
            if (botUser) {
                req.user = botUser; // O controller vai achar que é um admin logado
                return next(); 
            } else {
                console.warn("⚠️ Bot tentou logar, mas a conta 'market_maker@gecapix.com' não existe no banco.");
                return res.status(403).json({ error: "Conta do Bot não encontrada." });
            }
        }

        // --- 2. LOGIN NORMAL (HUMANOS) ---
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            // Se não for bot e não tiver token, tchau
            return res.status(401).json({ error: "Token não fornecido." });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        const user = await Usuario.findOne({ email: decodedToken.email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

        req.user = user;
        next();

    } catch (error) {
        // Silencia erros de token expirado no log para não poluir
        if (error.code !== 'auth/id-token-expired') {
            console.error("Auth Error:", error.message);
        }
        res.status(401).json({ error: "Autenticação falhou." });
    }
};