require('dotenv').config();
const colors = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m" };

console.log("\n🔍 INICIANDO VARREDURA DE CONTROLLERS (UPDATE: SISTEMA DE TROCAS)...\n");

function check(controllerName, funcName, func) {
    if (typeof func === 'function') {
        console.log(`${colors.green}✅ [${controllerName}] .${funcName} carregou ok${colors.reset}`);
    } else {
        console.log(`${colors.red}❌ ERRO CRÍTICO: [${controllerName}] .${funcName} é ${typeof func}${colors.reset}`);
        console.log(`${colors.yellow}👉 AÇÃO NECESSÁRIA: Verifique o arquivo controllers/${controllerName}.js. Certifique-se de que 'exports.${funcName} = ...' existe.${colors.reset}\n`);
    }
}

function load(name) {
    try {
        return require(`./controllers/${name}`);
    } catch (e) {
        console.log(`${colors.red}💀 ARQUIVO INEXISTENTE OU COM ERRO DE SINTAXE: ./controllers/${name}.js${colors.reset}`);
        console.log(`Erro original: ${e.message}\n`);
        return {};
    }
}

// Carrega os controllers novos e antigos
const auth = load('authController');
const exchange = load('exchangeController');
const arena = load('arenaController');

console.log("--- VERIFICANDO NOVAS FUNÇÕES DE HOJE ---");

// 1. NOVAS FUNÇÕES NO AUTH (Para o Saldo Real-time)
check('authController', 'getMe', auth.getMe);

// 2. FUNÇÕES DO SISTEMA DE TROCAS (EXCHANGE)
check('exchangeController', 'getQuote', exchange.getQuote);
check('exchangeController', 'executeTrade', exchange.executeTrade);
check('exchangeController', 'getChartData', exchange.getChartData);
check('exchangeController', 'getAdminStats', exchange.getAdminStats);
check('exchangeController', 'adminUpdateParams', exchange.adminUpdateParams);
check('exchangeController', 'toggleMarket', exchange.toggleMarket);

// 3. FUNÇÕES DE INFRAESTRUTURA
const DailyTreasury = load('../engine/DailyTreasury');
check('DailyTreasury', 'runDailyClosing', DailyTreasury.runDailyClosing);

console.log("\n🏁 FIM DO DIAGNÓSTICO ESPECÍFICO.");