const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

// --- CAMINHOS ---
const BASE_DIR = path.join(__dirname, '..', 'client', 'public', 'assets', 'avatar');
const JSON_OUTPUT = path.join(__dirname, '..', 'client', 'src', 'data', 'avatarAssets.json');
const TEMP_ZIP = path.join(__dirname, 'lpc_full.zip');

// LIMITE DE SEGURANÇA (Pra não baixar 10k arquivos de novo)
const MAX_PER_CATEGORY = 100; 

// 🚫 BLACKLIST: Arquivos que sabemos que NÃO são Full Sheets
const IGNORE_PATTERNS = [
    'slash', 'thrust', 'cast', 'shoot', 'bow', 'climb', 'hurt', 'jump', 'sit', 'emote', 
    'run', 'spear', 'dagger', // Armas muitas vezes vêm em formatos estranhos, vamos filtrar por enquanto
    'pregnant', 'child', 'muscular', 'zombie', 'skeleton', // Corpos não-padrão que quebram o layout
    'preview', 'sample', 'guide'
];

const main = async () => {
    console.log(`🚀 Iniciando Limpeza e Download Selecionado...`);

    // 1. Apaga TUDO para garantir que não sobra lixo
    if (fs.existsSync(BASE_DIR)) {
        console.log("🧹 Deletando pasta antiga inteira...");
        fs.rmSync(BASE_DIR, { recursive: true, force: true });
    }

    if (!fs.existsSync(TEMP_ZIP)) {
        console.error("❌ ZIP não encontrado. Baixe o ZIP primeiro (ou use o script anterior).");
        return;
    }

    const counts = { body: 0, hair: 0, torso: 0, legs: 0, feet: 0, hand_r: 0 };
    let totalExtracted = 0;

    console.log("📂 Extraindo apenas FULL SHEETS (Padrão Universal)...");

    fs.createReadStream(TEMP_ZIP)
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
            const fileName = entry.path.toLowerCase();
            
            // Regra 1: Deve ser PNG e estar na pasta spritesheets
            if (!fileName.includes('spritesheets/') || !fileName.endsWith('.png')) {
                entry.autodrain(); return;
            }

            // Regra 2: Blacklist (Ignora animações soltas)
            if (IGNORE_PATTERNS.some(pattern => fileName.includes(pattern))) {
                entry.autodrain(); return;
            }

            // Categorizar
            let category = '';
            if (fileName.includes('/body/')) category = 'body';
            else if (fileName.includes('/hair/')) category = 'hair';
            else if (fileName.includes('/torso/')) category = 'torso';
            else if (fileName.includes('/legs/')) category = 'legs';
            else if (fileName.includes('/feet/')) category = 'feet';
            // Ignoramos armas por enquanto pois elas quebram muito o layout padrão
            
            if (!category || counts[category] >= MAX_PER_CATEGORY) {
                entry.autodrain(); return;
            }

            // Cria pasta
            const targetDir = path.join(BASE_DIR, category);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            // Limpa o nome
            const parts = fileName.split('/');
            const usefulParts = parts.filter(p => 
                !['universal-lpc-spritesheet-character-generator-master', 'spritesheets', category, 'walk', 'male', 'female'].includes(p)
            );
            
            // Prefixo de gênero (m_ ou f_)
            const gender = fileName.includes('female') ? 'f' : 'm';
            const cleanName = `${gender}_` + usefulParts.join('_').replace(/_{2,}/g, '_');

            entry.pipe(fs.createWriteStream(path.join(targetDir, cleanName)));
            counts[category]++;
            totalExtracted++;
        })
        .on('close', () => {
            console.log(`\n✨ LIMPEZA CONCLUÍDA! Total: ${totalExtracted} arquivos válidos.`);
            Object.keys(counts).forEach(k => console.log(`   - ${k}: ${counts[k]}`));
            generateAssetIndex();
        });
};

function generateAssetIndex() {
    const index = {};
    const categories = ['body', 'hair', 'torso', 'legs', 'feet'];

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

    // Garante que a pasta existe
    const dataDir = path.dirname(JSON_OUTPUT);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(JSON_OUTPUT, JSON.stringify(index, null, 2));
    console.log(`💾 JSON Salvo.`);
}

main();