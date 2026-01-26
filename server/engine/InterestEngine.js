// server/engine/InterestEngine.js
const UsuarioModel = require('../models/Usuario');
const LockedBondModel = require('../models/LockedBond');
const SystemState = require('../models/SystemState');
const EmissionCurve = require('./EmissionCurve');
const TOKEN = require('../config/tokenomics');

exports.aplicarJurosDiarios = async (currentDay) => {
    console.log(`💸 [DEFI] Iniciando cálculo de rendimentos (Dia ${currentDay})...`);

    try {
        // 1. CALCULAR O POTE DE RECOMPENSAS (REWARD POOL)
        // Baseado na curva de emissão do dia
        const dailyEmission = EmissionCurve.getDailyCashbackPool(currentDay);
        const rewardPool = dailyEmission * TOKEN.BANK.STAKING_ALLOCATION;

        console.log(`   -> Emissão Hoje: ${dailyEmission} GC | Pote Staking: ${Math.floor(rewardPool)} GC`);

        // 2. CALCULAR O TVL (TOTAL VALUE LOCKED)
        // Agregação para somar tudo que está investido no banco
        const aggLiquido = await UsuarioModel.aggregate([{ $group: { _id: null, total: { $sum: "$saldo_staking_liquido" } } }]);
        const totalLiquido = aggLiquido[0]?.total || 0;

        const aggLocked = await LockedBondModel.aggregate([
            { $match: { status: 'ATIVO' } },
            { $group: { _id: null, total: { $sum: "$valor_atual" } } }
        ]);
        const totalLocked = aggLocked[0]?.total || 0;

        // 3. CALCULAR SHARES (PESO PONDERADO)
        // Locked vale 3x mais (config) na divisão do bolo
        const lockedWeight = TOKEN.BANK.LOCKED_WEIGHT;
        const totalShares = totalLiquido + (totalLocked * lockedWeight);

        if (totalShares === 0) {
            console.log("   -> Nenhum staker. Pote acumulado para amanhã.");
            return;
        }

        // 4. CALCULAR O YIELD BASE (Dividend Per Share)
        let baseYield = rewardPool / totalShares;

        // 5. APLICAR CAP (CIRCUIT BREAKER)
        // O rendimento líquido é 1x o baseYield. Verificamos se estoura o teto.
        const maxLiq = TOKEN.BANK.MAX_DAILY_YIELD_LIQUID;

        if (baseYield > maxLiq) {
            console.log(`   -> Teto atingido! (Calculado: ${(baseYield * 100).toFixed(2)}% > Max: ${(maxLiq * 100).toFixed(2)}%)`);
            baseYield = maxLiq;
            // O que sobra, fica no SystemState (não é distribuído), servindo de reserva
        }

        // Taxas Finais
        const aprLiquido = baseYield;
        const aprLocked = baseYield * lockedWeight;

        // Trava final de segurança pro Locked também
        const finalAprLocked = Math.min(aprLocked, TOKEN.BANK.MAX_DAILY_YIELD_LOCKED);

        console.log(`   -> APR FINAL: Líquido ${(aprLiquido * 100).toFixed(4)}% | Locked ${(finalAprLocked * 100).toFixed(4)}%`);

        // 6. APLICAR RENDIMENTOS (UPDATE MASSIVO)

        // A. Líquido (Com bônus de classe Especulador aplicado sobre a taxa dinâmica)
        const speculatorMult = TOKEN.CLASSES.ESPECULADOR.STAKING_YIELD_MULT;

        // Normais (Não Especuladores)
        await UsuarioModel.updateMany(
            { saldo_staking_liquido: { $gt: 0 }, classe: { $ne: 'ESPECULADOR' } },
            { $mul: { saldo_staking_liquido: (1 + aprLiquido) } }
        );

        // Especuladores (Ganha Bônus)
        // 🔥 CORREÇÃO AQUI: Substituir 'baseRate' por (1 + (aprLiquido * speculatorMult))
        const aprEspeculador = aprLiquido * speculatorMult;

        await UsuarioModel.updateMany(
            { saldo_staking_liquido: { $gt: 0 }, status: 'ativo', classe: 'ESPECULADOR' }, // 🔥 CORREÇÃO: classe É 'ESPECULADOR'
            { $mul: { saldo_staking_liquido: (1 + aprEspeculador) } }
        );

        // 7. SALVAR INDICADORES NO BANCO CENTRAL (Para o Front ver)
        await SystemState.updateOne({ season_id: 1 }, {
            last_apr_liquid: aprLiquido,
            last_apr_locked: finalAprLocked,
            total_staked_liquid: totalLiquido,
            total_staked_locked: totalLocked
        });

    } catch (e) {
        console.error("❌ Erro crítico no motor DeFi:", e);
    }
};