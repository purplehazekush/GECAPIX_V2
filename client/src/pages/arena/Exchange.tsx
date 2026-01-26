// client/src/pages/arena/Exchange.tsx
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { TradingChart } from '../../components/arena/TradingChart';

export default function ArenaExchange() {
    const { dbUser, reloadUser } = useAuth(); // Lembre de usar o reloadUser que criamos!
    const [history, setHistory] = useState([]);

    // Dados do Mercado
    const [marketParams, setMarketParams] = useState({ base: 0, mult: 0, supply: 0 });
    const [stats, setStats] = useState({ price: 0 });

    // UI de Trade
    const [amount, setAmount] = useState('');
    const [quote, setQuote] = useState<any>(null); // Armazena a cotação (Total a pagar/receber)
    const [loading, setLoading] = useState(false);

    const [timeframe, setTimeframe] = useState('1'); // Padrão 1 minuto

    // Linhas do Gráfico
    const [chartLines, setChartLines] = useState<any[]>([]);

    // 1. Otimização do fetchData
    const fetchData = async () => {
        try {
            // Passamos o timeframe atual na requisição
            const chartRes = await api.get(`/exchange/chart?tf=${timeframe}`);

            // Apenas uma chamada de setHistory (a lib lightweight-charts já entende o formato vindo do back)
            setHistory(chartRes.data);

            // ... (código de statsRes e marketParams mantido igual) ...
            const statsRes = await api.get('/exchange/admin');
            const { basePrice, multiplier, circulatingSupply } = statsRes.data;
            setMarketParams({ base: basePrice, mult: multiplier, supply: circulatingSupply });

            const currentPrice = basePrice * Math.pow(multiplier, circulatingSupply);
            setStats({ price: currentPrice });

            // ... (código de chartLines mantido igual) ...
            const amountNum = parseInt(amount) || 1;
            const finalAskPrice = currentPrice * Math.pow(multiplier, amountNum);
            const finalBidPrice = currentPrice * Math.pow(multiplier, -amountNum);

            setChartLines([
                { price: finalAskPrice, color: '#4ade80', title: `BUY IMPACT (+${amountNum})` },
                { price: finalBidPrice, color: '#f87171', title: `SELL IMPACT (-${amountNum})` }
            ]);

            reloadUser?.();
        } catch (e) { console.error(e); }
    };

    // 2. Correção de Reatividade
    useEffect(() => {
        fetchData(); // Chama imediatamente ao montar ou mudar timeframe
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, [timeframe]); // 🔥 ADICIONADO: Agora reage ao clique do botão!

    // Efeito para buscar Cotação quando o usuário digita
    useEffect(() => {
        const getQuote = async () => {
            if (!amount || parseInt(amount) <= 0) {
                setQuote(null);
                return;
            }
            try {
                // Vamos simular as duas pontas chamando a API
                const buyRes = await api.get(`/exchange/quote?action=buy&amount=${amount}`);
                const sellRes = await api.get(`/exchange/quote?action=sell&amount=${amount}`);

                setQuote({
                    buyTotal: buyRes.data.total_coins,
                    sellTotal: sellRes.data.total_coins,
                    buyImpact: buyRes.data.price_end, // Preço final após compra
                    sellImpact: sellRes.data.price_end // Preço final após venda
                });

            } catch (error) {
                console.error("Erro na cotação");
            }
        };

        const timeoutId = setTimeout(() => getQuote(), 500); // Debounce de 500ms
        return () => clearTimeout(timeoutId);
    }, [amount, marketParams]); // Recalcula se o mercado mudar

    const handleTrade = async (type: 'buy' | 'sell') => {
        if (!amount) return;
        setLoading(true);
        try {
            // Removemos o 'const res =' para não gerar aviso de variável não lida
            await api.post('/exchange/trade', { action: type, amount: parseInt(amount) });

            toast.success("Ordem Executada!");
            setAmount('');
            setQuote(null);

            // 🔥 Chame o reloadUser aqui para o saldo no cabeçalho atualizar na hora!
            await reloadUser();

            setTimeout(fetchData, 500);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Erro");
        } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000); // Mais rápido para ver o bot agindo
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-4 space-y-4 animate-fade-in pb-20">
            {/* 1. Header & Preço */}
            <div className="flex justify-between items-end px-2">
                <div>
                    <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Preço Atual</h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white font-mono tracking-tighter">
                            {stats.price.toFixed(2)}
                        </span>
                        <span className="text-slate-500 text-xs font-mono">COINS</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-cyan-400 font-mono mb-1">SUPPLY: {marketParams.supply} GLUE</div>
                    <div className="text-[10px] text-slate-500 font-mono">VOL: {history.length} TRADES</div>
                </div>
            </div>

            {/* ⏱️ SELETOR DE TIMEFRAME */}
            <div className="flex gap-2 mb-3 px-2">
                {['1', '5', '15', '60'].map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`
                px-3 py-1 rounded-md text-[10px] font-mono font-bold transition-all border
                ${timeframe === tf
                                ? 'bg-cyan-500 border-cyan-400 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                            }
            `}
                    >
                        {tf === '60' ? '1H' : `${tf}M`}
                    </button>
                ))}
            </div>


            {/* 2. Gráfico com Linhas de Bid/Ask */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-inner h-[280px]">
                <TradingChart data={history} priceLines={chartLines} />
            </div>

            {/* 3. Painel de Cotação (Estilo Corretora) */}
            <div className="bg-slate-900 border border-slate-800 rounded-t-3xl p-5 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">

                {/* Input Principal */}
                <div className="relative mb-6">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Quantidade</label>
                    <div className="flex items-center bg-black/40 border border-slate-700 rounded-xl px-4 py-3 focus-within:border-cyan-500 transition-colors">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            className="bg-transparent w-full text-2xl font-mono text-white outline-none placeholder:text-slate-700"
                        />
                        <span className="text-cyan-500 font-bold text-sm ml-2">GLUE</span>
                    </div>
                </div>

                {/* Grid de Decisão */}
                <div className="grid grid-cols-2 gap-4">
                    {/* LADO DA COMPRA */}
                    <div className="flex flex-col gap-2">
                        <div className="bg-slate-950/50 rounded-lg p-2 border border-emerald-500/10 text-center">
                            <span className="text-[10px] text-slate-500 block">PAGARÁ (Estimado)</span>
                            <span className="text-lg font-mono font-bold text-emerald-400">
                                {quote?.buyTotal ? quote.buyTotal.toLocaleString() : '-'}
                            </span>
                            <span className="text-[9px] text-slate-600 block">COINS</span>
                        </div>
                        <button
                            onClick={() => handleTrade('buy')}
                            disabled={loading || !quote}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl active:scale-95 transition-all shadow-lg shadow-emerald-900/20"
                        >
                            COMPRAR
                        </button>
                    </div>

                    {/* LADO DA VENDA */}
                    <div className="flex flex-col gap-2">
                        <div className="bg-slate-950/50 rounded-lg p-2 border border-red-500/10 text-center">
                            <span className="text-[10px] text-slate-500 block">RECEBERÁ (Estimado)</span>
                            <span className="text-lg font-mono font-bold text-red-400">
                                {quote?.sellTotal ? quote.sellTotal.toLocaleString() : '-'}
                            </span>
                            <span className="text-[9px] text-slate-600 block">COINS</span>
                        </div>
                        <button
                            onClick={() => handleTrade('sell')}
                            disabled={loading || !quote}
                            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl active:scale-95 transition-all shadow-lg shadow-red-900/20"
                        >
                            VENDER
                        </button>
                    </div>
                </div>

                {/* Rodapé de Saldo */}
                <div className="mt-4 flex justify-center">
                    <div className="bg-slate-800/50 px-4 py-1 rounded-full border border-slate-700">
                        <span className="text-[10px] text-slate-400 mr-2">SEU SALDO:</span>
                        <span className="text-xs font-mono text-yellow-500 font-bold">{dbUser?.saldo_coins?.toLocaleString()} 🪙</span>
                    </div>
                </div>
            </div>
        </div>
    );
}