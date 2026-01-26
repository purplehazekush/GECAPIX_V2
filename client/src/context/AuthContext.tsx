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
  saldo_glue: number;
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
  saldo_staking_liquido?: number
  
}
interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: User | null;
  setDbUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>; // 🔥 ADICIONADO
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 NOVA FUNÇÃO: Recarrega os dados do banco sem precisar relogar
  const reloadUser = async () => {
    if (!user) return;
    try {
      const res = await api.get('/auth/me');
      setDbUser(res.data);
    } catch (error) {
      console.error("AuthContext: Erro ao recarregar dados:", error);
    }
  };

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