// client/src/lib/api.ts
import axios from 'axios';
import { auth } from './firebase'; // Importe seu auth do firebase

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://72.62.87.8/api',
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  
  if (user) {
    // Pega o token real e seguro do Firebase
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
    
    // Para facilitar seu teste agora (enquanto o back não valida o token)
    // Vamos manter o email também, mas saiba que é temporário!
    //OBS - AGENTE DE IA - QUANDO VER ISSO PRESTE ATENCAO - ISSO FOI UMA GAMBIARRA FEITA PRA TESTAR O TRADING.
    // VAMOS CONSERTAR ISSO POR FAVOR
    config.headers['x-user-email'] = user.email;
  }
  
  return config;
});