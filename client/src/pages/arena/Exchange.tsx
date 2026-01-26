// client/src/pages/arena/Exchange.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

// Componentes Refatorados
import { MarketHeader } from '../../components/arena/exchange/MarketHeader';
import { TimeframeSelector } from '../../components/arena/exchange/TimeframeSelector';
import { ChartSection } from '../../components/arena/exchange/ChartSection';
import { TradePanel } from '../../components/arena/exchange/TradePanel';

const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://72.62.87.8:3001';

export default function ArenaExchange() {
    const { dbUser, reloadUser } = useAuth();
    
    // Estados Globais
    const [history, setHistory] = useState([]);
    const [marketParams, setMarketParams] = useState({ base: 0, mult: 0, supply: 0 });
    const [price, setPrice] = useState(0);
    
    // Estados de UI
    const [timeframe, setTimeframe] = useState('1');
    const [amount, setAmount] = useState('');
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [chartLines, setChartLines] = useState<any[]>([]);

    // --- LÓGICA DE DADOS ---

    const fetchData = useCallback(async () => {
        try {
            const [chartRes, statsRes] = await Promise.all([
                api.get(`/exchange/chart?tf=${timeframe}`),
                api.get('/exchange/admin')
            ]);

            const { basePrice, multiplier, circulatingSupply } = statsRes.data;
            const currentPrice = basePrice * Math.pow(multiplier, circulatingSupply);
            
            // Dados Visualização
            setHistory(chartRes.data);
            setMarketParams({ base: basePrice, mult: multiplier, supply: circulatingSupply });
            setPrice(currentPrice);

            // Linhas de Impacto (Bid/Ask)
            const amountNum = Math.max(1, parseInt(amount) || 1);
            setChartLines([
                { price: currentPrice * Math.pow(multiplier, amountNum), color: '#4ade80', title: `ASK (+${amountNum})` },
                { price: currentPrice * Math.pow(multiplier, -amountNum), color: '#f87171', title: `BID (-${amountNum})` }
            ]);

            reloadUser?.();
        } catch (e) { console.error("Sync Error:", e); }
    }, [amount, timeframe, reloadUser]);

    // --- EFEITOS (SOCKETS & POLLING) ---
    const fetchDataRef = useRef(fetchData);
    useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);

    useEffect(() => {
        // Socket Singleton
        const socket = io(SOCKET_URL);
        socket.on('market_update', () => fetchDataRef.current?.());
        return () => { socket.disconnect(); };
    }, []);

    useEffect(() => {
        // Polling Backup + Inicialização
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [fetchData]); // Recria o intervalo se mudar o Timeframe

    // --- COTAÇÃO ---
    useEffect(() => {
        const getQuote = async () => {
            if (!amount || parseInt(amount) <= 0) {
                setQuote(null); return;
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

    // --- AÇÃO ---
    const handleTrade = async (type: 'buy' | 'sell') => {
        if (!amount || loading) return;
        setLoading(true);
        try {
            await api.post('/exchange/trade', { action: type, amount: parseInt(amount) });
            toast.success("Ordem Executada!");
            setAmount('');
            setQuote(null);
            await fetchData(); 
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Erro");
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER ---
    return (
        <div className="p-4 space-y-4 pb-24 max-w-4xl mx-auto">
            
            <MarketHeader 
                price={price} 
                supply={marketParams.supply} 
                volume={history.length} 
            />

            <TimeframeSelector 
                selected={timeframe} 
                onSelect={setTimeframe} 
            />

            <ChartSection 
                data={history} 
                chartLines={chartLines} 
            />

            <TradePanel 
                amount={amount}
                setAmount={setAmount}
                balanceGlue={dbUser?.saldo_glue || 0}
                balanceCoins={dbUser?.saldo_coins || 0}
                quote={quote}
                loading={loading}
                onTrade={handleTrade}
            />
        </div>
    );
}