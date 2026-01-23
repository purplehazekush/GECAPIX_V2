import { useState } from 'react';
import { Edit, CheckCircle } from '@mui/icons-material';

// Lista de Personagens Disponíveis (Seeds do DiceBear)
const PERSONAGENS = [
  { id: 'mago', nome: 'O Arcano', desc: 'Sabedoria antiga' },
  { id: 'guerreiro', nome: 'Tanker', desc: 'Força bruta' },
  { id: 'ladino', nome: 'CyberPunk', desc: 'Agilidade digital' },
  { id: 'king', nome: 'Veterano', desc: 'Liderança nata' },
  { id: 'scientist', nome: 'Cientista', desc: 'QI 200+' },
  { id: 'robot', nome: 'Droid', desc: 'Automação total' },
  { id: 'ninja', nome: 'Shadow', desc: 'Silencioso' },
  { id: 'business', nome: 'Trader', desc: 'Foco no lucro' },
  { id: 'student', nome: 'Calouro', desc: 'Apenas começando' },
  { id: 'zombie', nome: 'Madrugador', desc: 'Sem dormir' },
];

export default function AvatarSection({ user, isEditing, setIsEditing, setAvatarConfig }: any) {
  // Estado local para visualização imediata antes de salvar
  const [selectedSlug, setSelectedSlug] = useState(user?.avatar_slug || 'student');

  const handleSelect = (slug: string) => {
    setSelectedSlug(slug);
    // Atualiza o estado pai para quando clicar em "Salvar" no Profile.tsx
    // Nota: Estamos usando o campo 'avatar_slug' no backend agora
    setAvatarConfig({ slug: slug }); 
  };

  const currentSlug = isEditing ? selectedSlug : (user?.avatar_slug || 'student');
  const avatarUrl = `https://api.dicebear.com/9.x/pixel-art/svg?seed=${currentSlug}`;

  return (
    <div className="flex flex-col items-center gap-6">
      
      {/* 1. VISUALIZAÇÃO DO AVATAR (HOLO CARD) */}
      <div className="relative group">
        <div className={`
          w-40 h-40 rounded-full bg-slate-900 border-4 overflow-hidden relative z-10 transition-all duration-500
          ${isEditing ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.3)] scale-110' : 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]'}
        `}>
          <img 
            src={avatarUrl} 
            alt="Avatar" 
            className="w-full h-full object-cover bg-slate-800"
          />
          
          {/* Botão de Editar (Só aparece se não estiver editando) */}
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="absolute bottom-0 right-0 bg-yellow-500 text-slate-900 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
            >
              <Edit />
            </button>
          )}
        </div>

        {/* Efeito de Aura */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity -z-10"></div>
      </div>

      {/* Texto de Status */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black italic text-white uppercase tracking-wider">
           {isEditing ? 'QUEM É VOCÊ?' : (user?.nome?.split(' ')[0] || 'Recruta')}
        </h2>
        <p className="text-xs text-indigo-300 font-mono bg-indigo-500/10 px-3 py-1 rounded-full inline-block border border-indigo-500/20">
           {isEditing ? 'Selecione seu Driver' : `Classe: ${user?.classe || 'Novato'}`}
        </p>
      </div>

      {/* 2. GRID DE SELEÇÃO (Só aparece editando) */}
      {isEditing && (
        <div className="w-full bg-slate-900/50 p-4 rounded-2xl border border-slate-800 animate-fade-in mt-2">
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {PERSONAGENS.map((p) => {
                    const isSelected = selectedSlug === p.id;
                    return (
                        <button
                            key={p.id}
                            onClick={() => handleSelect(p.id)}
                            className={`
                                relative aspect-square rounded-xl overflow-hidden border-2 transition-all active:scale-95 group
                                ${isSelected 
                                    ? 'border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/20 scale-105 z-10' 
                                    : 'border-slate-700 bg-slate-800 opacity-60 hover:opacity-100 hover:border-slate-500'
                                }
                            `}
                        >
                            <img 
                                src={`https://api.dicebear.com/9.x/pixel-art/svg?seed=${p.id}`} 
                                className="w-full h-full object-cover" 
                                alt={p.nome}
                            />
                            {isSelected && (
                                <div className="absolute top-1 right-1 text-yellow-400 bg-slate-900 rounded-full p-0.5 shadow-sm">
                                    <CheckCircle sx={{ fontSize: 12 }} />
                                </div>
                            )}
                            {/* Tooltip simples */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] text-white py-0.5 text-center opacity-0 group-hover:opacity-100 transition-opacity truncate px-1">
                                {p.nome}
                            </div>
                        </button>
                    )
                })}
            </div>
            
            <p className="text-[10px] text-center text-slate-500 mt-4 italic">
                Mais skins serão liberadas em eventos especiais.
            </p>
        </div>
      )}
    </div>
  );
}