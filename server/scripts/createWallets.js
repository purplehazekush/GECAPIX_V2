// server/scripts/createWallets.js
// server/scripts/createSystemWallets.js
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');

async function createWallets() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("📡 Conectado ao MongoDB para criação de carteiras...");

        const wallets = [
            {
                email: "treasury@gecapix.com",
                nome: "TESOURO NACIONAL GECAPIX",
                role: "admin",
                status: "ativo",
                classe: "NOVATO"
            },
            {
                email: "trading_fees@gecapix.com",
                nome: "FEE COLLECTOR (TAXAS)",
                role: "admin",
                status: "ativo",
                classe: "NOVATO"
            },
            {
                email: "burn_address@gecapix.com",
                nome: "FORNALHA (BURN)",
                role: "admin",
                status: "ativo",
                classe: "NOVATO"
            }
        ];

        for (const w of wallets) {
            const exists = await Usuario.findOne({ email: w.email });
            if (!exists) {
                await Usuario.create(w);
                console.log(`✅ Carteira criada: ${w.nome}`);
            } else {
                console.log(`ℹ️ Carteira já existe: ${w.nome}`);
            }
        }

        console.log("\n✨ Todas as carteiras de sistema estão prontas.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

createWallets();