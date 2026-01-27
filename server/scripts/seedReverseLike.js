// seedReverseLike.js
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const DatingProfile = require('../models/DatingProfile');

// ⚠️ COLOQUE SEU EMAIL AQUI
const MY_EMAIL = 'joaovictorrabelo95@gmail.com'; 
const WOOD_EMAIL = 'woodprotocol@gmail.com';

const seed = async () => {
    try {
        console.log("🔌 Conectando...");
        await mongoose.connect(process.env.MONGO_URI);

        // 1. Acha os perfis
        const myUser = await Usuario.findOne({ email: MY_EMAIL });
        const woodUser = await Usuario.findOne({ email: WOOD_EMAIL });

        if (!myUser || !woodUser) throw new Error("Usuários não encontrados (verifique os emails).");

        const myProfile = await DatingProfile.findOne({ userId: myUser._id });
        const woodProfile = await DatingProfile.findOne({ userId: woodUser._id });

        if (!myProfile || !woodProfile) throw new Error("Perfis de Dating não encontrados (Dê Opt-in primeiro).");

        console.log(`🎯 Wood (${woodProfile.nome}) dando SUPER LIKE em Você (${myProfile.nome})...`);

        // 2. Cria a mensagem na SUA caixa de correio
        const msg = {
            tipo: 'SUPERLIKE',
            remetente_id: woodProfile._id,
            remetente_nome: woodProfile.nome,
            remetente_foto: woodProfile.fotos[0] || '',
            mensagem: `🔥 SUPER LIKE! ${woodProfile.nome} investiu pesado em você. Telefone: ${woodProfile.telefone}`,
            telefone_revelado: woodProfile.telefone,
            data: new Date()
        };

        myProfile.correio.push(msg);

        // 3. Atualiza listas de Match/Like para consistência
        // Wood enviou like pra mim
        if (!woodProfile.likes_enviados.includes(myProfile._id)) {
            woodProfile.likes_enviados.push(myProfile._id);
        }
        // Eu recebi like do Wood
        if (!myProfile.likes_recebidos.includes(woodProfile._id)) {
            myProfile.likes_recebidos.push(woodProfile._id);
        }

        // 4. Salva
        await myProfile.save();
        await woodProfile.save();

        console.log("✅ FEITO! Verifique sua Mailbox no GecaMatch.");

    } catch (e) {
        console.error("❌ Erro:", e.message);
    } finally {
        mongoose.connection.close();
    }
};

seed();