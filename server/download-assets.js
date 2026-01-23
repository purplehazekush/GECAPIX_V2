// server/download-assets.js
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

// --- CONFIGURAÇÕES DE CURADORIA ---
const BASE_DIR = path.join(__dirname, '..', 'client', 'public', 'assets', 'avatar');
const JSON_OUTPUT = path.join(__dirname, '..', 'client', 'src', 'data', 'avatarAssets.json');
const TEMP_ZIP = path.join(__dirname, 'lpc_full.zip');

// METAS DE QUANTIDADE
const LIMITS = {
    body: 100,      // Variedade máxima de pele
    head: 100,      // Variedade máxima de cabeças
    eyes: 20,       // Olhos são parecidos, 20 tá bom
    hair: 60,       // Muita variedade
    beard: 50,      // Barbas legais
    torso: 60,      // Roupas principais
    accessory: 50,  // Itens extras
    legs: 20,       // Calças básicas (vamos esconder a aba)
    feet: 20,       // Sapatos básicos (vamos esconder a aba)
    hand_r: 40      // Armas/Ferramentas
};

// CORES PARA PINTAR (Assets Neutros)
const PAINTABLE_COLORS = ['white', 'gray', 'silver', 'light', 'blonde', 'platinum'];

// BLACKLIST (Lixo visual e bugs)
const BLACKLIST = [
    '/walk/', '/slash/', '/thrust/', '/cast/', '/shoot/', '/bow/', '/climb/', '/hurt/', '/jump/', '/sit/', '/emote/', 
    'teen', 'child', 'pregnant', 'muscular', 'zombie', 'skeleton', 'orc', 
    'spear', 'dagger', 'combat', 'walking', 'oversize', 'preview', 'guide',
    'chain', 'plate' // Opcional: remover armaduras pesadas se quiser looks mais casuais
];

const main = async () => {
    console.log(`🚀 Iniciando Download com 'DIVERSIDADE ALFABÉTICA'...`);

    if (fs.existsSync(BASE_DIR)) fs.rmSync(BASE_DIR, { recursive: true, force: true });
    if (!fs.existsSync(TEMP_ZIP)) { console.error("❌ ZIP não encontrado."); return; }

    // Armazena arquivos temporariamente na memória para escolher os melhores depois
    const candidates = {
        body: [], head: [], eyes: [], beard: [], hair: [], torso: [], 
        legs: [], feet: [], accessory: [], hand_r: []
    };

    console.log("📦 Analisando ZIP e catalogando candidatos...");

    fs.createReadStream(TEMP_ZIP)
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
            let fileName = entry.path.toLowerCase();
            
            if (!fileName.includes('spritesheets/') || !fileName.endsWith('.png') || BLACKLIST.some(bad => fileName.includes(bad))) {
                entry.autodrain(); return;
            }

            // Categorização
            let category = '';
            if (fileName.includes('/eyes/')) category = 'eyes';
            else if (fileName.includes('/beard/') || fileName.includes('facial')) category = 'beard';
            else if (fileName.includes('wheelchair') || fileName.includes('prosthes') || fileName.includes('wings') || fileName.includes('cape')) category = 'accessory';
            else if (fileName.includes('/body/') || fileName.includes('bodies/')) category = 'body';
            else if (fileName.includes('/head/') || fileName.includes('/heads/')) category = 'head';
            else if (fileName.includes('/hair/')) category = 'hair';
            else if (fileName.includes('/torso/')) category = 'torso';
            else if (fileName.includes('/legs/') || fileName.includes('pants')) category = 'legs';
            else if (fileName.includes('/feet/')) category = 'feet';
            else if (fileName.includes('/weapons/') || fileName.includes('tool')) category = 'hand_r';

            if (!category || !candidates[category]) {
                entry.autodrain(); return;
            }

            // Filtro de Cor (Pintáveis vs Naturais)
            let keep = false;
            if (['body', 'head', 'eyes', 'accessory', 'hand_r'].includes(category)) keep = true;
            else keep = PAINTABLE_COLORS.some(c => fileName.includes(c));

            if (keep) {
                // Bufferizamos o arquivo para salvar depois se ele for escolhido
                entry.buffer().then(buffer => {
                    candidates[category].push({ path: fileName, buffer });
                });
            } else {
                entry.autodrain();
            }
        })
        .on('close', async () => {
            console.log("🎨 Selecionando os melhores assets por variedade...");
            await processCandidates(candidates);
        });
};

async function processCandidates(candidates) {
    const finalCounts = {};

    for (const [category, items] of Object.entries(candidates)) {
        const limit = LIMITS[category] || 30;
        const targetDir = path.join(BASE_DIR, category);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        // --- ALGORITMO DE DIVERSIDADE ALFABÉTICA ---
        // 1. Agrupa por primeira letra do nome real do item (pula pastas)
        const buckets = {};
        items.forEach(item => {
            const name = item.path.split('/').pop();
            const char = name.charAt(0);
            if (!buckets[char]) buckets[char] = [];
            buckets[char].push(item);
        });

        // 2. Round Robin (Pega um de A, um de B, um de C...)
        const selected = [];
        const chars = Object.keys(buckets).sort();
        let added = true;
        
        while (selected.length < limit && added) {
            added = false;
            for (const char of chars) {
                if (selected.length >= limit) break;
                if (buckets[char].length > 0) {
                    selected.push(buckets[char].shift()); // Pega e remove do bucket
                    added = true;
                }
            }
        }

        // 3. Salva os escolhidos
        for (const item of selected) {
            // Limpeza do Nome
            const parts = item.path.split('/');
            const usefulParts = parts.filter(p => !['universal-lpc-spritesheet-character-generator-master', 'spritesheets', category, 'male', 'female'].includes(p));
            
            let prefix = 'u';
            if (item.path.includes('female')) prefix = 'f';
            else if (item.path.includes('male')) prefix = 'm';
            if (category === 'hair' || category === 'eyes') prefix = 'u'; // Cabelos muitas vezes são unissex

            let finalName = usefulParts.join('_')
                .replace(/_white|_gray|_silver|_blonde|_light|_dark/g, '')
                .replace('.png', '');
            
            const cleanName = `${prefix}_${finalName}`.replace(/^_/, '');
            
            fs.writeFileSync(path.join(targetDir, `${cleanName}.png`), item.buffer);
        }
        finalCounts[category] = selected.length;
    }

    console.log(`\n✨ SELEÇÃO FINAL:`);
    Object.keys(finalCounts).forEach(k => console.log(`   - ${k}: ${finalCounts[k]} arquivos`));
    generateAssetIndex();
}

function generateAssetIndex() {
    const index = {};
    const categories = Object.keys(LIMITS);

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
    console.log(`💾 JSON salvo.`);
}

main();