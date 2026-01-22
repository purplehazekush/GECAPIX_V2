import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MonetizationOn, Star } from '@mui/icons-material';

export default function ArenaLayout() {
  const { dbUser, user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 pb-24 text-slate-100 font-sans">
       {/* BARRA DE TOPO (HUD) */}
       <nav className="px-4 py-3 flex justify-between items-center bg-slate-900/80 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50 shadow-lg shadow-purple-900/10">
          
          {/* Logo / Título */}
          <div className="flex flex-col">
            <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 text-lg italic tracking-tighter">
                ARENA GECA
            </h1>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                Temporada 2026
            </span>
          </div>

          {/* Status do Jogador (Moedas e Avatar) */}
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-yellow-400 font-mono font-bold text-sm">
                    <MonetizationOn sx={{ fontSize: 16 }} />
                    <span>{dbUser?.saldo_coins || 0}</span>
                </div>
                <div className="flex items-center gap-1 text-purple-400 font-mono text-[10px]">
                    <Star sx={{ fontSize: 10 }} />
                    <span>NVL {dbUser?.nivel || 1}</span>
                </div>
             </div>
             
             <div className="relative">
                <img 
                    src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}&background=random`} 
                    className="w-9 h-9 rounded-lg border-2 border-purple-500/50 shadow-md"
                    alt="Avatar"
                />
                {/* Bolinha de status */}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
             </div>
          </div>
       </nav>

       {/* CONTEÚDO DA PÁGINA (Outlet) */}
       <div className="p-4 animate-fade-in">
          <Outlet />
       </div>

       {/* (Opcional) BOTTOM NAVIGATION AQUI FUTURAMENTE */}
    </div>
  );
}