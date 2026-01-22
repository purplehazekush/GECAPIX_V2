const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

const BASE_DIR = path.join(__dirname, '..', 'client', 'public', 'assets', 'avatar');
const JSON_OUTPUT = path.join(__dirname, '..', 'client', 'src', 'data', 'avatarAssets.json');
const TEMP_ZIP = path.join(__dirname, 'lpc_full.zip');

// WHITELIST: Só aceitamos arquivos com esses termos para roupas/cabelos
const ALLOWED_COLORS = ['white', 'gray', 'silver', 'light', 'blonde', 'platinum'];

// EXCEÇÕES: Coisas que DEVEMOS baixar mesmo que tenham cor
const ALWAYS_KEEP = ['body', 'head', 'wheelchair', 'prosthes', 'crutch', 'cane'];

// BLACKLIST: Coisas que quebram o layout
const BLACKLIST = ['slash', 'thrust', 'cast', 'shoot', 'bow', 'climb', 'hurt', 'jump', 'sit', 'emote', 'run', 'spear', 'dagger', 'combat', 'walking', 'oversize'];

const main = async () => {
    console.log(`🚀 Iniciando 'O Alvejante' (Filtro Radical de Cores)...`);

    if (fs.existsSync(BASE_DIR)) fs.rmSync(BASE_DIR, { recursive: true, force: true });
    
    if (!fs.existsSync(TEMP_ZIP)) {
        console.error("❌ ZIP não encontrado.");
        return;
    }

    const counts = { body: 0, head: 0, hair: 0, torso: 0, legs: 0, feet: 0, accessory: 0 };

    fs.createReadStream(TEMP_ZIP)
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
            let fileName = entry.path.toLowerCase();
            
            // 1. Filtro Básico de Arquivo
            if (!fileName.includes('spritesheets/') || !fileName.endsWith('.png')) {
                entry.autodrain(); return;
            }
            if (BLACKLIST.some(bad => fileName.includes(bad))) {
                entry.autodrain(); return;
            }

            // 2. Categorização Precisa
            let category = '';
            if (fileName.includes('/body/') || fileName.includes('bodies/')) category = 'body';
            else if (fileName.includes('/head/') || fileName.includes('/heads/')) category = 'head';
            else if (fileName.includes('/hair/')) category = 'hair';
            else if (fileName.includes('/torso/')) category = 'torso';
            else if (fileName.includes('/legs/')) category = 'legs';
            else if (fileName.includes('/feet/')) category = 'feet';
            else if (fileName.includes('wheelchair') || fileName.includes('prosthes')) category = 'accessory';
            
            if (!category) {
                entry.autodrain(); return;
            }

            // 3. O FILTRO DE COR RADICAL
            let keep = false;

            // Se for corpo, cabeça ou acessório médico, mantemos as variações originais
            if (ALWAYS_KEEP.includes(category) || ALWAYS_KEEP.some(k => fileName.includes(k))) {
                keep = true;
            } else {
                // Se for roupa/cabelo, SÓ baixa se for branco/cinza
                keep = ALLOWED_COLORS.some(c => fileName.includes(c));
            }

            if (!keep) {
                entry.autodrain(); return;
            }

            // 4. Preparação do Destino
            const targetDir = path.join(BASE_DIR, category);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            // 5. Limpeza do Nome (Remove a cor do nome do arquivo!)
            const parts = fileName.split('/');
            const usefulParts = parts.filter(p => 
                !['universal-lpc-spritesheet-character-generator-master', 'spritesheets', category, 'walk', 'male', 'female', 'human'].includes(p)
            );
            
            let prefix = '';
            if (fileName.includes('female')) prefix = 'f';
            else if (fileName.includes('male')) prefix = 'm';
            if (fileName.includes('child')) prefix = 'child';
            if (fileName.includes('teen')) prefix = 'teen';

            // Removemos as palavras de cor do nome final para evitar duplicatas
            // Ex: "apron_white.png" vira "apron.png"
            let finalNamePart = usefulParts.join('_')
                .replace(/_white|_gray|_silver|_blonde|_light/g, '') 
                .replace(/_{2,}/g, '_'); 

            const cleanName = `${prefix}_${finalNamePart}`.replace(/^_/, ''); // Remove underline inicial se não tiver prefixo

            // Salva
            entry.pipe(fs.createWriteStream(path.join(targetDir, cleanName)));
            counts[category]++;
        })
        .on('close', () => {
            console.log(`\n✨ LIMPEZA COMPLETA!`);
            Object.keys(counts).forEach(k => console.log(`   - ${k}: ${counts[k]}`));
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
    console.log(`💾 JSON Gerado em: ${JSON_OUTPUT}`);
}

main();