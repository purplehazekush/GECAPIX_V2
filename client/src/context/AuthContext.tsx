// client/src/context/AuthContext.tsx
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

// 1. ATUALIZANDO A DEFINIÇÃO DO USUÁRIO
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
  // --- NOVOS CAMPOS ADICIONADOS ---
  classe?: string;
  materias?: string[];
  avatar_seed?: string;
  bio?: string;
  chave_pix?: string;
  curso?: string;
  comprovante_url?: string;
  validado?: boolean;
  status_profissional?: string;
  equipe_competicao?: string;
  avatar_layers?: Record<string, string>;
}

// 2. ATUALIZANDO O TIPO DO CONTEXTO
interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: User | null;
  setDbUser: React.Dispatch<React.SetStateAction<User | null>>; // <--- ADICIONADO
  loading: boolean;
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null); // Já existia, mas agora vamos exportar
  const [loading, setLoading] = useState(true);

  // ... (funções syncWithBackend e useEffect mantêm iguais) ...
  
  const syncWithBackend = async (firebaseUser: FirebaseUser) => {
      try {
        const inviteCode = localStorage.getItem('gecapix_invite_code');
        const res = await api.post('/auth/login', {
          email: firebaseUser.email,
          nome: firebaseUser.displayName,
          codigo_convite: inviteCode
        });
        localStorage.removeItem('gecapix_invite_code');
        setDbUser(res.data); // Isso atualiza o estado
        if (res.data.mensagem_bonus) {
          setTimeout(() => alert(res.data.mensagem_bonus), 1000);
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

  // 3. EXPORTANDO O SETDBUSER NO VALUE
  return (
    <AuthContext.Provider value={{ user, dbUser, setDbUser, loading, signInGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);