// client/src/components/arena/TradingChart.tsx
import {
  createChart,
  ColorType,
  type IChartApi,
  CandlestickSeries,
  type ISeriesApi,
  type Time
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';

// Nova interface para as linhas de preço
interface PriceLineData {
  price: number;
  color: string;
  title: string;
}

interface ChartProps {
  data: { time: number; open: number; high: number; low: number; close: number }[];
  priceLines?: PriceLineData[]; // <--- Adicionado
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
  };
}

export const TradingChart = (props: ChartProps) => {
  const {
    data,
    priceLines = [], // Default vazio
    colors: {
      backgroundColor = '#0f172a',
      textColor = '#94a3b8',
    } = {},
  } = props;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  // Guardar referências das linhas criadas para poder remover depois
  const linesRef = useRef<any[]>([]);

  // Setup inicial (Simplificado para caber na resposta - mantenha o seu createChart original)
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: backgroundColor }, textColor },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      timeScale: { timeVisible: true, secondsVisible: true }
    });
    chartRef.current = chart;
    // Dentro do useEffect de setup inicial no seu TradingChart.tsx:

    const newSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      // 🔥 ADICIONE ESTAS DUAS LINHAS PARA LIMPAR O GRÁFICO:
      lastValueVisible: false, // Esconde a etiqueta de preço padrão no eixo Y
      priceLineVisible: false, // Esconde a linha horizontal automática da lib
    });
    seriesRef.current = newSeries;

    const formattedData = data.map(item => ({ ...item, time: item.time as Time }));
    newSeries.setData(formattedData);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [backgroundColor, textColor]); // Removi 'data' daqui para não recriar o chart toda hora

  // EFEITO 2: Atualiza dados E Linhas de Preço
  useEffect(() => {
    if (seriesRef.current) {
      // Atualiza Candles
      if (data.length > 0) {
        const formattedData = data.map(item => ({ ...item, time: item.time as Time }));
        seriesRef.current.setData(formattedData);
      }

      // Atualiza Linhas (Bid/Ask)
      // 1. Limpa antigas
      linesRef.current.forEach(line => seriesRef.current?.removePriceLine(line));
      linesRef.current = [];

      // 2. Adiciona novas
      priceLines.forEach(lineData => {
        const line = seriesRef.current?.createPriceLine({
          price: lineData.price,
          color: lineData.color,
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: lineData.title,
        });
        linesRef.current.push(line);
      });
    }
  }, [data, priceLines]); // Roda quando data ou priceLines mudam

  return <div ref={chartContainerRef} className="w-full h-[300px] relative" />;
};