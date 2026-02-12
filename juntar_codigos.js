const fs = require('fs');
const path = require('path');

// O caminho da sua pasta de controllers
const dirPath = String.raw`C:\dev\019_GECAPIX_V2\server\models`;

// Nome do arquivo de saída
const outputFile = 'models_unificados.txt';

async function mergeFiles() {
  try {
    // Lê o diretório
    const files = await fs.promises.readdir(dirPath);

    // Filtra apenas arquivos .js
    const jsFiles = files.filter(file => path.extname(file) === '.js');

    let content = '';

    console.log(`Encontrados ${jsFiles.length} arquivos .js...`);

    for (const file of jsFiles) {
      const filePath = path.join(dirPath, file);
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');

      // Adiciona o cabeçalho com o nome do arquivo
      content += `${file}:\n\n`;
      
      // Adiciona o código
      content += fileContent;
      
      // Adiciona o separador e quebras de linha
      content += `\n\n=============================\n\n`;
    }

    // Escreve o arquivo final
    await fs.promises.writeFile(outputFile, content);
    
    console.log(`Sucesso! Arquivo criado: ${outputFile}`);
    
  } catch (err) {
    console.error('Erro ao processar os arquivos:', err);
  }
}

mergeFiles();