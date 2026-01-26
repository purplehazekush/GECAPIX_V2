// server/engine/DailyTreasury.js
// server/engine/DailyTreasure.js
const SystemState = require('../models/SystemState');
const EmissionCurve = require('./EmissionCurve');
const TOKEN = require('../config/tokenomics');
const InterestEngine = require('./InterestEngine'); // <--- Importe
const UsuarioModel = require('../models/Usuario');

exports.runDailyClosing = async () => {
    console.log("🏦 [TREASURY] Iniciando fechamento diário...");
    
    // 1. Busca ou Cria o Estado Inicial (BOOTSTRAP)
    let state = await SystemState.findOne({ season_id: 1 });
    
    if (!state) {
        console.log("🌱 [TREASURY] Inicializando Season 1...");
        state = await SystemState.create({
            season_id: 1,
            season_start_date: new Date(TOKEN.SEASON.START_DATE),
            current_day: 0
        });
    }

    // 2. Calcula em que dia estamos
    const today = new Date();
    const startDate = new Date(state.season_start_date);
    // Diferença em dias
    const diffTime = Math.abs(today - startDate);
    const dayIndex = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 

    // Se a season ainda não começou oficialmente, travamos no dia 0
    const effectiveDay = dayIndex < 0 ? 0 : dayIndex;

    // 3. Calcula Emissões
    const refPool = EmissionCurve.getDailyReferralPool(effectiveDay);
    const cashPool = EmissionCurve.getDailyCashbackPool(effectiveDay);
    const unitReward = EmissionCurve.getUnitaryReferralReward(effectiveDay);

    // 4. Aplica Lógica de Sobra
    // Referral: Queima sobra (Reseta pro valor do dia)
    state.referral_pool_available = refPool;
    
    // Cashback: Acumula sobra (Rollover)
    // Se for o primeiro dia, é só o pool. Se não, é o que tinha + o novo.
    state.cashback_pool_available = (state.cashback_pool_available || 0) + cashPool;
    
    // Atualiza recompensa unitária
    state.current_referral_reward = unitReward;

    // 5. Salva
    state.current_day = effectiveDay;
    state.last_update = new Date();
    await state.save();

    await InterestEngine.aplicarJurosDiarios(effectiveDay);

    console.log(`✅ [TREASURY] Dia ${effectiveDay} consolidado.`);
    console.log(`   -> Referral Reward Hoje: ${unitReward} GC`);
    console.log(`   -> Referral Pool: ${refPool} GC`);

    // 6. REGISTRO CONTÁBIL DA EMISSÃO
// O sistema "imprime" dinheiro enviando da Treasury para o Pote de Recompensas (conceitualmente)
// Na prática, os usuários ganham dinheiro "do ar" (mint), mas para auditar, podemos debitar a Treasury.

const totalMintedToday = refPool + cashPool; // O que foi disponibilizado

await UsuarioModel.updateOne(
    { email: "treasury@gecapix.com" },
    { 
        $inc: { saldo_coins: -totalMintedToday },
        $push: { extrato: { tipo: 'SAIDA', valor: totalMintedToday, descricao: `Emissão Dia ${effectiveDay}`, categoria: 'SYSTEM', data: new Date() } }
    }
);

console.log(`🖨️ [MINT] ${totalMintedToday} GC emitidos pela Tesouraria.`);
};