import { useState, useEffect } from 'react';
import AvatarPixel from '../AvatarPixel'; 
import AVATAR_ASSETS from '../../../data/avatarAssets.json';
import { Edit, KeyboardArrowLeft, KeyboardArrowRight, Check, Shuffle, Male, Female, ChildCare } from '@mui/icons-material';
import type { User } from '../../../context/AuthContext';

interface Props {
    user: User | null;
    avatarConfig: any;
    setAvatarConfig: (config: any) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
}

// Tipos de Corpo Base
const BODY_TYPES = [
    { id: 'm', label: 'Masculino', icon: <Male /> },
    { id: 'f', label: 'Feminino', icon: <Female /> },
    // { id: 'teen', label: 'Jovem', icon: <EmojiPeople /> }, // Descomente se tiver assets teen
];

const CATEGORIES = [
    { id: 'body', label: 'Pele' }, // Agora selecionamos a COR da pele aqui
    { id: 'head', label: 'Rosto' },
    { id: 'hair', label: 'Cabelo' },
    { id: 'torso', label: 'Roupa' },
    { id: 'legs', label: 'Calça' },
    { id: 'feet', label: 'Pés' },
    { id: 'accessory', label: 'Acessório' },
    { id: 'hand_r', label: 'Mão' }
];

const COLORABLE_CATEGORIES = ['hair', 'torso', 'legs', 'feet'];
const COLORS = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gold', 'brown', 'orange', 'teal'];

export default function AvatarSection({ user, avatarConfig, setAvatarConfig, isEditing, setIsEditing }: Props) {
    const [activeTab, setActiveTab] = useState('hair');
    const [gender, setGender] = useState('m'); // Estado local para filtrar assets

    // Inicializa o gênero baseado no corpo atual
    useEffect(() => {
        const currentBody = typeof avatarConfig.body === 'string' ? avatarConfig.body : avatarConfig.body?.id;
        if (currentBody && currentBody.startsWith('f_')) setGender('f');
        else setGender('m');
    }, []);

    // Helper Functions
    const getId = (item: any) => (typeof item === 'string' ? item : item?.id);
    const getColor = (item: any) => (typeof item === 'string' ? 'white' : item?.color || 'white');

    const updateLayer = (key: string, newValue: any) => {
        setAvatarConfig((prev: any) => ({ ...prev, [key]: newValue }));
    };

    const formatName = (name: string) => {
        if (!name || name === 'none') return 'Nenhum';
        return name
            .replace(/_/g, ' ')
            .replace(/^f |^m /g, '') // Remove prefixo de gênero
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    // --- LÓGICA DE FILTRAGEM INTELIGENTE ---
    // Só mostra itens que começam com o prefixo do gênero selecionado (ou unissex)
    const getFilteredItems = (category: string) => {
        // @ts-ignore
        const allItems: string[] = AVATAR_ASSETS[category] || [];
        
        if (category === 'accessory' || category === 'hand_r') return allItems; // Acessórios são universais

        return allItems.filter(item => {
            if (item.startsWith(gender + '_')) return true; // Ex: m_shirt
            if (!item.includes('_')) return true; // Itens sem prefixo
            return false;
        });
    };

    // Muda o tipo de corpo e reseta itens incompatíveis
    const handleGenderChange = (newGender: string) => {
        setGender(newGender);
        
        // Tenta achar um corpo equivalente no novo gênero
        // @ts-ignore
        const bodies = AVATAR_ASSETS.body || [];
        const firstBody = bodies.find((b: string) => b.startsWith(newGender)) || bodies[0];
        
        // @ts-ignore
        const heads = AVATAR_ASSETS.head || [];
        const firstHead = heads.find((h: string) => h.startsWith(newGender)) || heads[0];

        updateLayer('body', firstBody);
        updateLayer('head', firstHead);
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

        const newItemId = items[newIndex];
        
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

    const randomize = () => {
        const newConfig: any = {};
        // Mantém o gênero atual
        const items = getFilteredItems('body');
        newConfig.body = items[Math.floor(Math.random() * items.length)];

        CATEGORIES.forEach(cat => {
            if (cat.id === 'body') return;
            const catItems = getFilteredItems(cat.id);
            if (catItems.length > 0) {
                const item = catItems[Math.floor(Math.random() * catItems.length)];
                if (COLORABLE_CATEGORIES.includes(cat.id)) {
                    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    newConfig[cat.id] = { id: item, color };
                } else {
                    newConfig[cat.id] = item;
                }
            }
        });
        setAvatarConfig(newConfig);
    };

    return (
        <div className="flex flex-col items-center py-6 relative w-full">
            
            {/* ÁREA DO BONECO */}
            <div className="relative group">
                <AvatarPixel 
                    layers={avatarConfig} 
                    size={220} 
                    className={`transition-all duration-300 ${isEditing ? 'scale-110 shadow-purple-500/40' : 'shadow-2xl border-slate-600'}`} 
                />
                
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`absolute -bottom-3 -right-3 p-3 rounded-full shadow-lg transition-all text-white z-10 flex items-center justify-center
                        ${isEditing ? 'bg-green-500' : 'bg-cyan-600 hover:scale-110'}`}
                >
                    {isEditing ? <Check /> : <Edit fontSize="small" />}
                </button>

                {isEditing && (
                    <button 
                        onClick={randomize}
                        className="absolute top-2 right-2 p-2 bg-slate-900/80 rounded-full text-purple-400 hover:text-white"
                        title="Aleatório"
                    >
                        <Shuffle fontSize="small" />
                    </button>
                )}
            </div>

            {/* NOME E LEVEL (Só visualização) */}
            {!isEditing && (
                <div className="text-center mt-6 animate-fade-in">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">{user?.nome}</h1>
                    <p className="text-xs text-slate-400 font-mono mt-2">Nível {Math.floor((user?.xp || 0) / 1000)}</p>
                </div>
            )}

            {/* EDITOR */}
            {isEditing && (
                <div className="w-full mt-6 animate-slide-up">
                    
                    {/* 1. SELETOR DE GÊNERO/CORPO (NOVO!) */}
                    <div className="flex justify-center gap-4 mb-6">
                        {BODY_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => handleGenderChange(type.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                                    gender === type.id 
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' 
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                            >
                                {type.icon}
                                <span className="text-xs font-bold uppercase">{type.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* 2. ABAS DE CATEGORIA */}
                    <div className="flex overflow-x-auto gap-2 pb-4 px-2 no-scrollbar mask-gradient-x">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all shadow-sm
                                    ${activeTab === cat.id 
                                        ? 'bg-purple-600 text-white ring-2 ring-purple-400/50' 
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* 3. SELETOR DE ITEM (Carrossel) */}
                    <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-700/50 shadow-xl mt-2">
                        <div className="flex items-center justify-between gap-4">
                            <button onClick={() => cycleItem(-1)} className="p-4 bg-slate-800 rounded-xl text-white hover:bg-purple-600 active:scale-95">
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

                            <button onClick={() => cycleItem(1)} className="p-4 bg-slate-800 rounded-xl text-white hover:bg-purple-600 active:scale-95">
                                <KeyboardArrowRight />
                            </button>
                        </div>
                    </div>

                    {/* 4. PALETA DE CORES */}
                    {COLORABLE_CATEGORIES.includes(activeTab) && (
                        <div className="mt-4 animate-fade-in">
                            <p className="text-[10px] text-slate-500 font-bold uppercase text-center mb-2">Pintar</p>
                            <div className="flex gap-3 justify-center flex-wrap px-4">
                                {COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setColor(color)}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform shadow-lg
                                            ${getColor(avatarConfig[activeTab]) === color 
                                                ? 'border-white scale-110 ring-2 ring-cyan-400' 
                                                : 'border-slate-600 hover:scale-110'
                                            }
                                        `}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}