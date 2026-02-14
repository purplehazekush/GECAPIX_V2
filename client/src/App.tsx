// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast'; // <--- 1. IMPORT NOVO

// SEUS IMPORTS ORIGINAIS (MANTIDOS)
import Login from './components/Login';
import Layout from './components/Layout';
import Feed from './pages/Feed';

import ArenaRanking from './pages/arena/Ranking';
import ArenaLayout from './components/arena/ArenaLayout';
import ArenaHome from './pages/arena/Home';
import TransferCoins from './pages/arena/Transfer';
import ArenaProfile from './pages/arena/Profile';
import ArenaMemes from './pages/arena/Memes';
import ArenaQuests from './pages/arena/Quests';
import Laboratorio from './pages/arena/Laboratorio';
import ArenaSolver from './pages/arena/Solver'; // A página da IA
import ValidationPanel from './pages/admin/ValidationPanel';
import GamesLobby from './pages/arena/GamesLobby'; // <--- IMPORTE ISSO
import GameRoom from './pages/arena/GameRoom';     // <--- E ISSO
import Tokenomics from './pages/arena/Tokenomics';
import ArenaSpotted from './pages/arena/Spotted';
import CentralBank from './pages/arena/CentralBank';
import ArenaStore from './pages/arena/Store'; // <--- Importe
import BankPanel from './components/arena/bank/AdminBankPanel';
import ArenaExchange from './pages/arena/Exchange'; //Corretora de GLUE/GECACOINS
import Dating from './pages/arena/Dating';
import MarketLab from './pages/arena/MarketLab';
import GecaCentral from './pages/admin/GecaCentral';
import GecaStore from './pages/store/GecaStore';
import GecaAdmin from './pages/admin/GecaAdmin';

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
          <Route path="admin" element={<GecaAdmin />} />
          
        </Route>
      )}

      {/* ROTAS DA ARENA */}
      <Route path="/arena" element={<ArenaLayout />}>
        <Route index element={<ArenaHome />} />
        <Route path="transferir" element={<TransferCoins />} />
        <Route path="ranking" element={<ArenaRanking />} />
        <Route path="perfil" element={<ArenaProfile />} />
        <Route path="memes" element={<ArenaMemes />} />
        <Route path="quests" element={<ArenaQuests />} />
        <Route path="laboratorio" element={<Laboratorio />} />

        <Route path="loja" element={<GecaStore />} />

        <Route path="games" element={<GamesLobby />} />
        <Route path="tokenomics" element={<Tokenomics />} />
        <Route path="spotted" element={<ArenaSpotted />} />
        <Route path="oraculo" element={<ArenaSolver />} />
        <Route path="bank" element={<CentralBank />} />
        <Route path="loja" element={<ArenaStore />} />
        <Route path="exchange" element={<ArenaExchange />} />
        <Route path="matching" element={<Dating />} />

        <Route path="games/play/:roomId" element={<GameRoom />} />

        <Route path="market-lab" element={<MarketLab />} />

        {/* Rota do Xerife */} 
        {dbUser.role === 'admin' && (
          <Route path="admin/validacao" element={<ValidationPanel />} />
        )}
        {dbUser.role === 'admin' && (
          <Route path="admin/bankpanel" element={<BankPanel />} />
        )}
        {dbUser.role === 'admin' && (
          <Route path="admin/geca-central-panel" element={<GecaCentral />} />
        )}
                  
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
        {/* 2. CONFIGURAÇÃO DO TOAST (GLOBAL) */}
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#fff',
              border: '1px solid #334155',
              fontSize: '14px',
              fontWeight: 'bold'
            },
            success: { iconTheme: { primary: '#4ade80', secondary: '#1e293b' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />

        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}