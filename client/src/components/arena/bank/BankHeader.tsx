// client/src/components/arena/bank/BankHeader.tsx
import { AccountBalance, MonetizationOn } from '@mui/icons-material';

interface BankHeaderProps {
    seasonId?: number;
    totalNetWorth: number;
}

export const BankHeader = ({ seasonId, totalNetWorth }: BankHeaderProps) => {
    return (
        <header className="flex items-center justify-between mb-4 animate-fade-in">
            <div>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter flex items-center gap-2">
                    <AccountBalance className="text-emerald-500" fontSize="large"/> Banco Central
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Autoridade Monetária • Season {seasonId || 1}
                </p>
            </div>
            <div className="text-right bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-lg">
                 <p className="text-[9px] text-slate-500 font-bold uppercase">Patrimônio Líquido</p>
                 <p className="text-lg font-black text-emerald-400 flex items-center justify-end gap-1">
                    <MonetizationOn sx={{fontSize:18}}/> 
                    {totalNetWorth.toLocaleString()}
                 </p>
            </div>
        </header>
    );
};