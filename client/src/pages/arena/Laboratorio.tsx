import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom'; // <--- IMPORTANTE

// Componentes do Chat
import ImageViewer from '../../components/ui/ImageViewer';
import MessageBubble from '../../components/arena/Chat/MessageBubble';
import ChatInput from '../../components/arena/Chat/ChatInput';
import SolutionBubble from '../../components/arena/Chat/SolutionBubble';
import { Science, ArrowBack, AutoAwesome, Bolt } from '@mui/icons-material';

const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset";

export default function Laboratorio() {
    const { dbUser } = useAuth();
    const navigate = useNavigate(); // <--- Hook de Navegação
    
    // Estados do Chat
    const [salaAtual, setSalaAtual] = useState<string | null>(null);
    const [msgs, setMsgs] = useState<any[]>([]);
    const [texto, setTexto] = useState('');
    const [sending, setSending] = useState(false);
    const [imagemExpandida, setImagemExpandida] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Polling do Chat
    useEffect(() => {
        if (!salaAtual) return;
        const carregar = () => api.get(`chat/${salaAtual}`).then(res => setMsgs(res.data));
        carregar();
        const intervalo = setInterval(carregar, 3000);
        return () => clearInterval(intervalo);
    }, [salaAtual]);

    // Auto-Scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgs]);

    // Upload no Chat (Cloudinary)
    const handleUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSending(true);
        const toastId = toast.loading("Enviando arquivo...");
        try {
            const data = new FormData();
            data.append('file', file);
            data.append('upload_preset', UPLOAD_PRESET);
            const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: data });
            const fileData = await resCloud.json();
            
            await api.post('chat', {
                email: dbUser?.email,
                materia: salaAtual,
                texto: "",
                arquivo_url: fileData.secure_url,
                tipo_arquivo: file.type.includes('pdf') ? 'documento' : 'imagem'
            });
            const atualizado = await api.get(`chat/${salaAtual}`);
            setMsgs(atualizado.data);
            toast.success("Enviado!", { id: toastId });
        } catch (err) { toast.error("Erro no envio", { id: toastId }); }
        finally { setSending(false); }
    };

    const handleSendText = async () => {
        if (!texto.trim()) return;
        setSending(true);
        try {
            await api.post('chat', { email: dbUser?.email, materia: salaAtual, texto });
            setTexto('');
            const res = await api.get(`chat/${salaAtual}`);
            setMsgs(res.data);
        } catch (e) { toast.error("Erro ao enviar"); }
        finally { setSending(false); }
    };

    // --- RENDERIZAÇÃO ---

    // MODO LOBBY (Escolha de Sala ou IA)
    if (!salaAtual) {
        const listaMaterias = dbUser?.materias || [];
        return (
             <div className="p-4 pb-24 animate-fade-in space-y-6">
                <header>
                    <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Laboratório</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Centro de Inteligência</p>
                </header>

                {/* 1. O ORÁCULO (IA) - DESTAQUE */}
                <div 
                    onClick={() => navigate('/arena/oraculo')}
                    className="bg-gradient-to-r from-purple-900 to-slate-900 p-6 rounded-3xl border border-purple-500/30 relative overflow-hidden group cursor-pointer shadow-xl"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                        <AutoAwesome sx={{ fontSize: 80 }} className="text-purple-400" />
                    </div>
                    <div className="relative z-10">
                        <div className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-[10px] font-black uppercase inline-block mb-2 border border-purple-500/30">
                            Novo • GPT-4o
                        </div>
                        <h3 className="text-2xl font-black text-white italic uppercase">Consultar Oráculo</h3>
                        <p className="text-purple-200 text-xs mt-1 max-w-[200px]">
                            Envie uma foto da questão. A IA resolve e explica na hora.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <span className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded"><Science sx={{fontSize:12}}/> 1 GLUE</span>
                            <span className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded"><Bolt sx={{fontSize:12}}/> Instantâneo</span>
                        </div>
                    </div>
                </div>

                {/* 2. SALAS DE ESTUDO (CHAT) */}
                <div>
                    <h3 className="text-white font-bold text-sm uppercase mb-3 ml-2 flex items-center gap-2">
                        <Science className="text-slate-500" fontSize="small"/> Salas de Matéria
                    </h3>
                    
                    {listaMaterias.length === 0 ? (
                        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center">
                            <h3 className="text-white font-bold text-sm">Nenhuma matéria inscrita?</h3>
                            <p className="text-slate-500 text-xs mb-4">Configure seu perfil para acessar os chats.</p>
                            <a href="/arena/perfil" className="bg-slate-800 border border-slate-700 text-white px-4 py-2 mt-2 inline-block rounded-xl text-xs font-black hover:bg-slate-700">
                                EDITAR PERFIL
                            </a>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {listaMaterias.map((mat: string) => (
                                <button 
                                    key={mat} 
                                    onClick={() => setSalaAtual(mat)} 
                                    className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-4 rounded-2xl text-left transition-colors group"
                                >
                                    <span className="block text-xs text-slate-500 font-bold uppercase mb-1">Sala de</span>
                                    <span className="block text-sm font-black text-white group-hover:text-purple-400 transition-colors line-clamp-2">
                                        {mat}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // MODO SALA DE AULA (CHAT ATIVO)
    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950">
            <ImageViewer src={imagemExpandida} onClose={() => setImagemExpandida(null)} />
            
            {/* Header da Sala */}
            <div className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-800 shadow-xl z-10 pt-safe-top">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSalaAtual(null)} className="text-slate-400 hover:text-white p-1">
                        <ArrowBack />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-white tracking-wide uppercase line-clamp-1">{salaAtual}</h2>
                        <p className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                        </p>
                    </div>
                </div>
                
                {/* Atalho Rápido para IA dentro do Chat */}
                <button 
                    onClick={() => navigate('/arena/oraculo')}
                    className="bg-purple-600/20 text-purple-400 p-2 rounded-xl border border-purple-500/30 hover:bg-purple-600 hover:text-white transition-colors"
                >
                    <AutoAwesome fontSize="small" />
                </button>
            </div>

            {/* Lista de Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
                {msgs.map((msg, idx) => {
                    // SE FOR RESOLUÇÃO DA IA, USA O COMPONENTE NOVO
                    if (msg.tipo === 'resolucao_ia') {
                        return <SolutionBubble key={idx} msg={msg} />;
                    }

                    // SE FOR MENSAGEM NORMAL
                    return (
                        <MessageBubble 
                            key={idx} 
                            msg={msg} 
                            souEu={msg.autor_real_id === dbUser?._id} 
                            onImageClick={setImagemExpandida}
                        />
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <ChatInput 
                texto={texto} 
                setTexto={setTexto} 
                onSend={handleSendText} 
                onUpload={handleUpload} 
                loading={sending} 
            />
        </div>
    );
}