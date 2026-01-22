import { EmojiEvents, Star } from '@mui/icons-material';
import UserAvatar from '../../components/arena/UserAvatar';

export default function ArenaRanking() {
    // Dados FAKE para visualização (enquanto não conectamos no backend)
    const rankingFake = [
        { id: 1, nome: "Pedro Engenheiro", xp: 5400, coins: 1200, nivel: 12 },
        { id: 2, nome: "Maria Automação", xp: 4800, coins: 350, nivel: 10 },
        { id: 3, nome: "João Calouro", xp: 3200, coins: 800, nivel: 8 },
        { id: 4, nome: "Lucas Elétrica", xp: 1200, coins: 50, nivel: 4 },
        { id: 5, nome: "Ana Civil", xp: 900, coins: 120, nivel: 3 },
    ];

    return (
        <div className="pb-24 animate-fade-in px-4 pt-4 space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 italic uppercase">
                    Hall da Fama
                </h2>
                <p className="text-xs text-slate-500 font-mono">OS MAIORES DO GRÊMIO</p>
            </div>

            {/* PODIUM (Top 3) - Desafio Visual Interessante */}
            <div className="flex items-end justify-center gap-2 mb-8">
                {/* 2º Lugar */}
                <div className="flex flex-col items-center">
                    <UserAvatar size="md" className="mb-2" showLevel={true} />
                    <div className="bg-slate-800 w-20 h-24 rounded-t-xl border-t-4 border-slate-400 flex flex-col items-center justify-center relative">
                        <span className="text-2xl font-black text-slate-500">2</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 mt-1 truncate w-16 text-center">Maria</span>
                </div>

                {/* 1º Lugar (Maior) */}
                <div className="flex flex-col items-center -mb-2 z-10">
                    <div className="relative">
                        <EmojiEvents className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-500 animate-bounce" />
                        <UserAvatar size="lg" className="mb-2 ring-4 ring-yellow-500/50 rounded-full" showLevel={true} />
                    </div>
                    <div className="bg-gradient-to-b from-yellow-600 to-yellow-800 w-24 h-32 rounded-t-xl border-t-4 border-yellow-400 flex flex-col items-center justify-center shadow-lg shadow-yellow-900/50">
                        <span className="text-4xl font-black text-yellow-200">1</span>
                    </div>
                    <span className="text-xs font-black text-yellow-400 mt-1 truncate w-20 text-center">Pedro</span>
                </div>

                {/* 3º Lugar */}
                <div className="flex flex-col items-center">
                    <UserAvatar size="md" className="mb-2" showLevel={true} />
                    <div className="bg-slate-800 w-20 h-16 rounded-t-xl border-t-4 border-orange-700 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-orange-800">3</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 mt-1 truncate w-16 text-center">João</span>
                </div>
            </div>

            {/* LISTA DO RESTO */}
            <div className="space-y-2">
                {rankingFake.slice(3).map((r, index) => (
                    <div key={r.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-500 w-4">{index + 4}</span>
                            <UserAvatar size="sm" />
                            <div>
                                <p className="text-xs font-bold text-white">{r.nome}</p>
                                <p className="text-[9px] text-slate-500">Nível {r.nivel}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="flex items-center gap-1 justify-end text-purple-400 font-bold text-xs">
                                 <Star sx={{ fontSize: 10 }} /> {r.xp} XP
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}