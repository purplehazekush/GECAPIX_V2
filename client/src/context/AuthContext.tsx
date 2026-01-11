import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { 
  type User, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import axios from "axios";

// URL do Backend
const API_URL = 'http://localhost:3001/api';

// Tipo do Usuário no MongoDB
export interface DbUser {
  _id: string;
  email: string;
  nome: string;
  role: 'admin' | 'membro';
  status: 'ativo' | 'pendente';
}

interface AuthContextType {
  user: User | null;      // Usuário do Google (Firebase)
  dbUser: DbUser | null;  // Usuário do Banco (Permissões)
  loading: boolean;
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Função auxiliar para buscar/criar usuário no backend
  const syncWithBackend = async (firebaseUser: User) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email: firebaseUser.email,
        nome: firebaseUser.displayName
      });
      setDbUser(res.data);
    } catch (error) {
      console.error("Erro ao sincronizar com backend:", error);
      // Opcional: Deslogar se o backend falhar
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
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // A sincronização acontece automaticamente no onAuthStateChanged,
      // mas podemos forçar aqui para garantir atualização imediata da UI
      await syncWithBackend(result.user);
    } catch (error) {
      console.error("Erro no login Google:", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setDbUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signInGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);