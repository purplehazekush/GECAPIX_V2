import { useEffect, useState } from 'react';
import { api } from "../lib/api";
import { AttachMoney, ShowChart, EmojiEvents, Groups } from '@mui/icons-material';
import HourlyHeatmap from '../components/charts/Hourly_Heatmap'
import PaymentMethodChart from '../components/charts/PaymentMethodChart'; // O de Pizza que criamos antes

export default function Stats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats')
        .then(res => setStats(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center mt-20 text-cyan-500 animate-pulse font-mono">CALCULANDO DADOS...</div>;
  if (!stats) return null;

  return (
    <div className="max-w-6xl mx-auto pb-24 px-4 animate-fade-in">
        <h2 className="text-2xl font-bold neon-text mb-6 mt-2">DASHBOARD</h2>

        {/* 1. CARDS DE RESUMO (KPIs) - Mobile: Grid 2x2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard 
                icon={<AttachMoney className="text-emerald-400"/>} 
                label="Faturamento" 
                value={`R$ ${stats.faturamento_mes}`} 
                color="border-emerald-500/50"
            />
             <StatCard 
                icon={<ShowChart className="text-cyan-400"/>} 
                label="Transações" 
                value={stats.total_transacoes} 
                color="border-cyan-500/50"
            />
             <StatCard 
                icon={<Groups className="text-purple-400"/>} 
                label="Ticket Médio" 
                value={`R$ ${stats.ticket_medio}`} 
                color="border-purple-500/50"
            />
             <StatCard 
                icon={<EmojiEvents className="text-yellow-400"/>} 
                label="Top Vendedor" 
                value={stats.top_vendedor.nome} 
                sub={stats.top_vendedor.nome !== '--' ? `R$ ${stats.top_vendedor.total.toFixed(0)}` : ''}
                color="border-yellow-500/50"
            />
        </div>

        {/* 2. GRÁFICOS GRANDES - Mobile: Empilhado */}
        <div className="flex flex-col gap-6">
            
            {/* O HEATMAP (Ocupa largura total) */}
            <div className="w-full">
                {stats.heatmap && <HourlyHeatmap data={stats.heatmap} />}
            </div>

            {/* DIVISÃO INFERIOR: PIZZA + RANKING */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gráfico de Pizza (Pix vs Dinheiro) */}
                {stats.distribuicao && <PaymentMethodChart data={stats.distribuicao} />}

                {/* Lista de Top Produtos */}
                <div className="glass-panel p-5 rounded-xl border border-white/10 h-80 overflow-y-auto custom-scrollbar">
                    <h3 className="text-white font-mono mb-4 flex items-center gap-2">
                        🏆 Ranking de Produtos
                    </h3>
                    <ul className="space-y-3">
                        {stats.ranking.map((prod: any, idx: number) => (
                            <li key={idx} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-slate-500 text-sm">#{idx + 1}</span>
                                    <span className="text-white font-medium text-sm">{prod.nome}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-cyan-400 font-bold text-sm">R$ {prod.total.toFixed(2)}</div>
                                    <div className="text-slate-500 text-[10px]">{prod.qtd} unidades</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    </div>
  );
}

// Mini Componente para os Cards do Topo
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