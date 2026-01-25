// mapperv2.js
const fs = require('fs');
const path = require('path');

// CONFIGURAÇÃO
const PROJECT_ROOT = path.resolve(__dirname); // Ajuste se o script estiver em subpasta
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'public', 'project_structure.json');

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.vscode'];
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'];

// ESTADO GLOBAL
const fileMap = {}; 
const apiRegistry = {}; 

// Auxiliar para normalizar caminhos (Windows/Linux)
const toPosix = (p) => p.split(path.sep).join('/');

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
    // Caminho relativo à raiz do projeto
    const relativePath = toPosix(path.relative(PROJECT_ROOT, filePath));
    
    fileMap[relativePath] = {
        imports: [],
        importedBy: [], // <--- NOVO CAMPO: REFS BY
        apiCalls: [],
        apiRoutes: []
    };

    // A. Capturar Imports
    const importRegex = /(?:import\s+.*?from\s+['"](.*?)['"])|(?:require\(['"](.*?)['"]\))/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1] || match[2];
        if (!importPath.startsWith('.')) continue; // Ignora libs
        
        try {
            const dir = path.dirname(filePath);
            const resolvedAbs = path.join(dir, importPath);
            
            // Aqui a mágica: Tenta resolver a extensão real do arquivo importado
            let resolvedRel = toPosix(path.relative(PROJECT_ROOT, resolvedAbs));
            
            // Se o arquivo importado não tem extensão no código (ex: import App from './App')
            // O script tenta achar o arquivo real no disco
            if (!fs.existsSync(resolvedAbs) && !path.extname(resolvedAbs)) {
                for (const ext of EXTENSIONS) {
                    if (fs.existsSync(resolvedAbs + ext)) {
                        resolvedRel += ext;
                        break;
                    }
                    // Tenta index
                    if (fs.existsSync(path.join(resolvedAbs, 'index' + ext))) {
                        resolvedRel += '/index' + ext;
                        break;
                    }
                }
            }
            
            fileMap[relativePath].imports.push(resolvedRel);
        } catch (e) {}
    }

    // B. Capturar APIs (Igual ao seu original)
    const apiCallRegex = /(?:api|axios|http|fetch)\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g;
    while ((match = apiCallRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const route = match[2].split('?')[0]; // Remove query params
        fileMap[relativePath].apiCalls.push(`${method} ${route}`);
        if (!apiRegistry[route]) apiRegistry[route] = { definedIn: [], calledBy: [] };
        apiRegistry[route].calledBy.push(relativePath);
    }

    // C. Capturar Rotas (Igual ao seu original)
    const routeDefRegex = /(?:router|app)\.(get|post|put|delete|patch)\(['"`](.*?)['"`]/g;
    while ((match = routeDefRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const route = match[2];
        fileMap[relativePath].apiRoutes.push(`${method} ${route}`);
        if (!apiRegistry[route]) apiRegistry[route] = { definedIn: [], calledBy: [] };
        apiRegistry[route].definedIn.push(relativePath);
    }
}

// 3. EXECUÇÃO
console.log("🔍 Iniciando varredura...");
scanDir(PROJECT_ROOT);

// 4. PÓS-PROCESSAMENTO: CALCULAR "REFS BY" (Imported By)
console.log("🔗 Calculando conexões reversas...");
Object.keys(fileMap).forEach(sourceFile => {
    const data = fileMap[sourceFile];
    data.imports.forEach(targetFile => {
        // Se o arquivo alvo existe no nosso mapa, adiciona a referência reversa
        if (fileMap[targetFile]) {
            // Evita duplicatas
            if (!fileMap[targetFile].importedBy.includes(sourceFile)) {
                fileMap[targetFile].importedBy.push(sourceFile);
            }
        }
    });
});

// 5. SALVAR
fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ fileMap, apiRegistry }, null, 2));
console.log(`✅ Sucesso! Mapa salvo em: ${OUTPUT_FILE}`);
console.log(`📊 Total de Arquivos: ${Object.keys(fileMap).length}`);