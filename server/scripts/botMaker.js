const axios = require('axios');
require('dotenv').config({ path: '../.env' }); // Pega a chave secreta do seu .env

const API_URL = 'http://72.62.87.8:3001/api';
const BOT_SECRET = process.env.BOT_SECRET;
const INTERVALO = 5000; // 5 segundos

async function runBot() {
    console.log("🤖 BOT MARKET MAKER EM OPERAÇÃO...");
    console.log(`📡 Alvo: ${API_URL}`);

    setInterval(async () => {
        const isBuying = Math.random() > 0.4; // 60% chance de compra
        const amount = Math.floor(Math.random() * 3) + 1; // 1 a 10 tokens

        try {
            await axios.post(`${API_URL}/exchange/trade`, {
                action: isBuying ? 'buy' : 'sell',
                amount: amount
            }, {
                headers: { 'x-bot-secret': BOT_SECRET } // O "Passe Livre"
            });

            console.log(`📊 Bot: ${isBuying ? 'COMPROU' : 'VENDEU'} ${amount} GLUE`);
        } catch (err) {
            console.error("❌ Erro no trade do bot:", err.response?.data?.error || err.message);
        }
    }, INTERVALO);
}

runBot();