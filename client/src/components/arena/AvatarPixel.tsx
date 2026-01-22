
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
  size?: number; 
  className?: string;
}

export default function AvatarPixel({ layers, size = 200, className = '' }: AvatarPixelProps) {
  
  const renderLayer = (folder: string, file: string | undefined, zIndex: number) => {
    if (!file || file === 'none') return null;

    // Se o arquivo vier com extensão, removemos para evitar duplicidade na URL
    const cleanFile = file.replace('.png', '');
    const imageUrl = `/assets/avatar/${folder}/${cleanFile}.png`;
    
    return (
      <div 
        key={folder}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex }}
      >
        <div 
            className="w-full h-full animate-walk"
            style={{
                backgroundImage: `url('${imageUrl}')`,
                backgroundRepeat: 'no-repeat',
                
                /* --- A MATEMÁTICA DO LPC --- */
                /* O Sheet completo tem 832px de largura x 1344px de altura */
                backgroundSize: '832px 1344px',
                
                /* A linha de "Andar para Frente" (South) começa no pixel 640 vertical */
                /* background-position: X Y */
                /* X é animado pelo keyframes. Y é fixo na linha 11 (-640px) */
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
      style={{ width: size, height: size }}
    >
        {/* Cenário / Fundo */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-800 to-slate-700" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-black/20 blur-xl" />

        {/* CSS Injetado para Animação */}
        <style>{`
            .animate-walk {
                /* 9 steps = 9 quadros de animação de andar */
                animation: walk-cycle 1.2s steps(9) infinite;
            }
            @keyframes walk-cycle {
                from { background-position-x: 0px; }
                /* 9 quadros * 64px = 576px. Movemos a imagem para a esquerda. */
                to { background-position-x: -576px; }
            }
        `}</style>

        {/* O Container do Boneco */}
        {/* O frame original é 64x64. Damos zoom e centralizamos. */}
        <div className="relative w-full h-full transform scale-[2] translate-y-[-20px]"> 
            {/* Ordem das Camadas (Quem fica por cima de quem) */}
            {renderLayer('body', layers.body, 10)}
            {renderLayer('feet', layers.feet, 20)}
            {renderLayer('legs', layers.legs, 30)}
            {renderLayer('torso', layers.torso, 40)}
            {renderLayer('hair', layers.hair, 50)}
            {renderLayer('hand_r', layers.hand_r, 60)}
        </div>
    </div>
  );
}