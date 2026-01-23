// server/controllers/questController.js
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');

// Definimos as missões estáticas ou buscamos do banco se você tiver criado a Collection Quest
// Para MVP rápido, manteremos Hardcoded aqui mas usando os valores do Tokenomics
const MISSOES_SISTEMA = [
    { 
        id: 'm1', 
        titulo: 'Primeira Pérola', 
        desc: 'Poste seu primeiro meme na Arena', 
        premio_coins: 100, 
        premio_xp: TOKEN.XP.MEME_POSTADO,
        rota_acao: '/arena/memes'
    },
    { 
        id: 'm2', 
        titulo: 'Investidor Anjo', 
        desc: 'Vote em um meme de colega', 
        premio_coins: 50, 
        premio_xp: 20,
        rota_acao: '/arena/memes' // O front redireciona para lá
    },
    { 
        id: 'm3', 
        titulo: 'Networking', 
        desc: 'Indique um amigo para a Arena (O amigo deve usar seu código)', 
        premio_coins: TOKEN.COINS.REFERRAL_BONUS, 
        premio_xp: TOKEN.XP.REFERRAL,
        auto_check: true // Essa missão é completada automaticamente pelo sistema de Auth
    }
];

// 1. LISTAR QUESTS (Com status de concluído)
exports.getQuests = async (req, res) => {
    try {
        const { email } = req.query;
        const user = await UsuarioModel.findOne({ email }).select('missoes_concluidas');
        
        const concluidas = (user && user.missoes_concluidas) ? user.missoes_concluidas : [];

        const statusQuests = MISSOES_SISTEMA.map(q => ({
            ...q,
            concluida: concluidas.includes(q.id)
        }));

        res.json(statusQuests);
    } catch (e) {
        console.error("ERRO QUESTS:", e);
        res.status(500).json({ error: "Erro interno ao buscar missões" });
    }
};

// 2. REIVINDICAR RECOMPENSA (Manual Trigger)
// Usado para missões que dependem de clique ou validação simples
exports.claimQuest = async (req, res) => {
    try {
        const { email, questId } = req.body;

        // Validação da Missão
        const quest = MISSOES_SISTEMA.find(q => q.id === questId);
        if (!quest) return res.status(404).json({ error: "Missão inexistente" });
        if (quest.auto_check) return res.status(400).json({ error: "Esta missão é completada automaticamente." });

        // Busca Usuário
        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

        // Verifica se já completou
        if (user.missoes_concluidas.includes(questId)) {
            return res.status(400).json({ error: "Missão já recompensada!" });
        }

        // LÓGICA DE VERIFICAÇÃO ESPECÍFICA (Exemplo)
        // Aqui você pode adicionar lógica customizada para validar se ele REALMENTE fez a ação
        // Por enquanto, vamos assumir que o Front só chama isso se a ação foi feita
        // ou faremos verificações simples:
        
        let podeReivindicar = false;

        if (questId === 'm2') {
             // Exemplo: Checar se ele tem algum gasto com descrição "Investimento Meme" no extrato
             const jaInvestiu = user.extrato.some(t => t.descricao && t.descricao.includes('Investimento Meme'));
             if (jaInvestiu) podeReivindicar = true;
             else return res.status(400).json({ error: "Você ainda não investiu em nenhum meme!" });
        }

        // SE PASSOU NAS VALIDAÇÕES: Executa Pagamento Atômico
        if (podeReivindicar) {
            await UsuarioModel.updateOne(
                { email },
                { 
                    $push: { 
                        missoes_concluidas: questId,
                        extrato: { 
                            tipo: 'ENTRADA', 
                            valor: quest.premio_coins, 
                            descricao: `Recompensa: ${quest.titulo}`, 
                            data: new Date() 
                        }
                    },
                    $inc: { 
                        saldo_coins: quest.premio_coins,
                        xp: quest.premio_xp
                    }
                }
            );

            res.json({ success: true, message: `Recebido: ${quest.premio_coins} Coins e ${quest.premio_xp} XP!` });
        } else {
            res.status(400).json({ error: "Critérios da missão não atendidos." });
        }

    } catch (e) {
        console.error("ERRO CLAIM QUEST:", e);
        res.status(500).json({ error: "Erro ao reivindicar missão" });
    }
};