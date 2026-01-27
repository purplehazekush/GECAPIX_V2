// server/auto-detector.js
const fs = require('fs');
const path = require('path');

const colors = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m" };

console.log("\n🕵️  INICIANDO VARREDURA AUTOMÁTICA DE CONTROLLERS...\n");

const controllersPath = path.join(__dirname, 'controllers');

try {
    const files = fs.readdirSync(controllersPath);

    files.forEach(file => {
        if (!file.endsWith('.js')) return;

        const controllerName = file.replace('.js', '');
        console.log(`${colors.cyan}📂 Verificando: ${file}...${colors.reset}`);

        try {
            const controller = require(path.join(controllersPath, file));
            const keys = Object.keys(controller);

            if (keys.length === 0) {
                console.log(`   ${colors.yellow}⚠️  ALERTA: O arquivo parece vazio ou não exporta nada (module.exports = {}).${colors.reset}`);
            }

            keys.forEach(funcName => {
                const func = controller[funcName];
                
                if (typeof func === 'function') {
                    // Tudo certo
                    // console.log(`   ✅ .${funcName} ok`); // Comentei pra não poluir, descomente se quiser ver tudo
                } else if (func === undefined) {
                    console.log(`   ${colors.red}❌ ERRO CRÍTICO: .${funcName} é UNDEFINED.${colors.reset}`);
                    console.log(`      👉 Você provavelmente fez "exports.${funcName} =" mas não atribuiu nada, ou houve erro circular.`);
                } else {
                    console.log(`   ${colors.yellow}⚠️  AVISO: .${funcName} não é uma função (Tipo: ${typeof func}).${colors.reset}`);
                    console.log(`      👉 Se for uma constante de configuração, ignore. Se for rota, vai quebrar.`);
                }
            });

        } catch (e) {
            console.log(`   ${colors.red}💀 ERRO DE SINTAXE NO ARQUIVO: ${e.message}${colors.reset}`);
        }
        console.log(""); // Linha vazia
    });

} catch (e) {
    console.error("Erro ao ler pasta controllers:", e.message);
}

console.log("🏁 VARREDURA CONCLUÍDA.");
console.log("DICA: Se tudo estiver verde aqui, verifique se o nome da função no 'index.js' bate EXATAMENTE com o nome exportado no controller.");