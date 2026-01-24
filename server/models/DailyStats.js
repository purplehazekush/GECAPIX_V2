const mongoose = require('mongoose');

const DailyStatsSchema = new mongoose.Schema({
    data: { type: Date, default: Date.now },
    total_supply: Number,      // Dinheiro total existente
    active_users: Number,      // Usuários que logaram hoje
    transactions_count: Number,// Volume de transações (se tivermos contador)
    circulating_supply: Number // Dinheiro na mão dos alunos (Total - Admin)
});

module.exports = mongoose.model('DailyStats', DailyStatsSchema);