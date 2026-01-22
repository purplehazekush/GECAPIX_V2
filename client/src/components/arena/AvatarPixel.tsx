import { useMemo } from 'react';

// Definição das camadas e configurações
export interface LayerConfig {
    id: string;      // Nome do arquivo (ex: 'm_shirt')
    color?: string;  // Cor para pintar (ex: 'red')
}

export interface AvatarConfig {
    body?: string;
    head?: string;   // A cabeça é separada do corpo!
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

// Filtros de Cor (Tintura CSS)
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
  
  // --- A MATEMÁTICA SAGRADA DO LPC ---
  const FRAME_SIZE = 64;   // Cada quadro tem 64x64
  const SHEET_WIDTH = 832; // Largura total da folha (13 colunas)
  const SHEET_HEIGHT = 1344; // Altura total da folha (21 linhas)
  
  // Qual animação mostrar? (Linha 11 = Andar para o Sul/Frente)
  // 10 linhas * 64px = 640px de deslocamento
  const ROW_OFFSET = -640; 

  // Calcula o Zoom necessário para preencher o tamanho que você quer na tela
  const scale = size / FRAME_SIZE;

  const renderLayer = (folder: string, item: LayerConfig | string | undefined, zIndex: number) => {
    if (!item) return null;

    // Normaliza input (string ou objeto)
    const layerId = typeof item === 'string' ? item : item.id;
    const layerColor = typeof item === 'string' ? 'white' : (item.color || 'white');

    if (!layerId || layerId === 'none') return null;

    // Remove extensão caso venha do JSON
    const cleanFile = layerId.replace('.png', '');
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
                // 1. TAMANHO RÍGIDO (Evita triplicar)
                width: `${FRAME_SIZE}px`,
                height: `${FRAME_SIZE}px`,
                
                // 2. IMAGEM
                backgroundImage: `url(/assets/avatar/${folder}/${cleanFile}.png)`,
                backgroundRepeat: 'no-repeat', // CRUCIAL: Não deixa repetir!
                
                // 3. POSICIONAMENTO NO MAPA (Sprite Sheet)
                backgroundSize: `${SHEET_WIDTH}px ${SHEET_HEIGHT}px`,
                backgroundPosition: `0px ${ROW_OFFSET}px`, 
                
                // 4. ESTILO
                imageRendering: 'pixelated', // Mantém o pixel art nítido
                filter: filterStyle
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
      }}
    >
        {/* Fundo Decorativo */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-800 to-slate-700" />
        
        {/* CONTAINER "JANELA" (Viewport)
            Aqui acontece a mágica. É uma janela de 64x64 que damos zoom.
        */}
        <div 
            style={{ 
                width: `${FRAME_SIZE}px`, 
                height: `${FRAME_SIZE}px`, 
                position: 'relative',
                // Damos zoom e jogamos um pouco pra baixo pra centralizar visualmente
                transform: `scale(${scale * 0.85}) translateY(5px)`, 
                transformOrigin: 'center center',
            }}
        >
            {/* --- ORDEM DAS CAMADAS (Quem fica em cima de quem) --- */}
            
            {/* 1. Base */}
            {renderLayer('body', layers.body, 10)}
            {renderLayer('head', layers.head, 11)} {/* A CABEÇA ESTÁ AQUI! */}

            {/* 2. Roupas de Baixo */}
            {renderLayer('feet', layers.feet, 20)}
            {renderLayer('legs', layers.legs, 30)}
            {renderLayer('torso', layers.torso, 40)}
            
            {/* 3. Cabelo e Topo */}
            {renderLayer('hair', layers.hair, 50)}
            {renderLayer('accessory', layers.accessory, 55)} 
            
            {/* 4. Mãos */}
            {renderLayer('hand_r', layers.hand_r, 60)}
        </div>

        {/* Animação CSS Injetada */}
        <style>{`
            .animate-walk {
                /* 9 frames de 64px = 576px total de deslocamento X */
                animation: walk-cycle 1s steps(9) infinite;
            }
            @keyframes walk-cycle {
                from { background-position-x: 0px; }
                to { background-position-x: -576px; } 
            }
        `}</style>
    </div>
  );
}