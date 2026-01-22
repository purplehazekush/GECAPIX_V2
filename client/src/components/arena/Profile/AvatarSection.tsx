import { useState, useEffect } from 'react';
import AvatarPixel from '../AvatarPixel'; 
import AVATAR_ASSETS from '../../../data/avatarAssets.json';
import { 
    Edit, 
    KeyboardArrowLeft, 
    KeyboardArrowRight, 
    Check, 
    Shuffle, 
    Male, 
    Female, 
    BugReport 
} from '@mui/icons-material';
import type { User } from '../../../context/AuthContext';

interface Props {
    user: User | null;
    avatarConfig: any;
    setAvatarConfig: (config: any) => void;
    profileData: any; 
    setProfileData: (data: any) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
}

const BODY_TYPES = [
    { id: 'm', label: 'Masculino', icon: <Male /> },
    { id: 'f', label: 'Feminino', icon: <Female /> }
];

const CATEGORIES = [
    { id: 'body', label: 'Pele' },
    { id: 'head', label: 'Rosto' },
    { id: 'hair', label: 'Cabelo' },
    { id: 'torso', label: 'Roupa' },
    { id: 'legs', label: 'Calça' },
    { id: 'feet', label: 'Pés' },
    { id: 'accessory', label: 'Item' },
    { id: 'hand_r', label: 'Mão' }
];

const COLORABLE_CATEGORIES = ['hair', 'torso', 'legs', 'feet'];
const COLORS = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gold', 'brown', 'orange', 'teal'];

export default function AvatarSection({ user, avatarConfig, setAvatarConfig, isEditing, setIsEditing }: Props) {
    const [activeTab, setActiveTab] = useState('hair');
    const [gender, setGender] = useState('m');
    
    // --- ESTADOS DO MODO LABORATÓRIO ---
    const [debugMode, setDebugMode] = useState(false);
    const [offsetY, setOffsetY] = useState(-640); // Padrão LPC (Linha 10)

    // Inicialização segura
    useEffect(() => {
        const bodyId = typeof avatarConfig.body === 'string' ? avatarConfig.body : avatarConfig.body?.id;
        if (bodyId && bodyId.startsWith('f_')) setGender('f');
        else setGender('m');
    }, [avatarConfig.body]);

    // --- HELPER FUNCTIONS ---
    const getId = (item: any) => (typeof item === 'string' ? item : item?.id);
    const getColor = (item: any) => (typeof item === 'string' ? 'white' : item?.color || 'white');

    const updateLayer = (key: string, newValue: any) => {
        setAvatarConfig((prev: any) => ({ ...prev, [key]: newValue }));
    };

    const formatName = (name: string) => {
        if (!name || name === 'none') return 'Vazio';
        return name
            .replace(/_/g, ' ')
            .replace(/^f |^m /g, '')
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    // --- FILTRAGEM INTELIGENTE ---
    const getFilteredItems = (category: string) => {
        // @ts-ignore
        const allItems: string[] = AVATAR_ASSETS[category] || [];
        if (['accessory', 'hand_r', 'hair'].includes(category)) return allItems; 
        
        return allItems.filter(item => item.startsWith(gender + '_') || !item.includes('_'));
    };

    // --- AÇÕES DO EDITOR ---
    const handleGenderChange = (newGender: string) => {
        setGender(newGender);
        
        // @ts-ignore
        const bodies = AVATAR_ASSETS.body || [];
        // @ts-ignore
        const heads = AVATAR_ASSETS.head || [];

        const newBody = bodies.find((b: string) => b.startsWith(newGender + '_')) || bodies[0];
        const newHead = heads.find((h: string) => h.startsWith(newGender + '_')) || heads[0];

        setAvatarConfig((prev: any) => ({
            ...prev,
            body: newBody,
            head: newHead,
            torso: 'none',
            legs: 'none',
            feet: 'none'
        }));
    };

    const cycleItem = (direction: number) => {
        const items = getFilteredItems(activeTab);
        if (!items.length) return;

        const currentId = getId(avatarConfig[activeTab]);
        let index = items.indexOf(currentId);
        if (index === -1) index = 0;

        let newIndex = index + direction;
        if (newIndex >= items.length) newIndex = 0;
        if (newIndex < 0) newIndex = items.length - 1;

        const newItem = items[newIndex];
        
        if (COLORABLE_CATEGORIES.includes(activeTab)) {
            const currentColor = getColor(avatarConfig[activeTab]);
            updateLayer(activeTab, { id: newItem, color: currentColor });
        } else {
            updateLayer(activeTab, newItem);
        }
    };

    const setColor = (color: string) => {
        if (!COLORABLE_CATEGORIES.includes(activeTab)) return;
        const currentId = getId(avatarConfig[activeTab]);
        updateLayer(activeTab, { id: currentId, color });
    };

    const randomize = () => {
        const newConfig: any = {};
        const items = getFilteredItems('body');
        newConfig.body = items[Math.floor(Math.random() * items.length)];

        const pfx = newConfig.body.startsWith('f_') ? 'f_' : 'm_';
        // @ts-ignore
        const heads = (AVATAR_ASSETS.head || []).filter(h => h.startsWith(pfx));
        newConfig.head = heads.length > 0 ? heads[Math.floor(Math.random() * heads.length)] : heads[0];

        CATEGORIES.forEach(cat => {
            if (['body', 'head'].includes(cat.id)) return;
            const catItems = getFilteredItems(cat.id);
            if (catItems.length) {
                const item = catItems[Math.floor(Math.random() * catItems.length)];
                if (COLORABLE_CATEGORIES.includes(cat.id)) {
                    newConfig[cat.id] = { id: item, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
                } else {
                    newConfig[cat.id] = item;
                }
            }
        });
        setAvatarConfig(newConfig);
    };

    return (
        <div className="flex flex-col items-center py-6 relative w-full">
            
            {/* ÁREA DO BONECO + CALIBRAGEM */}
            <div className="relative group">
                <AvatarPixel 
                    layers={avatarConfig} 
                    size={240} 
                    className={`transition-all duration-300 ${isEditing ? 'scale-105 shadow-purple-500/30' : 'shadow-2xl border-slate-600'}`} 
                    // PROPS DE CALIBRAGEM
                    debugMode={debugMode}
                    manualOffsetY={offsetY}
                />
                
                {/* Botão Principal (Editar/Salvar) */}
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`absolute -bottom-3 -right-3 p-3 rounded-full shadow-lg text-white z-10 transition-transform hover:scale-110 
                        ${isEditing ? 'bg-green-500' : 'bg-cyan-600'}`}
                >
                    {isEditing ? <Check /> : <Edit />}
                </button>

                {isEditing && (
                    <>
                        {/* Botão Aleatório */}
                        <button 
                            onClick={randomize} 
                            className="absolute top-0 right-0 p-2 bg-slate-800 rounded-bl-xl text-purple-400 hover:text-white transition-colors" 
                            title="Gerar Aleatório"
                        >
                            <Shuffle />
                        </button>

                        {/* Botão MODO LABORATÓRIO (Debug) */}
                        <button 
                            onClick={() => setDebugMode(!debugMode)} 
                            className={`absolute top-0 left-0 p-2 rounded-br-xl text-xs font-bold flex gap-1 items-center transition-colors
                                ${debugMode ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
                            title="Modo Calibragem (Arrumar Posição)"
                        >
                            <BugReport fontSize="small" /> {debugMode ? 'LAB ON' : 'LAB'}
                        </button>
                    </>
                )}
            </div>

            {/* PAINEL DE CALIBRAGEM (Aparece apenas no modo LAB) */}
            {debugMode && (
                <div className="mt-6 bg-red-950/90 p-4 rounded-xl border border-red-500 w-full max-w-sm shadow-2xl animate-fade-in">
                    <p className="text-[10px] text-red-200 font-bold uppercase mb-3 text-center tracking-widest">
                        🔧 Calibrador de Sprite (Eixo Y)
                    </p>
                    
                    <input 
                        type="range" 
                        min="-1344" 
                        max="0" 
                        step="64" // Pulo do Gato: 64px (Grade do LPC)
                        value={offsetY} 
                        onChange={(e) => setOffsetY(Number(e.target.value))}
                        className="w-full h-2 bg-red-900 rounded-lg appearance-none cursor-pointer accent-red-500 mb-3"
                    />
                    
                    <div className="flex justify-between items-center text-xs font-mono text-red-300 font-bold">
                        <span className="bg-black/40 px-2 py-1 rounded">OFFSET: <span className="text-white text-base">{offsetY}px</span></span>
                        <button 
                            onClick={() => setOffsetY(-640)} 
                            className="bg-red-700 px-3 py-1 rounded hover:bg-red-600 text-white transition-colors"
                        >
                            Resetar (-640)
                        </button>
                    </div>
                    <p className="text-[9px] text-red-400 mt-3 text-center leading-relaxed">
                        Arraste a barra até o boneco ficar <strong>de frente</strong> e centralizado.<br/>
                        Me diga o número final para fixarmos no código!
                    </p>
                </div>
            )}

            {/* INFO (Modo Visualização - some se estiver no LAB) */}
            {!isEditing && !debugMode && (
                <div className="text-center mt-6 animate-fade-in">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">{user?.nome}</h1>
                    <p className="text-xs text-slate-400 font-mono mt-2">Nível {Math.floor((user?.xp || 0) / 1000)}</p>
                </div>
            )}

            {/* EDITOR COMPLETO (Some se estiver no LAB para não poluir) */}
            {isEditing && !debugMode && (
                <div className="w-full mt-6 animate-slide-up space-y-6">
                    
                    {/* 1. SELETOR DE GÊNERO */}
                    <div className="flex justify-center gap-4">
                        {BODY_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => handleGenderChange(type.id)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all ${
                                    gender === type.id 
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg' 
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                            >
                                {type.icon}
                                <span className="text-xs font-bold uppercase">{type.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* 2. ABAS DE CATEGORIA */}
                    <div className="flex overflow-x-auto gap-2 pb-2 px-1 no-scrollbar mask-gradient-x">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-all
                                    ${activeTab === cat.id 
                                        ? 'bg-purple-600 text-white shadow-lg' 
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* 3. CARROSSEL DE ITENS */}
                    <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-700/50 shadow-xl">
                        <div className="flex items-center justify-between gap-4">
                            <button onClick={() => cycleItem(-1)} className="p-4 bg-slate-800 rounded-xl text-white hover:bg-purple-600 active:scale-95 transition-transform">
                                <KeyboardArrowLeft />
                            </button>
                            
                            <div className="flex-1 text-center overflow-hidden">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                                    {CATEGORIES.find(c => c.id === activeTab)?.label}
                                </p>
                                <p className="text-sm text-cyan-400 font-bold truncate px-2 font-mono">
                                    {formatName(getId(avatarConfig[activeTab]))}
                                </p>
                                <p className="text-[9px] text-slate-600 mt-1">
                                    {getFilteredItems(activeTab).indexOf(getId(avatarConfig[activeTab])) + 1} / {getFilteredItems(activeTab).length}
                                </p>
                            </div>

                            <button onClick={() => cycleItem(1)} className="p-4 bg-slate-800 rounded-xl text-white hover:bg-purple-600 active:scale-95 transition-transform">
                                <KeyboardArrowRight />
                            </button>
                        </div>

                        {/* 4. PALETA DE CORES */}
                        {COLORABLE_CATEGORIES.includes(activeTab) && (
                            <div className="mt-4 border-t border-slate-800 pt-4">
                                <p className="text-[9px] text-slate-500 text-center uppercase mb-2 font-bold">Pintura</p>
                                <div className="flex gap-2 justify-center flex-wrap">
                                    {COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setColor(color)}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform shadow-md hover:scale-110 
                                                ${getColor(avatarConfig[activeTab]) === color 
                                                    ? 'border-white scale-110 ring-2 ring-cyan-400' 
                                                    : 'border-slate-600'
                                                }`}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}