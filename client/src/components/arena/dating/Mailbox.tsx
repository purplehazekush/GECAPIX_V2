import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { WhatsApp } from '@mui/icons-material';
import { ProfileModal } from './ProfileModal';

export const Mailbox = () => {
    const [msgs, setMsgs] = useState<any[]>([]);
    const [viewProfile, setViewProfile] = useState<any>(null); // Estado para o modal

    useEffect(() => {
        api.get('/dating/mailbox').then(res => setMsgs(res.data)).catch(console.error);
    }, []);

    // Helper para montar objeto de perfil a partir da mensagem (já que não temos o objeto completo aqui, usamos o que tem)
    const openProfile = (msg: any) => {
        setViewProfile({
            nome: msg.remetente_nome,
            fotos: [msg.remetente_foto],
            curso: 'GecaMatch User', // A mensagem atual não salva o curso, teria que popular no backend. Por enquanto, placeholder.
            bio: msg.mensagem // Mostra a mensagem como bio temporária
        });
    };

    if (msgs.length === 0) return <div className="text-center p-10 text-xs text-slate-500">Nenhum match ainda. Continue dando likes!</div>;

    return (
        <>
            <div className="space-y-3 pb-24 animate-slide-up">
                {msgs.map((msg, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border flex gap-4 relative ${msg.tipo === 'SUPERLIKE' ? 'bg-slate-900 border-yellow-500/30' : 'bg-slate-900 border-purple-500/20'}`}>

                        {/* Foto Clicável */}
                        <div
                            onClick={() => openProfile(msg)}
                            className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden flex-shrink-0 border-2 border-slate-700 cursor-pointer hover:border-purple-500 transition-colors"
                        >
                            {msg.remetente_foto && <img src={msg.remetente_foto} className="w-full h-full object-cover" />}
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-white text-sm">
                                    {msg.remetente_nome.split(' ')[0]}
                                    {msg.tipo === 'SUPERLIKE' && <span className="ml-2 text-[9px] bg-yellow-500 text-black px-1.5 rounded font-black">SUPER</span>}
                                </h4>
                                <span className="text-[9px] text-slate-500">{new Date(msg.data).toLocaleDateString()}</span>
                            </div>

                            <p className="text-xs text-slate-400 mt-1">{msg.mensagem}</p>

                            {msg.telefone_revelado && (
                                <a
                                    href={`https://wa.me/55${msg.telefone_revelado.replace(/\D/g, '')}`}
                                    target="_blank"
                                    className="mt-3 inline-flex items-center gap-2 bg-emerald-600/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-600/30 transition-colors"
                                >
                                    <WhatsApp sx={{ fontSize: 14 }} /> Chamar no Zap
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {viewProfile && <ProfileModal profile={viewProfile} onClose={() => setViewProfile(null)} />}
        </>
    );
};