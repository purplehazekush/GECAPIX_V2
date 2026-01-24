import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { 
    History, ArrowUpward, ArrowDownward, 
    SportsEsports, SwapHoriz, Refresh 
} from '@mui/icons-material';
import UserAvatar from '../../components/arena/UserAvatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Ledger() {
    const [txs, setTxs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLedger = () => {
        setLoading(true);
        api.get('/tokenomics/ledger')
            .then(res => setTxs(res.data))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchLedger(); }, []);

    const getIcon = (tipo: string, desc: string) => {
        if (desc.includes('Aposta') || desc.includes('Vitória')) return <SportsEsports className="text-purple-400"/>;
        if (desc.includes('Transferência') || desc.includes('Recebido')) return <SwapHoriz className="text-cyan-400"/>;
        return tipo === 'ENTRADA' ? <ArrowDownward className="text-emerald-400"/> : <ArrowUpward className="text-rose-400"/>;
    };

    return (
        <div className="p-4 pb-24 animate-fade-in space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Ledger</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase flex items-center gap-1">
                        <History sx={{ fontSize: 12 }} /> Histórico Global
                    </p>
                </div>
                <button 
                    onClick={fetchLedger}
                    className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                >
                    <Refresh className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            <div className="space-y-2">
                {txs.map((tx, idx) => (
                    <div key={idx} className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
                        
                        {/* Esquerda: Quem e O Quê */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <UserAvatar user={{ avatar_slug: tx.avatar, nome: tx.usuario }} size="sm" />
                                <div className="absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-0.5 border border-slate-800">
                                    {getIcon(tx.tipo, tx.descricao)}
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">{tx.usuario.split(' ')[0]}</span>
                                    <span className="text-[9px] text-slate-500 font-mono">
                                        {format(new Date(tx.data), "HH:mm", { locale: ptBR })}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 uppercase font-medium max-w-[150px] truncate">
                                    {tx.descricao}
                                </p>
                            </div>
                        </div>

                        {/* Direita: Valor */}
                        <div className={`font-mono font-black text-sm ${
                            tx.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                            {tx.tipo === 'ENTRADA' ? '+' : '-'}{tx.valor}
                        </div>
                    </div>
                ))}
            </div>
            
            <p className="text-center text-[10px] text-slate-600 uppercase font-mono mt-8">
                Blockchain Explorer v0.1 • Gecapix Chain
            </p>
        </div>
    );
}