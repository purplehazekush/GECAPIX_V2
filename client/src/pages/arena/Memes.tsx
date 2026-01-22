import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { RocketLaunch, AddPhotoAlternate, MonetizationOn } from '@mui/icons-material';
import UserAvatar from '../../components/arena/UserAvatar';

export default function ArenaMemes() {
    const { dbUser } = useAuth();
    const [memes, setMemes] = useState<any[]>([]);

    const fetchMemes = () => api.get('arena/memes').then(res => setMemes(res.data));

    const handleVotar = async (memeId: string) => {
        const quantia = prompt("Quanto quer investir nesse meme? (Coins)");
        if (!quantia) return;
        
        try {
            await api.post('arena/memes/votar', {
                memeId,
                email_eleitor: dbUser?.email,
                quantia: parseInt(quantia)
            });
            alert("Investimento realizado! O autor recebeu o bônus.");
            fetchMemes();
        } catch (e) { alert("Saldo insuficiente!"); }
    };

    useEffect(() => { fetchMemes(); }, []);

    return (
        <div className="space-y-6 pb-20 p-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Tendências</h2>
                <button className="bg-purple-600 p-2 rounded-xl text-white shadow-lg shadow-purple-900/40">
                    <AddPhotoAlternate />
                </button>
            </div>

            <div className="space-y-8">
                {memes.map(meme => (
                    <div key={meme._id} className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                        <div className="p-4 flex items-center gap-3">
                            <UserAvatar user={{nome: meme.autor_nome}} size="sm" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{meme.autor_nome}</span>
                        </div>
                        <img src={meme.imagem_url} className="w-full bg-black" />
                        <div className="p-5 space-y-4">
                            <p className="text-sm font-bold text-slate-200">{meme.legenda}</p>
                            <div className="flex justify-between items-center pt-2">
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 uppercase font-black">Investimento Total</span>
                                    <div className="flex items-center gap-1 text-yellow-500 font-mono font-black text-lg">
                                        <MonetizationOn fontSize="small" />
                                        {meme.investimento_total}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleVotar(meme._id)}
                                    className="bg-slate-800 hover:bg-purple-600 px-6 py-2 rounded-xl text-xs font-black text-white transition-all"
                                >
                                    IMPULSIONAR
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}