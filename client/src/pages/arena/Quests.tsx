// client/src/pages/arena/Quests.tsx
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
    CheckCircle,
    MonetizationOn,
    MilitaryTech,
    Bolt // Trocamos Zap por Bolt
} from '@mui/icons-material';
// Removi o RadioButtonUnchecked que não estava sendo usado
import { CircularProgress } from '@mui/material';

export default function ArenaQuests() {
    const { dbUser } = useAuth();
    const [quests, setQuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (dbUser?.email) {
            api.get(`arena/quests?email=${dbUser.email}`)
                .then(res => {
                    setQuests(res.data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [dbUser]);

    return (
        <div className="p-4 pb-28 space-y-8 animate-fade-in">

            {/* HEADER GAMER */}
            <header className="relative py-4">
                <div className="absolute -left-2 top-0 w-1 h-12 bg-yellow-500 rounded-full"></div>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">
                    Missões <span className="text-yellow-500 text-sm block not-italic font-mono">SEASON 01</span>
                </h2>
            </header>

            {loading ? (
                <div className="flex justify-center py-20"><CircularProgress color="secondary" /></div>
            ) : (
                <div className="grid gap-4">
                    {quests.map((q) => (
                        <div
                            key={q.id}
                            className={`relative overflow-hidden p-5 rounded-3xl border-2 transition-all active:scale-[0.98] ${q.concluida
                                    ? 'bg-emerald-500/5 border-emerald-500/20 grayscale-[0.5]'
                                    : 'bg-slate-900 border-slate-800 shadow-xl shadow-black/20'
                                }`}
                        >
                            {/* Badge de Recompensa no canto */}
                            <div className="absolute top-0 right-0 bg-slate-800 px-3 py-1 rounded-bl-2xl border-l border-b border-slate-700 flex items-center gap-2">
                                <MonetizationOn className="text-yellow-500" sx={{ fontSize: 14 }} />
                                <span className="text-[10px] font-black text-white">{q.premio}</span>
                            </div>

                            <div className="flex gap-4">
                                <div className={`mt-1 rounded-xl w-12 h-12 flex items-center justify-center shrink-0 ${q.concluida ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-950 text-slate-600'
                                    }`}>
                                    {q.concluida ? <CheckCircle /> : <MilitaryTech />}
                                </div>

                                <div className="space-y-1 pr-10">
                                    <h3 className={`text-sm font-black uppercase tracking-tight ${q.concluida ? 'text-emerald-400 line-through' : 'text-white'}`}>
                                        {q.titulo}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium leading-tight italic">
                                        {q.desc}
                                    </p>
                                </div>
                            </div>

                            {/* Barra de Status Inferior */}
                            <div className="mt-4 flex items-center justify-between border-t border-slate-800/50 pt-3">
                                <div className="flex items-center gap-1 text-[9px] font-black text-purple-400 uppercase">
                                    <Bolt sx={{ fontSize: 10 }} /> +{q.xp} XP EXPERIÊNCIA
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${q.concluida ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-400'
                                    }`}>
                                    {q.concluida ? 'COMPLETA' : 'EM ANDAMENTO'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* FOOTER - TEASER DE SKINS */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 p-6 rounded-3xl border border-indigo-500/20 relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Loja de Avatares</p>
                    <h4 className="text-white font-black text-sm uppercase italic">Skins exclusivas chegando...</h4>
                    <div className="mt-4 flex -space-x-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px]">👤</div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}