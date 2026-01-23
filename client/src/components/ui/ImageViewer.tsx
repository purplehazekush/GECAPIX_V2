// client/src/components/ui/ImageViewer.tsx
import { Close } from '@mui/icons-material';

interface ImageViewerProps {
  src: string | null;
  onClose: () => void;
}

export default function ImageViewer({ src, onClose }: ImageViewerProps) {
  if (!src) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose} // Clica fora para fechar
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 p-2 rounded-full transition-colors"
      >
        <Close fontSize="large" />
      </button>

      <img 
        src={src} 
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl shadow-black"
        onClick={(e) => e.stopPropagation()} // Clica na imagem não fecha
        alt="Visualização em tela cheia"
      />
    </div>
  );
}