// client/src/components/arena/bank/AdminBankPanel.tsx
import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function AdminBankPanel() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Estados locais para edição
  const [newBase, setNewBase] = useState('');
  const [newMult, setNewMult] = useState('');

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/exchange/admin');
      setStats(res.data);
      setNewBase(res.data.basePrice);
      setNewMult(res.data.multiplier);
    } catch (error) {
      console.error("Erro admin bank", error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleUpdateParams = async () => {
    if (!confirm("⚠️ ATENÇÃO: Alterar a curva matemática afetará IMEDIATAMENTE o preço para todos os usuários. Confirmar alteração da política monetária?")) return;
    
    setLoading(true);
    try {
      await api.post('/api/exchange/admin', {
        base: parseFloat(newBase),
        multiplier: parseFloat(newMult)
      });
      toast.success("Política Monetária Atualizada! 🏛️");
      fetchStats();
    } catch (error) {
      toast.error("Falha ao atualizar parâmetros.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMarket = async () => {
    try {
      const res = await api.post('/api/exchange/admin/toggle');
      setStats({ ...stats, marketOpen: res.data.marketOpen });
      toast.success(res.data.marketOpen ? "Mercado ABERTO" : "Mercado FECHADO (Circuit Breaker)");
    } catch (error) {
      toast.error("Erro ao alterar estado do mercado");
    }
  };

  if (!stats) return <div className="p-4 text-xs text-slate-500">Carregando dados do BC...</div>;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mb-8">
      {/* Header do BC */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏛️</span>
          <h2 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Painel do Banco Central</h2>
        </div>
        <div className="flex items-center gap-2">
           <span className={`w-2 h-2 rounded-full ${stats.marketOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
           <span className="text-xs font-mono text-slate-400">{stats.marketOpen ? 'OPEN' : 'HALTED'}</span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* COLUNA 1: Indicadores Macroeconômicos */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase">Indicadores de Liquidez</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">GLUE em Circulação</p>
              <p className="text-xl font-mono text-cyan-400">{stats.circulatingSupply}</p>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Total Queimado (Fees)</p>
              <p className="text-xl font-mono text-orange-500">🔥 {Math.floor(stats.totalBurned).toLocaleString()}</p>
            </div>
          </div>

          <div className="p-3 bg-red-900/10 border border-red-900/30 rounded-lg flex justify-between items-center">
             <div>
               <p className="text-xs text-red-400 font-bold">Circuit Breaker</p>
               <p className="text-[10px] text-red-300/60">Parar negociações em emergência</p>
             </div>
             <button 
                onClick={handleToggleMarket}
                className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                  stats.marketOpen 
                  ? 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white' 
                  : 'border-green-500 text-green-500 hover:bg-green-500 hover:text-white'
                }`}
             >
                {stats.marketOpen ? 'STOP MARKET' : 'RESUME'}
             </button>
          </div>
        </div>

        {/* COLUNA 2: Calibragem da Curva */}
        <div className="space-y-4">
           <h3 className="text-xs font-bold text-slate-500 uppercase">Calibragem da Bonding Curve</h3>
           
           <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Preço Base (Gênesis)</label>
                <div className="flex gap-2">
                   <input 
                      type="number" 
                      value={newBase}
                      onChange={(e) => setNewBase(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white text-sm rounded px-2 py-1 flex-1"
                   />
                   <span className="text-slate-500 text-xs py-1">Coins</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Multiplicador (Fator K)</label>
                <div className="flex gap-2">
                   <input 
                      type="number" 
                      step="0.01"
                      value={newMult}
                      onChange={(e) => setNewMult(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white text-sm rounded px-2 py-1 flex-1"
                   />
                   <span className="text-slate-500 text-xs py-1">Exp</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Ex: 1.05 = 5% de aumento por unidade vendida.
                </p>
              </div>

              <button 
                onClick={handleUpdateParams}
                disabled={loading}
                className="w-full bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-400 text-xs font-bold py-2 rounded transition-all"
              >
                {loading ? 'Recalibrando...' : 'APLICAR NOVA POLÍTICA MONETÁRIA'}
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}