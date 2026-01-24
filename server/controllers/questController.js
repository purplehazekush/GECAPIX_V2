const UsuarioModel = require('../models/Usuario');
const QUESTS_CONFIG = require('../config/quests');

// HELPER: Verifica se a data é do período atual
const isCompletedInPeriod = (lastDate, frequency) => {
    if (!lastDate) return false;
    const now = new Date();
    const last = new Date(lastDate);

    // Reset às 21:00 (Fuso do Game) ou 00:00 (Fuso Real). Vamos usar 00:00 UTC para simplificar a lógica
    // Lógica simples: Mesmo dia/semana calendário
    
    if (frequency === 'DIARIA') {
        return last.toDateString() === now.toDateString();
    }
    
    if (frequency === 'SEMANAL') {
        // Pega o número da semana do ano
        const getWeek = (d) => {
            const onejan = new Date(d.getFullYear(), 0, 1);
            return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
        };
        return getWeek(last) === getWeek(now) && last.getFullYear() === now.getFullYear();
    }

    if (frequency === 'UNICA') {
        return true; // Se tem data, tá feita pra sempre
    }
    
    return false;
};

exports.getQuests = async (req, res) => {
    try {
        const { email } = req.query;
        const user = await UsuarioModel.findOne({ email });
        const progress = user.quest_progress || [];

        const statusQuests = QUESTS_CONFIG.map(q => {
            // Busca progresso dessa quest específica
            const userQuest = progress.find(p => p.quest_id === q.id);
            
            // Verifica se está concluída NO PERÍODO ATUAL
            const isDone = userQuest 
                ? isCompletedInPeriod(userQuest.last_completed_at, q.frequencia)
                : false;

            return {
                ...q,
                concluida: isDone,
                vezes_completada: userQuest?.count || 0
            };
        });

        res.json(statusQuests);
    } catch (e) {
        console.error("ERRO QUESTS:", e);
        res.status(500).json({ error: "Erro interno" });
    }
};

exports.claimQuest = async (req, res) => {
    try {
        const { email, questId } = req.body;
        
        // 1. Configs
        const quest = QUESTS_CONFIG.find(q => q.id === questId);
        if (!quest) return res.status(404).json({ error: "Missão inexistente" });
        if (quest.auto_check) return res.status(400).json({ error: "Completada automaticamente." });

        const user = await UsuarioModel.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found" });

        // 2. Verifica se já fez HOJE/SEMANA
        const userQuest = user.quest_progress?.find(p => p.quest_id === questId);
        if (userQuest && isCompletedInPeriod(userQuest.last_completed_at, quest.frequencia)) {
            return res.status(400).json({ error: `Você já completou esta missão ${quest.frequencia.toLowerCase()}!` });
        }

        // 3. Validação Lógica (Igual ao anterior, mas adaptado)
        let passou = false;
        
        // Se não checa backend, assume true (frontend validou redirecionamento)
        if (!quest.check_backend) passou = true; 
        else {
            const hoje = new Date(); hoje.setHours(0,0,0,0);
            
            switch (quest.criterio) {
                case 'INVESTIMENTO_MEME':
                    // Procura extrato de MEME/SAIDA com data >= hoje
                    passou = user.extrato.some(t => 
                        t.categoria === 'MEME' && t.tipo === 'SAIDA' && new Date(t.data) >= hoje
                    );
                    break;
                case 'COMPRA_TITULO':
                    // Procura extrato de INVEST/SAIDA com data >= hoje
                    // (Aqui poderia melhorar checando se foi essa semana, mas hoje serve pra validar a ação)
                    passou = user.extrato.some(t => 
                        t.categoria === 'INVEST' && t.tipo === 'SAIDA' && new Date(t.data) >= hoje
                    );
                    break;
            }
        }

        if (passou) {
            // 4. ATUALIZA O PROGRESSO (Upsert no Array)
            // Se já existe, atualiza data e incrementa count. Se não, push.
            
            // Remove entrada antiga se existir para colocar a nova (maneira fácil de atualizar array de objetos)
            await UsuarioModel.updateOne(
                { email },
                { $pull: { quest_progress: { quest_id: questId } } }
            );

            await UsuarioModel.updateOne(
                { email },
                { 
                    $push: { 
                        quest_progress: { 
                            quest_id: questId, 
                            last_completed_at: new Date(),
                            count: (userQuest?.count || 0) + 1 
                        },
                        extrato: { 
                            tipo: 'ENTRADA', valor: quest.premio_coins, 
                            descricao: `Quest: ${quest.titulo}`, categoria: 'QUEST', data: new Date() 
                        }
                    },
                    $inc: { saldo_coins: quest.premio_coins, xp: quest.premio_xp }
                }
            );

            res.json({ success: true, message: `+${quest.premio_coins} GC | +${quest.premio_xp} XP` });
        } else {
            res.status(400).json({ error: "Requisito não encontrado hoje." });
        }

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erro ao processar" });
    }
};