// client/src/pages/arena/Quests.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
    CheckCircle, MonetizationOn, Bolt, ArrowForward, Redeem, Lock,
    CalendarToday, DateRange, EmojiEvents, History
} from '@mui/icons-material';
import { CircularProgress, Tabs, Tab } from '@mui/material';

export default function ArenaQuests() {
    const { dbUser, setDbUser } = useAuth();
    const navigate = useNavigate();
    
    const [quests, setQuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState<string | null>(null);
    const [tab, setTab] = useState(0); // 0=Diaria, 1=Semanal, 2=Conquistas, 3=Historico

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
        if (quest.auto_check) { toast('Automático.', { icon: '🤖' }); return; }

        if (quest.check_backend) await doClaim(quest);
        else {
            if (quest.rota_acao) { navigate(quest.rota_acao); toast('Faça a ação e volte!', { icon: '🚀' }); }
            else await doClaim(quest);
        }
    };

    const doClaim = async (quest: any) => {
        setClaiming(quest.id);
        const toastId = toast.loading("Validando...");
        try {
            const res = await api.post('arena/quests/claim', { email: dbUser?.email, questId: quest.id });
            toast.success(res.data.message, { id: toastId });
            fetchQuests();
            if (dbUser) setDbUser({ ...dbUser, saldo_coins: dbUser.saldo_coins + quest.premio_coins, xp: dbUser.xp + quest.premio_xp });
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Requisito não atendido.", { id: toastId });
            if (quest.rota_acao) setTimeout(() => navigate(quest.rota_acao), 1500);
        } finally { setClaiming(null); }
    };

    // Filtros
    
    const getList = () => {
        if (tab === 3) return quests.filter(q => q.vezes_completada > 0); // Histórico
        const freq = tab === 0 ? 'DIARIA' : (tab === 1 ? 'SEMANAL' : 'UNICA');
        // Mostra apenas as NÃO concluídas nas abas principais (Para limpar a tela)
        return quests.filter(q => q.frequencia === freq && !q.concluida);
    };

    return (
        <div className="p-4 pb-28 space-y-6 animate-fade-in max-w-lg mx-auto">
            <header className="relative py-4">
                <div className="absolute -left-2 top-0 w-1 h-12 bg-yellow-500 rounded-full"></div>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">
                    Missões <span className="text-yellow-500 text-sm block not-italic font-mono">SEASON 01</span>
                </h2>
                <p className="text-xs text-slate-400 mt-2">Farm diário de XP e Coins.</p>
            </header>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" indicatorColor="secondary" variant="scrollable" scrollButtons="auto" className="bg-slate-900 rounded-xl border border-slate-800">
                <Tab icon={<CalendarToday sx={{fontSize:16}}/>} iconPosition="start" label={<span className="text-[10px] font-black">HOJE</span>} />
                <Tab icon={<DateRange sx={{fontSize:16}}/>} iconPosition="start" label={<span className="text-[10px] font-black">SEMANA</span>} />
                <Tab icon={<EmojiEvents sx={{fontSize:16}}/>} iconPosition="start" label={<span className="text-[10px] font-black">ÚNICAS</span>} />
                <Tab icon={<History sx={{fontSize:16}}/>} iconPosition="start" label={<span className="text-[10px] font-black">HISTÓRICO</span>} />
            </Tabs>

            {loading ? <div className="flex justify-center py-20"><CircularProgress color="secondary" /></div> : (
                <div className="grid gap-4">
                    {getList().length === 0 && (
                        <div className="text-center py-10 opacity-50 border-2 border-dashed border-slate-800 rounded-2xl">
                            <CheckCircle sx={{fontSize: 40}} className="mb-2"/>
                            <p className="text-xs font-bold">{tab === 3 ? "Nenhuma missão completada ainda." : "Tudo feito por aqui!"}</p>
                        </div>
                    )}

                    {getList().map((q) => (
                        <div key={q.id} className={`relative overflow-hidden p-4 rounded-2xl border transition-all ${
                            q.concluida || tab === 3 ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-slate-900 border-slate-800'
                        }`}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-sm font-black uppercase text-white">{q.titulo}</h3>
                                {tab === 3 ? (
                                    <span className="text-[10px] font-bold bg-slate-800 px-2 py-1 rounded text-emerald-400">
                                        {q.vezes_completada}x Concluída
                                    </span>
                                ) : (
                                    <div className="flex gap-2">
                                        <span className="text-[10px] font-bold text-yellow-400 flex items-center gap-1"><MonetizationOn sx={{fontSize:12}}/>{q.premio_coins}</span>
                                        <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1"><Bolt sx={{fontSize:12}}/>{q.premio_xp}</span>
                                    </div>
                                )}
                            </div>
                            
                            <p className="text-[11px] text-slate-400 font-medium mb-4">{q.desc}</p>

                            {/* Botão só aparece se NÃO for aba histórico e NÃO estiver concluída */}
                            {tab !== 3 && !q.concluida && (
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
                                            {q.auto_check ? 'AUTOMÁTICO' : (q.check_backend ? 'RESGATAR' : 'IR FAZER')}
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