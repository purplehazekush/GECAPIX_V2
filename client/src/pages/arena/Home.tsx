import { useAuth } from '../../context/AuthContext';
import UserAvatar from '../../components/arena/UserAvatar';
import { 
    MonetizationOn, LocalFireDepartment, EmojiEvents, 
    Campaign, QrCodeScanner, ArrowForward 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function ArenaHome() {
    const { dbUser, user } = useAuth();
    const navigate = useNavigate();

    // Cálculos de XP
    const xpAtual = dbUser?.xp || 0;
    const xpProxNivel = (dbUser?.nivel || 1) * 100;
    const progresso = Math.min((xpAtual / xpProxNivel) * 100, 100);

    return (
        <div className="pb-24 space-y-6 animate-fade-in relative">
            
            {/* 1. MURAL DE AVISOS (TICKER) - Estilo Bolsa de Valores */}
            <div className="bg-yellow-500/10 border-y border-yellow-500/20 overflow-hidden py-1 whitespace-nowrap">
                <div className="animate-marquee inline-block text-[10px] font-mono text-yellow-500 font-bold uppercase tracking-widest px-4">
                    📢 BEM-VINDO À TEMPORADA 2026 DO GECA • O BOLÃO DA FINAL DA COPA GECA JÁ ESTÁ ABERTO • QUEM COMPRAR 3 CERVEJAS HOJE GANHA BADGE "HIDRATADO" •
                </div>
            </div>

            {/* 2. HUD PRINCIPAL (Hero Section) */}
            <div className="px-4 pt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <UserAvatar 
                        user={dbUser} 
                        googlePhoto={user?.photoURL} 
                        size="lg" 
                        showLevel={true} 
                    />
                    <div>
                        <h1 className="text-2xl font-black text-white italic leading-none">
                            {dbUser?.nome?.split(' ')[0] || 'RECRUTA'}
                        </h1>
                        <div className="flex items-center gap-1 text-slate-400 text-xs font-mono mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            ONLINE NO GECA
                        </div>
                    </div>
                </div>

                {/* PLACAR DE MOEDAS (Bancário) */}
                <div className="text-right">
                    <p className="text-[9px] text-cyan-400 font-black tracking-widest uppercase mb-1">SALDO ATUAL</p>
                    <div 
                        onClick={() => navigate('/arena/transferir')}
                        className="bg-slate-900 border border-cyan-500/30 rounded-xl px-3 py-2 flex items-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.15)] active:scale-95 transition-transform cursor-pointer"
                    >
                        <MonetizationOn className="text-yellow-400" />
                        <span className="text-2xl font-black text-white font-mono tracking-tight">
                            {dbUser?.saldo_coins || 0}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. BARRA DE PROGRESSO (XP) */}
            <div className="px-4">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1 uppercase">
                    <span>Progresso do Nível {dbUser?.nivel}</span>
                    <span className="text-purple-400">{xpAtual}/{xpProxNivel} XP</span>
                </div>
                <div className="h-3 w-full bg-slate-900 rounded-full border border-slate-800 overflow-hidden relative">
                    <div 
                        className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-yellow-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-1000"
                        style={{ width: `${progresso}%` }}
                    ></div>
                    {/* Brilho animado na barra */}
                    <div className="absolute top-0 bottom-0 right-0 w-full h-full bg-gradient-to-r from-transparent to-white/20 opacity-30"></div>
                </div>
                <p className="text-[9px] text-center text-slate-600 mt-1.5">
                    Faça check-in ou compras para subir de patente.
                </p>
            </div>

            {/* 4. GRID DE AÇÕES RÁPIDAS (Widgets) */}
            <div className="px-4 grid grid-cols-2 gap-3">
                
                {/* Daily Quest Widget */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <LocalFireDepartment sx={{ fontSize: 40 }} />
                    </div>
                    <h3 className="text-xs font-black text-orange-400 uppercase mb-1">Missão Diária</h3>
                    <p className="text-xs text-slate-300 font-bold leading-tight">
                        Logar por 3 dias seguidos
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 w-1/3"></div>
                        </div>
                        <span className="text-[9px] text-white font-mono">1/3</span>
                    </div>
                </div>

                {/* Bolão Widget */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <EmojiEvents sx={{ fontSize: 40 }} />
                    </div>
                    <h3 className="text-xs font-black text-emerald-400 uppercase mb-1">Bolão Ativo</h3>
                    <p className="text-xs text-slate-300 font-bold leading-tight">
                        Quem ganha o Truco hoje?
                    </p>
                    <button className="mt-2 w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg py-1 text-[10px] font-black hover:bg-emerald-500/20 transition-colors">
                        APOSTAR AGORA
                    </button>
                </div>
            </div>

            {/* 5. AÇÃO PRINCIPAL: Check-in / Carteira */}
            <div className="px-4">
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-5 border border-indigo-500/30 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute -left-4 -bottom-4 bg-indigo-500/20 w-24 h-24 rounded-full blur-2xl"></div>
                    
                    <div className="relative z-10">
                        <h3 className="text-white font-black text-sm uppercase italic">Presença Confirmada?</h3>
                        <p className="text-indigo-200 text-[10px] mt-0.5 mb-3 max-w-[150px]">
                            Escaneie o QR Code na parede do grêmio para ganhar bônus.
                        </p>
                        <button className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
                            <QrCodeScanner sx={{ fontSize: 16 }} />
                            ESCANEAR
                        </button>
                    </div>

                    <div className="relative z-10 opacity-80">
                         {/* Placeholder para uma ilustração ou ícone grande */}
                         <Campaign sx={{ fontSize: 60, color: '#818cf8' }} />
                    </div>
                </div>
            </div>

             {/* Link para Ranking (Teaser) */}
             <div className="px-4">
                <div 
                    onClick={() => navigate('/arena/ranking')}
                    className="flex items-center justify-between bg-slate-900/30 p-4 rounded-xl border border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                             <EmojiEvents fontSize="small" />
                         </div>
                         <div className="flex flex-col">
                             <span className="text-xs font-bold text-white">Ranking Geral</span>
                             <span className="text-[10px] text-slate-500">Veja quem lidera a engenharia</span>
                         </div>
                    </div>
                    <ArrowForward sx={{ fontSize: 16, color: '#475569' }} />
                </div>
             </div>

        </div>
    );
}