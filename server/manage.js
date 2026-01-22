require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('./models/Usuario');

const command = process.argv[2];
const param = process.argv[3];
const value = process.argv[4];

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB...");

        switch (command) {
            case 'list':
                const users = await Usuario.find().select('nome email role status saldo_coins');
                console.table(users.map(u => u.toObject()));
                break;

            case 'delete':
                if (!param) return console.log("Erro: Informe o email. (Ex: node manage.js delete joao@email.com)");
                const del = await Usuario.findOneAndDelete({ email: param });
                console.log(del ? `Usuário ${param} DELETADO com sucesso.` : "Usuário não encontrado.");
                break;

            case 'admin':
                if (!param) return console.log("Erro: Informe o email.");
                const adm = await Usuario.findOneAndUpdate(
                    { email: param },
                    { role: 'admin', status: 'ativo' },
                    { new: true }
                );
                console.log(adm ? `Usuário ${param} agora é ADMIN e ATIVO.` : "Usuário não encontrado.");
                break;

            case 'reset':
                if (!param) return console.log("Erro: Informe o email.");
                const res = await Usuario.findOneAndUpdate(
                    { email: param },
                    { saldo_coins: 100, xp: 0, nivel: 1, sequencia_login: 0, badges: [] },
                    { new: true }
                );
                console.log(res ? `Status de ${param} RESETADO para o padrão inicial.` : "Usuário não encontrado.");
                break;

            case 'set-coins':
                if (!param || !value) return console.log("Uso: node manage.js set-coins <email> <valor>");
                const coins = await Usuario.findOneAndUpdate(
                    { email: param },
                    { saldo_coins: parseInt(value) },
                    { new: true }
                );
                console.log(coins ? `${param} agora tem ${value} GecaCoins.` : "Usuário não encontrado.");
                break;

            default:
                console.log(`
Comandos Disponíveis:
  node manage.js list                     - Lista todos os usuários
  node manage.js delete <email>           - Apaga uma conta permanentemente
  node manage.js admin <email>            - Promove a Admin e Ativo
  node manage.js reset <email>            - Volta XP/Coins/Level ao zero
  node manage.js set-coins <email> <val>  - Define saldo específico
                `);
        }
    } catch (err) {
        console.error("Erro no script:", err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}



run();