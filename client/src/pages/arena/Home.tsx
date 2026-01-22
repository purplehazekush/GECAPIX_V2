import { useAuth } from '../../context/AuthContext';
import { EmojiEvents, LocalFireDepartment, TrendingUp } from '@mui/icons-material';

export default function ArenaHome() {
  const { dbUser } = useAuth();
  
  // Cálculo de progresso do nível (Exemplo: 100 XP por nível)
  const xpAtual = dbUser?.xp || 0;
  const xpProxNivel = (dbUser?.nivel || 1) * 100;
  const progresso = Math.min((xpAtual / xpProxNivel) * 100, 100);

  return (
    <div className="space-y-6">
        
        {/* CARD DE IDENTIDADE (HERO) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 to-slate-900 border border-purple-500/30 p-6 shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
                <h2 className="text-2xl font-black text-white mb-1">
                    {dbUser?.nome || 'Recruta'}
                </h2>
                <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/40 rounded-full text-xs text-purple-200 font-mono mb-6">
                    Membro da Guilda
                </span>

                {/* BARRA DE XP */}
                <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-400">
                        <span>XP {xpAtual}</span>
                        <span>{xpProxNivel} XP</span>
                    </div>
                    <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000" 
                            style={{ width: `${progresso}%` }}
                        ></div>
                    </div>
                    <p className="text-[10px] text-center text-slate-500 mt-1">
                        Faltam {xpProxNivel - xpAtual} XP para o nível { (dbUser?.nivel || 1) + 1 }
                    </p>
                </div>
            </div>
        </div>

        {/* ESTATÍSTICAS RÁPIDAS */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
                <LocalFireDepartment className="text-orange-500" fontSize="large" />
                <div className="text-center">
                    {/* Agora o TS reconhece sequencia_login */}
                    <div className="text-xl font-bold text-white">{dbUser?.sequencia_login || 0}</div>
                    <div className="text-xs text-slate-500 uppercase">Dias Seguidos</div>
                </div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
                <TrendingUp className="text-emerald-500" fontSize="large" />
                <div className="text-center">
                    <div className="text-xl font-bold text-white">#{dbUser?.nivel || 0}</div>
                    <div className="text-xs text-slate-500 uppercase">Nível Atual</div>
                </div>
            </div>
        </div>

        {/* ÁREA DE BADGES (CONQUISTAS) */}
        <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-3 px-1">
                <EmojiEvents className="text-yellow-500" fontSize="small" />
                SUAS CONQUISTAS
            </h3>
            
            {(!dbUser?.badges || dbUser.badges.length === 0) ? (
                <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-xl p-8 text-center">
                    <p className="text-slate-600 text-sm">Nenhuma medalha ainda.</p>
                    <p className="text-slate-700 text-xs mt-1">Compre itens ou participe para ganhar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2">
                    {dbUser.badges.map((badge: string) => (
                        <div key={badge} className="aspect-square bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 shadow-inner">
                            <span className="text-2xl">🏆</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}