import axios from 'axios';

// Cria uma instância do Axios já com o endereço certo
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});