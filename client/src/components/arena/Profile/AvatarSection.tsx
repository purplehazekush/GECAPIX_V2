import { useState, useEffect } from 'react';
import AvatarPixel from '../AvatarPixel'; 
import AVATAR_ASSETS from '../../../data/avatarAssets.json'; // O JSON Elite
import { Edit, KeyboardArrowLeft, KeyboardArrowRight, Check, Male, Female } from '@mui/icons-material';
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
    { id: 'body', label: 'Corpo' },
    { id: 'head', label: 'Rosto' },
    { id: 'hair', label: 'Cabelo' },
    { id: 'torso', label: 'Roupa' },
    { id: 'legs', label: 'Calça' },
    { id: 'feet', label: 'Pés' },
    { id: 'accessory', label: 'Item' },
    { id: 'hand_r', label: 'Mão' }
];

const COLORABLE_CATEGORIES = ['hair', 'torso', 'legs', 'feet'];
const COLORS = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gold', 'brown'];

export default function AvatarSection({ user, avatarConfig, setAvatarConfig, isEditing, setIsEditing }: Props) {
    const [activeTab, setActiveTab] = useState('body');
    const [gender, setGender] = useState('m');

    // Inicialização segura
    useEffect(() => {
        if (!avatarConfig.body) {
             // Se não tiver nada, força um default
             handleGenderChange('m');
        } else {
            const bodyId = typeof avatarConfig.body === 'string' ? avatarConfig.body : avatarConfig.body?.id;
            setGender(bodyId && bodyId.startsWith('f_') ? 'f' : 'm');
        }
    }, []);

    const getId = (item: any) => (typeof item === 'string' ? item : item?.id);
    const getColor = (item: any) => (typeof item === 'string' ? 'white' : item?.color || 'white');

    const updateLayer = (key: string, newValue: any) => {
        setAvatarConfig((prev: any) => ({ ...prev, [key]: newValue }));
    };

    // --- FUNÇÃO CRÍTICA: Troca Gênero e Cabeça ---
    const handleGenderChange = (newGender: string) => {
        setGender(newGender);
        
        // @ts-ignore
        const bodies = AVATAR_ASSETS.body || [];
        // @ts-ignore
        const heads = AVATAR_ASSETS.head || [];
        
        // Encontra o primeiro corpo e cabeça compatíveis
        const firstBody = bodies.find((b: string) => b.startsWith(newGender + '_')) || bodies[0];
        const firstHead = heads.find((h: string) => h.startsWith(newGender + '_')) || heads[0];

        // Atualiza os dois simultaneamente para evitar "Frankenstein"
        setAvatarConfig((prev: any) => ({
            ...prev,
            body: firstBody,
            head: firstHead
        }));
    };

    const getFilteredItems = (category: string) => {
        // @ts-ignore
        const allItems: string[] = AVATAR_ASSETS[category] || [];
        if (category === 'accessory' || category === 'hand_r') return allItems; // Itens universais
        
        // Filtra itens que começam com o gênero atual (ex: 'm_') ou não tem prefixo
        return allItems.filter(item => item.startsWith(gender + '_') || !item.includes('_'));
    };

    const formatName = (name: string) => {
        if (!name) return 'Vazio';
        return name.replace(/_/g, ' ').replace(/^f |^m /g, '').replace(/\b\w/g, l => l.toUpperCase());
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

    return (
        <div className="flex flex-col items-center py-6 relative w-full">
            
            <div className="relative group">
                <AvatarPixel 
                    layers={avatarConfig} 
                    size={240} 
                    className={`transition-all duration-300 ${isEditing ? 'scale-110 shadow-purple-500/40' : 'shadow-2xl border-slate-600'}`} 
                />
                
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`absolute -bottom-3 -right-3 p-3 rounded-full shadow-lg text-white z-10 flex items-center justify-center
                        ${isEditing ? 'bg-green-500 hover:bg-green-600' : 'bg-cyan-600 hover:scale-110'}`}
                >
                    {isEditing ? <Check /> : <Edit fontSize="small" />}
                </button>
            </div>

            {!isEditing && (
                <div className="text-center mt-6 animate-fade-in">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">{user?.nome}</h1>
                    <p className="text-xs text-slate-400 font-mono mt-2">Nível {Math.floor((user?.xp || 0) / 1000)}</p>
                </div>
            )}

            {isEditing && (
                <div className="w-full mt-6 animate-slide-up space-y-6">
                    
                    {/* SELETOR DE GÊNERO */}
                    <div className="flex justify-center gap-4">
                        {BODY_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => handleGenderChange(type.id)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all ${
                                    gender === type.id 
                                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-lg' 
                                    : 'bg-slate-800 border-slate-700 text-slate-400'
                                }`}
                            >
                                {type.icon}
                                <span className="text-xs font-bold uppercase">{type.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* ABAS */}
                    <div className="flex overflow-x-auto gap-2 pb-4 px-2 no-scrollbar">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all shadow-sm
                                    ${activeTab === cat.id 
                                        ? 'bg-purple-600 text-white' 
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* CARROSSEL DE SELEÇÃO */}
                    <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-700/50 shadow-xl">
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

                        {/* CORES */}
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
            )}
        </div>
    );
}