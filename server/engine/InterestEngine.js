const UsuarioModel = require('../models/Usuario');
const LockedBondModel = require('../models/LockedBond');
const TOKEN = require('../config/tokenomics');

exports.aplicarJurosDiarios = async () => {
    console.log("💸 [BANK] Aplicando Juros Compostos (Staking)...");

    try {
        // --- 1. STAKING LÍQUIDO ---
        
        // Taxa Base (Para todos que NÃO são Especuladores)
        const baseRate = 1 + TOKEN.BANK.LIQUID_APR_DAILY;
        
        await UsuarioModel.updateMany(
            { saldo_staking_liquido: { $gt: 0 }, classe: { $ne: 'ESPECULADOR' } },
            { $mul: { saldo_staking_liquido: baseRate } }
        );

        // Taxa Turbo (Para Especuladores)
        // Ex: 0.5% * 1.5 = 0.75% ao dia
        const speculatorAPR = TOKEN.BANK.LIQUID_APR_DAILY * TOKEN.CLASSES.ESPECULADOR.STAKING_YIELD_MULT;
        const speculatorRate = 1 + speculatorAPR;

        const resSpec = await UsuarioModel.updateMany(
            { saldo_staking_liquido: { $gt: 0 }, classe: 'ESPECULADOR' },
            { $mul: { saldo_staking_liquido: speculatorRate } }
        );
        
        console.log(`   -> Staking Líquido processado. (Especuladores beneficiados: ${resSpec.modifiedCount})`);


        // --- 2. STAKING LOCKED (Títulos) ---
        // Títulos rendem igual para todos (contrato fixo), mas poderíamos aplicar bônus aqui também se quisesse.
        // Por enquanto, mantemos a taxa contratada no momento da compra.
        const lockedRate = 1 + TOKEN.BANK.LOCKED_APR_DAILY;
        
        await LockedBondModel.updateMany(
            { status: 'ATIVO' },
            { $mul: { valor_atual: lockedRate } }
        );

    } catch (e) {
        console.error("❌ Erro ao aplicar juros:", e);
    }
};