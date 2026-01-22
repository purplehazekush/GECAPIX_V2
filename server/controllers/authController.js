const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics'); 

const EMAILS_ADMINS = ["joaovictorrabelo95@gmail.com", "caiogcosta03@gmail.com"];

exports.login = async (req, res) => {
    try {
        const { email, nome, codigo_convite } = req.body;
        
        let user = await UsuarioModel.findOne({ email });
        let mensagem_bonus = null;

        // --- 1. SE É USUÁRIO NOVO ---
        if (!user) {
            const totalUsers = await UsuarioModel.countDocuments();
            const isAdmin = EMAILS_ADMINS.includes(email) || totalUsers === 0;
            
            user = new UsuarioModel({
                email, nome,
                role: isAdmin ? 'admin' : 'membro',
                status: isAdmin ? 'ativo' : 'pendente',
                saldo_coins: TOKEN.COINS.WELCOME_BONUS, // 100
                xp: 0
            });

            // Lógica de Convite (Referral)
            if (codigo_convite) {
                const padrinho = await UsuarioModel.findOne({ codigo_referencia: codigo_convite.toUpperCase() });
                if (padrinho) {
                    user.indicado_por = padrinho.email;
                    user.saldo_coins += TOKEN.COINS.REFERRAL_WELCOME; // +200
                    
                    padrinho.saldo_coins += TOKEN.COINS.REFERRAL_BONUS; // +500
                    padrinho.xp += TOKEN.XP.REFERRAL; // +100
                    await padrinho.save();
                }
            }
            await user.save();
        }

        // --- 2. LÓGICA DE LOGIN DIÁRIO (Sequência) ---
        const hoje = new Date().setHours(0,0,0,0);
        const ultimo = user.ultimo_login ? new Date(user.ultimo_login).setHours(0,0,0,0) : 0;

        if (hoje > ultimo) {
            user.ultimo_login = new Date();
            
            const ontem = new Date();
            ontem.setDate(ontem.getDate() - 1);
            ontem.setHours(0,0,0,0);
            
            if (ultimo === ontem.getTime()) {
                user.sequencia_login += 1;
            } else {
                user.sequencia_login = 1;
            }

            // Usando as fórmulas do Tokenomics
            const coinsBonus = TOKEN.COINS.DAILY_LOGIN_BASE + (user.sequencia_login * TOKEN.COINS.DAILY_LOGIN_STEP);
            const xpBonus = TOKEN.XP.DAILY_LOGIN;

            user.saldo_coins += coinsBonus;
            user.xp += xpBonus;
            
            mensagem_bonus = `+${coinsBonus} Coins! Sequência: ${user.sequencia_login} dias 🔥`;
            await user.save();
        }

        // Sincroniza Admin
        if (EMAILS_ADMINS.includes(email) && user.role !== 'admin') {
            user.role = 'admin';
            user.status = 'ativo';
            await user.save();
        }

        const userData = user.toObject();
        userData.mensagem_bonus = mensagem_bonus; 
        res.json(userData);

    } catch (error) {
        console.error("Erro login:", error);
        res.status(500).json({ error: "Erro no login" });
    }
};