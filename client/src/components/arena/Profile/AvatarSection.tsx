import { useState } from 'react';
import { Edit, Casino, CheckCircle } from '@mui/icons-material';

export default function AvatarSection({ user, isEditing, setIsEditing, setAvatarConfig, draftSlug }: any) {
  // Estado local para o "Slug" (A semente do avatar)
  // Se estiver editando, usa o estado local. Se não, usa o do usuário salvo.
  const [localSlug, setLocalSlug] = useState(user?.avatar_slug || 'player1');

  // Gerador de Aleatoriedade
  const randomize = () => {
    const randomSeed = Math.random().toString(36).substring(7); // Ex: "x9z1k"
    const newSlug = `hero-${randomSeed}`;
    setLocalSlug(newSlug);
    setAvatarConfig({ slug: newSlug }); // Já prepara para salvar
  };

  // A LÓGICA MÁGICA:
  // Se estiver editando -> Mostra o localSlug (o que vc tá digitando/rolando)
  // Se NÃO estiver editando -> Mostra o draftSlug (o que vc confirmou mas não salvou)
  // Se não tiver draft -> Mostra o do usuário (banco)
  const currentSlug = isEditing 
      ? localSlug 
      : (draftSlug || user?.avatar_slug || 'default');

  const avatarUrl = `https://api.dicebear.com/9.x/pixel-art/svg?seed=${currentSlug}`;

  return (
    <div className="flex flex-col items-center gap-6">

      {/* CARD DO AVATAR */}
      <div className="relative group">
        <div className={`
          w-48 h-48 rounded-full bg-slate-900 border-4 overflow-hidden relative z-10 transition-all duration-300
          ${isEditing ? 'border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.4)] scale-105' : 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]'}
        `}>
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-full h-full object-cover bg-slate-800"
          />

          {/* Botão de Editar (Modo Visualização) */}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute bottom-2 right-2 bg-yellow-500 text-slate-900 p-2 rounded-full shadow-lg hover:scale-110 transition-transform z-20"
            >
              <Edit />
            </button>
          )}
        </div>
      </div>

      {/* PAINEL DE EDIÇÃO */}
      {isEditing ? (
        <div className="w-full bg-slate-900/80 p-6 rounded-3xl border border-yellow-500/30 animate-fade-in text-center space-y-4">
          <h3 className="text-yellow-400 font-black uppercase text-sm tracking-widest">Personalize seu Hero</h3>

          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <input
              value={localSlug}
              onChange={(e) => {
                setLocalSlug(e.target.value);
                setAvatarConfig({ slug: e.target.value });
              }}
              className="bg-transparent text-white font-mono text-center w-full outline-none text-sm"
              placeholder="Digite um nome..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={randomize}
              className="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl text-white font-bold text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
            >
              <Casino fontSize="small" /> Aleatório
            </button>
          </div>

          {/* ADICIONE ISTO AQUI 👇 */}
          <button
            onClick={() => setIsEditing(false)}
            className="w-full mt-3 bg-emerald-500 hover:bg-emerald-400 py-3 rounded-xl text-slate-900 font-bold text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
          >
            <CheckCircle fontSize="small" /> CONFIRMAR ESTILO
          </button>

          <p className="text-[10px] text-slate-500">
            Cada nome gera um visual único. Existem bilhões de combinações.
          </p>
        </div>
      ) : (
        /* STATUS DE VISUALIZAÇÃO */
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black italic text-white uppercase tracking-wider">
            {user?.nome?.split(' ')[0] || 'Recruta'}
          </h2>
          <div className="flex justify-center gap-2">
            <span className="text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
              {user?.classe || 'Novato'}
            </span>
            <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
              Nível {user?.nivel || 1}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}