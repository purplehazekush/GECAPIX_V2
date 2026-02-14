export interface Product {
    _id: string;
    nome: string;
    preco: number;
    imagem_url: string;
    categoria: string;
    cashback_xp: number;
    estoque: number;
    badge?: string;
    ativo: boolean;
}

export interface LedgerItem {
    _id: string;
    time: string;
    desc: string;
    val: number;
    xp: number;
    method: 'Cartão' | 'Dinheiro' | 'Pix Manual';
}