import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { RocketLaunch, AddPhotoAlternate, MonetizationOn } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

export default function ArenaMemes() {
    const { dbUser } = useAuth();
    const [memes, setMemes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMemes = async () => {
        try {
            const res = await api.get('/api/arena/memes');
            setMemes(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const votar = async (id: string) => {
        const quantia = prompt("Quanto quer investir nesse meme? (GecaCoins)");
        if (!quantia || isNaN(parseInt(quantia))) return;

        try {
            await api.post('/api/arena/memes/voto', {
                memeId: id,
                usuario_email: dbUser?.email,
                quantia: parseInt(quantia)
            });
            fetchMemes();
        } catch (e) { alert("Saldo insuficiente!"); }
    };

    useEffect(() => { fetchMemes(); }, []);

    return (
        <div className="space-y-6 pb-24">
            {/* BOTÃO FLUTUANTE DE POSTAR (Placeholder funcional) */}
            <button className="fixed bottom-24 right-6 z-50 bg-purple-600 text-white p-4 rounded-full shadow-xl shadow-purple-900/40 active:scale-90 transition-transform">
                <AddPhotoAlternate />
            </button>

            <div className="px-4 pt-4">
                <h2 className="text-xl font-black italic text-white flex items-center gap-2">
                    <RocketLaunch className="text-purple-500" /> TENDÊNCIAS
                </h2>
            </div>

            {loading ? <div className="p-10 text-center"><CircularProgress color="secondary" /></div> : (
                <div className="space-y-8 px-4">
                    {memes.map(meme => (
                        <div key={meme._id} className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                            {/* Header do Post */}
                            <div className="p-4 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Postado por {meme.autor_nome.split(' ')[0]}</span>
                                <span className="text-[10px] text-slate-600">{new Date(meme.data).toLocaleDateString()}</span>
                            </div>

                            {/* Imagem do Meme */}
                            <img src={meme.imagem_url} className="w-full object-contain bg-black" alt="Meme" />

                            {/* Legenda e Ações */}
                            <div className="p-5 space-y-4">
                                <p className="text-sm font-bold text-slate-200 leading-relaxed">{meme.legenda}</p>
                                
                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-500 font-black uppercase">Investimento Total</span>
                                        <div className="flex items-center gap-1 text-yellow-500 font-mono font-black text-lg">
                                            <MonetizationOn fontSize="small" />
                                            {meme.investimento_total}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => votar(meme._id)}
                                        className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg shadow-purple-900/20 transition-all active:scale-95"
                                    >
                                        IMPULSIONAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {memes.length === 0 && <p className="text-center text-slate-600 text-sm py-10">Nenhum meme ainda. Seja o primeiro!</p>}
                </div>
            )}
        </div>
    );
}