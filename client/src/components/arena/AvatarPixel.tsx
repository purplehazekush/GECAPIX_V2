import { useMemo } from 'react';

export interface LayerConfig {
    id: string;      
    color?: string;  
}

export interface AvatarConfig {
    body?: string;
    head?: string;
    eyes?: string;   
    hair?: LayerConfig | string;
    beard?: LayerConfig | string;
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
    direction?: number; 
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

export default function AvatarPixel({ layers, size = 200, className = '', direction = 2 }: AvatarPixelProps) {
  
  const FRAME_SIZE = 64;   
  const SHEET_WIDTH = 832; 
  const SHEET_HEIGHT = 1344;
  
  // MAPA DE ROTAÇÃO
  const DIRECTION_OFFSETS = {
      0: -512, // Costas (Norte)
      1: -576, // Esquerda (Oeste)
      2: -640, // Frente (Sul)
      3: -704  // Direita (Leste)
  };

  // @ts-ignore
  const currentOffsetY = DIRECTION_OFFSETS[direction] || -640;
  const scale = size / FRAME_SIZE;

  // --- CACHE BUSTER ---
  // Gera um número aleatório (ou usa data) para obrigar o navegador a baixar a imagem nova
  // Usamos useMemo para não ficar piscando a cada render, mas mudar se a layer mudar
  const cacheBuster = useMemo(() => `?v=${new Date().getDate()}`, []); 

  const renderLayer = (folder: string, item: LayerConfig | string | undefined, zIndex: number) => {
    if (!item) return null;
    const layerId = typeof item === 'string' ? item : item.id;
    const layerColor = typeof item === 'string' ? 'white' : (item.color || 'white');
    if (!layerId || layerId === 'none') return null;

    const cleanFile = layerId.replace('.png', '');
    const filterStyle = COLOR_FILTERS[layerColor] || 'none';

    // URL COM VACINA ANTI-CACHE
    const imageUrl = `/assets/avatar/${folder}/${cleanFile}.png${cacheBuster}`;

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
                backgroundImage: `url('${imageUrl}')`, // Aspas importantes
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${SHEET_WIDTH}px ${SHEET_HEIGHT}px`,
                backgroundPositionY: `${currentOffsetY}px`,
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
            {/* CAMADAS NA ORDEM LÓGICA */}
            {renderLayer('body', layers.body, 10)}
            {renderLayer('head', layers.head, 15)}
            {renderLayer('eyes', layers.eyes, 20)}
            {renderLayer('beard', layers.beard, 25)}
            
            {renderLayer('feet', layers.feet, 30)}
            {renderLayer('legs', layers.legs, 40)}
            {renderLayer('torso', layers.torso, 50)}
            
            {renderLayer('hair', layers.hair, 60)}
            {renderLayer('accessory', layers.accessory, 70)} 
        </div>

        <style>{`
            .animate-walk-x { animation: walk-cycle-x 1s steps(9) infinite; }
            @keyframes walk-cycle-x { from { background-position-x: 0px; } to { background-position-x: -576px; } }
        `}</style>
    </div>
  );
}