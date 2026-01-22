const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

// --- CONFIGURAÇÃO ---
const BASE_DIR = path.join(__dirname, '..', 'client', 'public', 'assets', 'avatar');
const JSON_OUTPUT = path.join(__dirname, '..', 'client', 'src', 'data', 'avatarAssets.json');
const TEMP_ZIP = path.join(__dirname, 'lpc_full.zip');

// AUMENTANDO OS LIMITES!
const MAX_PER_CATEGORY = 120; // Mais roupas e cabelos!

// CORES PARA PINTAR (Ignora arquivos coloridos)
const PAINTABLE_COLORS = ['white', 'gray', 'silver', 'light', 'blonde', 'platinum'];

const BLACKLIST = [
    'teen', 'child', 'pregnant', 'muscular', 'zombie', 'skeleton', 'orc', 
    'slash', 'thrust', 'cast', 'shoot', 'bow', 'climb', 'hurt', 'jump', 'sit', 'emote', 
    'run', 'spear', 'dagger', 'combat', 'walking', 'oversize', 'preview', 'guide'
];

const main = async () => {
    console.log(`🚀 Iniciando Download 'BIG BANG' (Com Olhos e Barbas)...`);

    if (fs.existsSync(BASE_DIR)) fs.rmSync(BASE_DIR, { recursive: true, force: true });
    
    if (!fs.existsSync(TEMP_ZIP)) {
        console.error("❌ ZIP não encontrado.");
        return;
    }

    const counts = { body: 0, head: 0, eyes: 0, beard: 0, hair: 0, torso: 0, accessory: 0 }; // Categorias focadas

    fs.createReadStream(TEMP_ZIP)
        .pipe(unzipper.Parse())
        .on('entry', function (entry) {
            let fileName = entry.path.toLowerCase();
            
            // Validações
            if (!fileName.includes('spritesheets/') || !fileName.endsWith('.png')) {
                entry.autodrain(); return;
            }
            if (BLACKLIST.some(bad => fileName.includes(bad))) {
                entry.autodrain(); return;
            }

            // --- CATEGORIZAÇÃO EXPANDIDA ---
            let category = '';
            
            // Prioridade para Utilitários
            if (fileName.includes('/eyes/')) category = 'eyes'; // NOVO: Olhos!
            else if (fileName.includes('/beard/') || fileName.includes('facial')) category = 'beard'; // NOVO: Barba
            else if (fileName.includes('wheelchair') || fileName.includes('prosthes') || fileName.includes('wings')) category = 'accessory';
            
            // Categorias Base
            else if (fileName.includes('/body/') || fileName.includes('bodies/')) category = 'body';
            else if (fileName.includes('/head/') || fileName.includes('/heads/')) category = 'head';
            else if (fileName.includes('/hair/')) category = 'hair';
            else if (fileName.includes('/torso/')) category = 'torso';
            // Ignoramos legs/feet/hands no download para economizar, ou baixamos poucos como fallback?
            // Vamos ignorar no loop principal para focar no que importa.
            
            if (!category) {
                entry.autodrain(); return;
            }

            // Limite de Quantidade
            if ((counts[category] || 0) >= MAX_PER_CATEGORY) {
                entry.autodrain(); return;
            }

            // Filtro de Cor
            let keep = false;
            // Corpo, Cabeça, Olhos e Acessórios mantêm cor original
            if (['body', 'head', 'eyes', 'accessory'].includes(category)) {
                keep = true;
            } else {
                // Roupa, Cabelo e Barba: SÓ baixar se for neutro (para pintar)
                keep = PAINTABLE_COLORS.some(c => fileName.includes(c));
            }

            if (!keep) {
                entry.autodrain(); return;
            }

            // Destino
            const targetDir = path.join(BASE_DIR, category);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            // Limpeza do Nome
            const parts = fileName.split('/');
            const usefulParts = parts.filter(p => 
                !['universal-lpc-spritesheet-character-generator-master', 'spritesheets', category, 'walk', 'male', 'female', 'human'].includes(p)
            );
            
            // Prefixo de Gênero (Importantíssimo para o filtro funcionar)
            let prefix = '';
            if (fileName.includes('female')) prefix = 'f';
            else if (fileName.includes('male')) prefix = 'm';
            
            // Remove indicação de cor do nome
            let finalNamePart = usefulParts.join('_')
                .replace(/_white|_gray|_silver|_blonde|_light|_dark|_tanned|_pale|_blue|_green|_red/g, '') 
                .replace(/_{2,}/g, '_'); 

            // Se não tiver prefixo de gênero, assume unissex (u) ou tenta deduzir
            if (!prefix && category === 'eyes') prefix = 'u'; // Olhos são unissex
            if (!prefix) prefix = 'u'; 

            const cleanName = `${prefix}_${finalNamePart}`.replace(/^_/, '').replace('.png', '');

            entry.pipe(fs.createWriteStream(path.join(targetDir, `${cleanName}.png`)));
            
            if (!counts[category]) counts[category] = 0;
            counts[category]++;
        })
        .on('close', () => {
            console.log(`\n✨ ACERVO ATUALIZADO!`);
            Object.keys(counts).forEach(k => console.log(`   - ${k}: ${counts[k]}`));
            generateAssetIndex();
        });
};

function generateAssetIndex() {
    const index = {};
    const categories = ['body', 'head', 'eyes', 'beard', 'hair', 'torso', 'accessory']; // Lista atualizada

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