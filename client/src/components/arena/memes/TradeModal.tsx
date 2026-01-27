import { Modal, Box } from '@mui/material';
import { useState } from 'react';
import { MonetizationOn, ThumbUp, ThumbDown } from '@mui/icons-material';

interface TradeModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => void;
    side: 'UP' | 'DOWN';
}

export const TradeModal = ({ open, onClose, onConfirm, side }: TradeModalProps) => {
    const [amount, setAmount] = useState('');

    const handleSubmit = () => {
        const val = parseInt(amount);
        if (val > 0) onConfirm(val);
    };

    const isUp = side === 'UP';

    return (
        <Modal open={open} onClose={onClose} sx={{display:'flex', alignItems:'center', justifyContent:'center', p:4, backdropFilter: 'blur(4px)'}}>
            <Box className={`bg-slate-900 border-2 ${isUp ? 'border-emerald-500' : 'border-rose-500'} p-6 rounded-3xl w-full max-w-xs outline-none shadow-2xl`}>
                <div className="text-center mb-6">
                    <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {isUp ? <ThumbUp fontSize="large"/> : <ThumbDown fontSize="large"/>}
                    </div>
                    <h3 className="text-xl font-black text-white uppercase italic">
                        Apostar na {isUp ? 'ALTA' : 'BAIXA'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        {isUp ? "Ganhe se for o MELHOR meme." : "Ganhe se for o PIOR meme."}
                    </p>
                </div>

                <div className="relative mb-4">
                    <MonetizationOn className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                        type="number" 
                        placeholder="Quantidade" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        autoFocus
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white font-bold outline-none focus:border-white transition-colors" 
                    />
                </div>

                <button 
                    onClick={handleSubmit} 
                    className={`w-full py-3 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all text-white ${isUp ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}`}
                >
                    CONFIRMAR ORDEM
                </button>
            </Box>
        </Modal>
    );
};