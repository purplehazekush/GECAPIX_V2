// client/src/components/arena/exchange/MarketHeader.tsx
interface MarketHeaderProps {
    price: number;
    supply: number;
    volume: number;
}

export const MarketHeader = ({ price, supply, volume }: MarketHeaderProps) => {
    return (
        <div className="flex justify-between items-end px-2 animate-fade-in">
            <div>
                <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Preço GLUE/COIN</h2>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white font-mono tracking-tighter">
                        {price.toFixed(2)}
                    </span>
                    <span className="text-slate-500 text-xs font-mono">COINS</span>
                </div>
            </div>
            <div className="text-right">
                <div className="text-[10px] text-cyan-400 font-mono mb-1">SUPPLY: {supply.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 font-mono italic">VOL: {volume} CANDLES</div>
            </div>
        </div>
    );
};