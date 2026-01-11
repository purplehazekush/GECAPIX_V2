import { LockClock } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export default function Blocked() {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
      <div className="glass-panel p-8 rounded-2xl text-center border border-yellow-500/30 max-w-sm w-full">
        
        <div className="flex justify-center mb-4">
             <LockClock sx={{ fontSize: 60, color: '#eab308' }} />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Acesso em Análise</h2>
        
        <p className="text-slate-400 text-sm mb-6">
          Olá, <b>{user?.displayName}</b>.<br/>
          Sua conta foi criada, mas precisa ser aprovada por um administrador antes de acessar o sistema.
        </p>

        <div className="bg-slate-900/50 p-3 rounded mb-6 border border-slate-700">
            <p className="text-xs text-slate-500 font-mono">Status: PENDENTE</p>
            <p className="text-xs text-yellow-500 font-mono mt-1 break-all">{user?.email}</p>
        </div>

        <button 
          onClick={() => logout()} 
          className="text-red-400 text-sm hover:text-red-300 transition-colors border-b border-red-400/30 pb-0.5 hover:border-red-300"
        >
          Sair e tentar outra conta
        </button>
      </div>
    </div>
  );
}