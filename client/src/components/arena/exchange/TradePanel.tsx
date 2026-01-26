// client/src/components/arena/exchange/TradePanel.tsx
interface QuoteData {
    buyTotal: number;
    sellTotal: number;
    buyImpact: number;
    sellImpact: number;
}

interface TradePanelProps {
    amount: string;
    setAmount: (val: string) => void;
    balanceGlue: number;
    balanceCoins: number;
    quote: QuoteData | null;
    loading: boolean;
    onTrade: (type: 'buy' | 'sell') => void;
}

export const TradePanel = ({ 
    amount, setAmount, balanceGlue, balanceCoins, quote, loading, onTrade 
}: TradePanelProps) => {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in">
            {/* Input Quantidade */}
            <div className="relative mb-6">
                <div className="flex justify-between items-center mb-2 px-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Quantidade</label>
                    <span className="text-[10px] text-slate-500 font-mono">Saldo: {balanceGlue} GLUE</span>
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

            {/* Grid de Botões */}
            <div className="grid grid-cols-2 gap-4">
                {/* COMPRAR */}
                <div className="space-y-3">
                    <div className="bg-slate-950/40 rounded-xl p-3 border border-emerald-500/10 text-center min-h-[60px] flex flex-col justify-center">
                        <span className="text-[9px] text-slate-500 block leading-none mb-1">CUSTO ESTIMADO</span>
                        <span className="text-lg font-mono font-bold text-emerald-400 leading-none">
                            {quote?.buyTotal ? `≈ ${quote.buyTotal.toLocaleString()}` : '---'}
                        </span>
                    </div>
                    <button
                        onClick={() => onTrade('buy')}
                        disabled={loading || !amount}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-lg"
                    >
                        COMPRAR
                    </button>
                </div>

                {/* VENDER */}
                <div className="space-y-3">
                    <div className="bg-slate-950/40 rounded-xl p-3 border border-red-500/10 text-center min-h-[60px] flex flex-col justify-center">
                        <span className="text-[9px] text-slate-500 block leading-none mb-1">RECEBIMENTO</span>
                        <span className="text-lg font-mono font-bold text-red-400 leading-none">
                            {quote?.sellTotal ? `≈ ${quote.sellTotal.toLocaleString()}` : '---'}
                        </span>
                    </div>
                    <button
                        onClick={() => onTrade('sell')}
                        disabled={loading || !amount}
                        className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-lg"
                    >
                        VENDER
                    </button>
                </div>
            </div>

            {/* Rodapé Saldo */}
            <div className="mt-6 pt-4 border-t border-slate-800/50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500">SALDO EM CONTA</span>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-yellow-500 font-bold">
                        {balanceCoins?.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold">COINS</span>
                </div>
            </div>
        </div>
    );
};