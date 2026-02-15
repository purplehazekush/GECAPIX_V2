const mongoose = require('mongoose');
require('dotenv').config(); // Garante que carrega seu MONGO_URI
const SystemState = require('../server/models/SystemState');

const MONGO_URI = process.env.MONGO_URI || 'sua_string_de_conexao_aqui';

async function bigBang() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🚀 Conectado ao MongoDB. Iniciando Big Bang...");

    // Limpa estados anteriores da Season 1 (Cuidado: isso reseta o supply!)
    await SystemState.deleteMany({ season_id: 1 });

    const genesisState = new SystemState({
      season_id: 1,
      season_start_date: new Date(),
      glue_price_base: 50,         // Preço inicial de 50 coins
      glue_price_multiplier: 1.05, // Aumento de 5% por token (Ajuste conforme o teste)
      glue_supply_circulating: 0,
      market_is_open: true,
      total_burned: 0,
      is_active: true
    });

    await genesisState.save();
    console.log("🌌 Universo da Season 01 criado com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("💥 O Big Bang falhou:", error);
    process.exit(1);
  }
}

bigBang();
