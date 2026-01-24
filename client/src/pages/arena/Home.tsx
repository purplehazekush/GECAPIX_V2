// client/src/pages/arena/Home.tsx
import { useAuth } from '../../context/AuthContext';
import UserAvatar from '../../components/arena/UserAvatar'; // Seu novo componente pixelado
import {
    MonetizationOn, LocalActivity,
    SportsEsports, Science, RocketLaunch, Assignment,
    ContentCopy, WhatsApp, QrCodeScanner, ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Função auxiliar visual (apenas para renderizar a barra)
const getLevelInfo = (totalXp: number) => {
    let nivel = 1;
    let xpNecessario = 100;
    let xpRestante = totalXp;

    while (xpRestante >= xpNecessario) {
        xpRestante -= xpNecessario;
        nivel++;
        xpNecessario = nivel * 100;
    }

    // Retorna: 
    // current: quanto tem na barra atual (ex: 40)
    // max: quanto precisa pra encher (ex: 300)
    // level: nível atual calculado
    return { current: xpRestante, max: xpNecessario, level: nivel };
};


export default function ArenaHome() {
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    const { current, max, level } = getLevelInfo(dbUser?.xp || 0);
    const progresso = Math.min((current / max) * 100, 100);

    const copyCode = () => {
        navigator.clipboard.writeText(dbUser?.codigo_referencia || "");
        toast.success("Código copiado! Cole no grupo da sala.", {
            icon: '📋',
            style: { background: '#1e293b', color: '#fff' }
        });
    };

    const shareWhatsapp = () => {
        const texto = window.encodeURIComponent(
            `Vem pra Arena GECAPIX! 🏟️\nUse meu código: *${dbUser?.codigo_referencia}* e já comece com bônus de moedas!\n\nEntre aqui: https://gecapix-v2.vercel.app`
        );
        window.open(`https://wa.me/?text=${texto}`, '_blank');
    };

    return (
        <div className="pb-28 space-y-6 animate-fade-in relative">

            {/* 1. TICKER DE NOTÍCIAS */}
            <div className="bg-yellow-500/10 border-y border-yellow-500/20 overflow-hidden py-1 whitespace-nowrap">
                <div className="animate-marquee inline-block text-[10px] font-mono text-yellow-500 font-bold uppercase tracking-widest px-4">
                    📢 SEASON 01 NO AR • CAMPEONATO DE LIG 4 VALENDO XP EM DOBRO • PROIBIDO USAR BOT NO XADREZ • FESTA DO MEIO ENGENHEIRO VEM AÍ •
                </div>
            </div>

            {/* 2. HUD PRINCIPAL */}
            <div className="px-4 pt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div onClick={() => navigate('/arena/perfil')}>
                        {/* Mostra o Nível Calculado */}
                        <UserAvatar user={{...dbUser, nivel: level}} size="lg" showLevel={true} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white italic leading-none uppercase">
                            {dbUser?.nome?.split(' ')[0] || 'RECRUTA'}
                        </h1>
                        <div className="flex items-center gap-1 text-slate-400 text-xs font-mono mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {dbUser?.classe || 'Novato'} • Lvl {level}
                        </div>
                    </div>
                </div>

                {/* BANCO */}
                <div className="text-right">
                    <p className="text-[9px] text-cyan-400 font-black tracking-widest uppercase mb-1">SALDO</p>
                    <div
                        onClick={() => navigate('/arena/transferir')}
                        className="bg-slate-900 border border-cyan-500/30 rounded-xl px-3 py-2 flex items-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.1)] active:scale-95 transition-transform cursor-pointer"
                    >
                        <MonetizationOn className="text-yellow-400" />
                        <span className="text-xl font-black text-white font-mono tracking-tight">
                            {dbUser?.saldo_coins || 0}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. XP BAR (CORRIGIDA) */}
            <div className="px-4 -mt-2">
                <div className="flex justify-between text-[9px] font-bold text-slate-500 mb-1 uppercase">
                    <span>Nível {level}</span>
                    <span className="text-purple-400">{Math.floor(current)}/{max} XP</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden relative border border-slate-800">
                    <div 
                        className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-1000 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                        style={{ width: `${progresso}%` }}
                    ></div>
                </div>
                <p className="text-right text-[8px] text-slate-600 mt-1">
                    Faltam {max - current} XP para o nível {level + 1}
                </p>
            </div>

            {/* 4. BANNER DE EVENTOS (NOVIDADE) */}
            <div className="px-4">
                <div className="relative w-full h-32 rounded-2xl overflow-hidden group cursor-pointer border border-white/10 shadow-lg">
                    {/* Imagem de Fundo (Placeholder de festa) */}
                    <img
                        src="https://images.unsplash.com/photo-1514525253440-b393452e3726?q=80&w=1000&auto=format&fit=crop"
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                        alt="Festa"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>

                    <div className="absolute bottom-4 left-4">
                        <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider mb-1 inline-block animate-pulse">
                            Evento Oficial
                        </span>
                        <h3 className="text-xl font-black text-white italic uppercase leading-none">
                            Calourada 2026
                        </h3>
                        <p className="text-[10px] text-slate-300 font-medium">
                            Garanta seu ingresso com GecaCoins!
                        </p>
                    </div>
                    <div className="absolute bottom-4 right-4 bg-white/10 p-2 rounded-full backdrop-blur-sm">
                        <LocalActivity className="text-white" />
                    </div>
                </div>
            </div>

            {/* 5. GRID DE APPS (NAVEGAÇÃO RÁPIDA) */}
            <div className="px-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 ml-1">Central de Apps</h3>
                <div className="grid grid-cols-2 gap-3">
                    <QuickApp
                        icon={<SportsEsports className="text-yellow-400" fontSize="large" />}
                        title="Arcade"
                        desc="Xadrez, Velha & Lig 4"
                        color="border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10"
                        onClick={() => navigate('/arena/games')}
                    />
                    <QuickApp
                        icon={<RocketLaunch className="text-pink-400" fontSize="large" />}
                        title="Memes"
                        desc="Feed da Engenharia"
                        color="border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10"
                        onClick={() => navigate('/arena/memes')}
                    />
                    <QuickApp
                        icon={<Science className="text-cyan-400" fontSize="large" />}
                        title="Lab"
                        desc="Chat Anônimo"
                        color="border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10"
                        onClick={() => navigate('/arena/laboratorio')}
                    />
                    <QuickApp
                        icon={<Assignment className="text-emerald-400" fontSize="large" />}
                        title="Missões"
                        desc="Tasks & Recompensas"
                        color="border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                        onClick={() => navigate('/arena/quests')}
                    />
                </div>
            </div>

            {/* 6. CARD DE REFERÊNCIA (REDESIGN COMPLETO) */}
            <div className="px-4">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 relative overflow-hidden shadow-2xl">
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <QrCodeScanner sx={{ fontSize: 120 }} />
                    </div>

                    <div className="relative z-10">
                        <h3 className="text-white font-black text-sm uppercase italic mb-1">
                            Sistema de Indicação
                        </h3>
                        <p className="text-[10px] text-slate-400 mb-4 max-w-[200px]">
                            Convide calouros. Ganhe 500 Coins e 100 XP por cada registro validado.
                        </p>

                        <div className="flex flex-col gap-3">
                            {/* O Código */}
                            <div
                                onClick={copyCode}
                                className="flex items-center justify-between bg-black/40 border border-slate-700 rounded-xl px-4 py-3 cursor-pointer hover:border-purple-500 transition-colors group"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-500 uppercase font-bold">Seu Código</span>
                                    <span className="text-lg font-mono font-black text-purple-400 tracking-widest group-hover:text-purple-300">
                                        {dbUser?.codigo_referencia || '...'}
                                    </span>
                                </div>
                                <ContentCopy className="text-slate-600 group-hover:text-white transition-colors" fontSize="small" />
                            </div>

                            {/* Botão Zap */}
                            <button
                                onClick={shareWhatsapp}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <WhatsApp fontSize="small" /> ENVIAR NO ZAP
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 7. LINK RANKING */}
            <div className="px-4 pb-4">
                <div
                    onClick={() => navigate('/arena/ranking')}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                >
                    <span className="text-xs font-bold text-slate-300">Ver Ranking Geral</span>
                    <ArrowForward className="text-slate-500" fontSize="small" />
                </div>
            </div>

        </div>
    );
}

// Subcomponente para o Grid de Apps
function QuickApp({ icon, title, desc, color, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-start p-4 rounded-2xl border transition-all active:scale-95 text-left ${color}`}
        >
            <div className="mb-2">{icon}</div>
            <h4 className="font-black text-white text-sm uppercase italic">{title}</h4>
            <p className="text-[10px] text-slate-400 font-medium">{desc}</p>
        </button>
    );
}