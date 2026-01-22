
interface AvatarLayers {
  body?: string;
  hair?: string;
  torso?: string;
  legs?: string;
  feet?: string;
  hand_r?: string;
  [key: string]: string | undefined;
}

interface AvatarPixelProps {
  layers: AvatarLayers;
  size?: number; // Tamanho FINAL na tela (ex: 200px)
  className?: string;
}

export default function AvatarPixel({ layers, size = 200, className = '' }: AvatarPixelProps) {
  
  // O tamanho original do frame do LPC é sempre 64px
  const ORIGINAL_SIZE = 64;
  
  // Calculamos o Zoom necessário para atingir o tamanho desejado na tela
  const scale = size / ORIGINAL_SIZE;

  const renderLayer = (folder: string, file: string | undefined, zIndex: number) => {
    if (!file || file === 'none') return null;
    const cleanFile = file.replace('.png', '');
    
    return (
      <div 
        key={folder}
        className="absolute inset-0"
        style={{ zIndex }}
      >
        <div 
            className="animate-walk"
            style={{
                width: '64px',   // Largura EXATA de um quadro
                height: '64px',  // Altura EXATA de um quadro
                backgroundImage: `url(/assets/avatar/${folder}/${cleanFile}.png)`,
                backgroundRepeat: 'no-repeat',
                
                // --- CONFIGURAÇÃO LPC FULL SHEET ---
                // Tamanho total da folha padrão
                backgroundSize: '832px 1344px',
                
                // Posição Inicial: Linha 11 (Walk South)
                // X é animado pelo CSS. Y é fixo em -640px.
                backgroundPosition: '0px -640px',
                
                imageRendering: 'pixelated'
            }}
        />
      </div>
    );
  };

  return (
    <div 
      className={`relative bg-slate-800 rounded-xl border-4 border-slate-700 shadow-2xl overflow-hidden ${className}`}
      style={{ 
          width: size, 
          height: size,
          // Centraliza o boneco no container
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
      }}
    >
        {/* Fundo */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-800 to-slate-700 opacity-80" />
        
        {/* O Container de Renderização (A Janela de 64x64) */}
        <div 
            style={{ 
                width: '64px', 
                height: '64px', 
                position: 'relative',
                transform: `scale(${scale * 0.7}) translateY(10px)`, // Zoom e ajusta posição pra baixo
                transformOrigin: 'center center'
            }}
        >
            {/* Camadas */}
            {renderLayer('body', layers.body, 10)}
            {renderLayer('feet', layers.feet, 20)}
            {renderLayer('legs', layers.legs, 30)}
            {renderLayer('torso', layers.torso, 40)}
            {renderLayer('hair', layers.hair, 50)}
            {renderLayer('hand_r', layers.hand_r, 60)}
        </div>

        {/* Animação Global */}
        <style>{`
            .animate-walk {
                animation: walk-cycle 1s steps(9) infinite;
            }
            @keyframes walk-cycle {
                from { background-position-x: 0px; }
                to { background-position-x: -576px; } /* 9 quadros * 64px */
            }
        `}</style>
    </div>
  );
}