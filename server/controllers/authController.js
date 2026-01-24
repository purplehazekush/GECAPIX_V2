const UsuarioModel = require('../models/Usuario');
const SystemState = require('../models/SystemState'); 
const TOKEN = require('../config/tokenomics'); 

// Adicione seu email e o do Caio aqui para garantir acesso Admin
const EMAILS_ADMINS = ["joaovictorrabelo95@gmail.com", "caiogcosta03@gmail.com"];

// --- HELPERS ---

// Gera código único: JOAO + 4 números aleatórios
const gerarCodigo = (nome) => {
    const prefixo = (nome || "USER").split(' ')[0].toUpperCase().substring(0, 4).replace(/[^A-Z]/g, 'X');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefixo}${random}`;
};

// Recalcula nível baseado no XP total (Curva simples: 100xp por nível progressivo)
const calcularNivel = (xpTotal) => {
    let nivel = 1;
    let xpRequerido = 100;
    let auxXp = xpTotal;
    
    while (auxXp >= xpRequerido) {
        auxXp -= xpRequerido;
        nivel++;
        xpRequerido = nivel * 100; 
    }
    return nivel;
};

// --- LOGIN PRINCIPAL ---

exports.login = async (req, res) => {
    try {
        const { email, nome, codigo_convite } = req.body;
        
        // 1. Busca o valor do Referral de HOJE no Banco Central (SystemState)
        // Se não tiver estado (primeiro boot), usa o valor máximo do tokenomics
        let state = await SystemState.findOne({ season_id: 1 });
        const premioReferralHoje = state ? state.current_referral_reward : TOKEN.COINS.MAX_REFERRAL_REWARD;

        let user = await UsuarioModel.findOne({ email });
        let mensagem_bonus = null;
        let teveAlteracao = false;

        // ======================================================
        // CENÁRIO A: NOVO USUÁRIO (REGISTRO)
        // ======================================================
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
                    saldo_glue: 0,
                    xp: 0,
                    nivel: 1,
                    avatar_slug: 'default',
                    // Gera o código DELE agora
                    codigo_referencia: gerarCodigo(nome),
                    extrato: [{ tipo: 'ENTRADA', valor: TOKEN.COINS.WELCOME_BONUS, descricao: 'Bônus de Boas Vindas', data: new Date() }]
                });

                // Lógica de Padrinho (Quem indicou)
                if (codigo_convite) {
                    const padrinho = await UsuarioModel.findOne({ codigo_referencia: codigo_convite.toUpperCase() });
                    if (padrinho) {
                        user.indicado_por = padrinho.email;
                        
                        // 1. O Novato ganha bônus extra (Fixo)
                        user.saldo_coins += TOKEN.COINS.REFERRAL_WELCOME;
                        user.extrato.push({ tipo: 'ENTRADA', valor: TOKEN.COINS.REFERRAL_WELCOME, descricao: 'Bônus Código Convite', data: new Date() });

                        // 2. O Padrinho ganha o valor DINÂMICO do dia
                        // Atualização atômica para não precisar carregar o padrinho inteiro
                        await UsuarioModel.updateOne({ _id: padrinho._id }, {
                            $inc: { saldo_coins: premioReferralHoje, xp: TOKEN.XP.REFERRAL },
                            $push: { extrato: { tipo: 'ENTRADA', valor: premioReferralHoje, descricao: `Indicou ${nome.split(' ')[0]}`, data: new Date() } }
                        });
                    }
                }

                await user.save();
                
                const userData = user.toObject();
                userData.mensagem_bonus = "Bem-vindo ao GECA! Conta criada.";
                return res.json(userData);

            } catch (err) {
                // Se der erro de chave duplicada (raro), tenta buscar de novo
                if (err.code === 11000) user = await UsuarioModel.findOne({ email });
                else throw err; 
            }
        }

        // ======================================================
        // CENÁRIO B: USUÁRIO EXISTENTE (LOGIN)
        // ======================================================

        // 1. Correções de Legado (Se o usuário for antigo e não tiver esses campos)
        if (!user.codigo_referencia) {
            user.codigo_referencia = gerarCodigo(user.nome);
            teveAlteracao = true;
        }
        if (!user.avatar_slug) {
            user.avatar_slug = 'default';
            teveAlteracao = true;
        }

        // 2. Login Diário
        const hoje = new Date().setHours(0,0,0,0);
        const ultimo = user.ultimo_login ? new Date(user.ultimo_login).setHours(0,0,0,0) : 0;

        if (hoje > ultimo) {
            const ontem = new Date(); ontem.setDate(ontem.getDate() - 1); ontem.setHours(0,0,0,0);
            
            // Se logou ontem, aumenta streak. Se não, reseta para 1.
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

        // 3. Recalculo de Nível (Garante consistência)
        const novoNivel = calcularNivel(user.xp);
        if (novoNivel !== user.nivel) {
            user.nivel = novoNivel;
            teveAlteracao = true;
        }

        // 4. Admin Sync (Garante que você não perca acesso)
        if (EMAILS_ADMINS.includes(email) && user.role !== 'admin') {
            user.role = 'admin'; user.status = 'ativo'; 
            teveAlteracao = true;
        }

        // Salva apenas se mudou algo (economiza banco)
        if (teveAlteracao) await user.save();

        const userData = user.toObject();
        userData.mensagem_bonus = mensagem_bonus; 
        res.json(userData);

    } catch (error) {
        console.error("Erro fatal no login:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
};