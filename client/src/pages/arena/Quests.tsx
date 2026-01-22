import { Assignment, CheckCircle, Lock } from '@mui/icons-material';

export default function ArenaQuests() {
    const quests = [
        { id: 1, titulo: 'Check-in Diário', desc: 'Logue hoje no GECAPIX', premio: '50 Coins', status: 'concluido' },
        { id: 2, titulo: 'Mestre do Pix', desc: 'Identifique 3 compras no bar', premio: '200 Coins', status: 'disponivel' },
        { id: 3, titulo: 'O Infiltrado', desc: 'Indique alguém da Civil', premio: '500 Coins', status: 'bloqueado' },
    ];

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-xl font-black italic text-white mb-6 uppercase tracking-tighter">Missões Disponíveis</h2>
            
            {quests.map(q => (
                <div key={q.id} className={`p-4 rounded-2xl border ${q.status === 'concluido' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800'} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${q.status === 'concluido' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            {q.status === 'concluido' ? <CheckCircle /> : q.status === 'bloqueado' ? <Lock /> : <Assignment />}
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${q.status === 'concluido' ? 'text-emerald-400' : 'text-white'}`}>{q.titulo}</h4>
                            <p className="text-[10px] text-slate-500">{q.desc}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-black text-yellow-500 block uppercase">{q.premio}</span>
                        {q.status === 'disponivel' && <button className="mt-1 text-[9px] bg-slate-800 px-2 py-1 rounded text-white font-bold">FAZER</button>}
                    </div>
                </div>
            ))}
        </div>
    );
}