const UsuarioModel = require('../models/Usuario');
const LockedBondModel = require('../models/LockedBond');
const SystemState = require('../models/SystemState');
const TOKEN = require('../config/tokenomics');

class InterestEngine {

    /**
     * Calcula a APR (Taxa Diária) personalizada para um usuário
     * Baseada no Nível e Classe.
     */
    static calculateUserLiquidAPR(user) {
        // 1. Configurações Base
        const BASE_APR = 0.005; // 0.5% ao dia base
        const CAP_APR = TOKEN.BANK.MAX_DAILY_YIELD_LIQUID || 0.015; // Teto de 1.5% ao dia
        
        // 2. Bônus por Nível (0.05% a mais por nível)
        // Nível 1 = +0.05%, Nível 10 = +0.5%
        const LEVEL_BONUS = (user.nivel || 1) * 0.0005; 

        // 3. Bônus de Classe (Especulador ganha +10% sobre o total)
        let multiplier = 1;
        if (user.classe === 'ESPECULADOR') {
            multiplier = TOKEN.CLASSES.ESPECULADOR.STAKING_YIELD_MULT || 1.1;
        }

        // 4. Cálculo Final
        let finalRate = (BASE_APR + LEVEL_BONUS) * multiplier;

        // 5. Trava de Segurança (Cap)
        return Math.min(finalRate, CAP_APR);
    }

    /**
     * Roda o processamento em lote de todos os juros
     * Chamado pelo DailyTreasury.js
     */
    static async aplicarJurosDiarios(day) {
        console.log(`💸 [INTEREST] Calculando juros do dia ${day}...`);
        
        const bulkOpsUsers = [];
        const bulkOpsBonds = [];
        let totalYieldPaid = 0;

        // --- 1. STAKING LÍQUIDO (CDB) ---
        // Busca quem tem dinheiro parado
        const savers = await UsuarioModel.find({ saldo_staking_liquido: { $gt: 0 } });

        for (let user of savers) {
            const rate = this.calculateUserLiquidAPR(user);
            const yieldAmount = Math.floor(user.saldo_staking_liquido * rate);

            if (yieldAmount > 0) {
                totalYieldPaid += yieldAmount;
                
                // Prepara update em lote (Performance)
                bulkOpsUsers.push({
                    updateOne: {
                        filter: { _id: user._id },
                        update: { 
                            $inc: { saldo_staking_liquido: yieldAmount }, // Juros Compostos (Cai no principal)
                            // Opcional: Se quiser juros simples caindo na conta corrente:
                            // $inc: { saldo_coins: yieldAmount } 
                        }
                    }
                });
            }
        }

        // --- 2. STAKING TRAVADO (BONDS) ---
        // Busca títulos ativos
        const bonds = await LockedBondModel.find({ status: 'ATIVO' });

        for (let bond of bonds) {
            // A taxa já foi fixada na compra (contrato inteligente imutável)
            const rate = bond.apr_contratada;
            const yieldAmount = Math.floor(bond.valor_atual * rate);

            if (yieldAmount > 0) {
                totalYieldPaid += yieldAmount;
                
                bulkOpsBonds.push({
                    updateOne: {
                        filter: { _id: bond._id },
                        update: { $inc: { valor_atual: yieldAmount } }
                    }
                });
            }
        }

        // --- 3. EXECUÇÃO NO BANCO ---
        if (bulkOpsUsers.length > 0) {
            await UsuarioModel.bulkWrite(bulkOpsUsers);
            console.log(`   -> Juros Líquidos pagos a ${bulkOpsUsers.length} usuários.`);
        }

        if (bulkOpsBonds.length > 0) {
            await LockedBondModel.bulkWrite(bulkOpsBonds);
            console.log(`   -> Juros de Títulos atualizados em ${bulkOpsBonds.length} contratos.`);
        }

        // --- 4. REGISTRO CONTÁBIL ---
        // Registra quanto o sistema "imprimiu" ou tirou do fundo de garantia
        if (totalYieldPaid > 0) {
            await SystemState.updateOne({ season_id: 1 }, {
                $inc: { total_fees_collected: -totalYieldPaid } // Deduz do lucro do sistema (Fees)
            });
        }

        console.log(`💰 [INTEREST] Total distribuído: ${totalYieldPaid} GC`);
    }
}

module.exports = InterestEngine;