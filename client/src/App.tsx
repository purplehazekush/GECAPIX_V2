import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout'; 
import Feed from './pages/Feed';
import Stats from './pages/Stats';
import Admin from './pages/Admin';
import ArenaRanking from './pages/arena/Ranking';

// IMPORTS DA ARENA
import ArenaLayout from './components/arena/ArenaLayout';
import ArenaHome from './pages/arena/Home';
import TransferCoins from './pages/arena/Transfer'; 
import ArenaProfile from './pages/arena/Profile';
import ArenaMemes from './pages/arena/Memes'; // <-- ADICIONE ESTE IMPORT
import ArenaQuests from './pages/arena/Quests';
import Laboratorio from './pages/arena/Laboratorio';
import ValidationPanel from './pages/admin/ValidationPanel';

function AppRoutes() {
  const { user, dbUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-cyan-500 font-mono text-xs animate-pulse">SINCRONIZANDO ARENA...</p>
      </div>
    );
  }

  if (!user) return <Login />;
  if (!dbUser) return <div className="min-h-screen bg-slate-900" />;

  const isMembroGestao = dbUser.status === 'ativo' || dbUser.role === 'admin';

  return (
    <Routes>
      {/* ROTAS DA GESTÃO */}
      {isMembroGestao && (
        <Route path="/" element={<Layout />}>
          <Route index element={<Feed />} />
          <Route path="stats" element={<Stats />} />
          <Route path="admin" element={<Admin />} />
          <Route path="admin/validacao" element={<ValidationPanel />} />
        </Route>
      )}

      {/* ROTAS DA ARENA */}
      <Route path="/arena" element={<ArenaLayout />}>
        <Route index element={<ArenaHome />} />
        <Route path="transferir" element={<TransferCoins />} />
        <Route path="ranking" element={<ArenaRanking />} />
        <Route path="perfil" element={<ArenaProfile />} />
        <Route path="memes" element={<ArenaMemes />} /> {/* <-- ADICIONE ESTA LINHA */}
        <Route path="quests" element={<ArenaQuests />} /> {/* <-- ADICIONE ESTA LINHA */}
        <Route path="laboratorio" element={<Laboratorio />} />
        
      </Route>

      <Route 
        path="*" 
        element={<Navigate to={isMembroGestao ? "/" : "/arena"} replace />} 
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
       <AuthProvider>
          <AppRoutes />
       </AuthProvider>
    </BrowserRouter>
  );
}