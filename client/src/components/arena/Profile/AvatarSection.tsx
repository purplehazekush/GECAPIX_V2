import { useState } from 'react';
import AvatarPixel, { AvatarConfig, LayerConfig } from '../AvatarPixel';
import AVATAR_ASSETS from '../../../data/avatarAssets.json';
import { Edit, KeyboardArrowLeft, KeyboardArrowRight, Shuffle, Check } from '@mui/icons-material';
import { User } from '../../../context/AuthContext';

// ... (imports e Props iguais) ...

const COLORS = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gold', 'brown'];

// Categorias que podem ser coloridas
const COLORABLE_CATEGORIES = ['hair', 'torso', 'legs', 'feet'];

export default function AvatarSection({ user, avatarConfig, setAvatarConfig, isEditing, setIsEditing }: Props) {
    const [activeTab, setActiveTab] = useState('body');

    // Helper para pegar o ID seguro (se é string ou objeto)
    const getId = (item: any) => (typeof item === 'string' ? item : item?.id);
    const getColor = (item: any) => (typeof item === 'string' ? 'white' : item?.color || 'white');

    const updateLayer = (key: string, newValue: any) => {
        setAvatarConfig((prev: any) => ({ ...prev, [key]: newValue }));
    };

    const cycleItem = (direction: number) => {
        // @ts-ignore
        const items = AVATAR_ASSETS[activeTab] || [];
        if (!items.length) return;

        const currentId = getId(avatarConfig[activeTab]);
        let index = items.indexOf(currentId);
        if (index === -1) index = 0;

        let newIndex = index + direction;
        if (newIndex >= items.length) newIndex = 0;
        if (newIndex < 0) newIndex = items.length - 1;

        const newItemId = items[newIndex];
        
        // Preserva a cor atual se for uma categoria colorível
        if (COLORABLE_CATEGORIES.includes(activeTab)) {
            const currentColor = getColor(avatarConfig[activeTab]);
            updateLayer(activeTab, { id: newItemId, color: currentColor });
        } else {
            updateLayer(activeTab, newItemId);
        }
    };

    const setColor = (color: string) => {
        if (!COLORABLE_CATEGORIES.includes(activeTab)) return;
        const currentId = getId(avatarConfig[activeTab]);
        updateLayer(activeTab, { id: currentId, color });
    };

    // Gera um boneco aleatório válido
    const randomize = () => {
        const newConfig: any = {};
        
        // 1. Corpo Aleatório
        // @ts-ignore
        const bodies = AVATAR_ASSETS.body || [];
        const randomBody = bodies[Math.floor(Math.random() * bodies.length)];
        newConfig.body = randomBody;

        // 2. Cabeça Compatível (Se o corpo é 'f_', a cabeça tem que ser 'f_')
        const genderPrefix = randomBody.startsWith('f_') ? 'f_' : 'm_';
        // @ts-ignore
        const heads = (AVATAR_ASSETS.head || []).filter(h => h.startsWith(genderPrefix));
        newConfig.head = heads.length > 0 ? heads[Math.floor(Math.random() * heads.length)] : heads[0];

        // 3. Outros itens
        ['hair', 'torso', 'legs', 'feet'].forEach(cat => {
            // @ts-ignore
            const items = AVATAR_ASSETS[cat] || [];
            if (items.length) {
                const item = items[Math.floor(Math.random() * items.length)];
                const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                newConfig[cat] = { id: item, color };
            }
        });
        
        setAvatarConfig(newConfig);
    };

    // ... (O Resto do Render é igual, mas adicione a paleta de cores) ...

    return (
        <div className="flex flex-col items-center py-6 relative w-full">
            {/* ... AvatarPixel ... */}
            <div className="relative group">
                 <AvatarPixel layers={avatarConfig} size={220} className="..." />
                 {/* ... Botões Edit/Randomize ... */}
            </div>

            {isEditing && (
                <div className="w-full mt-8 animate-slide-up">
                    {/* ... Abas (CATEGORIES) ... */}
                    
                    {/* CONTROLE DE SELEÇÃO (Setinhas) */}
                    {/* ... igual ao anterior ... */}

                    {/* PALETA DE CORES (Só mostra se a categoria for pintável) */}
                    {COLORABLE_CATEGORIES.includes(activeTab) && (
                        <div className="flex gap-2 justify-center mt-4 flex-wrap px-4">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setColor(color)}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shadow-lg
                                        ${getColor(avatarConfig[activeTab]) === color ? 'border-white scale-110 ring-2 ring-cyan-400' : 'border-slate-600'}
                                    `}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}