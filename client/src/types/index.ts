export interface Pix {
  _id: string;
  remetente_extraido: string;
  valor_extraido: string;
  mensagem_texto: string;
  data: string;
  tipo?: 'PIX' | 'DINHEIRO';
  vendedor_nome?: string;
  item_vendido?: string;
  quantidade?: number;
  vendedor_email?: string;
}

export interface Produto {
  _id: string;
  nome: string;
  preco: number;
}

export interface ExtratoItem {
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  descricao: string;
  data: string;
  referencia_id?: string;
  categoria?: string; // Adicionado para o Ledger
}

export interface User {
  _id: string;
  email: string;
  nome: string;
  // AQUI ESTAVA O PROBLEMA: Adicionei os cargos que faltavam
  role: 'admin' | 'membro' | 'gm' | 'gestao'; 
  status: 'ativo' | 'pendente' | 'banido';
  
  saldo_coins: number;
  saldo_glue: number;
  xp: number;
  nivel: number;
  badges: string[];
  
  sequencia_login: number; 
  codigo_referencia?: string;
  indicado_por?: string;
  
  classe?: string;
  materias?: string[];
  avatar_slug?: string;
  avatar_layers?: Record<string, string>;
  bio?: string;
  
  chave_pix?: string;
  curso?: string;
  comprovante_url?: string;
  validado?: boolean;
  status_profissional?: string;
  equipe_competicao?: string;
  
  missoes_concluidas?: string[];
  quest_progress?: any[]; // Melhor usar array de objetos
  
  extrato?: ExtratoItem[]; 
  saldo_staking_liquido?: number;
}