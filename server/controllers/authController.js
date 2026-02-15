// server/controllers/authController.js
const UsuarioModel = require('../models/Usuario');
const SystemState = require('../models/SystemState'); // Certifique-se que o arquivo acima existe!
const TOKEN = require('../config/tokenomics');
const EmailService = require('../services/EmailService'); // Importe o serviço

const EMAILS_ADMINS = ["joaovictorrabelo95@gmail.com"];

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

        // 3. LÓGICA DE LOGIN DIÁRIO (Blindada)
        // Só processa se o usuário for ATIVO (Verificado)
        if (user.status === 'ativo') {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0); // Zera hora para comparar dia
            
            // Garante que ultimo_login seja um objeto Date válido
            const ultimo = user.ultimo_login ? new Date(user.ultimo_login) : new Date(0);
            ultimo.setHours(0, 0, 0, 0);

            // Se a data de hoje for MAIOR que a data do último login processado
            if (hoje.getTime() > ultimo.getTime()) {
                const ontem = new Date(hoje);
                ontem.setDate(ontem.getDate() - 1);

                // Se logou ontem, mantém streak. Se não, reseta.
                // Usamos getTime() para comparação segura de timestamps
                user.sequencia_login = (ultimo.getTime() === ontem.getTime()) ? (user.sequencia_login || 0) + 1 : 1;

                const coinsBonus = TOKEN.COINS.DAILY_LOGIN_BASE + (user.sequencia_login * TOKEN.COINS.DAILY_LOGIN_STEP);

                user.saldo_coins += coinsBonus;
                user.xp += TOKEN.XP.DAILY_LOGIN;
                
                // Atualiza o último login IMEDIATAMENTE para travar o F5
                user.ultimo_login = new Date(); 

                user.extrato.push({
                    tipo: 'ENTRADA', 
                    valor: coinsBonus, 
                    descricao: `Daily Login (Dia ${user.sequencia_login})`, 
                    data: new Date()
                });

                mensagem_bonus = `+${coinsBonus} Coins! Sequência: ${user.sequencia_login} dias 🔥`;
                teveAlteracao = true;
            } else {
                // Apenas atualiza o timestamp de acesso, sem dar prêmio
                // Isso evita que 'ultimo_login' fique velho, mas não altera a data base de cálculo do prêmio se não virou o dia
                // user.ultimo_login = new Date(); // Opcional: atualizar horário de acesso
            }
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

// ADICIONE ISTO NO FINAL DO ARQUIVO:
exports.uploadComprovante = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }

        const url = req.file.path; 

        await UsuarioModel.findOneAndUpdate(
            { email },
            { 
                comprovante_url: url,
                status: 'pendente',
                validado: false
            }
        );

        res.json({ success: true, url: url });

    } catch (e) {
        console.error("Erro Upload:", e);
        res.status(500).json({ error: "Erro upload" });
    }
};

exports.getMe = async (req, res) => {
    try {
        // req.user._id já vem do middleware após descriptografar o token
        const usuario = await UsuarioModel.findById(req.user._id);
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar perfil" });
    }
};

// ==========================================
// 🆕 VALIDAÇÃO AUTOMÁTICA (UFMG)
// ==========================================

// 1. ENVIAR CÓDIGO
exports.sendVerification = async (req, res) => {
    try {
        const { email_ufmg } = req.body;
        const userId = req.user._id; // Vem do middleware auth

        // Validação de Domínio (Opcional, mas recomendado)
        if (!email_ufmg.endsWith('@ufmg.br') && !email_ufmg.endsWith('@demet.ufmg.br')) {
            return res.status(400).json({ error: "Use um e-mail institucional UFMG válido." });
        }

        // Verifica se já existe (unicidade)
        const emUso = await UsuarioModel.findOne({ email_institucional: email_ufmg });
        if (emUso && emUso._id.toString() !== userId) {
            return res.status(409).json({ error: "Este e-mail já está vinculado a outra conta." });
        }

        // Gera Código (6 dígitos)
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiration = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        // Salva no Banco (Sem salvar o email ainda como definitivo para evitar bloqueio antes da hora)
        // Salvamos o email temporariamente junto com o token ou confiamos que o user mandará o mesmo email na confirmação?
        // Melhor: Salva o email no user mas mantém status 'pendente'
        await UsuarioModel.findByIdAndUpdate(userId, {
            email_institucional: email_ufmg,
            token_validacao: code,
            token_expiracao: expiration
        });

        // Envia Email
        await EmailService.sendCode(email_ufmg, code);

        res.json({ success: true, message: `Código enviado para ${email_ufmg}` });

    } catch (error) {
        console.error("Erro envio código:", error);
        res.status(500).json({ error: "Falha ao enviar e-mail. Tente mais tarde." });
    }
};

// 2. CONFIRMAR CÓDIGO
exports.confirmVerification = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user._id;

        // Busca user com o token (precisa do select('+token_validacao') pois está oculto)
        const user = await UsuarioModel.findById(userId).select('+token_validacao +token_expiracao');

        if (!user.token_validacao || user.token_validacao !== code) {
            return res.status(400).json({ error: "Código inválido." });
        }

        if (user.token_expiracao < new Date()) {
            return res.status(400).json({ error: "Código expirado. Solicite outro." });
        }

        // SUCESSO: Ativa a conta
        user.status = 'ativo';
        user.validado = true;
        user.token_validacao = undefined; // Limpa o token
        user.token_expiracao = undefined;
        
        // Bônus de Validação? (Opcional)
        user.saldo_coins += 100; 
        user.extrato.push({ tipo: 'ENTRADA', valor: 100, descricao: 'Bônus: Identidade Verificada', data: new Date() });

        await user.save();

        res.json({ success: true, user: { ...user.toObject(), token_validacao: undefined } });

    } catch (error) {
        console.error("Erro confirmação:", error);
        res.status(500).json({ error: "Erro ao validar código." });
    }
};