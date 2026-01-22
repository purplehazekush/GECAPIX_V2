import { useAuth } from '../../context/AuthContext';
import { 
    LocalFireDepartment, Share, 
    MonetizationOn, Shield, AutoFixHigh 
} from '@mui/icons-material';

export default function ArenaHome() {
  const { dbUser, user } = useAuth();
  
  const xpAtual = dbUser?.xp || 0;
  const xpProxNivel = (dbUser?.nivel || 1) * 100;
  const progresso = Math.min((xpAtual / xpProxNivel) * 100, 100);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* HEADER: AVATAR + SALDO DESTAQUE */}
        <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <img 
                        src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                        className="w-14 h-14 rounded-2xl border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-purple-600 text-[10px] font-black px-1.5 rounded-md border border-slate-900">
                        LV {dbUser?.nivel || 1}
                    </div>
                </div>
                <div>
                    <h2 className="text-white font-black text-xl italic tracking-tight uppercase">
                        {dbUser?.nome?.split(' ')[0] || 'Recruta'}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Shield sx={{ fontSize: 10 }} /> MEMBRO ATIVO
                    </p>
                </div>
            </div>

            {/* DESTAQUE GECACOINS */}
            <div className="bg-slate-900 border border-yellow-500/30 px-4 py-2 rounded-2xl flex flex-col items-end shadow-lg shadow-yellow-900/10">
                <span className="text-[9px] text-yellow-600 font-black uppercase tracking-widest">Saldo Atual</span>
                <div className="flex items-center gap-1 text-yellow-400 font-mono font-black text-xl">
                    <MonetizationOn />
                    <span>{dbUser?.saldo_coins || 0}</span>
                </div>
            </div>
        </div>

        {/* PROGRESSO DE XP */}
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
            <div className="flex justify-between text-[10px] font-black text-slate-400 mb-2 uppercase">
                <span>Experiência (XP)</span>
                <span className="text-purple-400">{xpAtual} / {xpProxNivel}</span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-1000" 
                    style={{ width: `${progresso}%` }}
                ></div>
            </div>
        </div>

        {/* MÓDULO DE SKINS & CUSTOMIZAÇÃO (ESQUELETO) */}
        <div className="grid grid-cols-2 gap-3">
             <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl border border-slate-700 opacity-60 group">
                <div className="flex justify-between items-start mb-4">
                    <AutoFixHigh className="text-purple-400" />
                    <span className="text-[8px] bg-slate-700 px-1.5 py-0.5 rounded text-white font-bold">EM BREVE</span>
                </div>
                <h3 className="text-xs font-bold text-slate-300">LOJA DE SKINS</h3>
                <p className="text-[9px] text-slate-500 mt-1">Mude seu visual no ranking.</p>
             </div>

             <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-2xl border border-slate-700 opacity-60">
                <div className="flex justify-between items-start mb-4">
                    <LocalFireDepartment className="text-orange-500" />
                    <span className="text-[10px] text-white font-black">{dbUser?.sequencia_login || 0}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-300">STREAK</h3>
                <p className="text-[9px] text-slate-500 mt-1">Logue todo dia para ganhar.</p>
             </div>
        </div>

        {/* CONVITE (ENGENHARIA SOCIAL) */}
        <div className="bg-indigo-600 p-5 rounded-2xl shadow-xl shadow-indigo-900/20 relative overflow-hidden">
            <div className="relative z-10">
                <h3 className="text-white font-black text-sm uppercase italic">Convoque seu Time</h3>
                <p className="text-indigo-200 text-[10px] mt-1 mb-4">Ganhe 500 Coins por cada calouro indicado.</p>
                
                <div className="flex gap-2">
                    <div className="flex-1 bg-slate-950/40 rounded-lg px-3 py-2 border border-white/10 text-white font-mono font-bold text-center">
                        {dbUser?.codigo_referencia || '---'}
                    </div>
                    <button className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-black text-xs active:scale-95 transition-all">
                        COMPARTILHAR
                    </button>
                </div>
            </div>
            <Share className="absolute -right-4 -bottom-4 text-white/10" sx={{ fontSize: 100 }} />
        </div>

    </div>
  );
}