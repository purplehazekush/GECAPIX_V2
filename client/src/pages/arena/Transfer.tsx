import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { SwapHorizontalCircle, MonetizationOn, Send } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

export default function TransferCoins() {
  const { dbUser } = useAuth();
  const [destinatario, setDestinatario] = useState('');
  const [valor, setValor] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (!destinatario || !valor) return;
    if (parseInt(valor) > (dbUser?.saldo_coins || 0)) return alert("Saldo insuficiente!");

    setLoading(true);
    try {
      await api.post('/arena/transferir', {
        remetente_email: dbUser?.email,
        codigo_destino: destinatario,
        valor: valor
      });
      alert("GecaCoins enviadas com sucesso! 💸");
      window.location.href = '/arena';
    } catch (e: any) {
      alert(e.response?.data?.error || "Erro na transferência");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="text-center py-6">
        <SwapHorizontalCircle sx={{ fontSize: 60, color: '#22d3ee' }} />
        <h2 className="text-2xl font-black text-white italic mt-2 uppercase tracking-tighter">GecaBank</h2>
        <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">Mercado Paralelo</p>
      </div>

      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
        {/* SALDO ATUAL */}
        <div className="text-center bg-slate-950/50 p-4 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Seu Saldo Disponível</p>
            <div className="flex items-center justify-center gap-2 text-yellow-400 font-mono font-black text-3xl">
                <MonetizationOn fontSize="large" />
                <span>{dbUser?.saldo_coins || 0}</span>
            </div>
        </div>

        {/* INPUTS */}
        <div className="space-y-4">
            <div>
                <label className="text-[10px] text-slate-400 font-bold ml-1 uppercase">Código do Amigo</label>
                <input 
                    type="text" 
                    placeholder="Ex: JOAO1234"
                    value={destinatario}
                    onChange={e => setDestinatario(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-white font-mono focus:border-cyan-500 outline-none"
                />
            </div>

            <div>
                <label className="text-[10px] text-slate-400 font-bold ml-1 uppercase">Quantia de GecaCoins</label>
                <input 
                    type="number" 
                    placeholder="0"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-white font-mono text-2xl focus:border-yellow-500 outline-none"
                />
            </div>
        </div>

        <button 
            onClick={handleTransfer}
            disabled={loading || !destinatario || !valor}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
            {loading ? <CircularProgress size={20} color="inherit" /> : <><Send /> ENVIAR COINS AGORA</>}
        </button>
      </div>

      <p className="text-[10px] text-slate-600 text-center px-6">
        Atenção: Transferências de moedas são permanentes e não podem ser desfeitas pelo sistema. Use com responsabilidade.
      </p>
    </div>
  );
}