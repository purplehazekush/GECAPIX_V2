import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  type User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';

// --- DEFINIÇÃO DE TIPOS ATUALIZADA ---
export interface ExtratoItem {
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  descricao: string;
  data: string;
  referencia_id?: string;
}

export interface User {
  _id: string;
  email: string;
  nome: string;
  role: 'admin' | 'membro';
  status: 'ativo' | 'pendente';
  saldo_coins: number;
  xp: number;
  nivel: number;
  codigo_referencia?: string;
  
  // Identidade
  classe?: string;
  materias?: string[];
  avatar_slug?: string;
  avatar_layers?: Record<string, string>;
  bio?: string;
  
  // Dados Pessoais
  chave_pix?: string;
  curso?: string;
  comprovante_url?: string;
  validado?: boolean;
  status_profissional?: string;
  equipe_competicao?: string;
  
  // Game
  missoes_concluidas?: string[];
  
  // 🔥 A CORREÇÃO DO ERRO 1 ESTÁ AQUI:
  extrato?: ExtratoItem[]; 
}

interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: User | null;
  setDbUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const syncWithBackend = async (firebaseUser: FirebaseUser) => {
      try {
        const inviteCode = localStorage.getItem('gecapix_invite_code');
        const res = await api.post('/auth/login', {
          email: firebaseUser.email,
          nome: firebaseUser.displayName,
          codigo_convite: inviteCode
        });
        localStorage.removeItem('gecapix_invite_code');
        setDbUser(res.data);
        if (res.data.mensagem_bonus) {
          // Pequeno hack para usar alert ou toast aqui se quiser, ou deixar pro componente
           console.log("Bonus:", res.data.mensagem_bonus);
        }
      } catch (error) {
        console.error("Erro ao sincronizar:", error);
      }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncWithBackend(currentUser);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setDbUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, setDbUser, loading, signInGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);