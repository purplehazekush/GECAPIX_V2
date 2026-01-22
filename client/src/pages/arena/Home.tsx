import { useAuth } from '../../context/AuthContext';
import { EmojiEvents, LocalFireDepartment, TrendingUp, ContentCopy, Share } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';

export default function ArenaHome() {
  const { dbUser } = useAuth();
  
  // Cálculo de progresso do nível
  const xpAtual = dbUser?.xp || 0;
  const xpProxNivel = (dbUser?.nivel || 1) * 100;
  const progresso = Math.min((xpAtual / xpProxNivel) * 100, 100);

  // Função para copiar código
  const copiarCodigo = () => {
    if (!dbUser?.codigo_referencia) return;
    navigator.clipboard.writeText(dbUser.codigo_referencia);
    alert("Código copiado! Mande para seus amigos.");
  };

  // Função para compartilhar link completo
  const compartilhar = () => {
    const texto = `Vem pra Arena GECAPIX! Use meu código ${dbUser?.codigo_referencia} e comece com bônus de coins: https://gecapix-v2.vercel.app`;
    if (navigator.share) {
        navigator.share({ title: 'Arena GECAPIX', text: texto, url: 'https://gecapix-v2.vercel.app' });
    } else {
        copiarCodigo();
    }
  };

  return (
    <div className="space-y-6 pb-10">
        
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

        {/* --- NOVO: SEÇÃO DE CONVITE (ENGENHARIA SOCIAL) --- */}
        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
            {/* Brilho lateral */}
            <div className="absolute left-0 top-0 h-full w-1 bg-cyan-500"></div>
            
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-cyan-400 font-bold text-sm flex items-center gap-2">
                        <Share sx={{ fontSize: 16 }} /> CONVOCAR AMIGOS
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">
                        Ganhe <span className="text-yellow-500 font-bold">500 Coins</span> por indicação
                    </p>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <span className="px-2 font-mono font-bold text-white text-sm">
                        {dbUser?.codigo_referencia || '------'}
                    </span>
                    <Tooltip title="Copiar Código">
                        <IconButton size="small" onClick={copiarCodigo} sx={{ color: '#22d3ee' }}>
                            <ContentCopy sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </div>
            </div>

            <button 
                onClick={compartilhar}
                className="w-full mt-4 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
            >
                COMPARTILHAR LINK DE ACESSO
            </button>
        </div>

        {/* ESTATÍSTICAS RÁPIDAS */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
                <LocalFireDepartment className="text-orange-500" fontSize="large" />
                <div className="text-center">
                    <div className="text-xl font-bold text-white">{dbUser?.sequencia_login || 0}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Login Streak</div>
                </div>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-2">
                <TrendingUp className="text-emerald-500" fontSize="large" />
                <div className="text-center">
                    <div className="text-xl font-bold text-white">#{dbUser?.nivel || 0}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Nível Atual</div>
                </div>
            </div>
        </div>

        {/* ÁREA DE BADGES */}
        <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-3 px-1">
                <EmojiEvents className="text-yellow-500" fontSize="small" />
                CONQUISTAS DESBLOQUEADAS
            </h3>
            
            {(!dbUser?.badges || dbUser.badges.length === 0) ? (
                <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-xl p-8 text-center">
                    <p className="text-slate-600 text-sm">Nenhuma medalha ainda.</p>
                    <p className="text-slate-700 text-xs mt-1">Identifique suas compras no bar para ganhar.</p>
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