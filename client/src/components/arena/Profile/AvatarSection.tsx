import { useState, useEffect } from 'react';
import AvatarPixel from '../AvatarPixel'; 
import AVATAR_ASSETS from '../../../data/avatarAssets.json';
import { Edit, KeyboardArrowLeft, KeyboardArrowRight, Check, Shuffle, Male, Female, Science, SportsMma, AutoFixHigh, LocalPharmacy } from '@mui/icons-material';
import type { User } from '../../../context/AuthContext';

interface Props {
    user: User | null;
    avatarConfig: any;
    setAvatarConfig: (config: any) => void;
    // Novos campos para atualizar o perfil
    profileData: any; 
    setProfileData: (data: any) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
}

const BODY_TYPES = [
    { id: 'm', label: 'Masculino', icon: <Male /> },
    { id: 'f', label: 'Feminino', icon: <Female /> }
];

const CLASSES = [
    { id: 'Mago', label: 'Mago', icon: <AutoFixHigh />, color: 'purple' },
    { id: 'Vampiro', label: 'Vampiro', icon: <LocalPharmacy />, color: 'red' }, // Usei farmácia como ícone "sangue/vida"
    { id: 'Atleta', label: 'Atleta', icon: <SportsMma />, color: 'yellow' },
    { id: 'Cientista', label: 'Cientista', icon: <Science />, color: 'cyan' }
];

const CATEGORIES = [
    { id: 'body', label: 'Pele' },
    { id: 'head', label: 'Rosto' },
    { id: 'hair', label: 'Cabelo' },
    { id: 'torso', label: 'Roupa' },
    { id: 'legs', label: 'Calça' },
    { id: 'feet', label: 'Pés' },
    { id: 'accessory', label: 'Extra' },
    { id: 'hand_r', label: 'Mão' }
];

const COLORABLE_CATEGORIES = ['hair', 'torso', 'legs', 'feet'];
const COLORS = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gold', 'brown'];

export default function AvatarSection({ user, avatarConfig, setAvatarConfig, profileData, setProfileData, isEditing, setIsEditing }: Props) {
    const [activeTab, setActiveTab] = useState('hair');
    const [gender, setGender] = useState('m');

    // Sincroniza gênero inicial
    useEffect(() => {
        const bodyId = typeof avatarConfig.body === 'string' ? avatarConfig.body : avatarConfig.body?.id;
        if (bodyId && bodyId.startsWith('f_')) setGender('f');
        else setGender('m');
    }, []);

    // --- HELPERS ---
    const getId = (item: any) => (typeof item === 'string' ? item : item?.id);
    const getColor = (item: any) => (typeof item === 'string' ? 'white' : item?.color || 'white');

    const updateLayer = (key: string, newValue: any) => {
        setAvatarConfig((prev: any) => ({ ...prev, [key]: newValue }));
    };

    const formatName = (name: string) => {
        if (!name || name === 'none') return 'Nenhum';
        return name
            .replace(/_/g, ' ')
            .replace(/^f |^m /g, '')
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    const getFilteredItems = (category: string) => {
        // @ts-ignore
        const allItems: string[] = AVATAR_ASSETS[category] || [];
        if (category === 'accessory' || category === 'hand_r') return allItems;
        return allItems.filter(item => item.startsWith(gender + '_') || !item.includes('_'));
    };

    const handleGenderChange = (newGender: string) => {
        setGender(newGender);
        // Reseta corpo e cabeça para o novo gênero
        // @ts-ignore
        const bodies = AVATAR_ASSETS.body || [];
        // @ts-ignore
        const heads = AVATAR_ASSETS.head || [];
        
        const firstBody = bodies.find((b: string) => b.startsWith(newGender)) || bodies[0];
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
        const items = getFilteredItems('body');
        newConfig.body = items[Math.floor(Math.random() * items.length)];

        // Garante cabeça do mesmo gênero
        const genderPrefix = newConfig.body.startsWith('f_') ? 'f' : 'm';
        // @ts-ignore
        const heads = (AVATAR_ASSETS.head || []).filter(h => h.startsWith(genderPrefix));
        newConfig.head = heads.length > 0 ? heads[Math.floor(Math.random() * heads.length)] : heads[0];

        CATEGORIES.forEach(cat => {
            if (cat.id === 'body' || cat.id === 'head') return;
            const catItems = getFilteredItems(cat.id);
            if (catItems.length > 0) {
                const item = catItems[Math.floor(Math.random() * catItems.length)];
                if (COLORABLE_CATEGORIES.includes(cat.id)) {
                    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    newConfig[cat.id] = { id: item, color };
                } else {
                    newConfig[cat.id] = item;
                }
            } else {
                newConfig[cat.id] = 'none';
            }
        });
        setAvatarConfig(newConfig);
    };

    return (
        <div className="flex flex-col items-center py-6 relative w-full">
            
            {/* ÁREA DE VISUALIZAÇÃO */}
            <div className="relative group">
                <AvatarPixel 
                    layers={avatarConfig} 
                    size={240} 
                    className={`transition-all duration-300 ${isEditing ? 'scale-110 shadow-purple-500/40' : 'shadow-2xl border-slate-600'}`} 
                />
                
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`absolute -bottom-3 -right-3 p-3 rounded-full shadow-lg transition-all text-white z-10 flex items-center justify-center
                        ${isEditing ? 'bg-green-500 hover:bg-green-600' : 'bg-cyan-600 hover:scale-110'}`}
                >
                    {isEditing ? <Check /> : <Edit fontSize="small" />}
                </button>

                {isEditing && (
                    <button 
                        onClick={randomize}
                        className="absolute top-2 right-2 p-2 bg-slate-900/80 rounded-full text-purple-400 hover:text-white"
                        title="Gerar Aleatório"
                    >
                        <Shuffle fontSize="small" />
                    </button>
                )}
            </div>

            {/* INFO (Modo Visualização) */}
            {!isEditing && (
                <div className="text-center mt-6 animate-fade-in">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">{user?.nome}</h1>
                    <div className="flex justify-center gap-2 mt-2">
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">Lvl {Math.floor((user?.xp || 0) / 1000)}</span>
                        <span className={`text-xs px-2 py-1 rounded font-bold uppercase border bg-${CLASSES.find(c => c.id === user?.classe)?.color || 'slate'}-500/20 text-${CLASSES.find(c => c.id === user?.classe)?.color || 'slate'}-300 border-${CLASSES.find(c => c.id === user?.classe)?.color || 'slate'}-500`}>
                            {user?.classe || 'Novato'}
                        </span>
                    </div>
                </div>
            )}

            {/* MODO EDIÇÃO COMPLETO */}
            {isEditing && (
                <div className="w-full mt-6 animate-slide-up space-y-6">
                    
                    {/* 1. NOME E CLASSE */}
                    <div className="grid gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500">Nome do Personagem</label>
                            <input 
                                value={profileData?.nome || ''}
                                onChange={e => setProfileData({...profileData, nome: e.target.value})}
                                className="w-full bg-slate-950 text-white font-bold p-3 rounded-xl border border-slate-700 focus:border-cyan-500 outline-none"
                            />
                        </div>
                        
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Classe</label>
                            <div className="grid grid-cols-4 gap-2">
                                {CLASSES.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => setProfileData({...profileData, classe: cls.id})}
                                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                                            profileData?.classe === cls.id 
                                            ? `bg-${cls.color}-500/20 border-${cls.color}-500 text-${cls.color}-400 scale-105` 
                                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900'
                                        }`}
                                    >
                                        <div className="mb-1">{cls.icon}</div>
                                        <span className="text-[8px] font-bold uppercase">{cls.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 2. GÊNERO */}
                    <div className="flex justify-center gap-4">
                        {BODY_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => handleGenderChange(type.id)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all ${
                                    gender === type.id 
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-900/50' 
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                            >
                                {type.icon}
                                <span className="text-xs font-bold uppercase">{type.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* 3. ASSETS E CORES */}
                    <div>
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

                            {COLORABLE_CATEGORIES.includes(activeTab) && (
                                <div className="flex gap-2 justify-center mt-4 flex-wrap">
                                    {COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setColor(color)}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform shadow-lg
                                                ${getColor(avatarConfig[activeTab]) === color 
                                                    ? 'border-white scale-125 ring-2 ring-cyan-400' 
                                                    : 'border-slate-600 hover:scale-110'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}