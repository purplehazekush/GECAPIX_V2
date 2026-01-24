// client/src/components/arena/Chat/SolutionBubble.tsx
import { useState } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Bolt, School, Paid, CheckCircle } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';

// LaTeX Renderer
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next'; 

interface Props {
    msg: any; // Objeto da mensagem vindo do banco
}

export default function SolutionBubble({ msg }: Props) {
    const { dbUser, setDbUser } = useAuth();
    const [donating, setDonating] = useState(false);

    // O conteúdo vem stringificado no campo 'texto'
    let content;
    try {
        content = JSON.parse(msg.texto);
    } catch (e) {
        content = { resolucao_rapida: "Erro ao processar resposta." };
    }

    const handleDonate = async () => {
        if (!dbUser) return;
        const VALOR_DOACAO = 10; // Valor fixo ou dinâmico

        if (dbUser.saldo_coins < VALOR_DOACAO) return toast.error("Saldo insuficiente!");
        if (msg.autor_real_id === dbUser._id) return toast.error("Não pode doar para si mesmo!");

        setDonating(true);
        try {
            await api.post('/arena/transferir', {
                remetenteEmail: dbUser.email,
                destinatarioChave: msg.autor_real_id, // Transferir por ID
                valor: VALOR_DOACAO
            });
            
            // Atualiza visualmente
            setDbUser({...dbUser, saldo_coins: dbUser.saldo_coins - VALOR_DOACAO});
            toast.success(`Você doou ${VALOR_DOACAO} coins! 🤝`);
        } catch (e) {
            toast.error("Erro na doação.");
        } finally {
            setDonating(false);
        }
    };

    return (
        <div className="flex flex-col animate-fade-in my-4">
            
            {/* Header: Quem pediu */}
            <div className="flex items-center gap-2 mb-2 ml-1">
                <div className="bg-purple-600/20 p-1.5 rounded-lg border border-purple-500/50">
                    <Bolt className="text-purple-400" sx={{ fontSize: 16 }} />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Oráculo invocado por <span className="text-white">{msg.autor_nome_original || 'Um Aluno'}</span>
                </span>
            </div>

            {/* O CARD DA SOLUÇÃO */}
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl relative">
                
                {/* 1. Pergunta (Imagem) */}
                {msg.imagem_original && (
                    <div className="w-full h-32 bg-black relative group">
                        <img 
                            src={msg.imagem_original} 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity cursor-zoom-in" 
                            onClick={() => window.open(msg.imagem_original, '_blank')}
                        />
                        <div className="absolute bottom-1 right-2 text-[9px] text-white/50 bg-black/50 px-2 rounded">
                            Ver Questão Original
                        </div>
                    </div>
                )}

                {/* 2. Resposta Rápida (Highlight) */}
                <div className="bg-gradient-to-r from-purple-900/50 to-slate-900 p-4 border-b border-slate-800">
                    <p className="text-[9px] text-purple-300 font-bold uppercase mb-1 flex items-center gap-1">
                        <CheckCircle sx={{fontSize:10}}/> Resposta Final
                    </p>
                    <div className="text-lg text-white font-black font-mono">
                        <Latex>{content.resolucao_rapida || "..."}</Latex>
                    </div>
                </div>

                {/* 3. Explicação (Corpo) */}
                <div className="p-4 space-y-3 bg-slate-900">
                    <div className="flex items-center gap-2 text-slate-500">
                        <School sx={{ fontSize: 14 }} />
                        <span className="text-[10px] font-bold uppercase">Passo a Passo</span>
                    </div>
                    <div className="text-sm text-slate-300 leading-relaxed font-light">
                        {/* Latex renderiza automaticamente o que estiver entre $...$ */}
                        <Latex>{content.passo_a_passo || ""}</Latex>
                    </div>
                </div>

                {/* 4. Footer: Botão de Doação */}
                {msg.autor_real_id !== dbUser?._id && (
                    <div className="bg-slate-950 p-3 flex justify-between items-center border-t border-slate-800">
                        <span className="text-[9px] text-slate-500 max-w-[60%]">
                            Essa resposta ajudou? Apoie quem gastou GLUE para gerá-la.
                        </span>
                        <button 
                            onClick={handleDonate}
                            disabled={donating}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shadow-lg active:scale-95 transition-all"
                        >
                            {donating ? <CircularProgress size={12} color="inherit"/> : <Paid sx={{fontSize:14}}/>}
                            Doar 10
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}