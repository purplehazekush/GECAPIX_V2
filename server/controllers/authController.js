const UsuarioModel = require('../models/Usuario');
const SystemState = require('../models/SystemState'); // <--- Importante
const TOKEN = require('../config/tokenomics'); 

const EMAILS_ADMINS = ["joaovictorrabelo95@gmail.com", "caiogcosta03@gmail.com"];

// Helper para gerar código único (EX: JOAO95X)
const gerarCodigo = (nome) => {
    const prefixo = nome.split(' ')[0].toUpperCase().substring(0, 4);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefixo}${random}`;
};

// Helper de Nível (Recalcula nível baseado no XP total)
const calcularNivel = (xpTotal) => {
    // Exemplo simples: Nível 1 (0-100), Nível 2 (101-300), Nível 3 (301-600)...
    // Fórmula: XP necessário para o próximo nível cresce
    let nivel = 1;
    let xpRequerido = 100;
    
    while (xpTotal >= xpRequerido) {
        xpTotal -= xpRequerido;
        nivel++;
        xpRequerido = nivel * 100; // Dificuldade aumenta a cada nível
    }
    return nivel;
};

exports.login = async (req, res) => {
    try {
        const { email, nome, codigo_convite } = req.body;
        
        // Busca estado da economia para saber quanto pagar de referral HOJE
        let state = await SystemState.findOne({ season_id: 1 });
        const premioReferralHoje = state ? state.current_referral_reward : TOKEN.COINS.MAX_REFERRAL_REWARD;

        let user = await UsuarioModel.findOne({ email });
        let mensagem_bonus = null;
        let teveAlteracao = false;

        // 1. CRIAÇÃO DE USUÁRIO (REGISTRO)
        if (!user) {
            try {
                const totalUsers = await UsuarioModel.countDocuments();
                const isAdmin = EMAILS_ADMINS.includes(email) || totalUsers === 0;
                
                user = new UsuarioModel({
                    email, 
                    nome, 
                    role: isAdmin ? 'admin' : 'membro',
                    status: isAdmin ? 'ativo' : 'pendente',
                    saldo_coins: TOKEN.COINS.WELCOME_BONUS, 
                    xp: 0,
                    nivel: 1,
                    avatar_slug: 'default',
                    // GERA O CÓDIGO DELE AGORA
                    codigo_referencia: gerarCodigo(nome),
                    extrato: [{ tipo: 'ENTRADA', valor: TOKEN.COINS.WELCOME_BONUS, descricao: 'Bônus de Boas Vindas', data: new Date() }]
                });

                // Processa quem indicou (Padrinho)
                if (codigo_convite) {
                    const padrinho = await UsuarioModel.findOne({ codigo_referencia: codigo_convite.toUpperCase() });
                    if (padrinho) {
                        user.indicado_por = padrinho.email;
                        
                        // O Novato ganha o fixo de boas-vindas extra
                        user.saldo_coins += TOKEN.COINS.REFERRAL_WELCOME;
                        user.extrato.push({ tipo: 'ENTRADA', valor: TOKEN.COINS.REFERRAL_WELCOME, descricao: 'Bônus Código Convite', data: new Date() });

                        // O Padrinho ganha o valor DINÂMICO do dia (Economia)
                        await UsuarioModel.updateOne({ _id: padrinho._id }, {
                            $inc: { saldo_coins: premioReferralHoje, xp: TOKEN.XP.REFERRAL },
                            $push: { extrato: { tipo: 'ENTRADA', valor: premioReferralHoje, descricao: `Indicou ${nome.split(' ')[0]}`, data: new Date() } }
                        });
                    }
                }
                await user.save();
                
                const userData = user.toObject();
                userData.mensagem_bonus = "Bem-vindo ao GECA!";
                return res.json(userData);

            } catch (err) {
                if (err.code === 11000) user = await UsuarioModel.findOne({ email }); // Retry se der colisão de email
                else throw err; 
            }
        }

        // 2. CORREÇÕES DE LEGADO (Para usuários antigos sem código)
        if (!user.codigo_referencia) {
            user.codigo_referencia = gerarCodigo(user.nome);
            teveAlteracao = true;
        }
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

        // 4. ATUALIZAÇÃO DE NÍVEL (Recalcula sempre que loga pra garantir)
        const novoNivel = calcularNivel(user.xp);
        if (novoNivel !== user.nivel) {
            user.nivel = novoNivel;
            teveAlteracao = true;
            // Opcional: Dar prêmio de Level Up aqui
        }

        // 5. SINCRONIZA ADMIN
        if (EMAILS_ADMINS.includes(email) && user.role !== 'admin') {
            user.role = 'admin'; user.status = 'ativo'; 
            teveAlteracao = true;
        }

        if (teveAlteracao) await user.save();

        const userData = user.toObject();
        userData.mensagem_bonus = mensagem_bonus; 
        res.json(userData);

    } catch (error) {
        console.error("Erro fatal no login:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
};