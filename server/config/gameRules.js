module.exports = {
    // 1. CURVA DE EXPERIÊNCIA (Exponencial Suave)
    // Nível 1: 0 - 100 XP
    // Nível 2: 101 - 300 XP
    // Fórmula: XP Necessário = (Nível * 100) * Multiplicador
    getLevelData: (currentXp) => {
        let level = 1;
        let xpForNext = 100;
        
        // Loop simples para descobrir o nível (para jogos até lvl 50 é performático o suficiente)
        while (currentXp >= xpForNext) {
            currentXp -= xpForNext;
            level++;
            xpForNext = Math.floor(level * 100 * 1.1); // Dificuldade aumenta 10% por nível
        }
        
        return {
            level,
            xpCurrent: Math.floor(currentXp),
            xpNext: xpForNext
        };
    },

    // 2. SISTEMA DE CLASSES (Perks Passivos)
    // Isso responde sua dúvida de "como usar as classes".
    CLASSES: {
        'Mago': { perk: 'SABEDORIA', desc: 'Ganha +10% de XP em todas as fontes.', bonus_xp: 1.10 },
        'Guerreiro': { perk: 'VIGOR', desc: 'Limite diário de jogos aumentado em +5.', bonus_limit: 5 },
        'Ladino': { perk: 'SORTE', desc: '5% de chance de ganhar dobro de Coins no Daily Login.', chance_double: 0.05 },
        'Vampiro': { perk: 'NOTURNO', desc: 'Ganha +20% de Coins em jogos entre 22h e 04h.', active_hours: [22, 23, 0, 1, 2, 3, 4] },
        'Novato': { perk: 'NENHUM', desc: 'Evolua para escolher uma classe.' }
    }
};