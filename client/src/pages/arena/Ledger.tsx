import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { 
    History, ArrowUpward, ArrowDownward, 
    SportsEsports, SwapHoriz, Refresh,
    ChevronLeft, ChevronRight
} from '@mui/icons-material';
import UserAvatar from '../../components/arena/UserAvatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Ledger() {
    const [txs, setTxs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchLedger = (pageIndex: number) => {
        setLoading(true);
        // O backend precisa suportar ?page=X (implementamos isso no statsController na resposta anterior)
        api.get(`/tokenomics/ledger?page=${pageIndex}`)
            .then(res => {
                setTxs(res.data);
                setHasMore(res.data.length === 20); // Se vieram 20, provavelmente tem mais
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchLedger(page); }, [page]);

    const getIcon = (tipo: string, desc: string) => {
        if (desc.includes('Aposta') || desc.includes('Vitória') || desc.includes('Reembolso')) return <SportsEsports className="text-purple-400" sx={{ fontSize: 16 }} />;
        if (desc.includes('Transferência') || desc.includes('Recebido')) return <SwapHoriz className="text-cyan-400" sx={{ fontSize: 16 }} />;
        return tipo === 'ENTRADA' ? <ArrowDownward className="text-emerald-400" sx={{ fontSize: 16 }} /> : <ArrowUpward className="text-rose-400" sx={{ fontSize: 16 }} />;
    };

    return (
        <div className="p-4 pb-24 animate-fade-in space-y-6 max-w-lg mx-auto">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Ledger</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase flex items-center gap-1">
                        <History sx={{ fontSize: 12 }} /> Histórico Global • Pág {page + 1}
                    </p>
                </div>
                <button 
                    onClick={() => fetchLedger(page)}
                    className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors text-white"
                >
                    <Refresh className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            <div className="space-y-2 min-h-[400px]">
                {loading && txs.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 font-mono text-xs">Carregando blocos...</div>
                ) : (
                    txs.map((tx, idx) => (
                        <div key={idx} className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between hover:border-purple-500/30 transition-colors animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                            
                            {/* Esquerda: Quem e O Quê */}
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <UserAvatar user={{ avatar_slug: tx.avatar, nome: tx.usuario }} size="sm" />
                                    <div className="absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-0.5 border border-slate-800 flex items-center justify-center">
                                        {getIcon(tx.tipo, tx.descricao)}
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-white">{tx.usuario.split(' ')[0]}</span>
                                        <span className="text-[9px] text-slate-500 font-mono">
                                            {format(new Date(tx.data), "HH:mm • dd/MM", { locale: ptBR })}
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
                    ))
                )}
                
                {!loading && txs.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-xs">Nenhuma transação encontrada.</div>
                )}
            </div>

            {/* Paginação */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button 
                    disabled={page === 0 || loading}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2 rounded-lg bg-slate-900"
                >
                    <ChevronLeft fontSize="small" /> Anterior
                </button>

                <span className="text-[10px] font-mono text-slate-600">PÁGINA {page + 1}</span>

                <button 
                    disabled={!hasMore || loading}
                    onClick={() => setPage(p => p + 1)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2 rounded-lg bg-slate-900"
                >
                    Próximo <ChevronRight fontSize="small" />
                </button>
            </div>
            
            <p className="text-center text-[10px] text-slate-600 uppercase font-mono mt-4">
                Blockchain Explorer v1.0 • Gecapix Chain
            </p>
        </div>
    );
}