import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
    Home, RocketLaunch, SportsEsports, Science, Person 
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import DailyRewardModal from './DailyRewardModal'; // <--- O Modal de Login Diário fica aqui!

export default function ArenaLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    useAuth();

    // Menu Inferior Fixo
    const menuItems = [
        { icon: <Home />, label: 'Home', path: '/arena' },
        { icon: <RocketLaunch />, label: 'Memes', path: '/arena/memes' },
        { icon: <SportsEsports />, label: 'Games', path: '/arena/games' },
        { icon: <Science />, label: 'Lab', path: '/arena/laboratorio' }, // Chat & Oráculo
        { icon: <Person />, label: 'Perfil', path: '/arena/perfil' },
    ];

    const isActive = (path: string) => {
        if (path === '/arena' && location.pathname === '/arena') return true;
        if (path !== '/arena' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-inter pb-20">
            {/* O Conteúdo das Páginas Renderiza Aqui */}
            <Outlet />

            {/* Modal Global de Login Diário */}
            <DailyRewardModal />

            {/* Barra de Navegação Fixa */}
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 pb-safe-bottom z-50">
                <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                    {menuItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.label}
                                onClick={() => navigate(item.path)}
                                className={`flex flex-col items-center justify-center w-full h-full transition-all active:scale-90 ${
                                    active ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                <div className={`p-1 rounded-xl transition-all ${active ? 'bg-cyan-500/10' : ''}`}>
                                    {item.icon}
                                </div>
                                {/* Label opcional em telas muito pequenas pode ser removido */}
                                <span className="text-[9px] font-bold mt-0.5">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}