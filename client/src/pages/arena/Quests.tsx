import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
    CheckCircle,
    MonetizationOn,
    MilitaryTech,
    Bolt,
    ArrowForward,
    Redeem
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

export default function ArenaQuests() {
    const { dbUser, setDbUser } = useAuth(); // setDbUser para atualizar saldo na hora
    const navigate = useNavigate();
    const [quests, setQuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);

    const fetchQuests = () => {
        if (dbUser?.email) {
            api.get(`arena/quests?email=${dbUser.email}`)
                .then((res: any) => {
                    setQuests(res.data);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    };

    useEffect(() => {
        fetchQuests();
    }, [dbUser]);

    const handleClaim = async (quest: any) => {
        // Se tem rota de ação e não é verificação manual, leva o usuário lá
        if (quest.rota_acao && !quest.concluida && quest.id !== 'm2') {
            navigate(quest.rota_acao);
            return;
        }

        // Tenta Reivindicar (Para m2 ou outras manuais)
        setClaiming(quest.id);
        const toastId = toast.loading("Verificando missão...");

        try {
            const res = await api.post('arena/quests/claim', {
                email: dbUser?.email,
                questId: quest.id
            });

            // Sucesso!
            toast.success(res.data.message || "Recompensa resgatada!", { id: toastId });
            
            // Atualiza a lista e o saldo do usuário localmente
            fetchQuests();
            if (dbUser) {
                setDbUser({
                    ...dbUser,
                    saldo_coins: dbUser.saldo_coins + quest.premio_coins,
                    xp: dbUser.xp + quest.premio_xp
                });
            }

        } catch (error: any) {
            // Se der erro (ex: ainda não fez), avisa
            const msg = error.response?.data?.error || "Você ainda não completou os requisitos.";
            toast.error(msg, { id: toastId });
            
            // Se for erro de requisito, redireciona para fazer
            if (quest.rota_acao) {
                setTimeout(() => navigate(quest.rota_acao), 1500);
            }
        } finally {
            setClaiming(null);
        }
    };

    return (
        <div className="p-4 pb-28 space-y-8 animate-fade-in max-w-lg mx-auto">

            {/* HEADER GAMER */}
            <header className="relative py-4">
                <div className="absolute -left-2 top-0 w-1 h-12 bg-yellow-500 rounded-full"></div>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">
                    Missões <span className="text-yellow-500 text-sm block not-italic font-mono">SEASON 01</span>
                </h2>
                <p className="text-xs text-slate-400 mt-2">Complete tarefas para ganhar XP e Coins.</p>
            </header>

            {loading ? (
                <div className="flex justify-center py-20"><CircularProgress color="secondary" /></div>
            ) : (
                <div className="grid gap-5">
                    {quests.map((q) => (
                        <div
                            key={q.id}
                            className={`relative overflow-hidden p-5 rounded-3xl border-2 transition-all ${
                                q.concluida
                                    ? 'bg-emerald-900/10 border-emerald-500/20 grayscale-[0.3]'
                                    : 'bg-slate-900 border-slate-800 shadow-xl shadow-black/40'
                            }`}
                        >
                            {/* Badge de Recompensa */}
                            <div className="absolute top-0 right-0 bg-slate-800 px-3 py-1 rounded-bl-2xl border-l border-b border-slate-700 flex items-center gap-2 z-10">
                                <MonetizationOn className="text-yellow-500" sx={{ fontSize: 14 }} />
                                <span className="text-[10px] font-black text-white">{q.premio_coins}</span>
                            </div>

                            <div className="flex gap-4 items-start relative z-10">
                                {/* Ícone Status */}
                                <div className={`mt-1 rounded-xl w-12 h-12 flex items-center justify-center shrink-0 border ${
                                    q.concluida 
                                        ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' 
                                        : 'bg-slate-800 text-slate-500 border-slate-700'
                                }`}>
                                    {q.concluida ? <CheckCircle /> : <MilitaryTech />}
                                </div>

                                <div className="space-y-1 flex-1">
                                    <h3 className={`text-sm font-black uppercase tracking-tight ${q.concluida ? 'text-emerald-400 line-through decoration-emerald-500/50' : 'text-white'}`}>
                                        {q.titulo}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-medium leading-tight">
                                        {q.desc}
                                    </p>
                                </div>
                            </div>

                            {/* BARRA DE AÇÃO */}
                            <div className="mt-5 flex items-center justify-between border-t border-slate-800/50 pt-3 relative z-10">
                                <div className="flex items-center gap-1 text-[9px] font-black text-purple-400 uppercase">
                                    <Bolt sx={{ fontSize: 10 }} /> +{q.premio_xp} XP
                                </div>
                                
                                {q.concluida ? (
                                    <span className="text-[9px] font-black uppercase px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                                        <CheckCircle sx={{ fontSize: 10 }} /> COMPLETA
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => handleClaim(q)}
                                        disabled={claiming === q.id}
                                        className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full flex items-center gap-1 transition-all active:scale-95 ${
                                            q.id === 'm2' // Missão de Investir (Manual Check)
                                                ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-600/20'
                                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                                        }`}
                                    >
                                        {claiming === q.id ? (
                                            <CircularProgress size={10} color="inherit" />
                                        ) : (
                                            <>
                                                {q.id === 'm2' ? <Redeem sx={{ fontSize: 12 }} /> : <ArrowForward sx={{ fontSize: 12 }} />}
                                                {q.id === 'm2' ? 'RESGATAR' : 'IR FAZER'}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}