// client/src/pages/arena/Memes.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { AddPhotoAlternate, MonetizationOn } from '@mui/icons-material';
import UserAvatar from '../../components/arena/UserAvatar';
import NewMemeModal from '../../components/arena/NewMemeModal'; // <--- Importe aqui

export default function ArenaMemes() {
    const { dbUser } = useAuth();
    const [memes, setMemes] = useState<any[]>([]);
    const [modalOpen, setModalOpen] = useState(false); // Estado do Modal

    const fetchMemes = () => api.get('arena/memes').then(res => setMemes(res.data));

    const handleVotar = async (memeId: string) => {
        const quantia = prompt("Quanto quer investir nesse meme?");
        if (!quantia) return;
        try {
            await api.post('arena/memes/votar', {
                memeId,
                email_eleitor: dbUser?.email,
                quantia: parseInt(quantia)
            });
            alert("Impulsionado! O autor recebeu o bônus de Inception.");
            fetchMemes();
        } catch (e) { alert("Saldo insuficiente!"); }
    };

    useEffect(() => { fetchMemes(); }, []);

    return (
        <div className="space-y-6 pb-24 p-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Tendências</h2>
                
                {/* O BOTÃO AGORA FUNCIONA! */}
                <button 
                    onClick={() => setModalOpen(true)}
                    className="bg-purple-600 p-3 rounded-2xl text-white shadow-lg shadow-purple-900/40 active:scale-90 transition-transform"
                >
                    <AddPhotoAlternate />
                </button>
            </div>

            <div className="space-y-8">
                {memes.map(meme => (
                    <div key={meme._id} className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl animate-fade-in">
                        <div className="p-4 flex items-center gap-3">
                            <UserAvatar user={{nome: meme.autor_nome}} size="sm" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{meme.autor_nome}</span>
                        </div>
                        <img src={meme.imagem_url} className="w-full object-contain bg-black max-h-[400px]" />
                        <div className="p-5 space-y-4">
                            <p className="text-sm font-bold text-slate-200 leading-relaxed">{meme.legenda}</p>
                            <div className="flex justify-between items-center pt-2">
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Investimento</span>
                                    <div className="flex items-center gap-1 text-yellow-500 font-mono font-black text-xl">
                                        <MonetizationOn fontSize="small" />
                                        {meme.investimento_total}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleVotar(meme._id)}
                                    className="bg-slate-800 hover:bg-purple-600 px-6 py-2 rounded-xl text-xs font-black text-white transition-all active:scale-95"
                                >
                                    IMPULSIONAR
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* O MODAL */}
            <NewMemeModal 
                open={modalOpen} 
                onClose={() => setModalOpen(false)} 
                onRefresh={fetchMemes} 
            />
        </div>
    );
}