import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout'; // Layout da Gestão
import Feed from './pages/Feed';
import Stats from './pages/Stats';
import Admin from './pages/Admin';

// IMPORTS CORRIGIDOS
import ArenaLayout from './components/arena/ArenaLayout';
import ArenaHome from './pages/arena/Home';

function AppRoutes() {
  const { user, dbUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // 1. Não logado -> Login
  if (!user) return <Login />;

  // 2. Aguardando sincronização com banco
  if (!dbUser) return <div className="min-h-screen bg-slate-900"/>;

  // 3. Verificação de Permissão
  const isMembroGestao = dbUser.status === 'ativo' || dbUser.role === 'admin';

  return (
    <Routes>
      {/* ROTA DA GESTÃO (ADMIN) */}
      {isMembroGestao && (
          <Route path="/" element={<Layout />}>
            <Route index element={<Feed />} />
            <Route path="stats" element={<Stats />} />
            <Route path="admin" element={<Admin />} />
          </Route>
      )}

      {/* ROTA DA ARENA (PÚBLICO/PENDENTE) */}
      <Route path="/arena" element={<ArenaLayout />}>
          <Route index element={<ArenaHome />} />
      </Route>

      {/* Redirecionamento Inteligente */}
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