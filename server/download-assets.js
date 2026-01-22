const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

// --- CONFIGURAÇÃO ---
const BASE_DIR = path.join(__dirname, '..', 'client', 'public', 'assets', 'avatar');
const JSON_OUTPUT = path.join(__dirname, '..', 'client', 'src', 'data', 'avatarAssets.json');
const TEMP_ZIP = path.join(__dirname, 'lpc_full.zip');

// LIMITE RÍGIDO (Para não travar o navegador)
const MAX_PER_CATEGORY = 30;

// CORES PERMITIDAS PARA ROUPAS (Para pintar via CSS)
const PAINTABLE_COLORS = ['white', 'gray', 'silver', 'light', 'blonde', 'platinum'];

// PALAVRAS PROIBIDAS (Lixo, grids errados, crianças, monstros)
const BLACKLIST = [
    'teen', 'child', 'pregnant', 'muscular', 'zombie', 'skeleton', 'orc', 
    'slash', 'thrust', 'cast', 'shoot', 'bow', 'climb', 'hurt', 'jump', 'sit', 'emote', 
    'run', 'spear', 'dagger', 'combat', 'walking', 'oversize', 'preview', 'guide'
];

const main = async () => {
    console.log(`🚀 Iniciando Download 'ELITE' (Filtro Humano Adulto)...`);

    if (fs.existsSync(BASE_DIR)) fs.rmSync(BASE_DIR, { recursive: true, force: true });
    
    if (!fs.existsSync(TEMP_ZIP)) {
        console.error("❌ ZIP não encontrado.");
        return;
    }

    const counts = { body: 0, head: 0, hair: 0, torso: 0, legs: 0, feet: 0, accessory: 0, hand_r: 0 };

    fs.createReadStream(TEMP_ZIP)
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
            let fileName = entry.path.toLowerCase();
            
            // 1. Validação Básica
            if (!fileName.includes('spritesheets/') || !fileName.endsWith('.png')) {
                entry.autodrain(); return;
            }
            if (BLACKLIST.some(bad => fileName.includes(bad))) {
                entry.autodrain(); return;
            }

            // 2. Categorização
            let category = '';
            // Ordem importa: acessórios específicos primeiro
            if (fileName.includes('wheelchair') || fileName.includes('prosthes') || fileName.includes('crutch')) category = 'accessory';
            else if (fileName.includes('weapon') || fileName.includes('sword') || fileName.includes('staff')) category = 'hand_r';
            else if (fileName.includes('/body/') || fileName.includes('bodies/')) category = 'body';
            else if (fileName.includes('/head/') || fileName.includes('/heads/')) category = 'head';
            else if (fileName.includes('/hair/')) category = 'hair';
            else if (fileName.includes('/torso/')) category = 'torso';
            else if (fileName.includes('/legs/')) category = 'legs';
            else if (fileName.includes('/feet/')) category = 'feet';
            
            if (!category) {
                entry.autodrain(); return;
            }

            // 3. Limite de Quantidade (Otimização)
            if (counts[category] >= MAX_PER_CATEGORY) {
                entry.autodrain(); return;
            }

            // 4. Filtro de Cor (Alvejante)
            let keep = false;
            // Corpos, Cabeças e Acessórios Médicos: Mantemos cores originais (peles variadas)
            if (['body', 'head', 'accessory', 'hand_r'].includes(category)) {
                keep = true;
            } else {
                // Roupas e Cabelo: SÓ baixar se for neutro (para pintar)
                keep = PAINTABLE_COLORS.some(c => fileName.includes(c));
            }

            if (!keep) {
                entry.autodrain(); return;
            }

            // 5. Preparar Destino
            const targetDir = path.join(BASE_DIR, category);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            // 6. Limpeza do Nome
            const parts = fileName.split('/');
            const usefulParts = parts.filter(p => 
                !['universal-lpc-spritesheet-character-generator-master', 'spritesheets', category, 'walk', 'male', 'female', 'human'].includes(p)
            );
            
            let prefix = '';
            if (fileName.includes('female')) prefix = 'f';
            else if (fileName.includes('male')) prefix = 'm';
            
            // Remove indicação de cor do nome do arquivo
            let finalNamePart = usefulParts.join('_')
                .replace(/_white|_gray|_silver|_blonde|_light|_dark|_tanned|_pale/g, '') 
                .replace(/_{2,}/g, '_'); 

            const cleanName = `${prefix}_${finalNamePart}`.replace(/^_/, '').replace('.png', '');

            // Salva
            entry.pipe(fs.createWriteStream(path.join(targetDir, `${cleanName}.png`)));
            counts[category]++;
        })
        .on('close', () => {
            console.log(`\n✨ COLEÇÃO 'ELITE' PRONTA!`);
            Object.keys(counts).forEach(k => console.log(`   - ${k}: ${counts[k]} arquivos`));
            generateAssetIndex();
        });
};

function generateAssetIndex() {
    const index = {};
    const categories = ['body', 'head', 'hair', 'torso', 'legs', 'feet', 'accessory', 'hand_r'];

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