// server/controllers/authController.js
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics'); 

const EMAILS_ADMINS = ["joaovictorrabelo95@gmail.com", "caiogcosta03@gmail.com"];

exports.login = async (req, res) => {
    try {
        const { email, nome, codigo_convite } = req.body;
        
        let user = await UsuarioModel.findOne({ email });
        let mensagem_bonus = null;
        let teveAlteracao = false; // Flag para saber se precisamos salvar

        // 1. CRIA SE NÃO EXISTIR
        if (!user) {
            try {
                const totalUsers = await UsuarioModel.countDocuments();
                const isAdmin = EMAILS_ADMINS.includes(email) || totalUsers === 0;
                
                user = new UsuarioModel({
                    email, nome, role: isAdmin ? 'admin' : 'membro',
                    status: isAdmin ? 'ativo' : 'pendente',
                    saldo_coins: TOKEN.COINS.WELCOME_BONUS, xp: 0,
                    avatar_slug: 'default', // Garante que nasce com avatar
                    extrato: [{ tipo: 'ENTRADA', valor: TOKEN.COINS.WELCOME_BONUS, descricao: 'Bônus de Boas Vindas', data: new Date() }]
                });

                if (codigo_convite) {
                    const padrinho = await UsuarioModel.findOne({ codigo_referencia: codigo_convite.toUpperCase() });
                    if (padrinho) {
                        user.indicado_por = padrinho.email;
                        user.saldo_coins += TOKEN.COINS.REFERRAL_WELCOME;
                        user.extrato.push({ tipo: 'ENTRADA', valor: TOKEN.COINS.REFERRAL_WELCOME, descricao: 'Bônus Código Convite', data: new Date() });

                        await UsuarioModel.updateOne({ _id: padrinho._id }, {
                            $inc: { saldo_coins: TOKEN.COINS.REFERRAL_BONUS, xp: TOKEN.XP.REFERRAL },
                            $push: { extrato: { tipo: 'ENTRADA', valor: TOKEN.COINS.REFERRAL_BONUS, descricao: `Indicou ${nome.split(' ')[0]}`, data: new Date() } }
                        });
                    }
                }
                await user.save();
                // Retorna direto pois é usuário novo
                const userData = user.toObject();
                userData.mensagem_bonus = "Bem-vindo ao GECA!";
                return res.json(userData);

            } catch (err) {
                if (err.code === 11000) user = await UsuarioModel.findOne({ email });
                else throw err; 
            }
        }

        // 2. AUTO-MIGRAÇÃO DE AVATAR (CORREÇÃO DO BUG DO F5)
        if (!user.avatar_slug) {
            user.avatar_slug = 'default';
            teveAlteracao = true;
        }

        // 3. LÓGICA DE LOGIN DIÁRIO
        const hoje = new Date().setHours(0,0,0,0);
        const ultimo = user.ultimo_login ? new Date(user.ultimo_login).setHours(0,0,0,0) : 0;

        if (hoje > ultimo) {
            const ontem = new Date(); ontem.setDate(ontem.getDate() - 1); ontem.setHours(0,0,0,0);
            
            user.sequencia_login = (ultimo === ontem.getTime()) ? user.sequencia_login + 1 : 1;
            const coinsBonus = TOKEN.COINS.DAILY_LOGIN_BASE + (user.sequencia_login * TOKEN.COINS.DAILY_LOGIN_STEP);
            
            user.saldo_coins += coinsBonus;
            user.xp += TOKEN.XP.DAILY_LOGIN;
            user.ultimo_login = new Date();
            
            user.extrato.push({ 
                tipo: 'ENTRADA', valor: coinsBonus, descricao: `Daily Login (Dia ${user.sequencia_login})`, data: new Date() 
            });
            
            mensagem_bonus = `+${coinsBonus} Coins! Sequência: ${user.sequencia_login} dias 🔥`;
            teveAlteracao = true;
        }

        // 4. SINCRONIZA ADMIN
        if (EMAILS_ADMINS.includes(email) && user.role !== 'admin') {
            user.role = 'admin'; user.status = 'ativo'; 
            teveAlteracao = true;
        }

        // 5. SALVA SE HOUVE QUALQUER MUDANÇA (CRÍTICO!)
        if (teveAlteracao) {
            await user.save();
        }

        const userData = user.toObject();
        userData.mensagem_bonus = mensagem_bonus; 
        res.json(userData);

    } catch (error) {
        console.error("Erro fatal no login:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
};