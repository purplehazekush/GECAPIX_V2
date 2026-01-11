import axios from 'axios';

// Pega a URL do .env ou usa localhost como fallback
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

export default api;