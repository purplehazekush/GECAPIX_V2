import { useEffect, useState } from 'react'; // <--- Adicione useState e useEffect
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios'; // <--- Adicione axios
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Blocked from './pages/Blocked';
import Feed from './pages/Feed';
import Stats from './pages/Stats';
import Admin from './pages/Admin';

function AppRoutes() {
  const { user, dbUser, loading } = useAuth();
  const [sistemaAberto, setSistemaAberto] = useState<boolean>(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Verifica se o sistema está em modo "Liberar Geral"
  useEffect(() => {
    axios.get(`config/modo-aberto`)
      .then(res => setSistemaAberto(res.data.aberto))
      .catch(() => setSistemaAberto(false)) // Padrão seguro se falhar
      .finally(() => setLoadingConfig(false));
  }, []);

  // Loading unificado (Auth + Config)
  if (loading || loadingConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-cyan-500 font-mono text-xs animate-pulse">VERIFICANDO ACESSO...</p>
      </div>
    );
  }

  // 1. Não logado
  if (!user) return <Login />;

  // 2. Aguardando sync do banco
  if (!dbUser) return <div className="min-h-screen bg-slate-900"/>;

  // 3. LÓGICA DE BLOQUEIO ATUALIZADA
  // Só bloqueia SE: usuário for pendente E o sistema NÃO estiver aberto
  if (dbUser.status === 'pendente' && !sistemaAberto) {
    return <Blocked />;
  }

  // 4. Acesso Liberado
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Feed />} />
        <Route path="stats" element={<Stats />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}