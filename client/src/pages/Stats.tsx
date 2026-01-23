// client/src/pages/Stats.tsx
import { useEffect, useState } from 'react';
import { api } from "../lib/api";
import { AttachMoney, ShowChart, EmojiEvents, Groups } from '@mui/icons-material';
import HourlyHeatmap from '../components/charts/Hourly_Heatmap'
import PaymentMethodChart from '../components/charts/PaymentMethodChart'; 

export default function Stats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats')
        .then(res => setStats(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-cyan-500 font-mono text-sm animate-pulse">PROCESSANDO DADOS...</p>
    </div>
  );
  
  if (!stats) return null;

  // SAFE GUARDS: Garantir que objetos existam antes de ler
  const topVendedor = stats.top_vendedor || { nome: '--', total: 0 };
  const ranking = stats.ranking || [];
  const heatmap = stats.heatmap || [];
  const distribuicao = stats.distribuicao || [];

  return (
    <div className="max-w-6xl mx-auto pb-24 px-4 animate-fade-in">
        <h2 className="text-2xl font-bold neon-text mb-6 mt-2">DASHBOARD</h2>

        {/* 1. CARDS DE RESUMO (KPIs) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard 
                icon={<AttachMoney className="text-emerald-400"/>} 
                label="Faturamento" 
                value={`R$ ${stats.faturamento_mes || '0.00'}`} 
                color="border-emerald-500/50"
            />
             <StatCard 
                icon={<ShowChart className="text-cyan-400"/>} 
                label="Transações" 
                value={stats.total_transacoes || 0} 
                color="border-cyan-500/50"
            />
             <StatCard 
                icon={<Groups className="text-purple-400"/>} 
                label="Ticket Médio" 
                value={`R$ ${stats.ticket_medio || '0.00'}`} 
                color="border-purple-500/50"
            />
             <StatCard 
                icon={<EmojiEvents className="text-yellow-400"/>} 
                label="Top Vendedor" 
                value={topVendedor.nome?.split(' ')[0] || '--'} 
                sub={topVendedor.nome !== '--' ? `R$ ${topVendedor.total?.toFixed(0)}` : ''}
                color="border-yellow-500/50"
            />
        </div>

        {/* 2. GRÁFICOS GRANDES */}
        <div className="flex flex-col gap-6">
            
            {/* HEATMAP */}
            <div className="w-full">
                 <HourlyHeatmap data={heatmap} />
            </div>

            {/* DIVISÃO INFERIOR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* PIZZA */}
                <PaymentMethodChart data={distribuicao} />

                {/* RANKING DE PRODUTOS */}
                <div className="glass-panel p-5 rounded-xl border border-white/10 h-80 overflow-y-auto custom-scrollbar">
                    <h3 className="text-white font-mono mb-4 flex items-center gap-2">
                        🏆 Ranking de Produtos
                    </h3>
                    {ranking.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center mt-10">Nenhum dado ainda.</p>
                    ) : (
                        <ul className="space-y-3">
                            {ranking.map((prod: any, idx: number) => (
                                <li key={idx} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold text-sm w-6 text-center ${idx === 0 ? 'text-yellow-500' : 'text-slate-500'}`}>
                                            #{idx + 1}
                                        </span>
                                        <span className="text-white font-medium text-sm truncate max-w-[120px]">
                                            {prod.nome}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-cyan-400 font-bold text-sm">R$ {prod.total?.toFixed(2)}</div>
                                        <div className="text-slate-500 text-[10px]">{prod.qtd} un.</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}

// Mini Componente
function StatCard({ icon, label, value, sub, color }: any) {
    return (
        <div className={`glass-panel p-3 rounded-xl border-l-2 ${color} flex flex-col justify-between h-24`}>
            <div className="flex justify-between items-start">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{label}</span>
                {icon}
            </div>
            <div>
                <div className="text-white font-bold text-lg leading-tight truncate">{value}</div>
                {sub && <div className="text-slate-500 text-[10px]">{sub}</div>}
            </div>
        </div>
    )
}