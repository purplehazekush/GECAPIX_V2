const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

const BASE_DIR = path.join(__dirname, '..', 'client', 'public', 'assets', 'avatar');
const JSON_OUTPUT = path.join(__dirname, '..', 'client', 'src', 'data', 'avatarAssets.json');
const TEMP_ZIP = path.join(__dirname, 'lpc_full.zip');

// 🎨 A REGRA DA PINTURA:
// Roupas/Cabelos: Só queremos bases neutras para pintar via CSS.
const NEUTRAL_COLORS = ['white', 'gray', 'silver', 'platinum', 'blonde']; 

// Peles: Baixamos as cores reais (pintar pele via CSS fica alienígena)
const SKIN_TYPES = ['light', 'dark', 'tanned', 'orc', 'skeleton', 'zombie'];

// Coisas que não queremos baixar de jeito nenhum
const BLACKLIST = ['slash', 'thrust', 'cast', 'shoot', 'bow', 'climb', 'hurt', 'jump', 'sit', 'emote', 'run', 'spear', 'dagger', 'combat', 'walking'];

const main = async () => {
    console.log(`🚀 Iniciando 'The Whitewasher' (Apenas Assets Pintáveis)...`);

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
            
            // Filtro Básico
            if (!fileName.includes('spritesheets/') || !fileName.endsWith('.png')) {
                entry.autodrain(); return;
            }
            if (BLACKLIST.some(bad => fileName.includes(bad))) {
                entry.autodrain(); return;
            }

            // Categorização
            let category = '';
            if (fileName.includes('/body/') || fileName.includes('bodies/')) category = 'body';
            else if (fileName.includes('/head/') || fileName.includes('/heads/')) category = 'head';
            else if (fileName.includes('/hair/')) category = 'hair';
            else if (fileName.includes('/torso/')) category = 'torso';
            else if (fileName.includes('/legs/')) category = 'legs';
            else if (fileName.includes('/feet/')) category = 'feet';
            else if (fileName.includes('wheelchair') || fileName.includes('prosthes')) category = 'accessory';
            else {
                entry.autodrain(); return;
            }

            // --- A MÁGICA DO FILTRO DE COR ---
            let keep = false;

            if (category === 'body' || category === 'head') {
                // Para corpo/cabeça, aceitamos tons de pele
                keep = SKIN_TYPES.some(c => fileName.includes(c));
            } else {
                // Para roupas/cabelo, só aceitamos NEUTROS (Branco/Cinza)
                // Exceção: Acessórios (cadeiras) podem ter cor, ou itens unicos
                keep = NEUTRAL_COLORS.some(c => fileName.includes(c)) || category === 'accessory';
            }

            if (!keep) {
                entry.autodrain(); return;
            }
            // ---------------------------------

            // Garante diretório
            const targetDir = path.join(BASE_DIR, category);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            // Limpa nome
            const parts = fileName.split('/');
            const usefulParts = parts.filter(p => 
                !['universal-lpc-spritesheet-character-generator-master', 'spritesheets', category, 'walk', 'male', 'female', 'human'].includes(p)
            );
            
            let prefix = fileName.includes('female') ? 'f' : 'm';
            if (category === 'hair') prefix = 'h'; // Cabelo as vezes é unissex

            const cleanName = `${prefix}_` + usefulParts.join('_')
                .replace(/_{2,}/g, '_')
                .replace('.png', '') // Remove extensão pra limpar
                .replace(/_white|_gray|_blonde|_light|_dark/g, ''); // Remove a cor do nome (já que vamos pintar)

            // Salva com nome limpo (ex: "m_longsleeve.png" em vez de "m_longsleeve_white.png")
            entry.pipe(fs.createWriteStream(path.join(targetDir, `${cleanName}.png`)));
            counts[category]++;
        })
        .on('close', () => {
            console.log(`\n✨ DOWNLOAD LIMPO CONCLUÍDO!`);
            Object.keys(counts).forEach(k => console.log(`   - ${k}: ${counts[k]} arquivos base`));
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
    console.log(`💾 JSON Gerado.`);
}

main();