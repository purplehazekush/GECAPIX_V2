import { useState } from 'react';
import AvatarPixel from '../AvatarPixel'; 
import AVATAR_ASSETS from '../../../data/avatarAssets.json';
import { Edit, KeyboardArrowLeft, KeyboardArrowRight, Check, Shuffle } from '@mui/icons-material';
import type { User } from '../../../context/AuthContext';

interface Props {
    user: User | null;
    avatarConfig: any; // Aceita objetos { id, color } ou strings
    setAvatarConfig: (config: any) => void;
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
}

// Mapeamento amigável para o usuário
const CATEGORIES = [
    { id: 'body', label: 'Corpo' },
    { id: 'head', label: 'Cabeça' },
    { id: 'hair', label: 'Cabelo' },
    { id: 'torso', label: 'Roupa' },
    { id: 'legs', label: 'Calça' },
    { id: 'feet', label: 'Pés' },
    { id: 'accessory', label: 'Extra' },
    { id: 'hand_r', label: 'Mão' }
];

// Categorias que permitem pintura (CSS Filter)
const COLORABLE_CATEGORIES = ['hair', 'torso', 'legs', 'feet'];

// Paleta de Cores Disponíveis
const COLORS = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gold', 'brown'];

const CLASSES_COLORS: Record<string, string> = {
    'Mago': 'border-purple-500 bg-purple-500/20 text-purple-300',
    'Vampiro': 'border-red-600 bg-red-600/20 text-red-300',
    'Atleta': 'border-yellow-500 bg-yellow-500/20 text-yellow-300',
    'Cientista': 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
};

export default function AvatarSection({ user, avatarConfig, setAvatarConfig, isEditing, setIsEditing }: Props) {
    const [activeTab, setActiveTab] = useState('hair');

    // --- HELPER FUNCTIONS (Lidam com string ou objeto {id, color}) ---
    
    const getId = (item: any) => (typeof item === 'string' ? item : item?.id);
    const getColor = (item: any) => (typeof item === 'string' ? 'white' : item?.color || 'white');

    // Atualiza uma camada específica
    const updateLayer = (key: string, newValue: any) => {
        setAvatarConfig((prev: any) => ({ ...prev, [key]: newValue }));
    };

    // Formata o nome para exibição (Remove male_, female_, underlines)
    const formatName = (name: string) => {
        if (!name || name === 'none') return 'Nenhum';
        return name
            .replace(/_/g, ' ')
            .replace('male ', '')
            .replace('female ', '')
            .replace('f ', '')
            .replace('m ', '')
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize
    };

    // --- NAVEGAÇÃO DE ITENS ---
    const cycleItem = (direction: number) => {
        // @ts-ignore
        const items = AVATAR_ASSETS[activeTab] || [];
        
        if (!items.length) {
            console.warn(`Categoria vazia: ${activeTab}`);
            return;
        }

        // Pega o ID atual (mesmo que esteja dentro de um objeto)
        const currentId = getId(avatarConfig[activeTab]);
        let index = items.indexOf(currentId);
        
        if (index === -1) index = 0;

        let newIndex = index + direction;
        
        // Loop infinito
        if (newIndex >= items.length) newIndex = 0;
        if (newIndex < 0) newIndex = items.length - 1;

        const newItemId = items[newIndex];

        // Se a categoria for pintável, preservamos a cor atual ao trocar o item!
        if (COLORABLE_CATEGORIES.includes(activeTab)) {
            const currentColor = getColor(avatarConfig[activeTab]);
            updateLayer(activeTab, { id: newItemId, color: currentColor });
        } else {
            updateLayer(activeTab, newItemId);
        }
    };

    // --- MUDANÇA DE COR ---
    const setColor = (color: string) => {
        if (!COLORABLE_CATEGORIES.includes(activeTab)) return;

        const currentId = getId(avatarConfig[activeTab]);
        // Salva como objeto { id: 'shirt', color: 'red' }
        updateLayer(activeTab, { id: currentId, color });
    };

    // --- GERAÇÃO ALEATÓRIA ---
    const randomize = () => {
        const newConfig: any = {};
        
        // 1. Corpo Aleatório
        // @ts-ignore
        const bodies = AVATAR_ASSETS.body || [];
        const randomBody = bodies.length > 0 ? bodies[Math.floor(Math.random() * bodies.length)] : 'male_light';
        newConfig.body = randomBody;

        // 2. Cabeça Compatível (Se corpo for f_, cabeça tem que ser f_)
        const genderPrefix = randomBody.startsWith('f_') ? 'f_' : 'm_';
        // @ts-ignore
        const heads = (AVATAR_ASSETS.head || []).filter((h: string) => h.startsWith(genderPrefix));
        // Se não achar cabeça especifica, pega qualquer uma ou a primeira
        newConfig.head = heads.length > 0 ? heads[Math.floor(Math.random() * heads.length)] : (heads[0] || 'none');

        // 3. Outros itens (com Cores Aleatórias)
        ['hair', 'torso', 'legs', 'feet', 'accessory', 'hand_r'].forEach(cat => {
            // @ts-ignore
            const items = AVATAR_ASSETS[cat] || [];
            if (items.length > 0) {
                const item = items[Math.floor(Math.random() * items.length)];
                
                // Se for categoria pintável, adiciona cor aleatória
                if (COLORABLE_CATEGORIES.includes(cat)) {
                    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    newConfig[cat] = { id: item, color };
                } else {
                    newConfig[cat] = item;
                }
            } else {
                newConfig[cat] = 'none';
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
                                    {/* Exibe o nome formatado do ID atual */}
                                    {formatName(getId(avatarConfig[activeTab]))}
                                </p>
                                {/* Contador */}
                                <p className="text-[9px] text-slate-600 mt-1">
                                    {/* @ts-ignore */}
                                    {(AVATAR_ASSETS[activeTab]?.indexOf(getId(avatarConfig[activeTab])) + 1 || 0)} / {/* @ts-ignore */}
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

                    {/* 3. PALETA DE CORES (Novo!) */}
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
                                                : 'border-slate-600 hover:scale-110 hover:border-slate-400'
                                            }
                                        `}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <p className="text-[10px] text-center text-slate-500 mt-6 italic">
                        Não esqueça de clicar em "Salvar Alterações" lá embaixo!
                    </p>
                </div>
            )}
        </div>
    );
}