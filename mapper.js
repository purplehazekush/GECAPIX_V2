// mapper.js
const fs = require('fs');
const path = require('path');

// CONFIGURAÇÃO
const PROJECT_ROOT = __dirname;
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.vscode'];
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// ESTADO GLOBAL
const fileMap = {}; // CaminhoArquivo -> { imports: [], apiCalls: [], apiRoutes: [] }
const apiRegistry = {}; // Rota (/admin/validacao) -> { definedIn: [], calledBy: [] }

// 1. VARREDURA DE ARQUIVOS
function scanDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (IGNORE_DIRS.includes(file)) return;

        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else {
            const ext = path.extname(file);
            if (EXTENSIONS.includes(ext)) {
                analyzeFile(fullPath);
            }
        }
    });
}

// 2. ANÁLISE DE CONTEÚDO
function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
    
    fileMap[relativePath] = {
        imports: [],
        apiCalls: [], // Frontend chamando
        apiRoutes: [] // Backend definindo
    };

    // A. Capturar Imports (Static Imports e Requires)
    const importRegex = /(?:import\s+.*?from\s+['"](.*?)['"])|(?:require\(['"](.*?)['"]\))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1] || match[2];
        if (!importPath.startsWith('.')) continue; // Ignora libs externas (react, axios, etc)
        
        // Tenta resolver o caminho absoluto simplificado
        try {
            const dir = path.dirname(filePath);
            const resolved = path.join(dir, importPath);
            const relResolved = path.relative(PROJECT_ROOT, resolved).replace(/\\/g, '/');
            fileMap[relativePath].imports.push(relResolved);
        } catch (e) {}
    }

    // B. Capturar Chamadas de API (Frontend -> Backend)
    // Padrões: api.get('/rota'), axios.post('/rota'), fetch('/rota')
    const apiCallRegex = /(?:api|axios|http|fetch)\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g;
    while ((match = apiCallRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const route = match[2]; // ex: /admin/validacao
        
        fileMap[relativePath].apiCalls.push(`${method} ${route}`);
        
        if (!apiRegistry[route]) apiRegistry[route] = { definedIn: [], calledBy: [] };
        apiRegistry[route].calledBy.push(relativePath);
    }

    // C. Capturar Definições de Rota (Backend)
    // Padrões: router.get('/rota'), app.post('/rota')
    const routeDefRegex = /(?:router|app)\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g;
    while ((match = routeDefRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        let route = match[2];
        
        // Ajuste fino: Se a rota for apenas '/', tenta inferir o prefixo baseado no nome do arquivo (heurística básica)
        // Em um cenário real complexo, seria necessário analisar o app.use() no server.js principal.
        
        fileMap[relativePath].apiRoutes.push(`${method} ${route}`);

        if (!apiRegistry[route]) apiRegistry[route] = { definedIn: [], calledBy: [] };
        apiRegistry[route].definedIn.push(relativePath);
    }
}

// 3. EXECUÇÃO
console.log("🔍 Iniciando mapeamento neural do projeto...");
scanDir(PROJECT_ROOT);

// 4. GERAR RELATÓRIO DE IMPACTO
function generateImpactReport(targetFile) {
    const report = {
        arquivo_alvo: targetFile,
        quem_ele_importa: [],
        quem_importa_ele: [],
        conexoes_api: []
    };

    // Dependências diretas (Imports)
    if (fileMap[targetFile]) {
        report.quem_ele_importa = fileMap[targetFile].imports;
    }

    // Dependências reversas (Quem usa este arquivo?)
    for (const [file, data] of Object.entries(fileMap)) {
        // Verifica imports de arquivos
        data.imports.forEach(imp => {
            if (imp.includes(targetFile.split('/').pop().replace(/\.[^/.]+$/, ""))) { 
                // Comparação "fuzzy" pelo nome do arquivo pra evitar problemas de extensão
                report.quem_importa_ele.push(file);
            }
        });
    }

    // Conexão via API (A Ponte Mágica Frontend <-> Backend)
    if (fileMap[targetFile]) {
        // Se for Frontend chamando API
        fileMap[targetFile].apiCalls.forEach(call => {
            const route = call.split(' ')[1];
            if (apiRegistry[route]) {
                report.conexoes_api.push({
                    rota: route,
                    processado_no_backend_por: apiRegistry[route].definedIn
                });
            }
        });

        // Se for Backend definindo API
        fileMap[targetFile].apiRoutes.forEach(def => {
            const route = def.split(' ')[1];
            if (apiRegistry[route]) {
                report.conexoes_api.push({
                    rota: route,
                    consumido_no_frontend_por: apiRegistry[route].calledBy
                });
            }
        });
    }

    return report;
}

// 5. SALVAR O MAPA COMPLETO (Para a IA consultar)
const fullMapPath = path.join(PROJECT_ROOT, 'project_structure.json');
fs.writeFileSync(fullMapPath, JSON.stringify({ fileMap, apiRegistry }, null, 2));
console.log(`✅ Mapa completo salvo em: ${fullMapPath}`);

// EXEMPLO DE USO:
// Se você quiser testar na hora, descomente a linha abaixo e mude o arquivo:
// const teste = generateImpactReport('client/src/pages/admin/ValidationPanel.tsx');
// console.log(JSON.stringify(teste, null, 2));