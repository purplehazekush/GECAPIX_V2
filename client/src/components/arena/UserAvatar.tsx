// client/src/components/arena/UserAvatar.tsx
interface UserAvatarProps {
  user?: {
    nome?: string;
    email?: string;
    avatar_slug?: string; // O novo campo
    avatar_layers?: any;  // Mantido para compatibilidade legado
    nivel?: number;
  } | null;
  googlePhoto?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showLevel?: boolean;
}

export default function UserAvatar({ user, googlePhoto, size = 'md', className = '', showLevel = false }: UserAvatarProps) {
  
  // 1. Definição de Tamanhos
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl'
  };

  // 2. Lógica de Resolução da Imagem (Prioridade: Slug > Google > Inicial)
  // Se tiver um slug definido (ex: 'mago'), usa o DiceBear Pixel Art
  const pixelArtUrl = user?.avatar_slug 
    ? `https://api.dicebear.com/9.x/pixel-art/svg?seed=${user.avatar_slug}`
    : null;

  // Fallback para Google Photo se não tiver slug (usuário novo)
  const finalSrc = pixelArtUrl || googlePhoto;
  
  // Inicial do nome para último caso
  const inicial = user?.nome ? user.nome[0].toUpperCase() : '?';

  // 3. Cor da Borda baseada no Nível (Opcional, dá um toque RPG)
  const nivel = user?.nivel || 1;
  let borderColor = 'border-slate-700';
  if (nivel >= 5) borderColor = 'border-cyan-500';
  if (nivel >= 10) borderColor = 'border-purple-500';
  if (nivel >= 20) borderColor = 'border-yellow-500';

  return (
    <div className={`relative inline-block ${className}`}>
      {finalSrc ? (
        <img
          src={finalSrc}
          alt={user?.nome || 'User'}
          className={`${sizeClasses[size]} rounded-full object-cover bg-slate-800 border-2 ${borderColor} shadow-lg`}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-slate-800 border-2 ${borderColor} flex items-center justify-center font-bold text-white shadow-lg`}>
          {inicial}
        </div>
      )}

      {/* Badge de Nível (Opcional) */}
      {showLevel && (
        <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md border border-slate-700 shadow-sm flex items-center gap-0.5">
          <span className="text-yellow-500">LV</span>{nivel}
        </div>
      )}
    </div>
  );
}