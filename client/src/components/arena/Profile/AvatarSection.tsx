import { useState, useEffect } from 'react';
import AvatarPixel from '../AvatarPixel'; 
import AVATAR_ASSETS from '../../../data/avatarAssets.json'; // O JSON Elite
import { Edit, KeyboardArrowLeft, KeyboardArrowRight, Check, Shuffle, Male, Female } from '@mui/icons-material';
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
const COLORS = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gold', 'brown'];

export default function AvatarSection({ avatarConfig, setAvatarConfig, isEditing, setIsEditing }: Props) {
    const [activeTab, setActiveTab] = useState('hair'); // Começa editando cabelo
    const [gender, setGender] = useState('m');

    // Sincroniza o botão de gênero com o corpo atual ao carregar
    useEffect(() => {
        const bodyId = typeof avatarConfig.body === 'string' ? avatarConfig.body : avatarConfig.body?.id;
        if (bodyId && bodyId.startsWith('f_')) setGender('f');
        else setGender('m');
    }, [avatarConfig.body]);

    // --- UTILS ---
    const getId = (item: any) => (typeof item === 'string' ? item : item?.id);
    const getColor = (item: any) => (typeof item === 'string' ? 'white' : item?.color || 'white');
    
    const updateLayer = (key: string, val: any) => setAvatarConfig((p: any) => ({ ...p, [key]: val }));

    const formatName = (name: string) => {
        if (!name) return 'Vazio';
        return name.replace(/_/g, ' ').replace(/^f |^m /g, '').replace(/\b\w/g, c => c.toUpperCase());
    };

    // --- LÓGICA DE TROCA DE GÊNERO ---
    const handleGenderChange = (newGender: string) => {
        setGender(newGender);
        
        // @ts-ignore
        const bodies = AVATAR_ASSETS.body || [];
        // @ts-ignore
        const heads = AVATAR_ASSETS.head || [];

        // Pega o primeiro corpo/cabeça do novo gênero para resetar
        const newBody = bodies.find((b: string) => b.startsWith(newGender + '_')) || bodies[0];
        const newHead = heads.find((h: string) => h.startsWith(newGender + '_')) || heads[0];

        setAvatarConfig((prev: any) => ({
            ...prev,
            body: newBody,
            head: newHead,
            // Reseta roupas para evitar bug de roupa masculina em corpo feminino
            torso: 'none',
            legs: 'none',
            feet: 'none'
        }));
    };

    // --- FILTRO DE ASSETS ---
    const getFilteredItems = (category: string) => {
        // @ts-ignore
        const allItems: string[] = AVATAR_ASSETS[category] || [];
        if (['accessory', 'hand_r', 'hair'].includes(category)) return allItems; // Alguns itens são unissex
        
        // Filtra pelo gênero atual
        return allItems.filter(item => item.startsWith(gender + '_') || !item.includes('_'));
    };

    // --- CARROSSEL ---
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
        
        // Mantém a cor se for pintável
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
        // Mantém gênero atual para não bugar UX
        const items = getFilteredItems('body');
        newConfig.body = items[Math.floor(Math.random() * items.length)];

        // Cabeça correspondente
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
        <div className="flex flex-col items-center py-6 w-full">
            
            {/* AVATAR + BOTÕES FLUTUANTES */}
            <div className="relative group">
                <AvatarPixel 
                    layers={avatarConfig} 
                    size={240} 
                    className={`transition-all duration-300 ${isEditing ? 'scale-105 shadow-purple-500/30' : 'shadow-2xl border-slate-600'}`} 
                />
                
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`absolute -bottom-4 -right-4 p-4 rounded-full shadow-xl text-white z-10 transition-transform hover:scale-110 
                        ${isEditing ? 'bg-green-500' : 'bg-cyan-600'}`}
                >
                    {isEditing ? <Check /> : <Edit />}
                </button>

                {isEditing && (
                    <button onClick={randomize} className="absolute top-0 right-0 p-2 bg-slate-800 rounded-bl-xl text-purple-400 hover:text-white" title="Aleatório">
                        <Shuffle />
                    </button>
                )}
            </div>

            {/* EDITOR */}
            {isEditing && (
                <div className="w-full mt-8 animate-slide-up space-y-6">
                    
                    {/* 1. SELETOR DE CORPO */}
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

                    {/* 2. CATEGORIAS */}
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

                    {/* 3. NAVEGAÇÃO */}
                    <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-700 shadow-xl">
                        <div className="flex items-center justify-between gap-4">
                            <button onClick={() => cycleItem(-1)} className="p-4 bg-slate-800 rounded-xl text-white hover:bg-purple-600"><KeyboardArrowLeft /></button>
                            
                            <div className="flex-1 text-center overflow-hidden">
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{CATEGORIES.find(c => c.id === activeTab)?.label}</p>
                                <p className="text-sm text-cyan-400 font-bold truncate px-2 font-mono">{formatName(getId(avatarConfig[activeTab]))}</p>
                                <p className="text-[9px] text-slate-600 mt-1">
                                    {getFilteredItems(activeTab).indexOf(getId(avatarConfig[activeTab])) + 1} / {getFilteredItems(activeTab).length}
                                </p>
                            </div>

                            <button onClick={() => cycleItem(1)} className="p-4 bg-slate-800 rounded-xl text-white hover:bg-purple-600"><KeyboardArrowRight /></button>
                        </div>

                        {/* 4. CORES */}
                        {COLORABLE_CATEGORIES.includes(activeTab) && (
                            <div className="flex gap-2 justify-center mt-4 flex-wrap">
                                {COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setColor(color)}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform shadow-md ${getColor(avatarConfig[activeTab]) === color ? 'border-white scale-110' : 'border-slate-600'}`}
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