// client/src/components/arena/ArenaLayout.tsx
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, EmojiEvents, SwapHorizontalCircle, MonetizationOn, 
  Star, RocketLaunch, Assignment, Biotech 
} from '@mui/icons-material';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import UserAvatar from './UserAvatar'; // <--- IMPORTANTE

export default function ArenaLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dbUser } = useAuth();

  const getTabValue = () => {
    const path = location.pathname;
    if (path.includes('/arena/transferir')) return 1;
    if (path.includes('/arena/ranking')) return 2;
    if (path.includes('/arena/memes')) return 3;
    if (path.includes('/arena/quests')) return 4;
    if (path.includes('/arena/laboratorio')) return 5;
    return 0;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">
      
      {/* 1. HEADER HUD */}
      <nav className="px-4 py-3 flex justify-between items-center bg-slate-900/90 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50 shadow-lg">
        
        <div className="flex flex-col">
          <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 text-lg italic tracking-tighter leading-none">
            ARENA GECA
          </h1>
          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mt-1">
             Season 01 • Beta
          </span>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 text-yellow-400 font-mono font-bold text-sm">
                 <MonetizationOn sx={{ fontSize: 16 }} /> 
                 <span>{dbUser?.saldo_coins || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-purple-400 font-mono text-[10px]">
                 <Star sx={{ fontSize: 10 }} /> 
                 <span>{dbUser?.xp || 0} XP</span>
              </div>
           </div>

           <div onClick={() => navigate('/arena/perfil')} className="cursor-pointer active:scale-95 transition-transform">
             <UserAvatar 
                key={dbUser?.avatar_slug} // <--- O SEGREDO ESTÁ AQUI
                user={dbUser} 
                size="md" 
                className="ring-2 ring-purple-500/50" 
             />
           </div>
        </div>
      </nav>

      {/* 2. CONTEÚDO */}
      <div className="animate-fade-in">
        <Outlet />
      </div>

      {/* 3. NAVEGAÇÃO INFERIOR */}
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: '#0f172a', borderTop: '1px solid #1e293b', zIndex: 100 }} elevation={10}>
        <BottomNavigation
          showLabels
          value={getTabValue()}
          onChange={(_, val) => {
              const rotas = ['/arena', '/arena/transferir', '/arena/ranking', '/arena/memes', '/arena/quests', '/arena/laboratorio'];
              navigate(rotas[val]);
          }}
          sx={{ 
            bgcolor: 'transparent', height: 70,
            '& .MuiBottomNavigationAction-root': { minWidth: 0, padding: '6px 0', maxWidth: '100%' },
            '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem', marginTop: '2px', fontWeight: 'bold' }
          }}
        >
          <BottomNavigationAction label="Início" icon={<Home />} sx={{ color: '#64748b', '&.Mui-selected': { color: '#a855f7' } }} />
          <BottomNavigationAction label="Pix" icon={<SwapHorizontalCircle />} sx={{ color: '#64748b', '&.Mui-selected': { color: '#22d3ee' } }} />
          <BottomNavigationAction label="Top" icon={<EmojiEvents />} sx={{ color: '#64748b', '&.Mui-selected': { color: '#eab308' } }} />
          <BottomNavigationAction label="Memes" icon={<RocketLaunch />} sx={{ color: '#64748b', '&.Mui-selected': { color: '#f472b6' } }} />
          <BottomNavigationAction label="Missões" icon={<Assignment />} sx={{ color: '#64748b', '&.Mui-selected': { color: '#4ade80' } }} />
          <BottomNavigationAction label="Lab" icon={<Biotech />} sx={{ color: '#64748b', '&.Mui-selected': { color: '#38bdf8' } }} />
        </BottomNavigation>
      </Paper>
    </div>
  );
}