const SystemState = require('../models/SystemState');
const UsuarioModel = require('../models/Usuario'); // Importe o model para debitar a Treasury
const EmissionCurve = require('./EmissionCurve');
const TOKEN = require('../config/tokenomics');
const InterestEngine = require('./InterestEngine');

exports.runDailyClosing = async () => {
    console.log("🏦 [TREASURY] Verificando fechamento diário...");
    
    // 1. Busca Estado
    let state = await SystemState.findOne({ season_id: TOKEN.SEASON.ID });
    
    // Bootstrap (Se não existir, cria - Acontece no primeiro boot pós-limpeza)
    if (!state) {
        console.log("🌱 [TREASURY] Inicializando Season (Bootstrap)...");
        // Não criamos aqui pois o adminController já cria no Reset.
        // Mas por segurança, se for null, abortamos para não quebrar.
        return console.log("⚠️ [TREASURY] SystemState não encontrado. Rode o Reset primeiro.");
    }

    // 2. Calcula o Dia Atual (Real)
    const today = new Date();
    const startDate = new Date(state.season_start_date);
    const diffTime = today - startDate; // Milissegundos
    // Arredonda para baixo (Dia 0 é as primeiras 24h)
    const calculatedDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 

    // Se o dia calculado for negativo (Season agendada pro futuro), travamos no 0
    const targetDay = calculatedDay < 0 ? 0 : calculatedDay;

    // 🔥 3. CHECK DE IDEMPOTÊNCIA (A TRAVA) 🔥
    // Se já processamos este dia (ou um dia futuro), paramos TUDO.
    if (state.last_processed_day >= targetDay) {
        console.log(`⏸️ [TREASURY] Dia ${targetDay} já foi consolidado. Nada a fazer.`);
        
        // Apenas atualiza o current_day para o relógio do frontend ficar certo, mas não roda a economia
        if (state.current_day !== targetDay) {
            state.current_day = targetDay;
            await state.save();
        }
        return;
    }

    console.log(`🚀 [TREASURY] Executando fechamento do Dia ${targetDay}...`);

    // --- 4. LÓGICA ECONÔMICA (Só roda se passou no check) ---

    // Calcula Emissões
    const refPool = EmissionCurve.getDailyReferralPool(targetDay);
    const cashPool = EmissionCurve.getDailyCashbackPool(targetDay);
    const unitReward = EmissionCurve.getUnitaryReferralReward(targetDay);

    // Atualiza Estado
    state.referral_pool_available = refPool;
    // Cashback acumula o que sobrou (rollover) + o novo
    state.cashback_pool_available = (state.cashback_pool_available || 0) + cashPool;
    state.current_referral_reward = unitReward;

    // Roda Juros DeFi
    await InterestEngine.aplicarJurosDiarios(targetDay);

   // --- 5. CONTABILIDADE (MINT) ---
    
    // A. Debita do Tesouro Geral o Referral Pool
    if (refPool > 0) {
        await UsuarioModel.updateOne(
            { email: TOKEN.WALLETS.TREASURY },
            { 
                $inc: { saldo_coins: -refPool },
                $push: { extrato: { tipo: 'SAIDA', valor: refPool, descricao: `Emissão Referral Dia ${targetDay}`, categoria: 'SYSTEM', data: new Date() } }
            }
        );
    }

    // B. Debita do Fundo Cashback o Cashback Pool
    if (cashPool > 0) {
        await UsuarioModel.updateOne(
            { email: TOKEN.WALLETS.CASHBACK },
            { 
                $inc: { saldo_coins: -cashPool },
                $push: { extrato: { tipo: 'SAIDA', valor: cashPool, descricao: `Emissão Cashback Dia ${targetDay}`, categoria: 'SYSTEM', data: new Date() } }
            }
        );
    }

    // --- 6. FINALIZAÇÃO ---
    state.current_day = targetDay;
    state.last_processed_day = targetDay; // 🔥 Marca como FEITO
    state.last_update = new Date();
    await state.save();

    console.log(`✅ [TREASURY] Fechamento do Dia ${targetDay} concluído com sucesso.`);
    console.log(`   -> Emitido: ${totalMintedToday} GC`);
};