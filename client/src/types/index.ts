// client/src/types/index.ts
export interface Pix {
  _id: string;
  remetente_extraido: string;
  valor_extraido: string;
  mensagem_texto: string;
  data: string;
  
  // Campos novos que adicionamos
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
  role: 'admin' | 'membro';
  status: 'ativo' | 'pendente';
  
  // Campos de Gamification (Garantir que todos estão aqui)
  saldo_coins: number;
  saldo_glue: number;
  xp: number;
  nivel: number;
  badges: string[];
  
  // ESTES FALTAVAM:
  sequencia_login: number; 
  codigo_referencia?: string;
  indicado_por?: string;
}