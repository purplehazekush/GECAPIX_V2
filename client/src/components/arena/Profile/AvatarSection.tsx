import { useState } from 'react';
import AvatarPixel from '../AvatarPixel'; // Verifique se o caminho volta para component/arena
import AVATAR_ASSETS from '../../../data/avatarAssets.json'; // Ajuste o caminho conforme necessário
import { Edit, KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';
import { type User } from '../../../context/AuthContext'; // Importe o tipo User

interface Props {
    user: User | null;
    avatarConfig: any;
    setAvatarConfig: (config: any) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
}

const CATEGORIES = [
    { id: 'body', label: 'Pele' },
    { id: 'hair', label: 'Cabelo' },
    { id: 'torso', label: 'Roupa' },
    { id: 'legs', label: 'Calça' },
    { id: 'feet', label: 'Sapatos' },
    { id: 'hand_r', label: 'Mão' }
];

const CLASSES_COLORS: Record<string, string> = {
    'Mago': 'border-purple-500 bg-purple-500/20',
    'Vampiro': 'border-red-600 bg-red-600/20',
    'Atleta': 'border-yellow-500 bg-yellow-500/20',
    'Cientista': 'border-cyan-500 bg-cyan-500/20'
};

export default function AvatarSection({ user, avatarConfig, setAvatarConfig, isEditing, setIsEditing }: Props) {
    const [activeTab, setActiveTab] = useState('hair');

    const cycleItem = (direction: number) => {
        // @ts-ignore
        const items = AVATAR_ASSETS[activeTab] || [];
        if (items.length === 0) return;

        const current = avatarConfig[activeTab];
        let index = items.indexOf(current);
        if (index === -1) index = 0;

        let newIndex = index + direction;
        if (newIndex >= items.length) newIndex = 0;
        if (newIndex < 0) newIndex = items.length - 1;

        setAvatarConfig((prev: any) => ({ ...prev, [activeTab]: items[newIndex] }));
    };

    return (
        <div className="flex flex-col items-center py-6 relative">
            <div className="relative">
                <AvatarPixel layers={avatarConfig} size={200} className="shadow-2xl border-slate-600" />
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`absolute -bottom-2 -right-2 p-3 rounded-full shadow-lg transition-all text-white ${isEditing ? 'bg-red-500 rotate-45' : 'bg-cyan-600 hover:scale-110'}`}
                >
                    {isEditing ? <span className="font-bold text-lg">+</span> : <Edit fontSize="small" />}
                </button>
            </div>

            {!isEditing && (
                <div className="text-center mt-4 animate-fade-in">
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">{user?.nome}</h1>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="bg-slate-800 text-slate-400 text-[10px] font-mono px-2 py-1 rounded-md border border-slate-700">
                            Lvl {Math.floor((user?.xp || 0) / 1000)}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md border text-white ${CLASSES_COLORS[user?.classe || 'Mago'] || 'border-slate-500'}`}>
                            {user?.classe || 'Novato'}
                        </span>
                    </div>
                </div>
            )}

            {isEditing && (
                <div className="w-full mt-6 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-2xl p-4 animate-slide-up">
                    <div className="flex overflow-x-auto gap-2 pb-3 mb-2 no-scrollbar">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-colors ${activeTab === cat.id ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between bg-black/30 rounded-xl p-2 border border-white/5">
                        <button onClick={() => cycleItem(-1)} className="p-3 bg-slate-800 rounded-lg text-white active:scale-95"><KeyboardArrowLeft /></button>
                        <p className="text-xs text-cyan-400 font-mono truncate max-w-[120px]">
                            {(avatarConfig[activeTab] || 'Nenhum').replace(/_/g, ' ')}
                        </p>
                        <button onClick={() => cycleItem(1)} className="p-3 bg-slate-800 rounded-lg text-white active:scale-95"><KeyboardArrowRight /></button>
                    </div>
                </div>
            )}
        </div>
    );
}