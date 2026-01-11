export interface Pix {
  _id: string;
  remetente_extraido: string;
  valor_extraido: string;
  mensagem_texto: string;
  data: string;
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