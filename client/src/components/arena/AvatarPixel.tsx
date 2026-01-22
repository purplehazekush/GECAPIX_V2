
export interface LayerConfig {
    id: string;      
    color?: string;  
}

export interface AvatarConfig {
    body?: string;
    head?: string;
    hair?: LayerConfig | string;
    torso?: LayerConfig | string;
    legs?: LayerConfig | string;
    feet?: LayerConfig | string;
    accessory?: LayerConfig | string;
    hand_r?: string;
}

interface AvatarPixelProps {
    layers: AvatarConfig;
    size?: number; 
    className?: string;
    // NOVAS PROPS PARA CALIBRAGEM
    debugMode?: boolean; 
    manualOffsetY?: number; // Para calibrar verticalmente
}

const COLOR_FILTERS: Record<string, string> = {
    'white': 'none',
    'black': 'brightness(0.2)',
    'red': 'sepia(1) saturate(5) hue-rotate(-50deg)',
    'blue': 'sepia(1) saturate(5) hue-rotate(180deg)',
    'green': 'sepia(1) saturate(5) hue-rotate(70deg)',
    'yellow': 'sepia(1) saturate(10) hue-rotate(0deg) brightness(1.2)',
    'purple': 'sepia(1) saturate(4) hue-rotate(220deg)',
    'pink': 'sepia(1) saturate(3) hue-rotate(280deg)',
    'gold': 'sepia(1) saturate(3) hue-rotate(10deg) brightness(1.1)',
    'brown': 'sepia(1) saturate(2) hue-rotate(-30deg) brightness(0.7)'
};

export default function AvatarPixel({ layers, size = 200, className = '', debugMode = false, manualOffsetY = -640 }: AvatarPixelProps) {
  
  const FRAME_SIZE = 64;   
  const scale = size / FRAME_SIZE;

  const renderLayer = (folder: string, item: LayerConfig | string | undefined, zIndex: number) => {
    if (!item) return null;
    const layerId = typeof item === 'string' ? item : item.id;
    const layerColor = typeof item === 'string' ? 'white' : (item.color || 'white');
    if (!layerId || layerId === 'none') return null;

    const cleanFile = layerId.replace('.png', '');
    const filterStyle = COLOR_FILTERS[layerColor] || 'none';

    return (
      <div 
        key={folder}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex }}
      >
        <div 
            className={debugMode ? '' : 'animate-walk-x'} // Se tiver debugando, para a animação
            style={{
                width: `${FRAME_SIZE}px`,
                height: `${FRAME_SIZE}px`,
                backgroundImage: `url(/assets/avatar/${folder}/${cleanFile}.png)`,
                backgroundRepeat: 'no-repeat',
                
                // MODO SEGURO: Se a imagem for pequena, isso evita esticar.
                // Se a imagem for Full Sheet (832px), isso mantém o grid.
                backgroundSize: '832px auto', 
                
                // AQUI ESTÁ O SEGREDO: Usamos a prop manualOffsetY para ajustar na tela
                backgroundPosition: `0px ${manualOffsetY}px`,
                
                imageRendering: 'pixelated',
                filter: filterStyle,
                
                // Debug visual
                outline: debugMode ? '1px solid rgba(255,0,0,0.5)' : 'none'
            }}
        />
      </div>
    );
  };

  return (
    <div 
      className={`relative bg-slate-900 rounded-xl border-4 border-slate-700 shadow-2xl ${className}`}
      style={{ 
          width: size, 
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden' // Corta o excesso
      }}
    >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-950 opacity-90" />
        
        {/* VIEWPORT: O Buraco da Fechadura de 64x64 */}
        <div 
            style={{ 
                width: `${FRAME_SIZE}px`, 
                height: `${FRAME_SIZE}px`, 
                position: 'relative',
                transform: `scale(${scale * 0.9}) translateY(5px)`, 
                transformOrigin: 'center center',
                border: debugMode ? '2px solid cyan' : 'none' // Borda da Janela
            }}
        >
            {renderLayer('body', layers.body, 10)}
            {renderLayer('head', layers.head, 15)} 
            {renderLayer('feet', layers.feet, 20)}
            {renderLayer('legs', layers.legs, 30)}
            {renderLayer('torso', layers.torso, 40)}
            {renderLayer('hair', layers.hair, 50)}
            {renderLayer('accessory', layers.accessory, 55)} 
            {renderLayer('hand_r', layers.hand_r, 60)}
        </div>

        <style>{`
            .animate-walk-x {
                animation: walk-cycle-x 1s steps(9) infinite;
            }
            @keyframes walk-cycle-x {
                from { background-position-x: 0px; }
                to { background-position-x: -576px; } 
            }
        `}</style>
    </div>
  );
}