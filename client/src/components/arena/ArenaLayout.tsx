import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, EmojiEvents, SwapHorizontalCircle, SportsEsports } from '@mui/icons-material';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';

export default function ArenaLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Mapeia a rota atual para o valor do index da barra
  const getTabValue = () => {
    if (location.pathname === '/arena') return 0;
    if (location.pathname === '/arena/transferir') return 1;
    if (location.pathname === '/arena/ranking') return 2;
    return 0;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
       <Outlet />

       {/* BARRA INFERIOR FIXA */}
       <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: '#0f172a', borderTop: '1px solid #1e293b' }} elevation={3}>
        <BottomNavigation
          showLabels
          value={getTabValue()}
          sx={{ bgcolor: 'transparent', height: 70 }}
        >
          <BottomNavigationAction 
            label="Início" 
            icon={<Home />} 
            onClick={() => navigate('/arena')}
            sx={{ color: '#64748b', '&.Mui-selected': { color: '#a855f7' } }} 
          />
          <BottomNavigationAction 
            label="Enviar" 
            icon={<SwapHorizontalCircle />} 
            onClick={() => navigate('/arena/transferir')}
            sx={{ color: '#64748b', '&.Mui-selected': { color: '#22d3ee' } }} 
          />
          <BottomNavigationAction 
            label="Ranking" 
            icon={<EmojiEvents />} 
            onClick={() => navigate('/arena/ranking')}
            sx={{ color: '#64748b', '&.Mui-selected': { color: '#eab308' } }} 
          />
          <BottomNavigationAction 
            label="Eventos" 
            icon={<SportsEsports />} 
            sx={{ color: '#64748b', opacity: 0.5 }} // Desabilitado visualmente por enquanto
          />
        </BottomNavigation>
      </Paper>
    </div>
  );
}