const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

// --- CONFIGURAÇÃO ---
const BASE_DIR = path.join(__dirname, '..', 'client', 'public', 'assets', 'avatar');
const JSON_OUTPUT = path.join(__dirname, '..', 'client', 'src', 'data', 'avatarAssets.json');
const TEMP_ZIP = path.join(__dirname, 'lpc_full.zip');

// Lista de palavras que PROIBEM o download (Ações que quebram o layout)
const BLACKLIST = [
    'slash', 'thrust', 'cast', 'shoot', 'bow', 'climb', 'hurt', 'jump', 'sit', 'emote', 
    'run', 'spear', 'dagger', 'combat', 'batten', 'eating', 'pickup', 'pokem', 'walking' // 'walking' as vezes é só tirinha
];

// Lista de palavras que QUEREMOS MUITO (Acessibilidade)
const WHITELIST_ACCESSIBILITY = ['wheelchair', 'prosthes', 'crutch', 'cane'];

const main = async () => {
    console.log(`🚀 Iniciando Download 'Sniper' (Filtragem Científica)...`);

    if (fs.existsSync(BASE_DIR)) {
        console.log("🧹 Limpando tudo...");
        fs.rmSync(BASE_DIR, { recursive: true, force: true });
    }

    if (!fs.existsSync(TEMP_ZIP)) {
        console.error("❌ O ZIP não está na pasta server. Baixe-o novamente com o script anterior se precisar.");
        return;
    }

    const counts = { body: 0, head: 0, hair: 0, torso: 0, legs: 0, feet: 0, accessory: 0 };
    let totalExtracted = 0;

    fs.createReadStream(TEMP_ZIP)
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
            const fileName = entry.path.toLowerCase();
            
            // REGRA 1: Tem que ser PNG e estar em spritesheets
            if (!fileName.includes('spritesheets/') || !fileName.endsWith('.png')) {
                entry.autodrain(); return;
            }

            // REGRA 2: Blacklist (Mata animações soltas)
            // Mas ABRE EXCEÇÃO se for item de acessibilidade (eles as vezes tem nomes proprios)
            const isAccessibility = WHITELIST_ACCESSIBILITY.some(w => fileName.includes(w));
            if (!isAccessibility && BLACKLIST.some(bad => fileName.includes(bad))) {
                entry.autodrain(); return;
            }

            // REGRA 3: Categorização Precisa
            let category = '';
            if (fileName.includes('/body/')) category = 'body';
            else if (fileName.includes('/head/') || fileName.includes('/heads/')) category = 'head'; // NOVA CATEGORIA
            else if (fileName.includes('/hair/')) category = 'hair';
            else if (fileName.includes('/torso/')) category = 'torso';
            else if (fileName.includes('/legs/')) category = 'legs';
            else if (fileName.includes('/feet/')) category = 'feet';
            else if (isAccessibility) category = 'accessory'; // Cadeiras e afins
            else {
                entry.autodrain(); return;
            }

            // REGRA 4: Limite de Cores (Tenta evitar spam de cores)
            // Se o arquivo tem "blue", "red", "green" no nome, a gente tenta pegar só um deles ou ignora se já tem muitos
            if (counts[category] > 80) { // Aumentei um pouco pra caber variedade
                entry.autodrain(); return;
            }

            // Cria pasta
            const targetDir = path.join(BASE_DIR, category);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            // Limpa o nome
            const parts = fileName.split('/');
            const usefulParts = parts.filter(p => 
                !['universal-lpc-spritesheet-character-generator-master', 'spritesheets', category, 'walk', 'male', 'female', 'human'].includes(p)
            );
            
            // Prefixo inteligente
            let prefix = 'u'; // Universal
            if (fileName.includes('female')) prefix = 'f';
            else if (fileName.includes('male')) prefix = 'm';
            if (fileName.includes('child')) prefix = 'child'; // Acessibilidade/Inclusão

            const cleanName = `${prefix}_` + usefulParts.join('_').replace(/_{2,}/g, '_');

            entry.pipe(fs.createWriteStream(path.join(targetDir, cleanName)));
            counts[category]++;
            totalExtracted++;
        })
        .on('close', () => {
            console.log(`\n✨ SUCESSO!`);
            Object.keys(counts).forEach(k => console.log(`   - ${k}: ${counts[k]} arquivos`));
            generateAssetIndex();
        });
};

function generateAssetIndex() {
    const index = {};
    const categories = ['body', 'head', 'hair', 'torso', 'legs', 'feet', 'accessory'];

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
    console.log(`💾 JSON atualizado.`);
}

main();