import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
    Send, AttachFile, Science, ArrowBack,
    PictureAsPdf, Download
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

// Config Cloudinary (A mesma do Perfil)
const CLOUD_NAME = "dcetrqazm";
const UPLOAD_PRESET = "gecapix_preset";

export default function Laboratorio() {
    const { dbUser } = useAuth();
    const [salaAtual, setSalaAtual] = useState<string | null>(null);
    const [msgs, setMsgs] = useState<any[]>([]);
    const [texto, setTexto] = useState('');
    const [sending, setSending] = useState(false);

    // Polling (Atualização automática)
    useEffect(() => {
        if (!salaAtual) return;

        const carregar = () => {
            api.get(`chat/${salaAtual}`).then(res => setMsgs(res.data));
        };

        carregar(); // Primeira carga
        const intervalo = setInterval(carregar, 3000); // Atualiza a cada 3s
        return () => clearInterval(intervalo);
    }, [salaAtual]);

    // Scroll automático para baixo
    const bottomRef = useRef<HTMLDivElement>(null);
    useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs]);

    const handleUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSending(true);
        try {
            const data = new FormData();
            data.append('file', file);
            data.append('upload_preset', UPLOAD_PRESET);

            const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: data });
            const fileData = await resCloud.json();

            // Envia para o chat com o link
            await api.post('chat', {
                email: dbUser?.email,
                materia: salaAtual,
                texto: "Anexou um arquivo:",
                arquivo_url: fileData.secure_url,
                tipo_arquivo: file.type.includes('pdf') ? 'documento' : 'imagem'
            });

            // Recarrega chat
            const atualizado = await api.get(`chat/${salaAtual}`);
            setMsgs(atualizado.data);
        } catch (err) { alert("Erro no upload"); }
        finally { setSending(false); }
    };

    const enviarTexto = async () => {
        if (!texto.trim()) return;
        setSending(true);
        try {
            await api.post('chat', {
                email: dbUser?.email,
                materia: salaAtual,
                texto: texto
            });
            setTexto('');
            const res = await api.get(`chat/${salaAtual}`);
            setMsgs(res.data);
        } catch (e) { alert("Erro ao enviar"); }
        finally { setSending(false); }
    };

    // --- TELA 1: LOBBY DAS MATÉRIAS ---
    if (!salaAtual) {
        const listaMaterias = dbUser?.materias || [];

        return (
            <div className="p-4 pb-24 animate-fade-in space-y-6">
                <header>
                    <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Laboratório</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Troca de info anônima & segura</p>
                </header>

                {listaMaterias.length === 0 ? (
                    <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center">
                        <Science className="text-slate-700 text-6xl mb-4" />
                        <h3 className="text-white font-bold">Sem Matérias?</h3>
                        <p className="text-xs text-slate-500 mt-2 mb-4">Vá no Perfil e adicione os códigos (ex: DCC034) para entrar nas salas.</p>
                        <a href="/arena/perfil" className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black">IR PARA PERFIL</a>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {listaMaterias.map((mat: string) => (
                            <button
                                key={mat}
                                onClick={() => setSalaAtual(mat)}
                                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 p-6 rounded-2xl transition-all group"
                            >
                                <Science className="text-cyan-600 group-hover:text-cyan-400 mb-2" />
                                <span className="block text-xl font-black text-white tracking-widest">{mat}</span>
                                <span className="text-[9px] text-slate-500 uppercase font-bold">Entrar na Sala</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- TELA 2: SALA DE CHAT ---
    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-950">
            {/* TOPO DA SALA */}
            <div className="bg-slate-900 p-4 flex items-center gap-4 border-b border-slate-800 shadow-xl z-10">
                <button onClick={() => setSalaAtual(null)} className="text-slate-400 hover:text-white">
                    <ArrowBack />
                </button>
                <div>
                    <h2 className="text-lg font-black text-white tracking-widest">{salaAtual}</h2>
                    <p className="text-[9px] text-cyan-400 font-bold uppercase blink">● Conexão Segura</p>
                </div>
            </div>

            {/* ÁREA DE MENSAGENS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
                {msgs.map((msg, idx) => {
                    const souEu = msg.autor_real_id === dbUser?._id;
                    return (
                        <div key={idx} className={`flex flex-col ${souEu ? 'items-end' : 'items-start'}`}>
                            {/* Identidade */}
                            <span className="text-[9px] text-slate-500 font-bold uppercase mb-1 px-1">
                                {msg.autor_fake}
                            </span>

                            {/* Balão */}
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${souEu
                                    ? 'bg-purple-600 text-white rounded-tr-none'
                                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                                }`}>
                                {msg.texto && <p>{msg.texto}</p>}

                                {/* Anexos */}
                                {msg.arquivo_url && (
                                    <div className="mt-2">
                                        {msg.tipo_arquivo === 'imagem' ? (
                                            <img
                                                src={msg.arquivo_url}
                                                onClick={() => window.open(msg.arquivo_url, '_blank')} // <--- O PULO DO GATO
                                                className="rounded-lg max-h-40 border border-black/20 cursor-pointer hover:opacity-90 transition-opacity"
                                                alt="anexo"
                                            />
                                        ) : (
                                            <a
                                                href={msg.arquivo_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 bg-black/30 p-3 rounded-xl hover:bg-black/50 transition-colors border border-white/10"
                                            >
                                                <div className="bg-red-500/20 p-2 rounded-lg text-red-400">
                                                    <PictureAsPdf fontSize="small" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white underline decoration-slate-500">Abrir Documento PDF</span>
                                                    <span className="text-[9px] text-slate-400 uppercase">Clique para visualizar</span>
                                                </div>
                                                <Download fontSize="small" className="text-slate-500 ml-auto" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* INPUT DE ENVIO */}
            <div className="bg-slate-900 p-3 border-t border-slate-800 flex items-center gap-2">
                <label className="p-3 bg-slate-800 rounded-xl text-slate-400 cursor-pointer hover:text-cyan-400 active:scale-90 transition-all">
                    <AttachFile />
                    <input type="file" hidden onChange={handleUpload} disabled={sending} />
                </label>

                <input
                    value={texto}
                    onChange={e => setTexto(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && enviarTexto()}
                    placeholder="Mensagem anônima..."
                    disabled={sending}
                    className="flex-1 bg-slate-950 text-white p-3 rounded-xl border border-slate-800 outline-none focus:border-purple-500"
                />

                <button
                    onClick={enviarTexto}
                    disabled={sending}
                    className="p-3 bg-purple-600 rounded-xl text-white shadow-lg shadow-purple-900/40 active:scale-90 transition-all disabled:opacity-50"
                >
                    {sending ? <CircularProgress size={24} color="inherit" /> : <Send />}
                </button>
            </div>
        </div>
    );
}