
interface AvatarLayers {
  body?: string;
  head?: string; // NOVO: Cabeça separada
  hair?: string;
  torso?: string;
  legs?: string;
  feet?: string;
  accessory?: string; // NOVO: Acessórios/Cadeira
  hand_r?: string;
  [key: string]: string | undefined;
}

interface AvatarPixelProps {
  layers: AvatarLayers;
  size?: number; 
  className?: string;
}

export default function AvatarPixel({ layers, size = 200, className = '' }: AvatarPixelProps) {
  
  // FATOR DE ESCALA: Transforma os 64px originais no tamanho desejado
  const scale = size / 64;

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
                width: '64px',   
                height: '64px',
                backgroundImage: `url(/assets/avatar/${folder}/${cleanFile}.png)`,
                backgroundRepeat: 'no-repeat',
                
                // CALIBRAÇÃO CIENTÍFICA (LPC STANDARD)
                // Folha Completa = 832x1344
                backgroundSize: '832px 1344px',
                
                // Posição: Movemos a imagem para mostrar a Linha 11 (Walk Cycle - South)
                // Y = -640px (10 linhas * 64px)
                backgroundPosition: '0px -640px',
                
                imageRendering: 'pixelated'
            }}
        />
      </div>
    );
  };

  return (
    <div 
      className={`relative bg-slate-800 rounded-xl overflow-hidden border-4 border-slate-700 shadow-2xl ${className}`}
      style={{ 
          width: size, 
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
      }}
    >
        {/* Cenário */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-800 to-slate-700 opacity-90" />
        
        {/* VIEWPORT (A janela de 64x64) */}
        <div 
            style={{ 
                width: '64px', 
                height: '64px', 
                position: 'relative',
                transform: `scale(${scale * 0.8}) translateY(5px)`, // Zoom de 80% do box pra caber folga
                transformOrigin: 'center center',
                
                // DEBUG: Descomente para ver o quadrado vermelho de alinhamento
                // border: '1px solid red' 
            }}
        >
            {/* ORDEM DAS CAMADAS (Importante para não ficar roupa atrás do corpo) */}
            
            {/* 1. Corpo Base e Cadeira de Rodas (Geralmente atrás) */}
            {renderLayer('body', layers.body, 10)}
            
            {/* 2. Cabeça (Obrigatório se o corpo for modular) */}
            {renderLayer('head', layers.head, 15)} 

            {/* 3. Olhos e Rosto (Se tivermos assets separados no futuro) */}
            
            {/* 4. Roupas de Baixo */}
            {renderLayer('feet', layers.feet, 20)}
            {renderLayer('legs', layers.legs, 30)}
            {renderLayer('torso', layers.torso, 40)}
            
            {/* 5. Cabelo e Acessórios */}
            {renderLayer('hair', layers.hair, 50)}
            {renderLayer('accessory', layers.accessory, 55)} 
            
            {/* 6. Mãos/Armas */}
            {renderLayer('hand_r', layers.hand_r, 60)}
        </div>

        <style>{`
            .animate-walk {
                animation: walk-cycle 1s steps(9) infinite;
            }
            @keyframes walk-cycle {
                from { background-position-x: 0px; }
                to { background-position-x: -576px; } /* 9 frames */
            }
        `}</style>
    </div>
  );
}