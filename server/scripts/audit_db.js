require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const Trade = require('../models/Trade');
const LockedBond = require('../models/LockedBond');

async function audit() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🔍 AUDITORIA PÓS-BIG BANG\n");

        // 1. Contagem de Usuários
        const users = await Usuario.find({}, 'nome email role saldo_coins');
        console.log(`👥 Usuários Vivos: ${users.length}`);
        users.forEach(u => console.log(`   - [${u.role}] ${u.nome} (${u.email}) -> ${u.saldo_coins} GC`));

        // 2. Trades
        const trades = await Trade.countDocuments();
        console.log(`\n📈 Trades no Histórico: ${trades}`);

        // 3. Títulos
        const bonds = await LockedBond.countDocuments();
        console.log(`🔒 Títulos Ativos: ${bonds}`);

        process.exit(0);
    } catch (e) { console.error(e); process.exit(1); }
}

audit();