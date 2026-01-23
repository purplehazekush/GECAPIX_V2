// client/src/components/Layout/index.tsx
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, IconButton, Box } from '@mui/material';
import { Logout, BarChart, List, AdminPanelSettings } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Função auxiliar para verificar rota ativa
  const isActive = (path: string) => location.pathname === path;

  // Estilo do botão de navegação
  const navButtonStyle = (path: string, color: string) => ({
    mx: 1,
    color: isActive(path) ? color : '#64748b',
    bgcolor: isActive(path) ? `${color}1a` : 'transparent', // 1a = 10% opacity hex
    fontWeight: 'bold',
    '&:hover': { color: color, bgcolor: `${color}1a` }
  });

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <AppBar position="static" sx={{ bgcolor: 'transparent', boxShadow: 'none', borderBottom: '1px solid #334155' }}>
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
             <Typography variant="h6" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'white', textShadow: '0 0 10px #22d3ee' }}>
               GECAPIX
             </Typography>
             <Typography variant="caption" sx={{ color: '#22d3ee', fontFamily: 'monospace' }}>
               Olá, {user?.displayName?.split(' ')[0]}
             </Typography>
          </Box>

          {/* Navegação Desktop */}
          <Box sx={{ display: 'flex', bgcolor: 'rgba(30, 41, 59, 0.5)', borderRadius: 2, p: 0.5, border: '1px solid #334155' }}>
            <Button 
                startIcon={<List />} 
                onClick={() => navigate('/')}
                sx={navButtonStyle('/', '#22d3ee')}
            >
                FEED
            </Button>
            <Button 
                startIcon={<BarChart />} 
                onClick={() => navigate('/stats')}
                sx={navButtonStyle('/stats', '#ffffff')}
            >
                STATS
            </Button>
            {/* TODO: Checar se é admin depois */}
            <Button 
                startIcon={<AdminPanelSettings />} 
                onClick={() => navigate('/admin')}
                sx={navButtonStyle('/admin', '#eab308')}
            >
                ADMIN
            </Button>
          </Box>

          <IconButton onClick={() => logout()} sx={{ ml: 2, color: '#ef4444' }}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Aqui renderiza a página atual */}
      <Box sx={{ maxWidth: '800px', mx: 'auto', p: 2 }}>
        <Outlet />
      </Box>
    </div>
  );
}