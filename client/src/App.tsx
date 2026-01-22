import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout'; // Layout da Gestão (Desktop/Admin)
import Feed from './pages/Feed';
import Stats from './pages/Stats';
import Admin from './pages/Admin';
import ArenaRanking from './pages/arena/Ranking';

// IMPORTS DA ARENA
import ArenaLayout from './components/arena/ArenaLayout';
import ArenaHome from './pages/arena/Home';
import TransferCoins from './pages/arena/Transfer'; // Certifique-se de ter criado este arquivo
import ArenaProfile from './pages/arena/Profile';

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

  // 1. Não logado -> Vai para a tela de Login
  if (!user) return <Login />;

  // 2. Logado no Firebase, mas o backend ainda não respondeu -> Tela de espera
  if (!dbUser) return <div className="min-h-screen bg-slate-900" />;

  // 3. Definição de Permissão
  const isMembroGestao = dbUser.status === 'ativo' || dbUser.role === 'admin';

  return (
    <Routes>
      {/* ==========================================================
          ROTAS DA GESTÃO (RESTRITAS)
          Aparecem apenas para quem é Ativo/Admin.
          Ficam na raiz "/" para facilitar o uso no dia a dia.
      ========================================================== */}
      {isMembroGestao && (
        <Route path="/" element={<Layout />}>
          <Route index element={<Feed />} />
          <Route path="stats" element={<Stats />} />
          <Route path="admin" element={<Admin />} />
          
        </Route>
      )}

      {/* ==========================================================
          ROTAS DA ARENA (PÚBLICAS PARA LOGADOS)
          Acessíveis para qualquer estudante da UFMG que logar.
          Mesmo os admins podem acessar via /arena.
      ========================================================== */}
      <Route path="/arena" element={<ArenaLayout />}>
        <Route index element={<ArenaHome />} />
        <Route path="transferir" element={<TransferCoins />} />
        <Route path="ranking" element={<ArenaRanking />} />
        <Route path="perfil" element={<ArenaProfile />} />
        {/* Futuras rotas como /arena/ranking ou /arena/memes entram aqui */}
      </Route>

      {/* ==========================================================
          REDIRECIONAMENTO INTELIGENTE
          - Se for Gestão: vai para o Feed (/)
          - Se for Aluno Pendente: vai para a Arena (/arena)
      ========================================================== */}
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