import { useState } from 'react';
import AvatarPixel from '../AvatarPixel'; // Caminho relativo, ajuste se necessário
import AVATAR_ASSETS from '../../../data/avatarAssets.json'; // Ajuste o caminho se necessário
import { Edit, KeyboardArrowLeft, KeyboardArrowRight, Check, Shuffle } from '@mui/icons-material';
import type { User } from '../../../context/AuthContext';

interface Props {
    user: User | null;
    avatarConfig: any;
    setAvatarConfig: (config: any) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
}

// Mapeamento amigável para o usuário
const CATEGORIES = [
    { id: 'body', label: 'Corpo' },
    { id: 'hair', label: 'Cabelo' },
    { id: 'torso', label: 'Roupa' },
    { id: 'legs', label: 'Calça' },
    { id: 'feet', label: 'Botas' },
    { id: 'hand_r', label: 'Arma' }
];

const CLASSES_COLORS: Record<string, string> = {
    'Mago': 'border-purple-500 bg-purple-500/20 text-purple-300',
    'Vampiro': 'border-red-600 bg-red-600/20 text-red-300',
    'Atleta': 'border-yellow-500 bg-yellow-500/20 text-yellow-300',
    'Cientista': 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
};

export default function AvatarSection({ user, avatarConfig, setAvatarConfig, isEditing, setIsEditing }: Props) {
    const [activeTab, setActiveTab] = useState('hair');

    // Função para limpar nomes feios (ex: "male_messy_raven" -> "Messy Raven")
    const formatName = (name: string) => {
        if (!name || name === 'none') return 'Nenhum';
        return name
            .replace(/_/g, ' ')
            .replace('male ', '')
            .replace('female ', '')
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize
    };

    // Navegar nos itens
    const cycleItem = (direction: number) => {
        // @ts-ignore
        const items = AVATAR_ASSETS[activeTab] || [];
        
        // Se a categoria estiver vazia ou não existir no JSON
        if (!items.length) {
            console.warn(`Categoria vazia: ${activeTab}`);
            return;
        }

        const current = avatarConfig[activeTab];
        let index = items.indexOf(current);
        
        // Se o item atual não for achado (bug), volta pro primeiro
        if (index === -1) index = 0;

        let newIndex = index + direction;
        
        // Loop infinito
        if (newIndex >= items.length) newIndex = 0;
        if (newIndex < 0) newIndex = items.length - 1;

        setAvatarConfig((prev: any) => ({ 
            ...prev, 
            [activeTab]: items[newIndex] 
        }));
    };

    // Função "Aleatório" para indecisos
    const randomize = () => {
        const newConfig: any = { ...avatarConfig };
        CATEGORIES.forEach(cat => {
            // @ts-ignore
            const items = AVATAR_ASSETS[cat.id];
            if (items && items.length > 0) {
                const randomItem = items[Math.floor(Math.random() * items.length)];
                newConfig[cat.id] = randomItem;
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
                
                {/* Botão Flutuante de Editar */}
                <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`absolute -bottom-3 -right-3 p-3 rounded-full shadow-lg transition-all text-white z-10 flex items-center justify-center
                        ${isEditing 
                            ? 'bg-green-500 hover:bg-green-600 rotate-0' 
                            : 'bg-cyan-600 hover:scale-110 hover:bg-cyan-500'
                        }`}
                >
                    {isEditing ? <Check /> : <Edit fontSize="small" />}
                </button>

                {/* Botão Randomize (Só aparece editando) */}
                {isEditing && (
                    <button 
                        onClick={randomize}
                        className="absolute top-2 right-2 p-2 bg-slate-900/80 rounded-full text-purple-400 hover:text-white hover:bg-purple-600 transition-all z-10"
                        title="Gerar Aleatório"
                    >
                        <Shuffle fontSize="small" />
                    </button>
                )}
            </div>

            {/* INFO BÁSICA (SÓ QUANDO NÃO ESTÁ EDITANDO) */}
            {!isEditing && (
                <div className="text-center mt-6 animate-fade-in">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-lg">{user?.nome}</h1>
                    
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <span className="bg-slate-900 text-slate-400 text-xs font-mono px-3 py-1 rounded-full border border-slate-700 shadow-inner">
                            Lvl {Math.floor((user?.xp || 0) / 1000)}
                        </span>
                        
                        <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border shadow-lg backdrop-blur-sm ${CLASSES_COLORS[user?.classe || 'Mago'] || 'border-slate-500 bg-slate-800'}`}>
                            {user?.classe || 'Novato'}
                        </span>
                    </div>
                </div>
            )}

            {/* EDITOR (SÓ QUANDO ESTÁ EDITANDO) */}
            {isEditing && (
                <div className="w-full mt-8 animate-slide-up">
                    
                    {/* 1. Abas de Categoria */}
                    <div className="flex overflow-x-auto gap-2 pb-4 px-2 no-scrollbar mask-gradient-x">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all shadow-sm
                                    ${activeTab === cat.id 
                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white scale-105 ring-2 ring-purple-400/50' 
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* 2. Controle de Seleção */}
                    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50 shadow-xl mt-2">
                        <div className="flex items-center justify-between gap-4">
                            
                            {/* Botão Anterior */}
                            <button 
                                onClick={() => cycleItem(-1)} 
                                className="p-4 bg-slate-800 rounded-xl text-white hover:bg-purple-600 hover:scale-105 active:scale-95 transition-all shadow-lg"
                            >
                                <KeyboardArrowLeft />
                            </button>
                            
                            {/* Nome do Item */}
                            <div className="flex-1 text-center overflow-hidden">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                                    {CATEGORIES.find(c => c.id === activeTab)?.label}
                                </p>
                                <p className="text-sm text-cyan-400 font-bold truncate px-2 font-mono">
                                    {/* @ts-ignore */}
                                    {formatName(avatarConfig[activeTab])}
                                </p>
                                {/* Contador (Opcional, pra saber onde está) */}
                                <p className="text-[9px] text-slate-600 mt-1">
                                    {/* @ts-ignore */}
                                    {(AVATAR_ASSETS[activeTab]?.indexOf(avatarConfig[activeTab]) + 1 || 0)} / {/* @ts-ignore */}
                                    {AVATAR_ASSETS[activeTab]?.length || 0}
                                </p>
                            </div>

                            {/* Botão Próximo */}
                            <button 
                                onClick={() => cycleItem(1)} 
                                className="p-4 bg-slate-800 rounded-xl text-white hover:bg-purple-600 hover:scale-105 active:scale-95 transition-all shadow-lg"
                            >
                                <KeyboardArrowRight />
                            </button>
                        </div>
                    </div>
                    
                    <p className="text-[10px] text-center text-slate-500 mt-4 italic">
                        Não esqueça de clicar em "Salvar Alterações" lá embaixo!
                    </p>
                </div>
            )}
        </div>
    );
}