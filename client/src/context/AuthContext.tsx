import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  type User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { api } from '../lib/api';

// IMPORTA A TIPAGEM OFICIAL (Apague as interfaces 'User' e 'ExtratoItem' que estavam aqui)
import type { User } from '../types'; 

interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: User | null;
  setDbUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 NOVA FUNÇÃO: Recarrega os dados do banco sem precisar relogar
  const reloadUser = useCallback(async () => {
    if (!user) return; // 'user' do firebase
    try {
      const res = await api.get('/auth/me');
      // Só atualiza se houver mudança real (opcional, mas boa prática)
      setDbUser(prev => JSON.stringify(prev) !== JSON.stringify(res.data) ? res.data : prev);
    } catch (error) {
      console.error("AuthContext: Erro ao recarregar dados:", error);
    }
  }, [user]); // Só recria se o usuário do Firebase mudar

  const syncWithBackend = async (firebaseUser: FirebaseUser) => {
      try {
        const inviteCode = localStorage.getItem('gecapix_invite_code');
        
        // 1. LOGIN PADRÃO
        const res = await api.post('/auth/login', {
          email: firebaseUser.email,
          nome: firebaseUser.displayName,
          codigo_convite: inviteCode
        });

        // 2. SAFETY CHECK (CORREÇÃO DO BUG)
        // Se o avatar vier 'default' ou vazio, tenta buscar o perfil completo para garantir
        // que não estamos pegando um cache ou versão desatualizada
        let finalUser = res.data;
        
        if (!finalUser.avatar_slug || finalUser.avatar_slug === 'default') {
             try {
                 // Tenta buscar o perfil específico se tiver ID
                 if (finalUser._id) {
                    const perfilRes = await api.get(`/arena/perfil/${finalUser._id}`);
                    if (perfilRes.data && perfilRes.data.avatar_slug !== 'default') {
                        console.log("AuthContext: Perfil atualizado recuperado com sucesso.");
                        finalUser = perfilRes.data;
                    }
                 }
             } catch (err) {
                 // Silencioso: falha na recuperação extra não deve travar o login
                 console.warn("AuthContext: Não foi possível recuperar perfil detalhado.");
             }
        }

        localStorage.removeItem('gecapix_invite_code');
        setDbUser(finalUser);

        if (res.data.mensagem_bonus) {
           // Aqui você pode disparar um evento global ou toast se quiser
           console.log("Bônus:", res.data.mensagem_bonus);
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
    <AuthContext.Provider value={{ user, dbUser, setDbUser, loading, signInGoogle, logout, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);