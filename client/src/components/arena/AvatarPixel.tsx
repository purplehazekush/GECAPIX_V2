
export interface LayerConfig {
    id: string;      
    color?: string;  
}

export interface AvatarConfig {
    body?: string;
    head?: string;
    eyes?: string;   // NOVO: Olhos
    beard?: LayerConfig | string; // NOVO: Barba (pintável)
    hair?: LayerConfig | string;
    torso?: LayerConfig | string;
    accessory?: LayerConfig | string;
    // Removemos legs/feet/hand_r do frontend para simplificar
}

interface AvatarPixelProps {
    layers: AvatarConfig;
    size?: number; 
    className?: string;
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
    'brown': 'sepia(1) saturate(2) hue-rotate(-30deg) brightness(0.7)',
    'orange': 'sepia(1) saturate(6) hue-rotate(-30deg)',
    'teal': 'sepia(1) saturate(4) hue-rotate(140deg)'
};

export default function AvatarPixel({ layers, size = 200, className = '' }: AvatarPixelProps) {
  
  const FRAME_SIZE = 64;   
  const SHEET_WIDTH = 832; 
  const SHEET_HEIGHT = 1344;
  const ROW_Y = -640; // Linha 11 (Walk South)

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
            className="animate-walk-x"
            style={{
                width: `${FRAME_SIZE}px`,
                height: `${FRAME_SIZE}px`,
                backgroundImage: `url(/assets/avatar/${folder}/${cleanFile}.png)`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${SHEET_WIDTH}px ${SHEET_HEIGHT}px`,
                backgroundPositionY: `${ROW_Y}px`,
                backgroundPositionX: '0px',
                imageRendering: 'pixelated',
                filter: filterStyle
            }}
        />
      </div>
    );
  };

  return (
    <div 
      className={`relative bg-slate-900 rounded-xl border-4 border-slate-700 shadow-2xl overflow-hidden ${className}`}
      style={{ 
          width: size, 
          height: size,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-950 opacity-90" />
        
        {/* VIEWPORT FIXO 64x64 */}
        <div 
            style={{ 
                width: `${FRAME_SIZE}px`, 
                height: `${FRAME_SIZE}px`, 
                position: 'relative',
                overflow: 'hidden',
                transform: `scale(${scale * 0.9}) translateY(5px)`, 
                transformOrigin: 'center center',
            }}
        >
            {/* 1. Base */}
            {renderLayer('body', layers.body, 10)}
            {renderLayer('head', layers.head, 15)}
            {renderLayer('eyes', layers.eyes, 16)} {/* OLHOS! */}
            
            {/* 2. Pelos Faciais (Abaixo do cabelo, acima da cabeça) */}
            {renderLayer('beard', layers.beard, 17)} 

            {/* 3. Roupas */}
            {renderLayer('torso', layers.torso, 40)}
            
            {/* 4. Topo */}
            {renderLayer('hair', layers.hair, 50)}
            {renderLayer('accessory', layers.accessory, 55)} 
        </div>

        <style>{`
            .animate-walk-x { animation: walk-cycle-x 1s steps(9) infinite; }
            @keyframes walk-cycle-x { from { background-position-x: 0px; } to { background-position-x: -576px; } }
        `}</style>
    </div>
  );
}