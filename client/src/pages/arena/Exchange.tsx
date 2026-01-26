import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ArenaExchange() {
  // Removi o reloadUser que estava dando erro
  const { dbUser } = useAuth(); 
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ price: 0, supply: 0 });
  const [localSaldo, setLocalSaldo] = useState(dbUser?.saldo_coins || 0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('exchange/stats');
      setStats(res.data);
      setHistory(res.data.history);
      
      // Aproveitamos para atualizar o saldo real do banco de dados
      const userRes = await api.get('/api/auth/me'); 
      setLocalSaldo(userRes.data.saldo_coins);
    } catch (e) { console.error("Erro ao sincronizar mercado:", e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTrade = async (type: 'buy' | 'sell') => {
    if (!amount || parseFloat(amount) <= 0) return toast.error("Digite um valor!");
    setLoading(true);
    try {
      await api.post(`exchange/${type}`, { amount: parseFloat(amount) });
      toast.success(`${type === 'buy' ? 'Compra' : 'Venda'} realizada!`);
      setAmount('');
      await fetchData(); // Recarrega tudo após o trade
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro na transação");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      {/* HEADER DO PREÇO */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Preço GLUE/COIN</h2>
          <div className="flex items-center gap-2">
             <span className="text-3xl font-black text-white font-mono">{stats.price.toFixed(4)}</span>
             <span className={stats.price > 10 ? "text-emerald-400 text-xs font-bold" : "text-red-400 text-xs font-bold"}>
                {stats.price > 10 ? "↑ BULLISH" : "↓ BEARISH"}
             </span>
          </div>
        </div>
      </div>

      {/* GRÁFICO (AGORA COM OS AXIS SENDO USADOS) */}
      <div className="h-64 w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
              </linearGradient>
            </defs>
            {/* XAxis e YAxis agora estão aqui para o TS ficar feliz */}
            <XAxis dataKey="time" hide /> 
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
              itemStyle={{ color: '#22d3ee' }}
            />
            <Area type="monotone" dataKey="price" stroke="#22d3ee" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* PAINEL DE TRADE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between mb-4">
           <span className="text-xs font-bold text-slate-400 uppercase">Seu Saldo</span>
           <span className="text-xs font-mono text-yellow-500">{localSaldo} COINS</span>
        </div>

        <input 
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Qtd de GLUE"
          className="w-full bg-black/40 border-2 border-slate-800 focus:border-cyan-500 rounded-2xl py-4 px-6 text-2xl font-mono text-white outline-none transition-all mb-6"
        />

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => handleTrade('buy')}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
          >
            COMPRAR
          </button>
          <button 
            onClick={() => handleTrade('sell')}
            disabled={loading}
            className="bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
          >
            VENDER
          </button>
        </div>
      </div>
    </div>
  );
}