// server/controllers/authController.js
const UsuarioModel = require('../models/Usuario');
const SystemState = require('../models/SystemState'); // Certifique-se que o arquivo acima existe!
const TOKEN = require('../config/tokenomics');

const EMAILS_ADMINS = ["joaovictorrabelo95@gmail.com", "caiogcosta03@gmail.com"];

// Helper para gerar código único (EX: JOAO95X)
const gerarCodigo = (nome) => {
    const prefixo = nome ? nome.split(' ')[0].toUpperCase().substring(0, 4) : 'USER';
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefixo}${random}`;
};

// Helper de Nível
const calcularNivel = (xpTotal) => {
    let nivel = 1;
    let xpRequerido = 100;
    while (xpTotal >= xpRequerido) {
        xpTotal -= xpRequerido;
        nivel++;
        xpRequerido = nivel * 100;
    }
    return nivel;
};

exports.login = async (req, res) => {
    try {
        const { email, nome, codigo_convite } = req.body;

        // Busca estado da economia (com fallback se não existir)
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
                    codigo_referencia: gerarCodigo(nome),
                    extrato: [{ tipo: 'ENTRADA', valor: TOKEN.COINS.WELCOME_BONUS, descricao: 'Bônus de Boas Vindas', data: new Date() }]
                });

                // Processa Padrinho (Referral)
                if (codigo_convite) {
                    const padrinho = await UsuarioModel.findOne({ codigo_referencia: codigo_convite.toUpperCase() });
                    if (padrinho) {
                        user.indicado_por = padrinho.email;

                        // Novato ganha o fixo
                        user.saldo_coins += TOKEN.COINS.REFERRAL_WELCOME;
                        user.extrato.push({ tipo: 'ENTRADA', valor: TOKEN.COINS.REFERRAL_WELCOME, descricao: 'Bônus Código Convite', data: new Date() });

                        // [LÓGICA DE CLASSE: BARDO]
                        let premioPadrinho = premioReferralHoje; // Valor base do dia (Banco Central)
                        let descBonus = `Indicou ${nome.split(' ')[0]}`;

                        if (padrinho.classe === 'BARDO') {
                            const mult = TOKEN.CLASSES.BARDO.REFERRAL_BONUS_MULT; // ex: 1.25
                            premioPadrinho = Math.floor(premioPadrinho * mult);
                            descBonus += ` (Bônus Bardo +${Math.round((mult - 1) * 100)}%)`;
                        }

                        // Paga o Padrinho
                        await UsuarioModel.updateOne({ _id: padrinho._id }, {
                            $inc: { saldo_coins: premioPadrinho, xp: TOKEN.XP.REFERRAL },
                            $push: {
                                extrato: {
                                    tipo: 'ENTRADA',
                                    valor: premioPadrinho,
                                    descricao: descBonus,
                                    data: new Date()
                                }
                            }
                        });
                    }
                }
                // --- CORREÇÃO AUTOMÁTICA DE CLASSE (FAILSAFE) ---
                const VALID_CLASSES = ['BRUXO', 'ESPECULADOR', 'TECNOMANTE', 'BARDO', 'NOVATO'];
                if (!user.classe || !VALID_CLASSES.includes(user.classe)) {
                    console.warn(`⚠️ Classe inválida detectada no login (${user.classe}). Resetando para NOVATO.`);
                    user.classe = 'NOVATO';
                }

                await user.save(); // Agora vai salvar sem erro de validação

                const userData = user.toObject();
                userData.mensagem_bonus = "Bem-vindo ao GECA!";
                return res.json(userData);

            } catch (err) {
                if (err.code === 11000) user = await UsuarioModel.findOne({ email });
                else throw err;
            }
        }

        // 2. CORREÇÕES DE LEGADO
        if (!user.codigo_referencia) {
            user.codigo_referencia = gerarCodigo(user.nome);
            teveAlteracao = true;
        }
        if (!user.avatar_slug) {
            user.avatar_slug = 'default';
            teveAlteracao = true;
        }

        // 3. LÓGICA DE LOGIN DIÁRIO
        const hoje = new Date().setHours(0, 0, 0, 0);
        const ultimo = user.ultimo_login ? new Date(user.ultimo_login).setHours(0, 0, 0, 0) : 0;

        if (hoje > ultimo) {
            const ontem = new Date(); ontem.setDate(ontem.getDate() - 1); ontem.setHours(0, 0, 0, 0);

            // Se logou ontem, aumenta streak. Se não, reseta pra 1.
            user.sequencia_login = (ultimo === ontem.getTime()) ? (user.sequencia_login || 0) + 1 : 1;

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

        // 4. ATUALIZAÇÃO DE NÍVEL
        const novoNivel = calcularNivel(user.xp);
        if (novoNivel !== user.nivel) {
            user.nivel = novoNivel;
            teveAlteracao = true;
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