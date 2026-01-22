

// Agora cada camada pode ter um ID e uma COR
// Ex: torso: { id: 'm_shirt', color: 'red' }
export interface LayerConfig {
    id: string;
    color?: string; // hex ou nome da cor
}

export interface AvatarConfig {
    body?: string; // Corpo geralmente não muda de cor via CSS
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
}

// Mapa de Cores para Filtros CSS
// "Tintar" branco para colorido exige: sepia(1) + saturate + hue-rotate
const COLOR_FILTERS: Record<string, string> = {
    'white': 'none',
    'black': 'brightness(0.2)', // Escurece
    'red': 'sepia(1) saturate(5) hue-rotate(-50deg)',
    'blue': 'sepia(1) saturate(5) hue-rotate(180deg)',
    'green': 'sepia(1) saturate(5) hue-rotate(70deg)',
    'yellow': 'sepia(1) saturate(10) hue-rotate(0deg) brightness(1.2)',
    'purple': 'sepia(1) saturate(4) hue-rotate(220deg)',
    'pink': 'sepia(1) saturate(3) hue-rotate(280deg)',
    'gold': 'sepia(1) saturate(3) hue-rotate(10deg) brightness(1.1)',
    'brown': 'sepia(1) saturate(2) hue-rotate(-30deg) brightness(0.7)'
};

export default function AvatarPixel({ layers, size = 200, className = '' }: AvatarPixelProps) {
  
  const scale = size / 64;

  const renderLayer = (folder: string, item: LayerConfig | string | undefined, zIndex: number) => {
    if (!item) return null;

    // Normaliza: Se for string, vira objeto sem cor. Se for objeto, usa ele.
    const layerId = typeof item === 'string' ? item : item.id;
    const layerColor = typeof item === 'string' ? 'white' : (item.color || 'white');

    if (!layerId || layerId === 'none') return null;

    // Remove extensão se tiver
    const cleanFile = layerId.replace('.png', '');
    
    // Pega o filtro da cor
    const filterStyle = COLOR_FILTERS[layerColor] || 'none';

    return (
      <div 
        key={folder}
        className="absolute inset-0"
        style={{ zIndex }}
      >
        <div 
            className="animate-walk"
            style={{
                width: '64px',   
                height: '64px',
                backgroundImage: `url(/assets/avatar/${folder}/${cleanFile}.png)`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: '832px 1344px',
                backgroundPosition: '0px -640px', // Walk South
                imageRendering: 'pixelated',
                
                // APLICA A COR AQUI!
                filter: filterStyle
            }}
        />
      </div>
    );
  };

  return (
    <div 
      className={`relative bg-slate-800 rounded-xl overflow-hidden border-4 border-slate-700 shadow-2xl ${className}`}
      style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-800 to-slate-700 opacity-90" />
        
        <div style={{ 
                width: '64px', height: '64px', position: 'relative',
                transform: `scale(${scale * 0.8}) translateY(5px)`,
                transformOrigin: 'center center'
        }}>
            {/* Camadas Corrigidas */}
            {renderLayer('body', layers.body, 10)}
            {renderLayer('head', layers.head, 15)} {/* AQUI ESTÁ A CABEÇA! */}
            {renderLayer('feet', layers.feet, 20)}
            {renderLayer('legs', layers.legs, 30)}
            {renderLayer('torso', layers.torso, 40)}
            {renderLayer('hair', layers.hair, 50)}
            {renderLayer('accessory', layers.accessory, 55)} 
            {renderLayer('hand_r', layers.hand_r, 60)}
        </div>

        <style>{`
            .animate-walk { animation: walk-cycle 1s steps(9) infinite; }
            @keyframes walk-cycle {
                from { background-position-x: 0px; }
                to { background-position-x: -576px; }
            }
        `}</style>
    </div>
  );
}