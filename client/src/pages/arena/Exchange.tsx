import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { TradingChart } from '../../components/arena/TradingChart';
import { io } from 'socket.io-client';

export default function ArenaExchange() {
    const { dbUser, reloadUser } = useAuth();
    const [history, setHistory] = useState([]);

    // Dados do Mercado
    const [marketParams, setMarketParams] = useState({ base: 0, mult: 0, supply: 0 });
    const [stats, setStats] = useState({ price: 0 });

    // UI de Trade
    const [amount, setAmount] = useState('');
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    
    const [timeframe, setTimeframe] = useState('1'); // '1', '5', '15', '60'

    // Linhas do Gráfico
    const [chartLines, setChartLines] = useState<any[]>([]);

    // 🔥 1. FETCH UNIFICADO (Resolve a Divergência)
    // Usamos useCallback dependendo do 'timeframe' para que a função sempre saiba o valor atual
    const fetchData = useCallback(async () => {
        try {
            // Promise.all dispara as duas requisições ao mesmo tempo
            // O código só continua quando AMBAS chegarem. Isso garante sincronia visual.
            const [chartRes, statsRes] = await Promise.all([
                api.get(`/exchange/chart?tf=${timeframe}`),
                api.get('/exchange/admin')
            ]);

            // --- PROCESSA TUDO NA MEMÓRIA ANTES DE RENDERIZAR ---

            // 1. Dados do BC
            const { basePrice, multiplier, circulatingSupply } = statsRes.data;
            const currentPrice = basePrice * Math.pow(multiplier, circulatingSupply);

            // 2. Dados do Gráfico
            // A lib já entende o formato do back, não precisa mapear se as chaves forem iguais
            const candles = chartRes.data; 

            // 3. Linhas de Impacto
            const amountNum = Math.max(1, parseInt(amount) || 1);
            const finalAskPrice = currentPrice * Math.pow(multiplier, amountNum);
            const finalBidPrice = currentPrice * Math.pow(multiplier, -amountNum);

            // --- RENDERIZAÇÃO EM LOTE (BATCH UPDATE) ---
            // O React tenta agrupar essas mudanças em um único "paint" na tela
            setMarketParams({ base: basePrice, mult: multiplier, supply: circulatingSupply });
            setStats({ price: currentPrice });
            setHistory(candles);
            setChartLines([
                { price: finalAskPrice, color: '#4ade80', title: `ASK (+${amountNum})` },
                { price: finalBidPrice, color: '#f87171', title: `BID (-${amountNum})` }
            ]);

            reloadUser?.();

        } catch (e) { console.error("Sync Error:", e); }
    }, [amount, timeframe, reloadUser]); // 🔥 Dependências vitais!

    // 🔥 2. POLLING CORRETO (Resolve o Jitter)
    useEffect(() => {
        fetchData(); // Busca inicial
        
        // O intervalo chama 'fetchData'. Como 'fetchData' muda quando 'timeframe' muda,
        // o intervalo é recriado automaticamente com a versão correta da função.
        const interval = setInterval(fetchData, 5000); 
        
        return () => clearInterval(interval);
    }, [fetchData]); // Se fetchData mudar (porque timeframe mudou), o efeito reinicia

    // 🔥 3. SOCKET IO (Reatividade Real-time)
    useEffect(() => {
        const socket = io('http://72.62.87.8:3001'); // Seu IP
        
        // Quando qualquer pessoa negociar, atualizamos TUDO imediatamente
        socket.on('market_update', () => {
            fetchData();
        });

        return () => { socket.disconnect(); }
    }, [fetchData]);

    // ... (Lógica de Cotação/Quote mantida igual) ...
    useEffect(() => {
        const getQuote = async () => {
            if (!amount || parseInt(amount) <= 0) {
                setQuote(null);
                return;
            }
            try {
                const [buyRes, sellRes] = await Promise.all([
                    api.get(`/exchange/quote?action=buy&amount=${amount}`),
                    api.get(`/exchange/quote?action=sell&amount=${amount}`)
                ]);
                setQuote({
                    buyTotal: buyRes.data.total_coins,
                    sellTotal: sellRes.data.total_coins,
                    buyImpact: buyRes.data.price_end,
                    sellImpact: sellRes.data.price_end
                });
            } catch (error) { console.warn("Quote Error"); }
        };
        const timer = setTimeout(getQuote, 400);
        return () => clearTimeout(timer);
    }, [amount, marketParams]);

    const handleTrade = async (type: 'buy' | 'sell') => {
        if (!amount || loading) return;
        setLoading(true);
        try {
            await api.post('/exchange/trade', { action: type, amount: parseInt(amount) });
            toast.success("Ordem Executada!");
            setAmount('');
            setQuote(null);
            
            // Não precisamos chamar fetchData() aqui manualmente se o Socket estiver ligado,
            // mas mal não faz (garantia extra).
            await fetchData(); 
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Falha na transação");
        } finally { setLoading(false); }
    };

    return (
        <div className="p-4 space-y-4 animate-fade-in pb-24 max-w-4xl mx-auto">
            {/* CABEÇALHO */}
            <div className="flex justify-between items-end px-2">
                <div>
                    <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Preço GLUE/COIN</h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white font-mono tracking-tighter">
                            {stats.price.toFixed(2)}
                        </span>
                        <span className="text-slate-500 text-xs font-mono">COINS</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-cyan-400 font-mono mb-1">SUPPLY: {marketParams.supply.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500 font-mono italic">VOL: {history.length} CANDLES</div>
                </div>
            </div>

            {/* SELETOR DE TIMEFRAME */}
            <div className="flex gap-1.5 px-1">
                {['1', '5', '15', '60'].map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all border ${
                            timeframe === tf
                                ? 'bg-cyan-500 border-cyan-400 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                    >
                        {tf === '60' ? '1H' : `${tf}M`}
                    </button>
                ))}
            </div>

            {/* GRÁFICO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl h-[300px] relative">
                {history.length > 0 ? (
                    <TradingChart data={history} priceLines={chartLines} />
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 font-mono text-[10px] animate-pulse">
                        CARREGANDO MERCADO...
                    </div>
                )}
            </div>

            {/* PAINEL DE OPERAÇÕES */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                {/* Input */}
                <div className="relative mb-6">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Quantidade</label>
                        <span className="text-[10px] text-slate-500 font-mono">Saldo: {dbUser?.saldo_glue || 0} GLUE</span>
                    </div>
                    <div className="flex items-center bg-black/40 border-2 border-slate-800 focus-within:border-cyan-500/50 rounded-2xl px-5 py-3 transition-all">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-transparent w-full text-3xl font-mono text-white outline-none placeholder:text-slate-800"
                        />
                        <span className="text-cyan-400 text-xs font-black tracking-widest ml-3">GLUE</span>
                    </div>
                </div>

                {/* Botões */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="bg-slate-950/40 rounded-xl p-3 border border-emerald-500/10 text-center min-h-[60px] flex flex-col justify-center">
                            <span className="text-[9px] text-slate-500 block leading-none mb-1">CUSTO ESTIMADO</span>
                            <span className="text-lg font-mono font-bold text-emerald-400 leading-none">
                                {quote?.buyTotal ? `≈ ${quote.buyTotal.toLocaleString()}` : '---'}
                            </span>
                        </div>
                        <button onClick={() => handleTrade('buy')} disabled={loading || !amount} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-lg">
                            COMPRAR
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-slate-950/40 rounded-xl p-3 border border-red-500/10 text-center min-h-[60px] flex flex-col justify-center">
                            <span className="text-[9px] text-slate-500 block leading-none mb-1">RECEBIMENTO</span>
                            <span className="text-lg font-mono font-bold text-red-400 leading-none">
                                {quote?.sellTotal ? `≈ ${quote.sellTotal.toLocaleString()}` : '---'}
                            </span>
                        </div>
                        <button onClick={() => handleTrade('sell')} disabled={loading || !amount} className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-lg">
                            VENDER
                        </button>
                    </div>
                </div>

                {/* Rodapé Saldo */}
                <div className="mt-6 pt-4 border-t border-slate-800/50 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500">SALDO EM CONTA</span>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-yellow-500 font-bold">{dbUser?.saldo_coins?.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-600 font-bold">COINS</span>
                    </div>
                </div>
            </div>
        </div>
    );
}