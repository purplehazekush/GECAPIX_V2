// server/middlewares/authMiddleware.js
const Usuario = require('../models/Usuario');

// Se você já inicializou o firebase-admin no index.js, use-o aqui
// Caso contrário, você precisará inicializar com suas credenciais
const admin = require('firebase-admin');

exports.authMiddleware = async (req, res, next) => {
    try {
        // 1. Checa se é o seu Bot com uma chave secreta
        const botSecret = req.headers['x-bot-secret'];
        if (botSecret && botSecret === process.env.BOT_SECRET) {
            const botUser = await Usuario.findOne({ email: 'joaovictorrabelo95@gmail.com' });
            req.user = botUser;
            return next();
        }
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "Token não fornecido" });
        }

        const token = authHeader.split(' ')[1];

        // 1. Valida o Token com o Google Firebase
        const decodedToken = await admin.auth().verifyIdToken(token);

        // 2. Busca o usuário no seu MongoDB pelo e-mail do token
        const user = await Usuario.findOne({ email: decodedToken.email });

        if (!user) return res.status(404).json({ error: "Usuário não registrado no banco" });

        req.user = user; // Injeta o usuário na requisição
        next();
    } catch (error) {
        console.error("Erro na validação do Token:", error);
        res.status(401).json({ error: "Sessão inválida ou expirada" });
    }
};