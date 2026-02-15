require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');

// --- CONFIGURAÇÃO DA OPERAÇÃO ---
const SOURCE_EMAIL = "central_bank@gecapix.com";
const TARGET_EMAIL = "market_maker@gecapix.com";
const AMOUNT = 10_000_000; // 10 Milhões de Coins (Ajuste conforme necessidade)

async function injectLiquidity() {
    if (!process.env.MONGO_URI) { console.error("❌ Sem MONGO_URI"); process.exit(1); }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🏦 CONECTADO AO SISTEMA FINANCEIRO.\n");

        // 1. Identificar as Partes
        const bank = await Usuario.findOne({ email: SOURCE_EMAIL });
        const bot = await Usuario.findOne({ email: TARGET_EMAIL });

        if (!bank) throw new Error(`Banco Central (${SOURCE_EMAIL}) não encontrado!`);
        if (!bot) throw new Error(`Bot Market Maker (${TARGET_EMAIL}) não encontrado!`);

        console.log(`💰 Saldo Atual BC:  ${bank.saldo_coins.toLocaleString()} GC`);
        console.log(`🤖 Saldo Atual Bot: ${bot.saldo_coins.toLocaleString()} GC`);
        console.log(`-------------------------------------------`);
        console.log(`💸 Transferindo:    ${AMOUNT.toLocaleString()} GC...`);

        // 2. Validação de Saldo
        if (bank.saldo_coins < AMOUNT) {
            throw new Error("O Banco Central não tem liquidez suficiente para este aporte.");
        }

        // 3. Execução (Débito e Crédito)
        
        // DEBITA DO BANCO
        bank.saldo_coins -= AMOUNT;
        bank.extrato.push({
            tipo: 'SAIDA',
            valor: AMOUNT,
            descricao: 'Aporte de Liquidez Operacional (Bot)',
            categoria: 'SYSTEM', // Importante para não sujar métricas de P2P
            data: new Date()
        });

        // CREDITA NO BOT
        bot.saldo_coins += AMOUNT;
        bot.extrato.push({
            tipo: 'ENTRADA',
            valor: AMOUNT,
            descricao: 'Recebimento de Aporte (Banco Central)',
            categoria: 'SYSTEM',
            data: new Date()
        });

        // 4. Commit
        await bank.save();
        await bot.save();

        console.log(`-------------------------------------------`);
        console.log("✅ OPERAÇÃO CONCLUÍDA COM SUCESSO.");
        console.log(`🏦 Novo Saldo BC:   ${bank.saldo_coins.toLocaleString()} GC`);
        console.log(`🤖 Novo Saldo Bot:  ${bot.saldo_coins.toLocaleString()} GC`);
        
        process.exit(0);

    } catch (e) {
        console.error("❌ ERRO NA TRANSFERÊNCIA:", e.message);
        process.exit(1);
    }
}

injectLiquidity();