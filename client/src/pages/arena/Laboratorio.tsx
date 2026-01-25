// client/src/pages/arena/Laboratorio.tsx
import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

// Componentes
import ImageViewer from '../../components/ui/ImageViewer';
import MessageBubble from '../../components/arena/Chat/MessageBubble';
import SolutionBubble from '../../components/arena/Chat/SolutionBubble';
import ChatInput from '../../components/arena/Chat/ChatInput';
import OracleModal from '../../components/arena/Chat/OracleModal';

// Ícones
import { Science, ArrowBack, AutoAwesome, ArrowDownward } from '@mui/icons-material';

const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset";

export default function Laboratorio() {
    const { dbUser } = useAuth();
    
    // Estados
    const [salaAtual, setSalaAtual] = useState<string | null>(null);
    const [msgs, setMsgs] = useState<any[]>([]);
    
    // UI
    const [texto, setTexto] = useState('');
    const [sending, setSending] = useState(false);
    const [imagemExpandida, setImagemExpandida] = useState<string | null>(null);
    const [oracleOpen, setOracleOpen] = useState(false);
    
    // Refs para Scroll Inteligente
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [userScrolledUp, setUserScrolledUp] = useState(false);

    // 1. POLLING EFICIENTE
    useEffect(() => {
        if (!salaAtual) return;
        
        const carregar = async () => {
            try {
                const res = await api.get(`chat/${encodeURIComponent(salaAtual)}`);
                setMsgs(prev => {
                    // Evita re-render desnecessário se não mudou nada (comparação simples por tamanho ou ID do último)
                    if (prev.length > 0 && res.data.length === prev.length) return prev;
                    return res.data;
                });
            } catch (err) {
                console.error("Falha no polling do chat");
            }
        };
        
        carregar(); 
        const intervalo = setInterval(carregar, 3000);
        return () => clearInterval(intervalo);
    }, [salaAtual]);

    // 2. SMART SCROLL (O Segredo da UX)
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Lógica: Se o usuário estiver perto do fundo (ou for a primeira carga), desce.
        // Se ele subiu para ler histórico, NÃO desce, mas avisa que tem msg nova.
        
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        
        if (!userScrolledUp || isNearBottom || msgs.length < 5) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            setShowScrollButton(false);
        } else {
            // Usuário está lendo o passado e chegou msg nova
            setShowScrollButton(true);
        }
    }, [msgs]); // Roda sempre que chegam mensagens

    // Detecta se o usuário subiu a tela manualmente
    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;
        
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        setUserScrolledUp(!isNearBottom);
        if (isNearBottom) setShowScrollButton(false);
    };

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        setUserScrolledUp(false);
        setShowScrollButton(false);
    };

    // 3. UPLOAD DE ARQUIVO
    const handleUpload = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file || !dbUser?.email) return;

        setSending(true);
        const toastId = toast.loading("Enviando arquivo...");

        try {
            const data = new FormData();
            data.append('file', file);
            data.append('upload_preset', UPLOAD_PRESET);

            const resCloud = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: data });
            const fileData = await resCloud.json();
            
            await api.post('chat', {
                email: dbUser.email, // Garantindo o email
                materia: salaAtual,
                texto: "",
                arquivo_url: fileData.secure_url,
                tipo_arquivo: file.type.includes('pdf') ? 'documento' : 'imagem'
            });

            // Atualiza localmente otimista ou espera o polling
            toast.success("Enviado!", { id: toastId });
            // Força um refresh rápido
            const atualizado = await api.get(`chat/${encodeURIComponent(salaAtual!)}`);
            setMsgs(atualizado.data);

        } catch (err) { 
            toast.error("Erro no envio", { id: toastId }); 
        } finally { 
            setSending(false); 
        }
    };

    // 4. ENVIO DE TEXTO (Correção do Payload)
    const handleSendText = async () => {
        if (!texto.trim() || !dbUser?.email) return;
        
        const msgTemp = texto;
        setTexto(''); // Limpa UI instantaneamente (Optimistic)
        setSending(true);
        
        try {
            await api.post('chat', { 
                email: dbUser.email, // <--- CRUCIAL: O Backend precisa disso
                materia: salaAtual, 
                texto: msgTemp 
            });
            
            // O polling vai trazer a mensagem, mas podemos forçar um fetch agora
            const res = await api.get(`chat/${encodeURIComponent(salaAtual!)}`);
            setMsgs(res.data);
            setUserScrolledUp(false); // Reseta scroll ao enviar
            
        } catch (e) { 
            setTexto(msgTemp); // Devolve o texto em caso de erro
            toast.error("Erro ao enviar. Tente novamente."); 
        } finally { 
            setSending(false); 
        }
    };

    // --- RENDERIZAÇÃO ---

    if (!salaAtual) {
        // ... (MANTIVE A LÓGICA DO LOBBY IDÊNTICA AO SEU CÓDIGO ORIGINAL)
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
                        <p className="text-slate-500 text-xs mb-4">Você precisa adicionar matérias no seu perfil.</p>
                        <a href="/arena/perfil" className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black">EDITAR PERFIL</a>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {listaMaterias.map((mat: string) => (
                            <button key={mat} onClick={() => setSalaAtual(mat)} className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-5 rounded-2xl text-left transition-all active:scale-95 shadow-lg">
                                <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Sala de</span>
                                <span className="block text-sm font-black text-white line-clamp-2">{mat}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950">
            <ImageViewer src={imagemExpandida} onClose={() => setImagemExpandida(null)} />
            
            {/* HEADER DA SALA */}
            <div className="bg-slate-900 p-3 px-4 flex items-center justify-between border-b border-slate-800 shadow-xl z-10 pt-safe-top">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSalaAtual(null)} className="text-slate-400 hover:text-white p-2">
                        <ArrowBack />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase line-clamp-1 max-w-[150px]">{salaAtual}</h2>
                        <p className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => setOracleOpen(true)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-xl border border-purple-400/30 text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                    <AutoAwesome sx={{ fontSize: 16 }} className="animate-pulse" /> Oráculo
                </button>
            </div>

            {/* FEED DE MENSAGENS COM REF DE CONTAINER */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50 custom-scrollbar relative"
            >
                {msgs.length === 0 && (
                    <div className="text-center py-10 opacity-50">
                        <Science sx={{fontSize: 40}} className="text-slate-700 mb-2"/>
                        <p className="text-xs text-slate-500 font-bold">Sala vazia.</p>
                        <p className="text-[10px] text-slate-600">Invoque o Oráculo para começar.</p>
                    </div>
                )}
                
                {msgs.map((msg, idx) => {
                    if (msg.tipo === 'resolucao_ia') return <SolutionBubble key={idx} msg={msg} />;
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

            {/* BOTÃO FLUTUANTE DE NOVA MENSAGEM */}
            {showScrollButton && (
                <button 
                    onClick={scrollToBottom}
                    className="absolute bottom-24 right-4 bg-cyan-500 text-white p-2 rounded-full shadow-lg animate-bounce z-20"
                >
                    <ArrowDownward />
                </button>
            )}

            <ChatInput 
                texto={texto} 
                setTexto={setTexto} 
                onSend={handleSendText} 
                onUpload={handleUpload} 
                loading={sending} 
            />

            {salaAtual && (
                <OracleModal 
                    open={oracleOpen} 
                    onClose={() => setOracleOpen(false)} 
                    sala={salaAtual} 
                    onSuccess={() => {
                        api.get(`chat/${encodeURIComponent(salaAtual)}`).then(res => setMsgs(res.data));
                        scrollToBottom();
                    }}
                />
            )}
        </div>
    );
}