// client/src/components/arena/Chat/ChatInput.tsx
import { Send, AttachFile } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

interface ChatInputProps {
  texto: string;
  setTexto: (t: string) => void;
  onSend: () => void;
  onUpload: (e: any) => void;
  loading: boolean;
}

export default function ChatInput({ texto, setTexto, onSend, onUpload, loading }: ChatInputProps) {
  return (
    <div className="bg-slate-900 p-3 border-t border-slate-800 flex items-center gap-2 safe-area-bottom">
      <label className="p-3 bg-slate-800 rounded-xl text-slate-400 cursor-pointer hover:text-cyan-400 active:scale-90 transition-all">
        <AttachFile />
        <input type="file" hidden onChange={onUpload} disabled={loading} accept="image/*,application/pdf" />
      </label>

      <input 
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSend()}
        placeholder="Mensagem anônima..."
        disabled={loading}
        className="flex-1 bg-slate-950 text-white p-3 rounded-xl border border-slate-800 outline-none focus:border-purple-500 transition-colors"
      />

      <button 
        onClick={onSend}
        disabled={loading || (!texto.trim())}
        className="p-3 bg-purple-600 rounded-xl text-white shadow-lg shadow-purple-900/40 active:scale-90 transition-all disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : <Send />}
      </button>
    </div>
  );
}