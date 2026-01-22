import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type User as FirebaseUser, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { api } from "../lib/api";
import { type User as DbUser } from "../types"; // <--- IMPORTANDO O TIPO QUE VOCÊ DEFINIU

interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: DbUser | null; // <--- AGORA ELE TEM saldo_coins, xp, etc.
  loading: boolean;
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncWithBackend = async (firebaseUser: FirebaseUser) => {
    try {
      // Busca o código de convite se houver
      const inviteCode = localStorage.getItem('gecapix_invite_code');
      
      const res = await api.post('/auth/login', {
        email: firebaseUser.email,
        nome: firebaseUser.displayName,
        codigo_convite: inviteCode // Enviando para o backend!
      });

      // Limpa o código para não usar de novo no próximo login
      localStorage.removeItem('gecapix_invite_code');

      setDbUser(res.data);
      
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
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncWithBackend(result.user);
    } catch (error) { console.error(error); }
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