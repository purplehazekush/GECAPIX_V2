// seedDating.js
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');
const DatingProfile = require('../models/DatingProfile');

const TARGET_EMAIL = 'woodprotocol@gmail.com';



const seed = async () => {
    try {
        console.log("🔌 Conectando ao MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Conectado.");

        // 1. Acha o Usuário
        const user = await Usuario.findOne({ email: TARGET_EMAIL });
        if (!user) throw new Error(`Usuário ${TARGET_EMAIL} não encontrado! Crie ele no site primeiro.`);

        console.log(`👤 Usuário encontrado: ${user.nome} (${user._id})`);

        // 2. Remove Perfil Antigo se existir (para resetar)
        await DatingProfile.deleteOne({ userId: user._id });

        // 3. Cria Perfil Dating
        const profile = await DatingProfile.create({
            userId: user._id,
            email: user.email,
            nome: user.nome || "Wood Teste",
            curso: "Engenharia de Software",
            telefone: "(31) 99999-8888", // Telefone Fake
            
            // Características
            genero: "HOMEM", // Ajuste conforme necessário
            altura: "📏 Alto(a)",
            biotipo: "💪 Atlético",
            bebe: "🥃 Gosto muito",
            fuma: "❌ Não",
            festa: "🎉 Baladeiro(a)",
            
            bio: "Bot de testes oficial do sistema. Gosto de algoritmos e café. Se der match, é bug (ou destino).",
            fotos: [
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=60", // Foto Genérica
                "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=500&q=60"
            ],
            
            interessado_em: ["MULHER", "OUTRO"], // O que ele busca
            status: "ATIVO"
        });

        console.log("✅ Perfil de Dating criado com sucesso!");
        console.log(profile);

    } catch (e) {
        console.error("❌ Erro:", e.message);
    } finally {
        mongoose.connection.close();
    }
};

seed();