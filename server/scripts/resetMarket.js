// server/scripts/resetMarket.js
require('dotenv').config({ path: '../.env' }); // Ajuste o path se rodar de dentro da pasta scripts
const mongoose = require('mongoose');
const Trade = require('../models/Trade');
const SystemState = require('../models/SystemState');
const Usuario = require('../models/Usuario');

const MONGO_URI = process.env.MONGO_URI;

async function resetMarket() {
    if (!MONGO_URI) { console.error("❌ Sem MONGO_URI"); process.exit(1); }
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log("🧹 Conectado. Iniciando limpeza do mercado...");

        // 1. Apagar todos os Trades (Candles somem)
        await Trade.deleteMany({});
        console.log("✅ Histórico de Trades apagado.");

        // 2. Resetar o Estado da Economia (Supply volta a zero)
        await SystemState.updateOne(
            { season_id: 1 },
            { 
                glue_supply_circulating: 0,
                total_burned: 0,
                // Mantemos o multiplicador e base price atuais, ou quer resetar também?
                // glue_price_base: 50,
                // glue_price_multiplier: 1.05
            }
        );
        console.log("✅ SystemState resetado (Supply 0).");

        // 3. Remover GLUE de todos os usuários (Opcional, mas recomendado para coerência)
        await Usuario.updateMany({}, { saldo_glue: 0 });
        console.log("✅ Carteiras de GLUE esvaziadas.");

        console.log("\n✨ MERCADO RESETADO COM SUCESSO. PRONTO PARA SEASON 1.");
        process.exit(0);

    } catch (error) {
        console.error("Erro:", error);
        process.exit(1);
    }
}

resetMarket();