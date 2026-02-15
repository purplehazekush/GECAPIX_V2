require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const SystemState = require('../models/SystemState');

async function fixCurve() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("💉 Injetando nova calibragem...");

    // Atualiza a season atual
    const res = await SystemState.updateOne(
        { season_id: 1 }, 
        { $set: { glue_price_multiplier: 1.03 } }
    );

    console.log(`✅ Curva ajustada para 1.03 (3%). Resultado:`, res);
    process.exit(0);
}

fixCurve();