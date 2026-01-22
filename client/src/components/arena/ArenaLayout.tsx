import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Home,
    EmojiEvents,
    SwapHorizontalCircle,
    MonetizationOn,
    Star, RocketLaunch
} from '@mui/icons-material';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import UserAvatar from './UserAvatar';

export default function ArenaLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { dbUser, user } = useAuth();

    // Lógica para marcar qual botão da barra inferior está ativo
    const getTabValue = () => {
        if (location.pathname === '/arena' || location.pathname === '/arena/') return 0;
        if (location.pathname.includes('transferir')) return 1;
        if (location.pathname.includes('ranking')) return 2;
        return 0;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24">

            {/* 1. HEADER (HUD de Status) - Fica fixo no topo */}
            <nav className="px-4 py-3 flex justify-between items-center bg-slate-900/80 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50 shadow-lg shadow-purple-900/10">

                <div className="flex flex-col">
                    <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 text-lg italic tracking-tighter leading-none">
                        ARENA GECA
                    </h1>
                    <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mt-1">
                        Temporada 2026
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

                    {/* AJUSTE: Avatar agora é clicável e leva ao Perfil */}
                    <div
                        className="relative cursor-pointer hover:scale-105 transition-transform active:scale-95"
                        onClick={() => navigate('/arena/perfil')}
                    >
                        <UserAvatar
                            user={dbUser}
                            googlePhoto={user?.photoURL}
                            size="md"
                            showLevel={true}
                        />
                    </div>
                </div>
            </nav>

            {/* 2. CONTEÚDO DINÂMICO - Aqui renderizam as páginas (Home, Ranking, etc) */}
            <div className="animate-fade-in">
                <Outlet />
            </div>

            {/* 3. BARRA DE NAVEGAÇÃO INFERIOR - Estilo App Mobile */}
            <Paper
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    bgcolor: '#0f172a',
                    borderTop: '1px solid #1e293b',
                    zIndex: 100
                }}
                elevation={10}
            >
                <BottomNavigation
                    showLabels
                    value={getTabValue()}
                    sx={{
                        bgcolor: 'transparent',
                        height: 70,
                        '& .MuiBottomNavigationAction-root': { minWidth: 0, padding: '12px 0' }
                    }}
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
                        label="Memes"
                        icon={<RocketLaunch />}
                        onClick={() => navigate('/arena/memes')} // <-- Verifique se o caminho é este
                        sx={{ color: '#64748b', '&.Mui-selected': { color: '#a855f7' } }}
                    />
                </BottomNavigation>
            </Paper>
        </div>
    );
}