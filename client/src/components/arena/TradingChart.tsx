// client/src/components/arena/TradingChart.tsx
import { 
    createChart, 
    ColorType, 
    type IChartApi, 
    CandlestickSeries, 
    type ISeriesApi,
    type Time // <--- Importação necessária para corrigir o erro
 // <--- Importação necessária para corrigir o erro
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';

interface ChartProps {
  // Mantemos 'number' na interface externa para facilitar pra você
  data: { time: number; open: number; high: number; low: number; close: number }[];
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
  };
}

export const TradingChart = (props: ChartProps) => {
  const {
    data,
    colors: {
      backgroundColor = '#0f172a',
      textColor = '#94a3b8',
    } = {},
  } = props;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Criar o Gráfico
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      timeScale: {
         timeVisible: true,
         secondsVisible: true,
      }
    });
    
    chartRef.current = chart;

    // 2. Adicionar Série
    const newSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    
    seriesRef.current = newSeries;
    
    // --- CORREÇÃO DE TIPAGEM AQUI ---
    // Transformamos os dados recebidos para o tipo que a lib exige
    const formattedData = data.map(item => ({
        ...item,
        time: item.time as Time // O pulo do gato: Cast explícito
    }));

    newSeries.setData(formattedData);
    
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [backgroundColor, textColor]); // Dependências limpas

  // Atualização dinâmica de dados
  useEffect(() => {
      if(seriesRef.current && data.length > 0) {
          const formattedData = data.map(item => ({
            ...item,
            time: item.time as Time
          }));
          seriesRef.current.setData(formattedData);
      }
  }, [data]);

  return (
    <div ref={chartContainerRef} className="w-full h-[300px] relative" />
  );
};