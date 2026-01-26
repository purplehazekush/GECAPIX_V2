import axios from 'axios';
import { auth } from './firebase'; // Importando sua instância do Firebase

export const api = axios.create({
  // URL da sua VPS
  baseURL: 'http://72.62.87.8/api', 
});

// O Interceptor: O "pedágio" que identifica o usuário
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;

  if (user && user.email) {
    // 1. Enviamos o e-mail (O que o seu back-end 'authSimples' espera hoje)
    config.headers['x-user-email'] = user.email;

    // 2. Enviamos o Token JWT (Para quando instalarmos o firebase-admin no back)
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.error("Erro ao obter token do Firebase:", e);
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});