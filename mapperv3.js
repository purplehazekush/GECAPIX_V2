const fs = require('fs');
const path = require('path');

// --- 1. CONFIGURAÇÃO DE AMBIENTE ---
const PROJECT_ROOT = process.cwd(); 
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'visualizador-arquitetura', 'public', 'project_structure.json');
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.vscode'];
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'];

// --- 2. MAPA MANUAL (O PULO DO GATO) ---
// Inserido aqui para garantir que o script seja autossuficiente
const MANUAL_API_MAP = {
    "/auth/login": "server/controllers/authController.js",
    "/tokenomics": "server/controllers/statsController.js",
    "/tokenomics/history": "server/controllers/statsController.js",
    "/tokenomics/ledger": "server/controllers/statsController.js",
    "/tokenomics/status": "server/models/SystemState.js",
    "/stats": "server/controllers/statsController.js",
    "/pix": "server/controllers/pixController.js",
    "/pix/:id": "server/controllers/pixController.js",
    "/vendas/manual": "server/controllers/pixController.js",
    "/arena/memes": "server/controllers/memeController.js",
    "/arena/memes/invest": "server/controllers/memeController.js",
    "/arena/ranking": "server/controllers/arenaController.js",
    "/arena/perfil/:id": "server/controllers/arenaController.js",
    "/arena/perfil": "server/controllers/arenaController.js",
    "/arena/quests": "server/controllers/questController.js",
    "/arena/quests/claim": "server/controllers/questController.js",
    "/arena/spotted": "server/controllers/spottedController.js",
    "/arena/spotted/comentar": "server/controllers/spottedController.js",
    "/arena/transferir": "server/controllers/arenaController.js",
    "/arena/ai/solve": "server/controllers/aiController.js",
    "/chat/:materia": "server/controllers/chatController.js",
    "/chat": "server/controllers/chatController.js",
    "/admin/validacao": "server/controllers/adminController.js",
    "/admin/recursos": "server/controllers/adminController.js",
    "/admin/reset": "server/controllers/adminController.js",
    "/admin/usuarios": "server/models/Usuario.js",
    "/debug/fechar-mercado": "server/controllers/memeController.js",
    "/produtos": "server/controllers/productController.js",
    "/bank/deposit": "server/controllers/bankController.js",
    "/bank/withdraw": "server/controllers/bankController.js",
    "/bank/bond/buy": "server/controllers/bankController.js",
    "/bank/bond/redeem": "server/controllers/bankController.js",
    "/bank/bonds": "server/controllers/bankController.js",
    "/store/p2p": "server/controllers/storeController.js",
    "/store/p2p/criar": "server/controllers/storeController.js",
    "/store/p2p/comprar": "server/controllers/storeController.js",
    "/store/p2p/cancelar": "server/controllers/storeController.js"
};

const fileMap = {}; 
const apiRegistry = {}; 
const toPosix = (p) => p.split(path.sep).join('/');

// Normalizador de rotas para garantir que Front e Back usem a mesma chave
const cleanRoute = (r) => r.split('?')[0].replace(/^\/api/, '').replace(/\/+$/, '').replace(/^\/+/, '').toLowerCase();

// --- 3. MOTOR DE ANÁLISE ---
function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = toPosix(path.relative(PROJECT_ROOT, filePath));
    const currentDir = path.dirname(filePath);
    
    fileMap[relativePath] = { imports: [], importedBy: [], apiCalls: [], apiRoutes: [] };

    // A. IMPORTS
    const importRegex = /(?:import\s+.*?from\s+['"](.*?)['"])|(?:require\(['"](.*?)['"]\))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1] || match[2];
        if (!importPath.startsWith('.')) continue; 
        try {
            const resolvedAbs = path.join(currentDir, importPath);
            let resolvedRel = toPosix(path.relative(PROJECT_ROOT, resolvedAbs));
            if (!fs.existsSync(resolvedAbs) && !path.extname(resolvedAbs)) {
                for (const ext of EXTENSIONS) {
                    if (fs.existsSync(resolvedAbs + ext)) { resolvedRel += ext; break; }
                    if (fs.existsSync(path.join(resolvedAbs, 'index' + ext))) { resolvedRel += '/index' + ext; break; }
                }
            }
            fileMap[relativePath].imports.push(resolvedRel);
        } catch (e) {}
    }

    // B. API CALLS (Frontend)
    const apiCallRegex = /(?:api|axios|http|fetch)\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g;
    while ((match = apiCallRegex.exec(content)) !== null) {
        const route = match[2];
        const key = cleanRoute(route);
        fileMap[relativePath].apiCalls.push(`${match[1].toUpperCase()} ${route}`);
        
        if (!apiRegistry[key]) apiRegistry[key] = { definedIn: [], calledBy: [] };
        apiRegistry[key].calledBy.push(relativePath);
    }

    // C. API ROUTES (Backend)
    const routeDefRegex = /app\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g;
    while ((match = routeDefRegex.exec(content)) !== null) {
        const route = match[2];
        const key = cleanRoute(route);
        fileMap[relativePath].apiRoutes.push(`${match[1].toUpperCase()} ${route}`);
        
        if (!apiRegistry[key]) apiRegistry[key] = { definedIn: [], calledBy: [] };
        // Adiciona o arquivo atual (geralmente server/index.js)
        if (!apiRegistry[key].definedIn.includes(relativePath)) {
            apiRegistry[key].definedIn.push(relativePath);
        }
    }
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (IGNORE_DIRS.includes(file)) return;
        if (fs.statSync(fullPath).isDirectory()) scanDir(fullPath);
        else if (EXTENSIONS.includes(path.extname(file))) analyzeFile(fullPath);
    });
}

// --- 4. EXECUÇÃO E PÓS-PROCESSAMENTO ---
console.log("🔍 Iniciando varredura neural...");
scanDir(PROJECT_ROOT);

console.log("🔗 Injetando Mapa Manual de Controllers...");
Object.keys(MANUAL_API_MAP).forEach(route => {
    const key = cleanRoute(route);
    const targetFile = MANUAL_API_MAP[route];
    if (!apiRegistry[key]) apiRegistry[key] = { definedIn: [], calledBy: [] };
    if (!apiRegistry[key].definedIn.includes(targetFile)) {
        apiRegistry[key].definedIn.push(targetFile);
    }
});

console.log("🔄 Calculando Referências Reversas (Refs By)...");
Object.keys(fileMap).forEach(source => {
    fileMap[source].imports.forEach(target => {
        if (fileMap[target] && !fileMap[target].importedBy.includes(source)) {
            fileMap[target].importedBy.push(source);
        }
    });
});

// --- 5. SALVAR ---
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ fileMap, apiRegistry }, null, 2));

console.log(`\n✅ SUCESSO!`);
console.log(`📊 Total de Arquivos: ${Object.keys(fileMap).length}`);
console.log(`📡 Endpoints Mapeados: ${Object.keys(apiRegistry).length}`);