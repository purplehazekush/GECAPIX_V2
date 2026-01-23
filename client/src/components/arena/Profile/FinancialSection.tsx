// client/src/components/arena/Profile/FinancialSection.tsx
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  History, 
  Filter,
  Trophy,
  Zap
} from 'lucide-react';

type FilterType = 'ALL' | 'IN' | 'OUT';

export default function FinancialSection() {
  const { dbUser } = useAuth();
  const [filter, setFilter] = useState<FilterType>('ALL');

  if (!dbUser) return null;

  // Garante que o extrato existe e ordena por data (mais recente primeiro)
  const extrato = (dbUser.extrato || []).sort((a: any, b: any) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  const filteredExtrato = extrato.filter((item: any) => {
    if (filter === 'IN') return item.tipo === 'ENTRADA';
    if (filter === 'OUT') return item.tipo === 'SAIDA';
    return true;
  });

  // Utilitário para formatar datas amigáveis
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    if (date.toDateString() === hoje.toDateString()) return 'Hoje';
    if (date.toDateString() === ontem.toDateString()) return 'Ontem';
    
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
  };

  // Utilitário para ícones baseados na descrição
  const getIcon = (desc: string, tipo: string) => {
    if (desc.includes('Pix') || desc.includes('Venda')) return <Wallet className="w-4 h-4" />;
    if (desc.includes('Missão') || desc.includes('VENCEDOR')) return <Trophy className="w-4 h-4" />;
    if (desc.includes('Transferência')) return <Zap className="w-4 h-4" />;
    return tipo === 'ENTRADA' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. CABEÇALHO DO SALDO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Wallet className="w-32 h-32 text-cyan-400" />
        </div>
        
        <div className="relative z-10">
          <span className="text-slate-400 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Saldo Atual
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tight">
              {dbUser.saldo_coins.toLocaleString('pt-BR')}
            </span>
            <span className="text-cyan-400 font-bold text-lg">$GC</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 font-mono">
            BLOCKCHAIN ID: {dbUser._id.slice(-8).toUpperCase()}
          </p>
        </div>
      </div>

      {/* 2. EXTRATO E FILTROS */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 backdrop-blur-sm overflow-hidden">
        {/* Header do Extrato */}
        <div className="p-4 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <History className="w-5 h-5 text-purple-400" />
            <span>Histórico de Transações</span>
          </div>

          {/* Botões de Filtro */}
          <div className="flex bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === 'ALL' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              TUDO
            </button>
            <button 
              onClick={() => setFilter('IN')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === 'IN' ? 'bg-emerald-500/20 text-emerald-400 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              ENTRADAS
            </button>
            <button 
              onClick={() => setFilter('OUT')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === 'OUT' ? 'bg-rose-500/20 text-rose-400 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              SAÍDAS
            </button>
          </div>
        </div>

        {/* Lista de Transações */}
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {filteredExtrato.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma transação encontrada.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredExtrato.map((item: any, idx: number) => (
                <div key={idx} className="p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between group">
                  
                  {/* Esquerda: Ícone e Descrição */}
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                      item.tipo === 'ENTRADA' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {getIcon(item.descricao, item.tipo)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                        {item.descricao}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">
                        {formatDate(item.data)} • {new Date(item.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>

                  {/* Direita: Valor */}
                  <div className={`text-right font-mono font-bold ${
                    item.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
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