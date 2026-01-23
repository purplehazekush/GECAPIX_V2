// client/src/components/arena/Chat/Avatar3D.tsx
import { AvatarCreator, type AvatarCreatorConfig } from '@readyplayerme/react-avatar-creator'; // Para editar
import { useState } from 'react';
import { Close } from '@mui/icons-material';

interface Avatar3DProps {
  avatarUrl: string | undefined;
  onAvatarExported?: (url: string) => void;
  editable?: boolean;
  size?: number; // Tamanho em px
}

export default function Avatar3D({ avatarUrl, onAvatarExported, editable = false, size = 120 }: Avatar3DProps) {
  const [showEditor, setShowEditor] = useState(false);

  // URL Padrão se o usuário não tiver avatar (Um boneco cinza genérico)
  const displayUrl = avatarUrl || "https://models.readyplayer.me/64b73e0e7a25697664614fa1.glb"; 

  const config: AvatarCreatorConfig = {
    clearCache: true,
    bodyType: 'fullbody',
    quickStart: false,
    language: 'pt',
  };

  const handleExport = (event: any) => {
    // Quando o usuário termina de criar, recebemos a URL nova
    if (onAvatarExported) {
      onAvatarExported(event.data.url);
    }
    setShowEditor(false);
  };

  return (
    <>
      {/* 1. O EDITOR (Abre em tela cheia) */}
      {showEditor && (
        <div className="fixed inset-0 z-[9999] bg-black animate-fade-in">
            <button 
                onClick={() => setShowEditor(false)}
                className="absolute top-4 right-4 z-50 bg-white/10 p-2 rounded-full text-white hover:bg-red-500 transition-colors"
            >
                <Close />
            </button>
            <AvatarCreator 
                subdomain="demo" // Idealmente, crie uma conta no readyplayer.me para ter seu subdomínio
                config={config} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                onAvatarExported={handleExport} 
            />
        </div>
      )}

      {/* 2. A VISUALIZAÇÃO (O boneco no perfil) */}
      <div 
        className="relative group cursor-pointer transition-transform hover:scale-105"
        style={{ width: size, height: size }}
        onClick={() => editable && setShowEditor(true)}
      >
        {/* Borda/Moldura baseada em CSS (Aqui entraria a lógica de evolução!) */}
        <div className="absolute inset-0 rounded-full border-4 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.4)] z-10 pointer-events-none"></div>
        
        {/* O Avatar Renderizado como Imagem 2D (Mais leve que carregar o modelo 3D inteiro) */}
        {/* O parâmetro ?scene=fullbody-portrait-v1-transparent recorta o fundo e foca no busto */}
        <img 
            src={`${displayUrl.replace('.glb', '.png')}?scene=fullbody-portrait-v1-transparent`}
            className="w-full h-full object-cover rounded-full bg-slate-800"
            alt="Avatar 3D"
        />

        {editable && (
            <div className="absolute bottom-0 right-0 bg-cyan-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-20 shadow-lg uppercase">
                Editar
            </div>
        )}
      </div>
    </>
  );
}