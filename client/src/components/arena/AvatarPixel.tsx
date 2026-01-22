
// Tipagem das camadas
interface AvatarLayers {
  body?: string;
  hair?: string;
  torso?: string;
  legs?: string;
  feet?: string;
  hand_r?: string;
  [key: string]: string | undefined; // Flexibilidade extra
}

interface AvatarPixelProps {
  layers: AvatarLayers;
  size?: number; 
  className?: string;
}

export default function AvatarPixel({ layers, size = 160, className = '' }: AvatarPixelProps) {
  
  const renderLayer = (folder: string, file: string | undefined, zIndex: number) => {
    if (!file || file === 'none') return null;
    
    return (
      <div 
        className="absolute inset-0"
        style={{ zIndex }}
      >
        <div 
            className="w-full h-full animate-sprite"
            style={{
                backgroundImage: `url(/assets/avatar/${folder}/${file}.png)`,
                backgroundRepeat: 'no-repeat',
                // CONFIGURAÇÃO TÉCNICA LPC WALK CYCLE:
                // As tiras de 'walk' têm 4 linhas: Cima, Esquerda, BAIXO, Direita.
                // Queremos a linha de BAIXO (Frente), que começa no pixel 128 (64px * 2).
                backgroundPosition: '0 -128px', 
                
                // Tamanho total da tira: 9 quadros de largura (576px) x 4 linhas de altura (256px)
                backgroundSize: '576px 256px', 
                
                imageRendering: 'pixelated'
            }}
        />
      </div>
    );
  };

  return (
    <div 
      className={`relative bg-slate-800 rounded-xl overflow-hidden border-4 border-slate-700 shadow-2xl ${className}`}
      style={{ width: size, height: size }}
    >
        {/* Cenário de Fundo (Pode ser customizável no futuro) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-900 to-slate-800 opacity-90" />
        
        {/* Efeito de chão/sombra */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-2/3 h-4 bg-black/50 rounded-full blur-sm" />

        {/* CSS da Animação */}
        <style>{`
            .animate-sprite {
                /* 9 steps porque o walk cycle tem 9 quadros */
                animation: walk-cycle 1s steps(9) infinite;
            }
            @keyframes walk-cycle {
                from { background-position-x: 0px; }
                to { background-position-x: -576px; }
            }
        `}</style>

        {/* CONTAINER COM ZOOM */}
        {/* O boneco original é pequeno (64px). Damos um zoom de 2x ou 2.5x para preencher o quadro */}
        <div className="w-full h-full relative transform scale-[2.5] origin-bottom translate-y-[-10px]"> 
            {renderLayer('body', layers.body || 'light', 10)}
            {renderLayer('feet', layers.feet || 'shoes', 20)}
            {renderLayer('legs', layers.legs || 'pants', 30)}
            {renderLayer('torso', layers.torso || 'shirt', 40)}
            {renderLayer('hair', layers.hair || 'messy', 50)}
            {renderLayer('hand_r', layers.hand_r, 60)}
        </div>
    </div>
  );
}