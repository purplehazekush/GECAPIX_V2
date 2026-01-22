
// Tipos
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
}

// Filtros de Cor (Tintura)
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

export default function AvatarPixel({ layers, size = 200, className = '' }: AvatarPixelProps) {
  
  // --- A CIÊNCIA EXATA DO LPC ---
  const FRAME_SIZE = 64;   
  const SHEET_WIDTH = 832; 
  const SHEET_HEIGHT = 1344;
  
  // Linha 10 (Começando do 0) = Walk South (Frente)
  // 10 * 64px = 640px. Negativo porque o background sobe.
  const ROW_Y = -640; 

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
        className="absolute inset-0 pointer-events-none" // Garante que não interfere no clique
        style={{ zIndex }}
      >
        <div 
            className="animate-walk-x"
            style={{
                width: `${FRAME_SIZE}px`,
                height: `${FRAME_SIZE}px`,
                backgroundImage: `url(/assets/avatar/${folder}/${cleanFile}.png)`,
                backgroundRepeat: 'no-repeat',
                
                // Mapeamento
                backgroundSize: `${SHEET_WIDTH}px ${SHEET_HEIGHT}px`,
                
                // Posição Y FIXA (Não animamos o Y, só o X)
                backgroundPositionY: `${ROW_Y}px`,
                // Posição X INICIAL
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
      }}
    >
        {/* Fundo (Cenário) */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-950 opacity-90" />
        
        {/* MÁSCARA RÍGIDA DE 64x64 */}
        <div 
            style={{ 
                width: `${FRAME_SIZE}px`, 
                height: `${FRAME_SIZE}px`, 
                position: 'relative',
                overflow: 'hidden', // ISSO MATA O CORPO TRIPLICADO
                transform: `scale(${scale * 0.9}) translateY(5px)`, 
                transformOrigin: 'center center',
            }}
        >
            {/* Ordem de Camadas (Corrigida) */}
            {renderLayer('body', layers.body, 10)}
            {renderLayer('head', layers.head, 15)} 
            {renderLayer('feet', layers.feet, 20)}
            {renderLayer('legs', layers.legs, 30)}
            {renderLayer('torso', layers.torso, 40)}
            {renderLayer('hair', layers.hair, 50)}
            {renderLayer('accessory', layers.accessory, 55)} 
            {renderLayer('hand_r', layers.hand_r, 60)}
        </div>

        {/* Animação: Move APENAS o Eixo X */}
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