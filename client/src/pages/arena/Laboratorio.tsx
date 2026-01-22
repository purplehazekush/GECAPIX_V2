import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import ImageViewer from '../../components/ui/ImageViewer';
import MessageBubble from '../../components/arena/Chat/MessageBubble'; // <--- IMPORT
import ChatInput from '../../components/arena/Chat/ChatInput';       // <--- IMPORT
import { Science, ArrowBack } from '@mui/icons-material';

const CLOUD_NAME = "dcetrqazm"; 
const UPLOAD_PRESET = "gecapix_preset";

export default function Laboratorio() {
    const { dbUser } = useAuth();
    const [salaAtual, setSalaAtual] = useState<string | null>(null);
    const [msgs, setMsgs] = useState<any[]>([]);
    const [texto, setTexto] = useState('');
    const [sending, setSending] = useState(false);
    const [imagemExpandida, setImagemExpandida] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Polling
    useEffect(() => {
        if (!salaAtual) return;
        const carregar = () => api.get(`chat/${salaAtual}`).then(res => setMsgs(res.data));
        carregar();
        const intervalo = setInterval(carregar, 3000);
        return () => clearInterval(intervalo);
    }, [salaAtual]);

    // Scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [msgs]);

    // Lógicas de Envio (Mantidas iguais, só movidas para funções limpas)
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
    if (!salaAtual) {
        // ... (Mantenha o Lobby igual, ou crie um componente <Lobby /> se quiser)
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
                        <a href="/arena/perfil" className="bg-purple-600 text-white px-4 py-2 mt-4 inline-block rounded-xl text-xs font-black">ADICIONAR</a>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {listaMaterias.map((mat: string) => (
                            <button key={mat} onClick={() => setSalaAtual(mat)} className="bg-slate-900 hover:bg-slate-800 border border-slate-700 p-6 rounded-2xl">
                                <span className="block text-xl font-black text-white">{mat}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-950">
            <ImageViewer src={imagemExpandida} onClose={() => setImagemExpandida(null)} />
            
            {/* Header da Sala */}
            <div className="bg-slate-900 p-4 flex items-center gap-4 border-b border-slate-800 shadow-xl z-10">
                <button onClick={() => setSalaAtual(null)} className="text-slate-400 hover:text-white"><ArrowBack /></button>
                <h2 className="text-lg font-black text-white tracking-widest">{salaAtual}</h2>
            </div>

            {/* Lista de Mensagens (Agora limpa!) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
                {msgs.map((msg, idx) => (
                    <MessageBubble 
                        key={idx} 
                        msg={msg} 
                        souEu={msg.autor_real_id === dbUser?._id} 
                        onImageClick={setImagemExpandida}
                    />
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input Componentizado */}
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