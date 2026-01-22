import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, RadioButtonUnchecked, Stars, MonetizationOn } from '@mui/icons-material';

export default function ArenaQuests() {
    const { dbUser } = useAuth();
    const [quests, setQuests] = useState<any[]>([]);

    useEffect(() => {
        api.get(`arena/quests?email=${dbUser?.email}`).then(res => setQuests(res.data));
    }, [dbUser]);

    return (
        <div className="p-4 space-y-6 pb-24 animate-fade-in">
            <header>
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter italic">Missões</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Complete desafios e fique rico</p>
            </header>

            <div className="space-y-3">
                {quests.map(q => (
                    <div 
                        key={q.id} 
                        className={`p-5 rounded-3xl border transition-all ${
                            q.concluida 
                            ? 'bg-emerald-500/10 border-emerald-500/20 opacity-80' 
                            : 'bg-slate-900 border-slate-800'
                        }`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h3 className={`font-black text-sm uppercase ${q.concluida ? 'text-emerald-400 line-through' : 'text-white'}`}>
                                    {q.titulo}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium leading-tight">{q.desc}</p>
                            </div>
                            {q.concluida ? (
                                <CheckCircle className="text-emerald-500" />
                            ) : (
                                <RadioButtonUnchecked className="text-slate-700" />
                            )}
                        </div>

                        <div className="mt-4 flex items-center gap-4">
                            <div className="flex items-center gap-1 text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-lg">
                                <MonetizationOn sx={{ fontSize: 12 }} /> +{q.premio}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-1 rounded-lg">
                                <Stars sx={{ fontSize: 12 }} /> +{q.xp} XP
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Teaser de Temporada */}
            <div className="bg-gradient-to-r from-purple-900/40 to-slate-900 p-6 rounded-3xl border border-purple-500/20 text-center">
                <p className="text-[10px] text-purple-300 font-bold uppercase tracking-widest mb-1">Próxima Temporada</p>
                <h4 className="text-white font-black text-xs uppercase">Skins exclusivas para o TOP 10 do Ranking</h4>
            </div>
        </div>
    );
}