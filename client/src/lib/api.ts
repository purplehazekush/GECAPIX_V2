/*import axios from 'axios';

// Cria uma instância do Axios já com o endereço certo
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

*/

import axios from 'axios';

export const api = axios.create({
  // Force o IP diretamente para testar se a conexão chega na VPS
  baseURL: 'http://72.62.87.8/api', 
});