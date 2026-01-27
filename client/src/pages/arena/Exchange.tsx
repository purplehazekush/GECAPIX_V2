import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';

// Componentes
import { MarketHeader } from '../../components/arena/exchange/MarketHeader';
import { TimeframeSelector } from '../../components/arena/exchange/TimeframeSelector';
import { ChartSection } from '../../components/arena/exchange/ChartSection';
import { TradePanel } from '../../components/arena/exchange/TradePanel';

const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://72.62.87.8:3001';

export default function ArenaExchange() {
    const { dbUser, reloadUser } = useAuth();
    
    // Estados Globais
    const [history, setHistory] = useState<any[]>([]);
    const [marketParams, setMarketParams] = useState({ base: 0, mult: 0, supply: 0 });
    const [price, setPrice] = useState(0);
    
    // Estados de UI
    const [timeframe, setTimeframe] = useState('1');
    const [amount, setAmount] = useState('');
    const [quote, setQuote] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [chartLines, setChartLines] = useState<any[]>([]);

    // Socket Ref (Para não recriar a conexão)
    const socketRef = useRef<Socket | null>(null);

    // 1. CARGA INICIAL (HTTP)
    const fetchInitialData = useCallback(async () => {
        try {
            const [chartRes, statsRes] = await Promise.all([
                api.get(`/exchange/chart?tf=${timeframe}`),
                api.get('/exchange/admin')
            ]);

            const { basePrice, multiplier, circulatingSupply } = statsRes.data;
            const currentPrice = basePrice * Math.pow(multiplier, circulatingSupply);
            
            setHistory(chartRes.data);
            setMarketParams({ base: basePrice, mult: multiplier, supply: circulatingSupply });
            setPrice(currentPrice);

            // Calcula Linhas Iniciais
            updateChartLines(currentPrice, multiplier, amount);

        } catch (e) { console.error("Sync Error:", e); }
    }, [timeframe]); // Só recria se mudar o Timeframe

    // Helper para atualizar linhas sem depender de estados externos
    const updateChartLines = (currPrice: number, mult: number, amt: string) => {
        const amountNum = Math.max(1, parseInt(amt) || 1);
        setChartLines([
            { price: currPrice * Math.pow(mult, amountNum), color: '#4ade80', title: `ASK (+${amountNum})` },
            { price: currPrice * Math.pow(mult, -amountNum), color: '#f87171', title: `BID (-${amountNum})` }
        ]);
    };

    // 2. CONEXÃO SOCKET (STREAMING)
    useEffect(() => {
        // Carrega dados iniciais
        fetchInitialData();

        // Conecta Socket
        if (!socketRef.current) {
            socketRef.current = io(SOCKET_URL);
        }

        const socket = socketRef.current;

        // Ouve atualizações do mercado
        const handleMarketUpdate = (data: any) => {
            // data = { time, price, supply, ... }
            
            // 1. Atualiza Preço e Supply
            setPrice(data.price);
            setMarketParams(prev => ({ ...prev, supply: data.supply }));
            
            // 2. Atualiza Gráfico (Merge inteligente)
            setHistory(prevHistory => {
                const lastCandle = prevHistory[prevHistory.length - 1];
                
                // Se o timestamp do trade for maior que o último candle + intervalo, cria novo
                // (Lógica simplificada: Para 100% de precisão de timeframe no front, 
                // seria ideal recalcular, mas para UX rápida, injetamos como update do último candle)
                
                if (lastCandle && data.time === lastCandle.time) {
                    // Atualiza candle atual
                    return [
                        ...prevHistory.slice(0, -1),
                        {
                            ...lastCandle,
                            close: data.price,
                            high: Math.max(lastCandle.high, data.price),
                            low: Math.min(lastCandle.low, data.price)
                        }
                    ];
                } else {
                    // Novo candle
                    return [
                        ...prevHistory,
                        {
                            time: data.time,
                            open: data.price, // Simplificação
                            close: data.price,
                            high: data.price,
                            low: data.price
                        }
                    ];
                }
            });

            // Se fui eu que fiz o trade, atualizo meu saldo
            // (Poderíamos filtrar pelo ID do usuário no payload do socket)
            reloadUser?.(); 
        };

        socket.on('market_update', handleMarketUpdate);

        return () => {
            socket.off('market_update', handleMarketUpdate);
            // Não desconectamos aqui para manter a conexão viva ao trocar timeframes se possível,
            // mas por segurança em React, desconectamos no unmount do componente pai.
        };
    }, [fetchInitialData, reloadUser]); // Roda ao mudar timeframe

    // Recalcula linhas quando o usuário digita (Local, sem API)
    useEffect(() => {
        if (price && marketParams.base) {
            updateChartLines(price, marketParams.mult, amount);
        }
    }, [amount, price, marketParams]);

    // --- COTAÇÃO (HTTP - Apenas quando digita) ---
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
        const timer = setTimeout(getQuote, 400); // Debounce
        return () => clearTimeout(timer);
    }, [amount, marketParams]); // Depende dos parametros do mercado

    // --- AÇÃO ---
    const handleTrade = async (type: 'buy' | 'sell') => {
        if (!amount || loading) return;
        setLoading(true);
        try {
            await api.post('/exchange/trade', { action: type, amount: parseInt(amount) });
            toast.success("Ordem Executada!");
            setAmount('');
            setQuote(null);
            // NÃO PRECISAMOS CHAMAR fetchData()! O Socket vai atualizar tudo.
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Erro");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 space-y-4 pb-24 max-w-4xl mx-auto">
            <MarketHeader price={price} supply={marketParams.supply} volume={history.length} />
            <TimeframeSelector selected={timeframe} onSelect={setTimeframe} />
            <ChartSection data={history} chartLines={chartLines} />
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