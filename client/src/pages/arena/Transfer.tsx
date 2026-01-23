// client/src/pages/arena/Transfer.tsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast'; // <--- O Toast bonito
import { Send, QrCode, AttachMoney, PersonSearch } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

export default function TransferCoins() {
    const { dbUser, setDbUser } = useAuth();
    const [loading, setLoading] = useState(false);
    
    // Estados do Formulário
    const [destinatario, setDestinatario] = useState('');
    const [valor, setValor] = useState('');

    const handleTransfer = async () => {
        // 1. Validações prévias
        if (!destinatario || !valor) {
            return toast.error("Preencha todos os campos!");
        }
        if (Number(valor) <= 0) {
            return toast.error("O valor deve ser maior que zero.");
        }
        if (Number(valor) > (dbUser?.saldo_coins || 0)) {
            return toast.error("Saldo insuficiente!");
        }

        setLoading(true);
        const toastId = toast.loading("Processando transferência...");

        try {
            // 2. A Chamada para a API (AGORA COM O EMAIL DO REMETENTE)

            // 3. Atualiza o saldo visualmente na hora (sem precisar de F5)
            if (dbUser) {
                setDbUser({
                    ...dbUser,
                    saldo_coins: dbUser.saldo_coins - Number(valor)
                });
            }

            // 4. Sucesso
            toast.success(`Enviado ${valor} coins com sucesso! 💸`, { id: toastId });
            setDestinatario('');
            setValor('');

        } catch (error: any) {
            // Tratamento de erro melhorado
            const msgErro = error.response?.data?.error || "Erro ao realizar transferência.";
            toast.error(msgErro, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 pb-24 animate-fade-in space-y-6">
            <header>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Transferir</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Envie GecaCoins para amigos</p>
            </header>

            {/* CARD DE SALDO */}
            <div className="bg-gradient-to-r from-purple-900 to-slate-900 p-6 rounded-3xl border border-purple-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <AttachMoney sx={{ fontSize: 100 }} />
                </div>
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">Seu Saldo Disponível</p>
                <h3 className="text-4xl font-black text-white flex items-center gap-2">
                    {dbUser?.saldo_coins} <span className="text-lg text-yellow-400">Coins</span>
                </h3>
            </div>

            {/* FORMULÁRIO */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
                
                {/* Input Destinatário */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <PersonSearch fontSize="small" /> Quem recebe?
                    </label>
                    <input 
                        value={destinatario}
                        onChange={e => setDestinatario(e.target.value)}
                        placeholder="Email ou Código de Convite"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white outline-none focus:border-cyan-500 transition-colors"
                    />
                    <p className="text-[9px] text-slate-600">Dica: Use o código de convite (ex: JOAO1234) para ser mais rápido.</p>
                </div>

                {/* Input Valor */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <AttachMoney fontSize="small" /> Quantidade
                    </label>
                    <input 
                        type="number"
                        value={valor}
                        onChange={e => setValor(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-mono text-xl outline-none focus:border-yellow-500 transition-colors"
                    />
                </div>

                {/* Botão Enviar */}
                <button 
                    onClick={handleTransfer}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-2xl text-white font-black text-sm shadow-lg shadow-cyan-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <CircularProgress size={20} color="inherit" /> : <><Send fontSize="small" /> CONFIRMAR ENVIO</>}
                </button>

            </div>

            {/* DICA DE QR CODE (Futuro) */}
            <div className="text-center opacity-50 mt-8">
                <button className="bg-slate-800 p-4 rounded-full text-slate-400 hover:text-white transition-colors">
                    <QrCode />
                </button>
                <p className="text-[9px] mt-2 uppercase font-bold text-slate-600">Ler QR Code (Em breve)</p>
            </div>
        </div>
    );
}