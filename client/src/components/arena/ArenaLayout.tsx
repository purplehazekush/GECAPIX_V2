// client/src/components/arena/ArenaLayout.tsx
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, 
  EmojiEvents, 
  SwapHorizontalCircle, 
  MonetizationOn, 
  Star, RocketLaunch, Assignment, Biotech 
} from '@mui/icons-material';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';

export default function ArenaLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dbUser } = useAuth();

  // LÓGICA CORRIGIDA: Mapeia a URL atual para o índice do botão
  const getTabValue = () => {
    const path = location.pathname;
    
    if (path.includes('/arena/transferir')) return 1;
    if (path.includes('/arena/ranking')) return 2;
    if (path.includes('/arena/memes')) return 3;
    if (path.includes('/arena/quests')) return 4;
    if (path.includes('/arena/laboratorio') || path.includes('/arena/chat')) return 5;
    
    // Default: Home
    return 0;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">
      
      {/* 1. HEADER (HUD de Status) */}
      <nav className="px-4 py-3 flex justify-between items-center bg-slate-900/80 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50 shadow-lg shadow-purple-900/10">
        
        <div className="flex flex-col">
          <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 text-lg italic tracking-tighter leading-none">
            ARENA GECA
          </h1>
          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mt-1">
             Season 01
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

           {/* Avatar Clicável -> Vai para o Perfil */}
           <div 
             className="relative cursor-pointer hover:scale-105 transition-transform active:scale-95"
             onClick={() => navigate('/arena/perfil')}
           >
             {/* Fallback caso UserAvatar não esteja pronto, usamos img direta */}
             <img 
                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${dbUser?.classe || 'mago'}-${dbUser?.email}&backgroundColor=b6e3f4,c0aede,d1d4f9`} 
                className="w-10 h-10 rounded-full border-2 border-purple-500 bg-slate-800"
                alt="Perfil"
             />
           </div>
        </div>
      </nav>

      {/* 2. CONTEÚDO DA PÁGINA */}
      <div className="animate-fade-in">
        <Outlet />
      </div>

      {/* 3. BARRA DE NAVEGAÇÃO (6 Ícones) */}
      <Paper 
        sx={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          bgcolor: '#0f172a', // Slate-900
          borderTop: '1px solid #1e293b',
          zIndex: 100
        }} 
        elevation={10}
      >
        <BottomNavigation
          showLabels
          value={getTabValue()}
          onChange={(_, newValue) => {
              // Array de rotas na mesma ordem dos botões abaixo
              const rotas = [
                  '/arena', 
                  '/arena/transferir', 
                  '/arena/ranking', 
                  '/arena/memes', 
                  '/arena/quests', 
                  '/arena/laboratorio'
              ];
              navigate(rotas[newValue]);
          }}
          sx={{ 
            bgcolor: 'transparent', 
            height: 70,
            // Truque CSS para caber 6 ícones no celular sem quebrar
            '& .MuiBottomNavigationAction-root': { 
                minWidth: 0, 
                padding: '6px 0',
                maxWidth: '100%' 
            },
            '& .MuiBottomNavigationAction-label': {
                fontSize: '0.65rem', // Texto menor
                marginTop: '2px'
            }
          }}
        >
          {/* 0. HOME */}
          <BottomNavigationAction 
            label="Início" 
            icon={<Home />} 
            sx={{ color: '#64748b', '&.Mui-selected': { color: '#a855f7' } }} 
          />
          
          {/* 1. TRANSFERIR */}
          <BottomNavigationAction 
            label="Enviar" 
            icon={<SwapHorizontalCircle />} 
            sx={{ color: '#64748b', '&.Mui-selected': { color: '#22d3ee' } }} 
          />

          {/* 2. RANKING */}
          <BottomNavigationAction 
            label="Top" 
            icon={<EmojiEvents />} 
            sx={{ color: '#64748b', '&.Mui-selected': { color: '#eab308' } }} 
          />

          {/* 3. MEMES */}
          <BottomNavigationAction 
            label="Memes" 
            icon={<RocketLaunch />} 
            sx={{ color: '#64748b', '&.Mui-selected': { color: '#f472b6' } }} 
          />

          {/* 4. QUESTS */}
          <BottomNavigationAction 
            label="Missões" 
            icon={<Assignment />} 
            sx={{ color: '#64748b', '&.Mui-selected': { color: '#4ade80' } }} 
          />

          {/* 5. LAB */}
          <BottomNavigationAction 
            label="Lab" 
            icon={<Biotech />} 
            sx={{ color: '#64748b', '&.Mui-selected': { color: '#38bdf8' } }} 
          />
        </BottomNavigation>
      </Paper>
    </div>
  );
}