const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const { Readable } = require('stream');
const { finished } = require('stream/promises');

// --- CAMINHOS ---
// __dirname é a pasta server. Subimos um nível (..) para chegar na raiz e entrar em client.
const BASE_DIR = path.join(__dirname, '..', 'client', 'public', 'assets', 'avatar');
const JSON_OUTPUT = path.join(__dirname, '..', 'client', 'src', 'data', 'avatarAssets.json');
const TEMP_ZIP = path.join(__dirname, 'lpc_full.zip');

const ZIP_URL = "https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator/archive/refs/heads/master.zip";
const WANTED_ANIMATION = 'walk'; 

const main = async () => {
    console.log(`🚀 Iniciando Download com FETCH (Node 20+)...`);
    console.log(`📂 Alvo: ${BASE_DIR}`);

    // 1. Limpeza
    if (fs.existsSync(BASE_DIR)) {
        console.log("🧹 Limpando assets antigos...");
        fs.rmSync(BASE_DIR, { recursive: true, force: true });
    }

    // 2. Download Moderno (Segue redirects 302 automaticamente)
    try {
        const response = await fetch(ZIP_URL);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
        }

        console.log("⬇️  Baixando ZIP (Isso pode levar alguns segundos)...");
        
        // Transforma o corpo da resposta em um stream para salvar no disco
        const fileStream = fs.createWriteStream(TEMP_ZIP);
        await finished(Readable.fromWeb(response.body).pipe(fileStream));
        
        console.log("📦 ZIP Salvo no disco!");

    } catch (error) {
        console.error("❌ Erro fatal no download:", error);
        return;
    }

    // 3. Extração
    let extractedCount = 0;
    console.log("📂 Extraindo e Filtrando...");

    fs.createReadStream(TEMP_ZIP)
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
            const fileName = entry.path;
            
            // FILTRO: Apenas PNGs que contenham 'walk'
            if (fileName.includes(WANTED_ANIMATION) && fileName.endsWith('.png')) {
                
                // Categorizar
                let category = 'misc';
                if (fileName.includes('/body/')) category = 'body';
                else if (fileName.includes('/hair/')) category = 'hair';
                else if (fileName.includes('/torso/')) category = 'torso';
                else if (fileName.includes('/legs/')) category = 'legs';
                else if (fileName.includes('/feet/')) category = 'feet';
                else if (fileName.includes('/weapons/')) category = 'hand_r';
                else {
                    entry.autodrain(); // Ignora arquivos que não são dessas categorias
                    return;
                }

                // Cria pasta
                const targetDir = path.join(BASE_DIR, category);
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                // Limpa o nome
                const parts = fileName.split('/');
                const usefulParts = parts.filter(p => 
                    !['spritesheets', 'walk', category, 'universal-lpc-spritesheet-character-generator-master'].includes(p.toLowerCase())
                );
                const cleanName = usefulParts.join('_').replace(/_{2,}/g, '_').toLowerCase();

                // Salva
                entry.pipe(fs.createWriteStream(path.join(targetDir, cleanName)));
                extractedCount++;
                
                if (extractedCount % 50 === 0) process.stdout.write('.');
            } else {
                entry.autodrain();
            }
        })
        .on('close', () => {
            console.log(`\n✨ SUCESSO! Total extraído: ${extractedCount}`);
            
            if (fs.existsSync(TEMP_ZIP)) fs.unlinkSync(TEMP_ZIP); // Apaga o lixo
            generateAssetIndex();
        })
        .on('error', (e) => console.error("Erro no Unzip:", e));
};

function generateAssetIndex() {
    console.log("📝 Gerando índice JSON...");
    const index = {};
    const categories = ['body', 'hair', 'torso', 'legs', 'feet', 'hand_r'];

    categories.forEach(cat => {
        const dir = path.join(BASE_DIR, cat);
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir)
                .filter(f => f.endsWith('.png'))
                .map(f => f.replace('.png', ''))
                .sort();
            index[cat] = files;
            console.log(`   - ${cat}: ${files.length} itens`);
        } else {
            index[cat] = [];
        }
    });

    const dataDir = path.dirname(JSON_OUTPUT);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(JSON_OUTPUT, JSON.stringify(index, null, 2));
    console.log(`💾 Salvo em: ${JSON_OUTPUT}`);
}

main();