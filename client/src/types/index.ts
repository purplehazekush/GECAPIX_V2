export interface Pix {
  _id: string;
  remetente_extraido: string;
  valor_extraido: string;
  mensagem_texto: string;
  data: string;
  
  // Campos novos
  tipo?: 'PIX' | 'DINHEIRO';
  vendedor_nome?: string;
  
  // Campos de gestão
  item_vendido?: string;
  quantidade?: number;
  vendedor_email?: string;
}

export interface Produto {
  _id: string;
  nome: string;
  preco: number;
}

export interface User {
  _id: string;
  nome: string;
  email: string;
  // ATUALIZADO: Adicionei 'gm' e 'gestao' para o TS não reclamar
  role: 'admin' | 'membro' | 'gm' | 'gestao'; 
  status: 'ativo' | 'pendente' | 'banido';
  
  // Gamification
  saldo_coins: number;
  saldo_glue: number;
  xp: number;
  nivel: number;
  badges: string[];
  
  // Dados extras
  sequencia_login: number; 
  codigo_referencia?: string;
  indicado_por?: string;
  classe?: string;
  avatar_slug?: string;
}