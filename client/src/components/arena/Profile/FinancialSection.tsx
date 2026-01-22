import { AccountBalanceWallet } from '@mui/icons-material';

interface Props {
    formData: any;
    setFormData: (data: any) => void;
}

export default function FinancialSection({ formData, setFormData }: Props) {
    return (
        <section className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-lg">
            <h3 className="text-emerald-400 font-black uppercase text-xs flex items-center gap-2"><AccountBalanceWallet fontSize="small" /> Financeiro</h3>
            <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Chave PIX</label>
                <input 
                    value={formData.chave_pix} 
                    onChange={e => setFormData({...formData, chave_pix: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-mono outline-none focus:border-emerald-500 transition-colors"
                    placeholder="CPF, Email ou Telefone"
                />
            </div>
        </section>
    );
}