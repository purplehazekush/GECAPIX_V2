import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
    CheckCircle, MonetizationOn, Bolt, ArrowForward, Redeem, Lock,
    CalendarToday, DateRange, EmojiEvents
} from '@mui/icons-material';
import { CircularProgress, Tabs, Tab } from '@mui/material';

export default function ArenaQuests() {
    const { dbUser, setDbUser } = useAuth();
    const navigate = useNavigate();
    
    const [quests, setQuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);
    const [tab, setTab] = useState(0); // 0=Diaria, 1=Semanal, 2=Unica

    const fetchQuests = () => {
        if (dbUser?.email) {
            api.get(`arena/quests?email=${dbUser.email}`)
                .then((res: any) => { setQuests(res.data); setLoading(false); })
                .catch(() => setLoading(false));
        }
    };

    useEffect(() => { fetchQuests(); }, [dbUser]);

    const handleAction = async (quest: any) => {
        if (quest.concluida) return;
        if (quest.auto_check) {
            toast('Esta missão completa automaticamente.', { icon: '🤖' });
            return;
        }

        if (quest.check_backend) {
            await doClaim(quest);
        } else {
            if (quest.rota_acao) {
                navigate(quest.rota_acao);
                toast('Faça a ação e volte aqui!', { icon: '🚀' });
            } else {
                 await doClaim(quest);
            }
        }
    };

    const doClaim = async (quest: any) => {
        setClaiming(quest.id);
        const toastId = toast.loading("Verificando...");
        try {
            const res = await api.post('arena/quests/claim', { email: dbUser?.email, questId: quest.id });
            toast.success(res.data.message, { id: toastId });
            fetchQuests();
            if (dbUser) setDbUser({ ...dbUser, saldo_coins: dbUser.saldo_coins + quest.premio_coins, xp: dbUser.xp + quest.premio_xp });
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Requisito não atendido.", { id: toastId });
            if (quest.rota_acao) setTimeout(() => navigate(quest.rota_acao), 1500);
        } finally {
            setClaiming(null);
        }
    };

    // Filtra as quests pela aba selecionada
    const getFilteredQuests = () => {
        if (tab === 0) return quests.filter(q => q.frequencia === 'DIARIA');
        if (tab === 1) return quests.filter(q => q.frequencia === 'SEMANAL');
        return quests.filter(q => q.frequencia === 'UNICA');
    };

    return (
        <div className="p-4 pb-28 space-y-6 animate-fade-in max-w-lg mx-auto">
            <header className="relative py-4">
                <div className="absolute -left-2 top-0 w-1 h-12 bg-yellow-500 rounded-full"></div>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">
                    Missões <span className="text-yellow-500 text-sm block not-italic font-mono">SEASON 01</span>
                </h2>
                <p className="text-xs text-slate-400 mt-2">Complete tarefas para ganhar XP e Coins.</p>
            </header>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" indicatorColor="secondary" variant="fullWidth" className="bg-slate-900 rounded-xl border border-slate-800">
                <Tab icon={<CalendarToday sx={{fontSize:16}}/>} iconPosition="start" label={<span className="text-[10px] font-black">DIÁRIAS</span>} />
                <Tab icon={<DateRange sx={{fontSize:16}}/>} iconPosition="start" label={<span className="text-[10px] font-black">SEMANAIS</span>} />
                <Tab icon={<EmojiEvents sx={{fontSize:16}}/>} iconPosition="start" label={<span className="text-[10px] font-black">CONQUISTAS</span>} />
            </Tabs>

            {loading ? (
                <div className="flex justify-center py-20"><CircularProgress color="secondary" /></div>
            ) : (
                <div className="grid gap-4">
                    {getFilteredQuests().length === 0 && (
                        <p className="text-center text-slate-500 text-xs py-10">Nenhuma missão disponível nesta categoria.</p>
                    )}

                    {getFilteredQuests().map((q) => (
                        <div key={q.id} className={`relative overflow-hidden p-4 rounded-2xl border transition-all ${
                            q.concluida ? 'bg-emerald-900/10 border-emerald-500/20 grayscale-[0.3]' : 'bg-slate-900 border-slate-800'
                        }`}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className={`text-sm font-black uppercase ${q.concluida ? 'text-emerald-400 line-through' : 'text-white'}`}>{q.titulo}</h3>
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-bold text-yellow-400 flex items-center gap-1"><MonetizationOn sx={{fontSize:12}}/>{q.premio_coins}</span>
                                    <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1"><Bolt sx={{fontSize:12}}/>{q.premio_xp}</span>
                                </div>
                            </div>
                            
                            <p className="text-[11px] text-slate-400 font-medium mb-4">{q.desc}</p>

                            {q.concluida ? (
                                <div className="flex justify-between items-center border-t border-slate-800 pt-2">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Reset: {q.frequencia === 'DIARIA' ? '00:00' : (q.frequencia === 'SEMANAL' ? 'Domingo' : 'Nunca')}</span>
                                    <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1"><CheckCircle sx={{fontSize:12}}/> CONCLUÍDA</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleAction(q)}
                                    disabled={claiming === q.id || q.auto_check}
                                    className={`w-full py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95 ${
                                        q.auto_check ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 
                                        q.check_backend ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                                    }`}
                                >
                                    {claiming === q.id ? <CircularProgress size={10} color="inherit" /> : (
                                        <>
                                            {q.auto_check ? <Lock sx={{ fontSize: 12 }} /> : (q.check_backend ? <Redeem sx={{ fontSize: 12 }} /> : <ArrowForward sx={{ fontSize: 12 }} />)}
                                            {q.auto_check ? 'AUTOMÁTICO' : (q.check_backend ? 'RESGATAR RECOMPENSA' : 'IR FAZER')}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}