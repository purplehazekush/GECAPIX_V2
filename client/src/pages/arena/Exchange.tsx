import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { TradingChart } from '../../components/arena/TradingChart'; // Importe o novo componente

export default function ArenaExchange() {
    const { dbUser } = useAuth();
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ price: 0, supply: 0 });
    const [localSaldo, setLocalSaldo] = useState(dbUser?.saldo_coins || 0);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        try {
            // 1. Pega os dados do gráfico (Histórico de Trades)
            const chartRes = await api.get('/exchange/chart');
            // Mapeamos para garantir que o Recharts entenda o preço de fechamento (close)
            const formattedHistory = chartRes.data.map((t: any) => ({
                ...t,
                price: t.close
            }));
            setHistory(formattedHistory);

            // 2. Pega os parâmetros do Banco Central (usando a rota que já existe no seu index.js)
            const statsRes = await api.get('/exchange/admin');
            const { basePrice, multiplier, circulatingSupply } = statsRes.data;

            // Calcula o preço spot atual: P = Base * (Mult ^ Supply)
            const currentPrice = basePrice * Math.pow(multiplier, circulatingSupply);

            setStats({ price: currentPrice, supply: circulatingSupply });

            // Atualiza o saldo local com o que está no dbUser do contexto
            if (dbUser) setLocalSaldo(dbUser.saldo_coins);

        } catch (e) { console.error("Erro na sincronização:", e); }
    };

    const handleTrade = async (type: 'buy' | 'sell') => {
        if (!amount || parseInt(amount) <= 0) return toast.error("Quantidade inválida");
        setLoading(true);
        try {
            // Chama a sua rota oficial: /api/exchange/trade
            await api.post('/exchange/trade', {
                action: type,
                amount: parseInt(amount)
            });

            toast.success(type === 'buy' ? "Compra executada! 📈" : "Venda executada! 📉");
            setAmount('');

            // Pequeno delay para o banco processar e a gente atualizar a tela
            setTimeout(fetchData, 500);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Falha na execução");
        } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Atualiza a cada 5s para os testes
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-4 space-y-6 animate-fade-in">
            {/* PREÇO ATUAL */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Preço GLUE/COIN</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-white font-mono">
                            {stats.price.toFixed(2)}
                        </span>
                        <span className="text-cyan-400 text-[10px] font-mono">SUPPLY: {stats.supply}</span>
                    </div>
                </div>
            </div>

            {/* GRÁFICO */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
                {history.length > 0 ? (
                    <TradingChart data={history} />
                ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-500 font-mono text-xs">
                        AGUARDANDO PRIMEIRA NEGOCIAÇÃO...
                    </div>
                )}
            </div>

            {/* PAINEL DE AÇÃO */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400">SALDO DISPONÍVEL</span>
                    <span className="text-xs font-mono text-yellow-500">{localSaldo.toLocaleString()} COINS</span>
                </div>

                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Quantidade de GLUE"
                    className="w-full bg-black/40 border-2 border-slate-800 focus:border-cyan-500 rounded-2xl py-4 px-6 text-2xl font-mono text-white outline-none mb-6"
                />

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleTrade('buy')} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl active:scale-95 transition-all">
                        COMPRAR
                    </button>
                    <button onClick={() => handleTrade('sell')} disabled={loading} className="bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl active:scale-95 transition-all">
                        VENDER
                    </button>
                </div>
            </div>
        </div>
    );
}