import { PictureAsPdf, Download } from '@mui/icons-material';

interface MessageBubbleProps {
  msg: any;
  souEu: boolean;
  onImageClick: (url: string) => void;
}

export default function MessageBubble({ msg, souEu, onImageClick }: MessageBubbleProps) {
  return (
    <div className={`flex flex-col ${souEu ? 'items-end' : 'items-start'} animate-fade-in`}>
      {/* Nome Fake */}
      <span className="text-[9px] text-slate-500 font-bold uppercase mb-1 px-1">
        {msg.autor_fake}
      </span>
      
      {/* Balão */}
      <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
        souEu 
        ? 'bg-purple-600 text-white rounded-tr-none' 
        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
      }`}>
        {msg.texto && <p className="whitespace-pre-wrap break-words">{msg.texto}</p>}
        
        {/* Anexos */}
        {msg.arquivo_url && (
          <div className="mt-2">
            {msg.tipo_arquivo === 'imagem' ? (
              <img 
                src={msg.arquivo_url} 
                onClick={() => onImageClick(msg.arquivo_url)}
                className="rounded-lg max-h-48 w-full object-cover border border-black/20 cursor-pointer hover:opacity-90 transition-opacity" 
                alt="anexo"
              />
            ) : (
              <a 
                href={msg.arquivo_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-black/20 p-3 rounded-xl hover:bg-black/40 transition-colors border border-white/10"
              >
                <div className="bg-red-500/20 p-2 rounded-lg text-red-400">
                  <PictureAsPdf fontSize="small" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold underline decoration-slate-500">Documento PDF</span>
                  <span className="text-[9px] opacity-70">Clique para baixar</span>
                </div>
                <Download fontSize="small" className="opacity-50 ml-auto" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}