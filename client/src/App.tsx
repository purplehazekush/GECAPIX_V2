import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import axios from 'axios';
import { useAuth, AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout'; // Layout do Admin (Barra em cima)
import Feed from './pages/Feed';
import Stats from './pages/Stats';
import Admin from './pages/Admin';

// --- LAYOUT DA ARENA (PÚBLICA) ---
// Criar um componente visual diferente pro aluno comum
function ArenaLayout() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 pb-20">
       <nav className="p-4 flex justify-between items-center bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
          <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 text-xl italic">
            ARENA GECA
          </h1>
          <div className="flex items-center gap-2">
             <span className="text-yellow-500 font-bold text-xs">🪙 0</span>
             <img src={user?.photoURL || ''} className="w-8 h-8 rounded-full border border-slate-600"/>
          </div>
       </nav>
       <Outlet />
       {/* Aqui entraremos com a Bottom Navigation depois */}
    </div>
  );
}

// Página Placeholder para testar a Arena
function ArenaHome() {
    return (
        <div className="p-6 text-center">
            <h2 className="text-white text-2xl font-bold mb-4">Bem-vindo à Arena! 🏟️</h2>
            <p className="text-slate-400">Em breve: Ranking, Memes e Apostas.</p>
        </div>
    );
}

function AppRoutes() {
  const { user, dbUser, loading } = useAuth();
  const [sistemaAberto, setSistemaAberto] = useState<boolean>(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    axios.get(`config/modo-aberto`) // Ajuste a URL base se não estiver global
      .then(res => setSistemaAberto(res.data.aberto))
      .catch(() => setSistemaAberto(false))
      .finally(() => setLoadingConfig(false));
  }, []);

  if (loading || loadingConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // 1. Não logado -> Tela de Login
  if (!user) return <Login />;

  // 2. Aguardando sync -> Tela Preta
  if (!dbUser) return <div className="min-h-screen bg-slate-900"/>;

  // 3. ROTEAMENTO INTELIGENTE
  
  // Se for ADMIN ou ATIVO -> Acesso Total
  const isMembroGestao = dbUser.status === 'ativo' || dbUser.role === 'admin';

  return (
    <Routes>
      {/* ROTAS DA GESTÃO (Protegidas) */}
      {isMembroGestao && (
          <Route path="/" element={<Layout />}>
            <Route index element={<Feed />} />
            <Route path="stats" element={<Stats />} />
            <Route path="admin" element={<Admin />} />
            <Route path="arena" element={<ArenaHome />} /> {/* Gestão também pode ver a Arena */}
          </Route>
      )}

      {/* ROTAS PÚBLICAS (Arena) - Para quem é Pendente */}
      {!isMembroGestao && (
          <Route path="/" element={<ArenaLayout />}>
             <Route index element={<ArenaHome />} />
             {/* Futuras rotas: /ranking, /loja */}
          </Route>
      )}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
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