require('dotenv').config();
const colors = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m" };

console.log("\n🔍 INICIANDO VARREDURA DE CONTROLLERS...\n");

function check(controllerName, funcName, func) {
    if (typeof func === 'function') {
        console.log(`${colors.green}✅ [${controllerName}] .${funcName} carregou ok${colors.reset}`);
    } else {
        console.log(`${colors.red}❌ ERRO CRÍTICO: [${controllerName}] .${funcName} é ${typeof func}${colors.reset}`);
        console.log(`${colors.yellow}👉 AÇÃO NECESSÁRIA: Verifique o arquivo controllers/${controllerName}.js. A função '${funcName}' não foi exportada ou não existe.${colors.reset}\n`);
    }
}

// Tenta importar os arquivos. Se o arquivo não existir, avisa.
function load(name) {
    try {
        return require(`./controllers/${name}`);
    } catch (e) {
        console.log(`${colors.red}💀 ARQUIVO INEXISTENTE OU COM ERRO DE SINTAXE: ./controllers/${name}.js${colors.reset}`);
        console.log(`Erro original: ${e.message}\n`);
        return {};
    }
}

// Carrega tudo
const auth = load('authController');
const pix = load('pixController');
const arena = load('arenaController');
const meme = load('memeController');
const quest = load('questController');
const chat = load('chatController');
const admin = load('adminController');
const product = load('productController');
const stats = load('statsController');
const spotted = load('spottedController');
const ai = load('aiController');
const bank = load('bankController');
const store = load('storeController');

console.log("--- VERIFICANDO ROTAS USADAS NO INDEX.JS ---");

// 1. AUTH
check('authController', 'login', auth.login);

// 2. PIX
check('pixController', 'getFeed', pix.getFeed);
check('pixController', 'createWebhook', pix.createWebhook);
check('pixController', 'updatePix', pix.updatePix);
check('pixController', 'createManual', pix.createManual);

// 3. ARENA & MEMES
check('memeController', 'getMemes', meme.getMemes);
check('memeController', 'postarMeme', meme.postarMeme);
check('memeController', 'investirMeme', meme.investirMeme);
check('arenaController', 'getRanking', arena.getRanking);
check('arenaController', 'getPerfilPublico', arena.getPerfilPublico);
check('arenaController', 'updatePerfil', arena.updatePerfil);
check('arenaController', 'transferirCoins', arena.transferirCoins); // <--- ATENÇÃO AQUI

// 4. QUESTS & SPOTTED
check('questController', 'getQuests', quest.getQuests);
check('questController', 'claimQuest', quest.claimQuest);
check('spottedController', 'getSpotteds', spotted.getSpotteds);
check('spottedController', 'postarSpotted', spotted.postarSpotted);
check('spottedController', 'comentarSpotted', spotted.comentarSpotted);

// 5. AI & CHAT
check('aiController', 'resolverQuestao', ai.resolverQuestao);
check('chatController', 'getMensagens', chat.getMensagens);
check('chatController', 'enviarMensagem', chat.enviarMensagem);

// 6. ADMIN
check('adminController', 'getFilaValidacao', admin.getFilaValidacao);
check('adminController', 'moderarUsuario', admin.moderarUsuario);
check('adminController', 'darRecursos', admin.darRecursos);
check('adminController', 'resetSeason', admin.resetSeason);
check('memeController', 'finalizarDiaArena', meme.finalizarDiaArena); // Usado no debug

// 7. LOJAS E BANCO
check('productController', 'getProdutos', product.getProdutos);
check('productController', 'createProduto', product.createProduto);
check('statsController', 'getStats', stats.getStats);
check('statsController', 'getTokenomics', stats.getTokenomics);
check('statsController', 'getHistoricalStats', stats.getHistoricalStats);
check('statsController', 'getGlobalTransactions', stats.getGlobalTransactions);
check('statsController', 'snapshotEconomy', stats.snapshotEconomy);

check('bankController', 'depositarLiquido', bank.depositarLiquido);
check('bankController', 'sacarLiquido', bank.sacarLiquido);
check('bankController', 'comprarTitulo', bank.comprarTitulo);
check('bankController', 'resgatarTitulo', bank.resgatarTitulo);
check('bankController', 'listarTitulos', bank.listarTitulos);

check('storeController', 'getOfertasP2P', store.getOfertasP2P);
check('storeController', 'criarOfertaP2P', store.criarOfertaP2P);
check('storeController', 'comprarOfertaP2P', store.comprarOfertaP2P);
check('storeController', 'cancelarOfertaP2P', store.cancelarOfertaP2P);

console.log("\n🏁 FIM DO DIAGNÓSTICO.");