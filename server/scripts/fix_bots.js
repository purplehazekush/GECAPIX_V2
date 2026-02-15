require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');

async function fixBots() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔧 Iniciando Manutenção de Bots...");

    // 1. Identificar e Remover Bots Impostores
    // Deleta qualquer um que tenha 'bot' ou 'market' no nome/email MAS NÃO SEJA o oficial
    const oficialEmail = "market_maker@gecapix.com";
    
    const impostores = await Usuario.deleteMany({
        $or: [
            { email: { $regex: /bot/i } },
            { email: { $regex: /market/i } }
        ],
        email: { $ne: oficialEmail } // 🔥 SALVA O OFICIAL
    });

    console.log(`🗑️ ${impostores.deletedCount} bots antigos/impostores deletados.`);

    // 2. Garantir o Bot Oficial
    let bot = await Usuario.findOne({ email: oficialEmail });
    if (!bot) {
        console.log("⚠️ Bot oficial não encontrado. Recriando...");
        bot = await Usuario.create({
            email: oficialEmail,
            nome: "🤖 MARKET MAKER BOT",
            role: "admin",
            status: "ativo",
            saldo_coins: 1000000,
            saldo_glue: 1000,
            classe: "TECNOMANTE"
        });
    } else {
        // Reseta o saldo dele para garantir operação
        bot.saldo_coins = 1000000;
        bot.saldo_glue = 1000;
        await bot.save();
        console.log("✅ Bot Oficial restaurado e recarregado.");
    }

    console.log("✨ Limpeza concluída.");
    process.exit(0);
}

fixBots();