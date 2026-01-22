const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

// --- CONFIGURAÇÕES ---
const BASE_DIR = path.join(__dirname, '..', 'client', 'public', 'assets', 'avatar');
const JSON_OUTPUT = path.join(__dirname, '..', 'client', 'src', 'data', 'avatarAssets.json');
const TEMP_ZIP = path.join(__dirname, 'lpc_full.zip');

// 🛑 O FREIO DE MÃO: Máximo de itens por categoria
const MAX_PER_CATEGORY = 60; 

const main = async () => {
    console.log(`🚀 Iniciando 'O Curador' (Limite: ${MAX_PER_CATEGORY} por tipo)...`);

    // 1. Limpeza (Apaga os 10k arquivos anteriores)
    if (fs.existsSync(BASE_DIR)) {
        console.log("🧹 Varrendo a bagunça anterior...");
        fs.rmSync(BASE_DIR, { recursive: true, force: true });
    }

    // O Zip já deve estar lá, então nem vou por o código de download pra ser rápido.
    if (!fs.existsSync(TEMP_ZIP)) {
        console.error("❌ O ZIP sumiu! Rode o script anterior para baixar o ZIP primeiro.");
        return;
    }

    const counts = { body: 0, hair: 0, torso: 0, legs: 0, feet: 0, hand_r: 0 };
    let totalExtracted = 0;

    console.log("📂 Selecionando os melhores assets...");

    fs.createReadStream(TEMP_ZIP)
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
            const fileName = entry.path;
            
            // Filtro Básico: Pasta spritesheets + PNG
            if (fileName.includes('spritesheets/') && fileName.endsWith('.png')) {
                
                // 1. Identifica Categoria
                let category = '';
                if (fileName.includes('/body/')) category = 'body';
                else if (fileName.includes('/hair/')) category = 'hair';
                else if (fileName.includes('/torso/')) category = 'torso';
                else if (fileName.includes('/legs/')) category = 'legs';
                else if (fileName.includes('/feet/')) category = 'feet';
                else if (fileName.includes('/weapons/')) category = 'hand_r';
                
                // 2. Regras de Exclusão (Ignora coisas bizarras)
                const isWeird = fileName.includes('pregnant') || 
                                fileName.includes('child') || 
                                fileName.includes('muscular') || // As vezes buga com roupas normais
                                fileName.includes('/zombie/') || // Opcional
                                fileName.includes('/skeleton/'); // Opcional

                if (!category || isWeird) {
                    entry.autodrain();
                    return;
                }

                // 3. O FREIO DE MÃO (Checa se já lotou a categoria)
                if (counts[category] >= MAX_PER_CATEGORY) {
                    entry.autodrain();
                    return;
                }

                // Se passou, cria a pasta e salva
                const targetDir = path.join(BASE_DIR, category);
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                // Limpa o nome
                const parts = fileName.split('/');
                const usefulParts = parts.filter(p => 
                    !['universal-lpc-spritesheet-character-generator-master', 'spritesheets', category, 'walk', 'male', 'female'].includes(p.toLowerCase())
                );
                
                // Adiciona gênero no nome para não sobrescrever (ex: male_messy vs female_messy)
                const genderPrefix = fileName.includes('female') ? 'f' : 'm';
                
                const cleanName = `${genderPrefix}_` + usefulParts
                    .join('_')
                    .replace(/_{2,}/g, '_')
                    .toLowerCase();

                entry.pipe(fs.createWriteStream(path.join(targetDir, cleanName)));
                
                counts[category]++;
                totalExtracted++;
                
            } else {
                entry.autodrain();
            }
        })
        .on('close', () => {
            console.log(`\n✨ DIETA CONCLUÍDA!`);
            console.log(`📊 Estatísticas Finais:`);
            Object.keys(counts).forEach(k => console.log(`   - ${k}: ${counts[k]} arquivos`));
            console.log(`   - TOTAL: ${totalExtracted} arquivos (Muito melhor que 10k!)`);
            
            generateAssetIndex();
        })
        .on('error', (e) => console.error("Erro:", e));
};

function generateAssetIndex() {
    const index = {};
    const categories = ['body', 'hair', 'torso', 'legs', 'feet', 'hand_r'];

    categories.forEach(cat => {
        const dir = path.join(BASE_DIR, cat);
        if (fs.existsSync(dir)) {
            index[cat] = fs.readdirSync(dir)
                .filter(f => f.endsWith('.png'))
                .map(f => f.replace('.png', ''))
                .sort();
        } else {
            index[cat] = [];
        }
    });

    const dataDir = path.dirname(JSON_OUTPUT);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(JSON_OUTPUT, JSON.stringify(index, null, 2));
    console.log(`💾 JSON atualizado: ${JSON_OUTPUT}`);
}

main();