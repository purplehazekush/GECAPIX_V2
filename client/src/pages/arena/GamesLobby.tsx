import { useNavigate } from 'react-router-dom';
import { SportsEsports, Grid3x3, Tag, Apps } from '@mui/icons-material';

const GAMES = [
    { id: 'velha', nome: 'Jogo da Velha', icon: <Tag fontSize="large"/>, cor: 'from-blue-500 to-cyan-500', desc: 'Clássico rápido' },
    { id: 'xadrez', nome: 'Xadrez', icon: <Grid3x3 fontSize="large"/>, cor: 'from-purple-500 to-indigo-500', desc: 'Estratégia pura' },
    { id: 'damas', nome: 'Damas', icon: <Apps fontSize="large"/>, cor: 'from-red-500 to-orange-500', desc: 'Em breve', disabled: true },
    { id: 'connect4', nome: 'Connect 4', icon: <SportsEsports fontSize="large"/>, cor: 'from-yellow-500 to-amber-500', desc: 'Em breve', disabled: true },
];

export default function GamesLobby() {
    const navigate = useNavigate();

    return (
        <div className="p-4 pb-24 animate-fade-in space-y-6">
            <header>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Arcade</h2>
                <p className="text-xs text-slate-500 font-bold uppercase">Jogue e ganhe XP + Coins</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GAMES.map(game => (
                    <button
                        key={game.id}
                        disabled={game.disabled}
                        onClick={() => navigate(`/arena/games/${game.id}`)}
                        className={`relative overflow-hidden rounded-3xl p-6 text-left border border-white/10 transition-all ${
                            game.disabled ? 'opacity-50 cursor-not-allowed bg-slate-900' : 'bg-slate-900 hover:scale-[1.02] active:scale-95 shadow-xl'
                        }`}
                    >
                        {/* Background Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${game.cor} opacity-10`}></div>
                        
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase italic">{game.nome}</h3>
                                <p className="text-xs text-slate-400 font-medium">{game.desc}</p>
                            </div>
                            <div className={`p-3 rounded-2xl bg-slate-950/30 text-white`}>
                                {game.icon}
                            </div>
                        </div>

                        {!game.disabled && (
                            <div className="mt-4 flex items-center gap-2">
                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded uppercase">
                                    Valendo Coins
                                </span>
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-[10px] font-black rounded uppercase">
                                    +XP
                                </span>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}