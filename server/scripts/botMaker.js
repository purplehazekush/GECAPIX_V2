const axios = require('axios');

// Configuração
const API_URL = 'http://72.62.87.8:3001/api'; // Batendo localmente no servidor
const BOT_EMAIL = 'joaovictorrabelo95@gmail.com'; // O bot precisa dessa identidade
const INTERVALO_MS = 3000; // 5 segundos

// Lógica de Decisão (Aleatória)
const actions = ['buy', 'buy', 'buy', 'sell', 'sell', 'sell', 'buy']; // 75% chance de compra (Bullish)
const amounts = [1, 2, 3, 4]; // Quantidades pequenas para não explodir o preço

async function runBot() {
    console.log(`🤖 BOT INICIADO. Alvo: ${API_URL}`);

    // 1. Garantir que o Bot existe e tem dinheiro infinito (Cheat Code)
    // Nota: Você precisaria criar uma rota de admin para dar dinheiro ou injetar no banco manualmente.
    // Por enquanto, assumimos que o bot já tem saldo. 
    
    setInterval(async () => {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const amount = amounts[Math.floor(Math.random() * amounts.length)];

        console.log(`\n🎲 Tentando: ${action.toUpperCase()} ${amount} GLUE...`);

        try {
            const res = await axios.post(`${API_URL}/exchange/trade`, {
                action,
                amount
            }, {
                headers: { 'x-user-email': BOT_EMAIL } // A autenticação "gambiarra" que criamos
            });

            if (res.data.success) {
                console.log(`✅ Sucesso! Preço reagiu.`);
            }
        } catch (error) {
            console.log(`❌ Falha: ${error.response?.data?.error || error.message}`);
            // Se falhar por saldo, o bot pararia. Idealmente, daríamos refill nele aqui.
        }

    }, INTERVALO_MS);
}

runBot();