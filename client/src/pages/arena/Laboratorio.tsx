import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

// Componentes Visuais
import ImageViewer from '../../components/ui/ImageViewer';
import MessageBubble from '../../components/arena/Chat/MessageBubble';
import SolutionBubble from '../../components/arena/Chat/SolutionBubble'; // <--- O Renderizador de LaTeX
import ChatInput from '../../components/arena/Chat/ChatInput';
import OracleModal from '../../components/arena/Chat/OracleModal'; // <--- O Modal da Câmera

// Ícones
import { Science, ArrowBack, AutoAwesome } from '@mui/icons-material';

// Configuração Cloudinary (Para upload de arquivos no chat normal)
const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset";

export default function Laboratorio() {
    const { dbUser } = useAuth();
    
    // Estados de Navegação e Dados
    const [salaAtual, setSalaAtual] = useState<string | null>(null);
    const [msgs, setMsgs] = useState<any[]>([]);
    
    // Estados de Interface
    const [texto, setTexto] = useState('');
    const [sending, setSending] = useState(false);
    const [imagemExpandida, setImagemExpandida] = useState<string | null>(null);
    const [oracleOpen, setOracleOpen] = useState(false); // Controla o Modal do Oráculo
    
    const bottomRef = useRef<HTMLDivElement>(null);

    // 1. POLLING (Busca mensagens a cada 3 segundos quando está numa sala)
    useEffect(() => {
        if (!salaAtual) return;
        
        const carregar = () => api.get(`chat/${salaAtual}`).then(res => setMsgs(res.data));
        
        carregar(); // Primeira carga imediata
        const intervalo = setInterval(carregar, 3000); // Loop
        
        return () => clearInterval(intervalo);
    }, [salaAtual]);

    // 2. AUTO-SCROLL (Desce a tela quando chega mensagem nova)
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgs]);

    // 3. UPLOAD DE ARQUIVO (Chat Comum - Não é o Oráculo)
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

            // Atualiza lista
            const atualizado = await api.get(`chat/${salaAtual}`);
            setMsgs(atualizado.data);
            toast.success("Enviado!", { id: toastId });

        } catch (err) { 
            toast.error("Erro no envio", { id: toastId }); 
        } finally { 
            setSending(false); 
        }
    };

    // 4. ENVIO DE TEXTO
    const handleSendText = async () => {
        if (!texto.trim()) return;
        setSending(true);
        try {
            await api.post('chat', { email: dbUser?.email, materia: salaAtual, texto });
            setTexto('');
            // Atualiza imediato para sensação de rapidez
            const res = await api.get(`chat/${salaAtual}`);
            setMsgs(res.data);
        } catch (e) { 
            toast.error("Erro ao enviar"); 
        } finally { 
            setSending(false); 
        }
    };

    // --- RENDERIZAÇÃO ---

    // CENÁRIO A: LOBBY (Usuário escolhe a sala)
    if (!salaAtual) {
        const listaMaterias = dbUser?.materias || [];
        return (
             <div className="p-4 pb-24 animate-fade-in space-y-6">
                <header>
                    <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Laboratório</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Centro de Inteligência Coletiva</p>
                </header>

                {listaMaterias.length === 0 ? (
                    <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center">
                        <Science className="text-slate-700 text-6xl mb-4" />
                        <h3 className="text-white font-bold text-sm">Sem Acesso?</h3>
                        <p className="text-slate-500 text-xs mb-4">
                            Você precisa adicionar matérias no seu perfil para entrar nos laboratórios.
                        </p>
                        <a href="/arena/perfil" className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black active:scale-95 transition-transform inline-block">
                            EDITAR PERFIL
                        </a>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {listaMaterias.map((mat: string) => (
                            <button 
                                key={mat} 
                                onClick={() => setSalaAtual(mat)} 
                                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-5 rounded-2xl text-left transition-all group active:scale-95 shadow-lg"
                            >
                                <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Sala de</span>
                                <span className="block text-sm font-black text-white group-hover:text-purple-400 transition-colors line-clamp-2">
                                    {mat}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // CENÁRIO B: DENTRO DA SALA (Chat + Oráculo)
    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950">
            {/* Visualizador de Imagem Fullscreen */}
            <ImageViewer src={imagemExpandida} onClose={() => setImagemExpandida(null)} />
            
            {/* HEADER DA SALA */}
            <div className="bg-slate-900 p-3 px-4 flex items-center justify-between border-b border-slate-800 shadow-xl z-10 pt-safe-top">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setSalaAtual(null)} 
                        className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <ArrowBack />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-white tracking-wide uppercase line-clamp-1 max-w-[150px]">
                            {salaAtual}
                        </h2>
                        <p className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                        </p>
                    </div>
                </div>
                
                {/* BOTÃO DO ORÁCULO (Estilo Mágico) */}
                <button 
                    onClick={() => setOracleOpen(true)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-xl border border-purple-400/30 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-900/50 flex items-center gap-2"
                >
                    <AutoAwesome sx={{ fontSize: 16 }} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase">Oráculo</span>
                </button>
            </div>

            {/* FEED DE MENSAGENS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50 custom-scrollbar">
                
                {/* Empty State */}
                {msgs.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <Science sx={{fontSize: 40}} className="text-slate-700 mb-2"/>
                        <p className="text-xs text-slate-500 font-bold">Sala vazia.</p>
                        <p className="text-[10px] text-slate-600">Seja o primeiro a perguntar ou invoque o Oráculo.</p>
                    </div>
                )}
                
                {/* Lista */}
                {msgs.map((msg, idx) => {
                    // SE FOR IA -> Renderiza Balão de Solução (LaTeX + Doação)
                    if (msg.tipo === 'resolucao_ia') {
                        return <SolutionBubble key={idx} msg={msg} />;
                    }
                    
                    // SE FOR HUMANO -> Renderiza Balão Normal
                    return (
                        <MessageBubble 
                            key={idx} 
                            msg={msg} 
                            souEu={msg.autor_real_id === dbUser?._id} 
                            onImageClick={setImagemExpandida} 
                        />
                    );
                })}
                
                {/* Elemento invisível para scrollar até o fim */}
                <div ref={bottomRef} />
            </div>

            {/* INPUT DE TEXTO */}
            <ChatInput 
                texto={texto} 
                setTexto={setTexto} 
                onSend={handleSendText} 
                onUpload={handleUpload} 
                loading={sending} 
            />

            {/* MODAL DO ORÁCULO (Invisível até ser ativado) */}
            {salaAtual && (
                <OracleModal 
                    open={oracleOpen} 
                    onClose={() => setOracleOpen(false)} 
                    sala={salaAtual} 
                    onSuccess={() => {
                        // Recarrega o chat imediatamente após a IA responder
                        api.get(`chat/${salaAtual}`).then(res => setMsgs(res.data));
                    }}
                />
            )}
        </div>
    );
}