import { useState, useEffect } from 'react';
import AvatarPixel from '../AvatarPixel'; 
import AVATAR_ASSETS from '../../../data/avatarAssets.json';
import { 
    Edit, KeyboardArrowLeft, KeyboardArrowRight, Check, Shuffle, 
    Male, Female, RotateRight, RotateLeft} from '@mui/icons-material';
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
    { id: 'eyes', label: 'Olhos' },
    { id: 'hair', label: 'Cabelo' },
    { id: 'beard', label: 'Barba' },
    { id: 'torso', label: 'Roupa' },
    { id: 'accessory', label: 'Item' }
];

const COLORABLE_CATEGORIES = ['hair', 'beard', 'torso'];
const COLORS = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gold', 'brown', 'orange', 'teal'];

export default function AvatarSection({ user, avatarConfig, setAvatarConfig, isEditing, setIsEditing }: Props) {
    const [activeTab, setActiveTab] = useState('hair');
    const [gender, setGender] = useState('m');
    const [direction, setDirection] = useState(2); // 2 = FRENTE (SUL)

    useEffect(() => {
        const bodyId = typeof avatarConfig.body === 'string' ? avatarConfig.body : avatarConfig.body?.id;
        if (bodyId && bodyId.startsWith('f_')) setGender('f');
        else setGender('m');

        // AUTO-FIX OLHOS: Se não tiver, coloca o padrão
        if (!avatarConfig.eyes || avatarConfig.eyes === 'none') {
             // @ts-ignore
             const eyesList = AVATAR_ASSETS.eyes || [];
             if (eyesList.length > 0) updateLayer('eyes', eyesList[0]);
        }
    }, [avatarConfig.body]);

    const getId = (item: any) => (typeof item === 'string' ? item : item?.id);
    const getColor = (item: any) => (typeof item === 'string' ? 'white' : item?.color || 'white');
    const updateLayer = (key: string, val: any) => setAvatarConfig((p: any) => ({ ...p, [key]: val }));

    const formatName = (name: string) => {
        if (!name || name === 'none') return 'Nenhum';
        return name.replace(/_/g, ' ').replace(/^f |^m |^u /g, '').replace(/\b\w/g, c => c.toUpperCase());
    };

    const handleGenderChange = (newGender: string) => {
        setGender(newGender);
        // @ts-ignore
        const bodies = AVATAR_ASSETS.body || [];
        // @ts-ignore
        const heads = AVATAR_ASSETS.head || [];
        // @ts-ignore
        const eyes = AVATAR_ASSETS.eyes || [];

        const newBody = bodies.find((b: string) => b.startsWith(newGender + '_')) || bodies[0];
        const newHead = heads.find((h: string) => h.startsWith(newGender + '_')) || heads[0];

        setAvatarConfig((prev: any) => ({
            ...prev,
            body: newBody,
            head: newHead,
            eyes: prev.eyes !== 'none' ? prev.eyes : (eyes[0] || 'none'),
            beard: 'none', 
            torso: 'none'
        }));
    };

    const getFilteredItems = (category: string) => {
        // @ts-ignore
        const allItems: string[] = AVATAR_ASSETS[category] || [];
        if (['accessory', 'eyes'].includes(category)) return allItems;
        return allItems.filter(item => item.startsWith(gender + '_') || item.startsWith('u_') || !item.includes('_'));
    };

    const cycleItem = (dir: number) => {
        const items = getFilteredItems(activeTab);
        if (!items.length) return;
        const currentId = getId(avatarConfig[activeTab]);
        let index = items.indexOf(currentId);
        if (index === -1) index = 0;
        let newIndex = index + dir;
        if (newIndex >= items.length) newIndex = 0;
        if (newIndex < 0) newIndex = items.length - 1;
        const newItem = items[newIndex];
        
        if (COLORABLE_CATEGORIES.includes(activeTab)) {
            updateLayer(activeTab, { id: newItem, color: getColor(avatarConfig[activeTab]) });
        } else {
            updateLayer(activeTab, newItem);
        }
    };

    const setColor = (color: string) => {
        if (!COLORABLE_CATEGORIES.includes(activeTab)) return;
        updateLayer(activeTab, { id: getId(avatarConfig[activeTab]), color });
    };

    const randomize = () => {
        const newConfig: any = {};
        const items = getFilteredItems('body');
        newConfig.body = items[Math.floor(Math.random() * items.length)];
        const pfx = newConfig.body.startsWith('f_') ? 'f_' : 'm_';
        
        // @ts-ignore
        const heads = (AVATAR_ASSETS.head || []).filter(h => h.startsWith(pfx));
        newConfig.head = heads.length > 0 ? heads[Math.floor(Math.random() * heads.length)] : heads[0];
        // @ts-ignore
        const eyesList = AVATAR_ASSETS.eyes || [];
        newConfig.eyes = eyesList.length > 0 ? eyesList[Math.floor(Math.random() * eyesList.length)] : 'none';

        CATEGORIES.forEach(cat => {
            if (['body', 'head', 'eyes'].includes(cat.id)) return;
            const catItems = getFilteredItems(cat.id);
            if (catItems.length) {
                const item = catItems[Math.floor(Math.random() * catItems.length)];
                if (COLORABLE_CATEGORIES.includes(cat.id)) {
                    newConfig[cat.id] = { id: item, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
                } else {
                    newConfig[cat.id] = item;
                }
            } else {
                newConfig[cat.id] = 'none';
            }
        });
        setAvatarConfig(newConfig);
    };

    // --- LÓGICA DE ROTAÇÃO (O NOVO LAB) ---
    const rotate = (dir: number) => {
        setDirection(prev => {
            let newDir = prev + dir;
            if (newDir > 3) return 0;
            if (newDir < 0) return 3;
            return newDir;
        });
    };

    return (
        <div className="flex flex-col items-center py-6 relative w-full">
            <div className="relative group">
                <AvatarPixel 
                    layers={avatarConfig} 
                    size={240} 
                    className={`transition-all duration-300 ${isEditing ? 'scale-105 shadow-purple-500/30' : 'shadow-2xl border-slate-600'}`} 
                    // PASSA A DIREÇÃO PARA O MOTOR GRÁFICO
                    direction={direction}
                />
                
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`absolute -bottom-3 -right-3 p-3 rounded-full shadow-lg text-white z-10 transition-transform hover:scale-110 ${isEditing ? 'bg-green-500' : 'bg-cyan-600'}`}
                >
                    {isEditing ? <Check /> : <Edit />}
                </button>
                
                {isEditing && (
                    <button onClick={randomize} className="absolute top-0 right-0 p-2 bg-slate-800 rounded-bl-xl text-purple-400 hover:text-white" title="Aleatório">
                        <Shuffle />
                    </button>
                )}

                {/* --- BOTÕES DE ROTAÇÃO (Feature Nova!) --- */}
                <div className="absolute top-1/2 -left-12 -translate-y-1/2 flex flex-col gap-2">
                     <button onClick={() => rotate(-1)} className="p-2 bg-slate-800/80 rounded-full text-white hover:bg-cyan-600 shadow-lg">
                        <RotateLeft />
                     </button>
                </div>
                <div className="absolute top-1/2 -right-12 -translate-y-1/2 flex flex-col gap-2">
                     <button onClick={() => rotate(1)} className="p-2 bg-slate-800/80 rounded-full text-white hover:bg-cyan-600 shadow-lg">
                        <RotateRight />
                     </button>
                </div>
                
                {/* Indicador de Direção */}
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-[9px] text-white font-mono uppercase">
                    {['Costas', 'Esq', 'Frente', 'Dir'][direction]}
                </div>
            </div>

            {!isEditing && (
                <div className="text-center mt-6 animate-fade-in">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">{user?.nome}</h1>
                    <p className="text-xs text-slate-400 font-mono mt-2">Nível {Math.floor((user?.xp || 0) / 1000)}</p>
                </div>
            )}

            {isEditing && (
                <div className="w-full mt-6 animate-slide-up space-y-6">
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

                    <div className="flex overflow-x-auto gap-2 pb-2 px-1 no-scrollbar mask-gradient-x">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition-all
                                    ${activeTab === cat.id ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-700/50 shadow-xl">
                        <div className="flex items-center justify-between gap-4">
                            <button onClick={() => cycleItem(-1)} className="p-4 bg-slate-800 rounded-xl text-white hover:bg-purple-600 active:scale-95"><KeyboardArrowLeft /></button>
                            <div className="flex-1 text-center overflow-hidden">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{CATEGORIES.find(c => c.id === activeTab)?.label}</p>
                                <p className="text-sm text-cyan-400 font-bold truncate px-2 font-mono">{formatName(getId(avatarConfig[activeTab]))}</p>
                                <p className="text-[9px] text-slate-600 mt-1">{getFilteredItems(activeTab).indexOf(getId(avatarConfig[activeTab])) + 1} / {getFilteredItems(activeTab).length}</p>
                            </div>
                            <button onClick={() => cycleItem(1)} className="p-4 bg-slate-800 rounded-xl text-white hover:bg-purple-600 active:scale-95"><KeyboardArrowRight /></button>
                        </div>
                        {COLORABLE_CATEGORIES.includes(activeTab) && (
                            <div className="mt-4 border-t border-slate-800 pt-4">
                                <div className="flex gap-2 justify-center flex-wrap">
                                    {COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setColor(color)}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform shadow-md hover:scale-110 ${getColor(avatarConfig[activeTab]) === color ? 'border-white scale-110 ring-2 ring-cyan-400' : 'border-slate-600'}`}
                                            style={{ backgroundColor: color }}
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