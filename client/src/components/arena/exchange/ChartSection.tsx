// client/src/components/arena/exchange/ChartSection.tsx
import { TradingChart } from '../TradingChart'; // Importe o componente que já existe

interface ChartSectionProps {
    data: any[];
    chartLines: any[];
    loading?: boolean;
}

export const ChartSection = ({ data, chartLines, loading }: ChartSectionProps) => {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl h-[300px] relative animate-fade-in">
            {data.length > 0 ? (
                <TradingChart data={data} priceLines={chartLines} />
            ) : (
                <div className="h-full flex items-center justify-center text-slate-600 font-mono text-[10px] animate-pulse">
                    {loading ? "CONECTANDO AO MERCADO..." : "CARREGANDO BOOK..."}
                </div>
            )}
        </div>
    );
};