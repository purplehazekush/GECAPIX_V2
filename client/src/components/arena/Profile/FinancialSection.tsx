import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { 
  NorthEast, // Seta para Cima-Direita (Saída)
  SouthWest, // Seta para Baixo-Esquerda (Entrada)
  AccountBalanceWallet, // Carteira
  History, 
  EmojiEvents, // Troféu
  Bolt, // Raio (Zap)
  Pix 
} from '@mui/icons-material';

type FilterType = 'ALL' | 'IN' | 'OUT';

interface SectionProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function FinancialSection({ formData, setFormData }: SectionProps) {
  const { dbUser } = useAuth();
  const [filter, setFilter] = useState<FilterType>('ALL');

  // --- LÓGICA DE VISUALIZAÇÃO (NUBANK GAMER) ---
  const extrato = (dbUser?.extrato || []).sort((a: any, b: any) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  const filteredExtrato = extrato.filter((item: any) => {
    if (filter === 'IN') return item.tipo === 'ENTRADA';
    if (filter === 'OUT') return item.tipo === 'SAIDA';
    return true;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const hoje = new Date();
    if (date.toDateString() === hoje.toDateString()) return 'Hoje';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
  };

  // Ícones dinâmicos
  const getIcon = (desc: string) => {
    if (desc.includes('Missão') || desc.includes('VENCEDOR')) return <EmojiEvents fontSize="small" />;
    if (desc.includes('Transferência')) return <Bolt fontSize="small" />;
    if (desc.includes('Pix') || desc.includes('Venda')) return <AccountBalanceWallet fontSize="small" />;
    return null; // Ícone padrão será a seta
  };

  return (
    <div className="space-y-6">
      
      {/* 1. EDITOR DE CHAVE PIX (O FORMULÁRIO) */}
      <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Pix />
            <h3 className="font-black italic uppercase">Dados Financeiros</h3>
        </div>
        <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Sua Chave Pix (Para receber prêmios)</label>
            <input
                type="text"
                value={formData.chave_pix}
                onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                placeholder="CPF, Email ou Aleatória..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500 transition-colors font-mono"
            />
        </div>
      </div>

      {/* 2. VISUALIZAÇÃO DE EXTRATO (READ ONLY) */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Header do Extrato */}
        <div className="p-4 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <History fontSize='small' className="text-purple-400" />
            <span>Extrato Recente</span>
          </div>

          <div className="flex bg-slate-800 p-1 rounded-lg">
            {['ALL', 'IN', 'OUT'].map((f) => (
                <button 
                    key={f}
                    onClick={() => setFilter(f as FilterType)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${filter === f ? 'bg-slate-600 text-white' : 'text-slate-500'}`}
                >
                    {f === 'ALL' ? 'TUDO' : f === 'IN' ? 'ENTRADA' : 'SAÍDA'}
                </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          {filteredExtrato.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nada por aqui ainda.
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredExtrato.map((item: any, idx: number) => (
                <div key={idx} className="p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                      item.tipo === 'ENTRADA' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                        {/* SE não tiver ícone especial, usa seta */}
                        {getIcon(item.descricao) || (item.tipo === 'ENTRADA' ? <SouthWest fontSize="small" /> : <NorthEast fontSize="small" />)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{item.descricao}</p>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">{formatDate(item.data)}</p>
                    </div>
                  </div>
                  <div className={`text-right font-mono font-bold text-xs ${item.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.tipo === 'ENTRADA' ? '+' : '-'}{item.valor}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}