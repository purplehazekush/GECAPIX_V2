// server/fix_users.js
require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('./models/Usuario'); // Ajuste o caminho se necessário

const URI_DO_BANCO = "Sua_String_De_Conexao_Do_Env_Aqui";

async function fixUsers() {
    await mongoose.connect(URI_DO_BANCO);
    console.log("Conectado ao Mongo. Iniciando reparo...");

    const users = await Usuario.find({});
    
    for (const u of users) {
        let changed = false;

        // 1. Corrige Role (Membro padrão)
        const validRoles = ['admin', 'gm2', 'gm', 'gestao', 'membro'];
        if (!validRoles.includes(u.role)) {
            console.log(`Corrigindo Role de ${u.nome}: ${u.role} -> membro`);
            u.role = 'membro';
            changed = true;
        }

        // 2. Corrige Status
        const validStatus = ['ativo', 'pendente', 'banido'];
        if (!validStatus.includes(u.status)) {
            console.log(`Corrigindo Status de ${u.nome}: ${u.status} -> pendente`);
            u.status = 'pendente';
            changed = true;
        }

        // 3. Garante Classe RPG
        if (!u.classe) {
            u.classe = 'NOVATO';
            changed = true;
        }

        // 4. Garante Saldos Numéricos
        if (isNaN(u.saldo_coins)) { u.saldo_coins = 0; changed = true; }
        if (isNaN(u.xp)) { u.xp = 0; changed = true; }

        // 5. Inicializa Arrays
        if (!u.quest_progress) { u.quest_progress = []; changed = true; }
        if (!u.missoes_concluidas) { u.missoes_concluidas = []; changed = true; }

        if (changed) {
            try {
                await u.save(); // Tenta salvar com as correções
                console.log(`✅ Usuário ${u.email} reparado.`);
            } catch (err) {
                console.error(`❌ Falha ao salvar ${u.email}:`, err.message);
                // Se falhar validação, força update direto sem validar
                await Usuario.collection.updateOne(
                    { _id: u._id },
                    { $set: { role: 'membro', status: 'ativo', classe: 'NOVATO' } }
                );
                console.log(`⚠️ Forçado update direto em ${u.email}`);
            }
        }
    }

    console.log("Processo finalizado.");
    process.exit();
}

fixUsers();