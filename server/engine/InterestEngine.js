const UsuarioModel = require('../models/Usuario');
const LockedBondModel = require('../models/LockedBond');
const TOKEN = require('../config/tokenomics');

exports.aplicarJurosDiarios = async () => {
    console.log("💸 [BANK] Aplicando Juros Compostos (Staking)...");

    try {
        // 1. STAKING LÍQUIDO (Atualização em Massa)
        // Multiplica o saldo de todos que tem > 0 por (1 + taxa)
        // No Mongo, $mul faz multiplicação atômica
        const liquidRate = 1 + TOKEN.BANK.LIQUID_APR_DAILY;
        
        const resLiq = await UsuarioModel.updateMany(
            { saldo_staking_liquido: { $gt: 0 } },
            { $mul: { saldo_staking_liquido: liquidRate } }
        );
        console.log(`   -> Líquido: ${resLiq.modifiedCount} contas renderam.`);


        // 2. STAKING LOCKED (Um por um para precisão ou $mul também)
        // Títulos ativos também rendem diariamente sobre o valor_atual (juro composto)
        const lockedRate = 1 + TOKEN.BANK.LOCKED_APR_DAILY;
        
        const resLock = await LockedBondModel.updateMany(
            { status: 'ATIVO' },
            { $mul: { valor_atual: lockedRate } }
        );
        console.log(`   -> Locked: ${resLock.modifiedCount} títulos renderam.`);

    } catch (e) {
        console.error("❌ Erro ao aplicar juros:", e);
    }
};