import { useEffect, useState } from 'react';
import { EmojiEvents, Star, MonetizationOn, Refresh } from '@mui/icons-material';
import { api } from '../../lib/api';
import UserAvatar from '../../components/arena/UserAvatar';
import { type User } from '../../types';

export default function ArenaRanking() {
    const [rankingData, setRankingData] = useState<{ xp: User[], coins: User[] }>({ xp: [], coins: [] });
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'xp' | 'coins'>('xp');

    const fetchRanking = async () => {
        setLoading(true);
        try {
            const res = await api.get('/arena/ranking');
            setRankingData(res.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchRanking(); }, []);

    // Seleciona a lista ativa
    const lista = tab === 'xp' ? rankingData.xp : rankingData.coins;
    
    // Funções visuais
    const getCorPodium = (i: number) => {
        if (i === 0) return 'from-yellow-600 to-yellow-800 border-yellow-400 text-yellow-200'; // 1º
        if (i === 1) return 'from-slate-500 to-slate-700 border-slate-400 text-slate-200'; // 2º
        if (i === 2) return 'from-orange-700 to-orange-900 border-orange-600 text-orange-200'; // 3º
        return '';
    };

    if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse">Carregando Hall da Fama...</div>;

    return (
        <div className="pb-24 animate-fade-in px-4 pt-4 space-y-6">
            
            {/* CABEÇALHO + CONTROLE */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Hall da Fama</h2>
                    <p className="text-[10px] text-slate-500 font-mono font-bold uppercase">Temporada Atual</p>
                </div>
                <button onClick={fetchRanking} className="bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white">
                    <Refresh fontSize="small" />
                </button>
            </div>

            {/* ABAS TIPO "IOS" */}
            <div className="bg-slate-900 p-1 rounded-xl flex">
                <button 
                    onClick={() => setTab('xp')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${tab === 'xp' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                    MAIORES PATENTES (XP)
                </button>
                <button 
                    onClick={() => setTab('coins')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${tab === 'coins' ? 'bg-yellow-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                    GECACOINS ($)
                </button>
            </div>

            {/* PODIUM (TOP 3) - SÓ RENDERIZA SE TIVER GENTE */}
            {lista.length >= 3 && (
                <div className="flex items-end justify-center gap-2 mb-8 pt-4">
                    {/* 2º LUGAR */}
                    <div className="flex flex-col items-center w-1/3">
                        <UserAvatar user={lista[1]} size="md" className="mb-2" showLevel={true} />
                        <div className={`w-full h-24 rounded-t-xl border-t-4 flex flex-col items-center justify-center bg-gradient-to-b ${getCorPodium(1)}`}>
                            <span className="text-2xl font-black opacity-50">2</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 mt-1 truncate w-full text-center">{lista[1].nome.split(' ')[0]}</span>
                        <span className="text-[9px] font-mono text-slate-500">{tab === 'xp' ? `${lista[1].xp} XP` : `$${lista[1].saldo_coins}`}</span>
                    </div>

                    {/* 1º LUGAR */}
                    <div className="flex flex-col items-center w-1/3 -mb-4 z-10">
                        <div className="relative">
                            <EmojiEvents className={`absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce ${tab === 'xp' ? 'text-purple-400' : 'text-yellow-400'}`} />
                            <UserAvatar user={lista[0]} size="lg" className={`mb-2 ring-4 rounded-full ${tab === 'xp' ? 'ring-purple-500' : 'ring-yellow-500'}`} showLevel={true} />
                        </div>
                        <div className={`w-full h-32 rounded-t-xl border-t-4 flex flex-col items-center justify-center shadow-xl bg-gradient-to-b ${getCorPodium(0)}`}>
                            <span className="text-4xl font-black opacity-80">1</span>
                        </div>
                        <span className="text-xs font-black text-white mt-1 truncate w-full text-center">{lista[0].nome.split(' ')[0]}</span>
                        <span className="text-[10px] font-mono font-bold text-white bg-slate-900/50 px-2 rounded-full mt-1">
                            {tab === 'xp' ? `${lista[0].xp} XP` : `$${lista[0].saldo_coins}`}
                        </span>
                    </div>

                    {/* 3º LUGAR */}
                    <div className="flex flex-col items-center w-1/3">
                        <UserAvatar user={lista[2]} size="md" className="mb-2" showLevel={true} />
                        <div className={`w-full h-16 rounded-t-xl border-t-4 flex flex-col items-center justify-center bg-gradient-to-b ${getCorPodium(2)}`}>
                            <span className="text-2xl font-black opacity-50">3</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 mt-1 truncate w-full text-center">{lista[2].nome.split(' ')[0]}</span>
                        <span className="text-[9px] font-mono text-slate-500">{tab === 'xp' ? `${lista[2].xp} XP` : `$${lista[2].saldo_coins}`}</span>
                    </div>
                </div>
            )}

            {/* LISTA RESTANTE (4º EM DIANTE) */}
            <div className="space-y-2">
                {lista.slice(3).map((u, index) => (
                    <div key={u._id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800 hover:bg-slate-800/80 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-500 w-6 text-center">{index + 4}</span>
                            <UserAvatar user={u} size="sm" />
                            <div>
                                <p className="text-xs font-bold text-white">{u.nome}</p>
                                <p className="text-[9px] text-slate-500 uppercase font-bold">Nível {u.nivel}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className={`flex items-center gap-1 justify-end font-bold text-xs ${tab === 'xp' ? 'text-purple-400' : 'text-yellow-400'}`}>
                                 {tab === 'xp' ? <Star sx={{ fontSize: 10 }} /> : <MonetizationOn sx={{ fontSize: 10 }} />}
                                 {tab === 'xp' ? `${u.xp} XP` : u.saldo_coins}
                             </div>
                        </div>
                    </div>
                ))}
                
                {lista.length === 0 && (
                    <div className="text-center py-10 text-slate-600 text-xs">
                        Nenhum competidor encontrado.
                    </div>
                )}
            </div>
        </div>
    );
}