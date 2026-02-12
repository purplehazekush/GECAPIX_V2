import axios from 'axios';
import { auth } from './firebase'; 

// URL dinâmica: Se estiver rodando local, usa localhost. Se buildar, usa a VPS.
const baseURL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api' 
  : 'http://72.62.87.8/api';

export const api = axios.create({
  baseURL: baseURL,
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  
  if (user) {
    // Pega o token seguro do Firebase
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
    
    // GAMBIARRA REMOVIDA 🗑️
    // Não precisamos mais mandar x-user-email. 
    // O authMiddleware no backend vai extrair o email de dentro do token.
  }
  
  return config;
});