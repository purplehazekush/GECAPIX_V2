const fs = require('fs');
const path = require('path');
const https = require('https');
const unzipper = require('unzipper');

// Onde vamos salvar
const BASE_DIR = path.join(__dirname, 'client', 'public', 'assets', 'avatar');
const TEMP_ZIP = path.join(__dirname, 'lpc_full.zip');

// URL do Repositório Mestre (Sanderfrenken) - Tem tudo organizado
const ZIP_URL = "https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator/archive/refs/heads/master.zip";

// Filtros: Só queremos arquivos que contenham estas palavras no caminho
const WANTED_ANIMATION = 'walk'; // Queremos apenas animações de andar

const main = async () => {
    console.log("🚀 Iniciando Download do MEGA PACK (Isso pode levar uns segundos)...");

    // 1. Baixar o ZIP
    const file = fs.createWriteStream(TEMP_ZIP);
    await new Promise((resolve, reject) => {
        https.get(ZIP_URL, response => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log("📦 ZIP Baixado. Extraindo e Filtrando...");
                resolve();
            });
        }).on('error', err => {
            fs.unlink(TEMP_ZIP, () => {});
            reject(err.message);
        });
    });

    // 2. Ler o ZIP e Extrair o que interessa
    fs.createReadStream(TEMP_ZIP)
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
            const fileName = entry.path;
            
            // Lógica de Filtro: Queremos PNGs que sejam da animação WALK
            if (fileName.includes(WANTED_ANIMATION) && fileName.endsWith('.png')) {
                
                // Categorizar baseado no nome da pasta
                let category = 'misc';
                if (fileName.includes('/body/')) category = 'body';
                else if (fileName.includes('/hair/')) category = 'hair';
                else if (fileName.includes('/torso/')) category = 'torso';
                else if (fileName.includes('/legs/')) category = 'legs';
                else if (fileName.includes('/feet/')) category = 'feet';
                else if (fileName.includes('/weapons/')) category = 'hand_r';
                else if (fileName.includes('/head/')) return entry.autodrain(); // Ignora cabeças soltas (usamos body completo)

                // Cria pasta de destino
                const targetDir = path.join(BASE_DIR, category);
                if (!fs.existsSync(targetDir)) fs.mkdirSync(dir, { recursive: true });

                // Limpa o nome do arquivo para ficar legível
                // Ex: "spritesheets/hair/male/messy/walk/raven.png" -> "messy_raven.png"
                const parts = fileName.split('/');
                const cleanName = parts.slice(-3).join('_').replace('walk_', '').replace('male_', '');
                
                const targetPath = path.join(targetDir, cleanName);

                // Salva
                entry.pipe(fs.createWriteStream(targetPath));
                // console.log(`✅ ${category}: ${cleanName}`);
            } else {
                entry.autodrain(); // Ignora arquivos inúteis
            }
        })
        .on('close', () => {
            console.log("✨ EXTRAÇÃO CONCLUÍDA!");
            console.log(`📂 Verifique: ${BASE_DIR}`);
            // Limpa o zip
            fs.unlinkSync(TEMP_ZIP);
            
            // GERA UM ARQUIVO JSON COM TUDO QUE BAIXOU (Para o Front usar)
            generateAssetIndex();
        });
};

function generateAssetIndex() {
    console.log("📝 Gerando índice para o Frontend...");
    const index = {};
    const categories = ['body', 'hair', 'torso', 'legs', 'feet', 'hand_r'];

    categories.forEach(cat => {
        const dir = path.join(BASE_DIR, cat);
        if (fs.existsSync(dir)) {
            // Pega lista de arquivos e remove a extensão .png
            index[cat] = fs.readdirSync(dir)
                .filter(f => f.endsWith('.png'))
                .map(f => f.replace('.png', ''));
        } else {
            index[cat] = [];
        }
    });

    const jsonPath = path.join(__dirname, 'client', 'src', 'data', 'avatarAssets.json');
    
    // Garante que a pasta data existe
    const dataDir = path.dirname(jsonPath);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(jsonPath, JSON.stringify(index, null, 2));
    console.log(`💾 Índice salvo em: ${jsonPath}`);
}

main();