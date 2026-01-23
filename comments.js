const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("🚀 Iniciando etiquetagem de arquivos...");

try {
    // 1. Pega lista de arquivos do Git
    // O trim() remove o último \n e o split quebra em array
    const output = execSync('git ls-files').toString().trim();
    const files = output.split(/\r?\n/); // Regex para funcionar em Windows (\r\n) e Linux (\n)

    let count = 0;

    files.forEach(filePath => {
        // 2. Filtros de Segurança (PULA O QUE NÃO PODE TER COMENTÁRIO)
        if (
            filePath.endsWith('.json') || // JSON não aceita comentário, quebra o projeto
            filePath.endsWith('.lock') || 
            filePath.endsWith('.png') || 
            filePath.endsWith('.jpg') || 
            filePath.endsWith('.svg') || 
            filePath.endsWith('.ico') ||
            filePath.includes('node_modules') ||
            filePath === 'add-path-comments.js' // Não etiqueta a si mesmo pra evitar loop
        ) {
            return;
        }

        // 3. Define o estilo do comentário baseado na extensão
        const ext = path.extname(filePath);
        let commentWrapper = '';

        if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.java', '.c', '.cpp'].includes(ext)) {
            commentWrapper = `// ${filePath}`;
        } else if (['.css', '.scss', '.less'].includes(ext)) {
            commentWrapper = `/* ${filePath} */`;
        } else if (['.html', '.xml', '.vue'].includes(ext)) {
            commentWrapper = ``;
        } else if (['.py', '.rb', '.yml', '.yaml', '.sh', '.gitignore', '.env'].includes(ext) || filePath.endsWith('Dockerfile')) {
            commentWrapper = `# ${filePath}`;
        } else {
            // Se não conhece a extensão, pula pra não estragar
            return;
        }

        // 4. Lê e Escreve
        try {
            // Verifica se o arquivo existe (git ls-files pode listar deletados não commitados)
            if (!fs.existsSync(filePath)) return;

            const content = fs.readFileSync(filePath, 'utf8');

            // Evita duplicar se já tiver o comentário
            if (content.startsWith(commentWrapper)) {
                return;
            }

            const newContent = `${commentWrapper}\n${content}`;
            fs.writeFileSync(filePath, newContent);
            count++;
            console.log(`✅ Etiquetado: ${filePath}`);

        } catch (err) {
            console.error(`❌ Erro ao ler/escrever ${filePath}:`, err.message);
        }
    });

    console.log(`\n✨ Concluído! ${count} arquivos foram modificados.`);
    console.log(`⚠️  JSONs e imagens foram ignorados para evitar quebra de código.`);

} catch (error) {
    console.error("Erro fatal ao executar git ls-files:", error);
}