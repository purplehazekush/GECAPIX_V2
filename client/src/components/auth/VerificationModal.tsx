import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Key, CheckCircle, School, Close } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function VerificationModal({ isOpen, onClose }: Props) {
    const { reloadUser } = useAuth();
    const [step, setStep] = useState<'EMAIL' | 'CODE' | 'SUCCESS'>('EMAIL');
    const [emailUfmg, setEmailUfmg] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSendCode = async () => {
        // Aceita @ufmg.br e @demet.ufmg.br
        if (!emailUfmg.includes('@ufmg.br')) {
            return toast.error("Use um e-mail institucional (@ufmg.br).");
        }
        
        setLoading(true);
        try {
            await api.post('/auth/send-verification', { email_ufmg: emailUfmg });
            toast.success(`Código enviado para ${emailUfmg}`);
            setStep('CODE');
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Erro ao enviar código.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmCode = async () => {
        setLoading(true);
        try {
            await api.post('/auth/confirm-verification', { code });
            await reloadUser();
            setStep('SUCCESS');
            toast.success("Identidade confirmada! Bem-vindo(a).");
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Código inválido.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl">
                
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <Close />
                </button>

                {step === 'EMAIL' && (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-cyan-400 mb-2">
                            <School fontSize="large" />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase italic">Validação UFMG</h2>
                        <p className="text-xs text-slate-400">
                            Insira seu e-mail institucional para desbloquear a Arena e ganhar <span className="text-yellow-400 font-bold">100 Coins</span>.
                        </p>

                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-slate-500" fontSize="small" />
                            <input 
                                type="email" 
                                placeholder="usuario@ufmg.br" 
                                value={emailUfmg}
                                onChange={e => setEmailUfmg(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none focus:border-cyan-500 transition-colors"
                            />
                        </div>

                        <button 
                            onClick={handleSendCode} 
                            disabled={loading}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-900/30 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? <CircularProgress size={20} color="inherit" /> : "ENVIAR CÓDIGO"}
                        </button>
                    </div>
                )}

                {step === 'CODE' && (
                    <div className="text-center space-y-4 animate-slide-up">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-yellow-400 mb-2">
                            <Key fontSize="large" />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase italic">Código de Acesso</h2>
                        <p className="text-xs text-slate-400">
                            Enviamos um código para <strong>{emailUfmg}</strong>. Verifique o Spam.
                        </p>

                        <input 
                            type="text" 
                            placeholder="000000" 
                            maxLength={6}
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g,''))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 text-center text-white text-2xl font-mono tracking-[0.5em] outline-none focus:border-yellow-500 transition-colors"
                        />

                        <button 
                            onClick={handleConfirmCode} 
                            disabled={loading || code.length < 6}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/30 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? <CircularProgress size={20} color="inherit" /> : "VALIDAR"}
                        </button>
                        <button onClick={() => setStep('EMAIL')} className="text-xs text-slate-500 underline">Corrigir E-mail</button>
                    </div>
                )}

                {step === 'SUCCESS' && (
                    <div className="text-center space-y-6 animate-scale-up py-4">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white shadow-lg shadow-emerald-500/50">
                            <CheckCircle sx={{ fontSize: 50 }} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase italic">Confirmado!</h2>
                            <p className="text-slate-400 text-sm mt-2">Sua conta agora é <span className="text-emerald-400 font-bold">Nível Membro</span>.</p>
                        </div>
                        <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl mt-4">
                            FECHAR
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}