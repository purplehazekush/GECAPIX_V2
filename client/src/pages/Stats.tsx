// client/src/pages/Stats.tsx
import { useEffect, useState } from 'react';
import { 
  AttachMoney, 
  ReceiptLong, 
  ShowChart, 
  EmojiEvents, 
  BarChart 
} from '@mui/icons-material';

// Definição do tipo da resposta da API
interface StatsData {
  faturamento_mes: string;
  total_transacoes: number;
  ticket_medio: string;
  top_vendedor: { nome: string; total: number };
  ranking: Array<{ nome: string; qtd: number; total: number }>;
}

export default function Stats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get(`${API_URL}/stats`);
        setData(res.data);
      } catch (error) {
        console.error("Erro ao buscar stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-center mt-20 text-slate-500 animate-pulse">Calculando métricas...</div>;
  if (!data) return <div className="text-center mt-20 text-red-400">Erro ao carregar dados.</div>;

  // Calcula o maior valor para fazer a barra de progresso relativa
  const maiorVenda = data.ranking.length > 0 ? data.ranking[0].total : 1;

  return (
    <div className="pb-24 animate-fade-in">
      
      {/* --- GRID DE KPIs (Indicadores Chave) --- */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        
        {/* Card 1: Faturamento */}
        <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-10"><AttachMoney sx={{ fontSize: 40 }}/></div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Faturamento</p>
          <h2 className="text-2xl font-mono font-bold text-white mt-1">
            R$ {data.faturamento_mes.replace('.', ',')}
          </h2>
        </div>

        {/* Card 2: Transações */}
        <div className="glass-panel p-4 rounded-xl border-l-4 border-cyan-500 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-10"><ReceiptLong sx={{ fontSize: 40 }}/></div>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Vendas</p>
          <h2 className="text-2xl font-mono font-bold text-white mt-1">
            {data.total_transacoes}
          </h2>
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="glass-panel p-4 rounded-xl border-l-4 border-purple-500 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-10"><ShowChart sx={{ fontSize: 40 }}/></div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Ticket Médio</p>
          </div>
          <h2 className="text-xl font-mono font-bold text-white">
            R$ {data.ticket_medio.replace('.', ',')}
          </h2>
        </div>

        {/* Card 4: Top Vendedor */}
        <div className="glass-panel p-4 rounded-xl border-l-4 border-yellow-500 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-10"><EmojiEvents sx={{ fontSize: 40 }}/></div>
          <div className="flex items-center gap-2 mb-1">
             <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">MVP Vendedor</p>
          </div>
          <h2 className="text-sm font-bold text-white truncate">
             {data.top_vendedor.nome.toUpperCase()}
          </h2>
          <p className="text-[10px] text-emerald-400 font-mono">
             R$ {data.top_vendedor.total.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>

      {/* --- RANKING DE PRODUTOS --- */}
      <div className="glass-panel p-6 rounded-xl">
        <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2 border-b border-slate-700 pb-2">
            <BarChart sx={{ color: '#22d3ee' }} /> PERFORMANCE PRODUTOS
        </h3>
        
        <div className="space-y-5">
            {data.ranking.length === 0 ? (
                <p className="text-center text-slate-600 text-sm">Nenhum produto classificado ainda.</p>
            ) : (
                data.ranking.map((item, index) => {
                    const percent = (item.total / maiorVenda) * 100;
                    const pos = index + 1;
                    
                    // Cores do Pódio
                    let rankColor = "text-white";
                    let barColor = "bg-cyan-600";
                    if(pos === 1) { rankColor="text-yellow-400"; barColor="bg-yellow-500"; }
                    if(pos === 2) { rankColor="text-slate-300"; barColor="bg-slate-400"; }
                    if(pos === 3) { rankColor="text-orange-400"; barColor="bg-orange-600"; }

                    return (
                        <div key={item.nome}>
                            <div className="flex items-end justify-between text-xs mb-1">
                                <div className="flex items-center gap-2">
                                    <span className={`font-mono font-bold w-4 ${rankColor}`}>{pos}º</span>
                                    <span className="text-slate-200 font-bold tracking-wide">{item.nome}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-emerald-400 font-mono font-bold">
                                        R$ {item.total.toFixed(2).replace('.', ',')}
                                    </div>
                                    <div className="text-[10px] text-slate-500">{item.qtd} un.</div>
                                </div>
                            </div>
                            {/* Barra de Progresso Customizada */}
                            <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className={`h-1.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-1000 ${barColor}`} 
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>

    </div>
  );
}