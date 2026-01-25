require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('./models/Usuario');

const CLASSES_VALIDAS = ['BRUXO', 'ESPECULADOR', 'TECNOMANTE', 'BARDO', 'NOVATO'];

async function fixClasses() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🦇 Caçando Vampiros e classes inválidas...");

    const users = await Usuario.find({});
    let count = 0;

    for (const u of users) {
        // Se a classe do usuário NÃO estiver na lista válida
        if (!CLASSES_VALIDAS.includes(u.classe)) {
            console.log(`⚠️ Corrigindo: ${u.email} era '${u.classe}' -> virou 'NOVATO'`);
            
            // Força atualização direta no banco ignorando validação do Mongoose
            await Usuario.collection.updateOne(
                { _id: u._id },
                { $set: { classe: 'NOVATO' } }
            );
            count++;
        }
    }

    console.log(`✅ Processo finalizado. ${count} usuários corrigidos.`);
    process.exit();
}

fixClasses();