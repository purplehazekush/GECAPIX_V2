// client/src/components/arena/exchange/TimeframeSelector.tsx
interface TimeframeSelectorProps {
    selected: string;
    onSelect: (tf: string) => void;
}

const TIMEFRAMES = ['1', '5', '15', '60'];

export const TimeframeSelector = ({ selected, onSelect }: TimeframeSelectorProps) => {
    return (
        <div className="flex gap-1.5 px-1 animate-fade-in">
            {TIMEFRAMES.map((tf) => (
                <button
                    key={tf}
                    onClick={() => onSelect(tf)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all border ${
                        selected === tf
                            ? 'bg-cyan-500 border-cyan-400 text-slate-900 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                >
                    {tf === '60' ? '1H' : `${tf}M`}
                </button>
            ))}
        </div>
    );
};