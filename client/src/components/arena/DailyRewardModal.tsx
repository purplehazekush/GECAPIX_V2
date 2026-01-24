// client/src/components/arena/DailyRewardModal.tsx
import { Modal, Box } from '@mui/material';
import { CalendarMonth, MonetizationOn, CheckCircle } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';

// Estilo Centralizado (Flexbox Shield)
const style = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2
};

export default function DailyRewardModal() {
    const { dbUser } = useAuth();
    const [open, setOpen] = useState(false);
    const [rewardData, setRewardData] = useState<{valor: number, dia: number} | null>(null);

    useEffect(() => {
        // Verifica se no extrato recente tem um Daily Login de hoje
        if (dbUser?.extrato && dbUser.extrato.length > 0) {
            const lastItem = dbUser.extrato[dbUser.extrato.length - 1];
            const isDaily = lastItem.descricao.includes("Daily Login");
            
            // Se a última transação foi um Daily Login e aconteceu agora (menos de 1 min), mostra o modal
            const txTime = new Date(lastItem.data).getTime();
            const now = new Date().getTime();
            
            if (isDaily && (now - txTime < 60000)) { 
                // Extrai o dia da string "Daily Login (Dia X)"
                const diaMatch = lastItem.descricao.match(/Dia (\d+)/);
                const dia = diaMatch ? parseInt(diaMatch[1]) : 1;
                
                setRewardData({ valor: lastItem.valor, dia });
                setOpen(true);
            }
        }
    }, [dbUser]);

    return (
        <Modal open={open} onClose={() => setOpen(false)} sx={style}>
            <Box className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-1 shadow-2xl outline-none w-full max-w-sm animate-fade-in relative overflow-hidden">
                {/* Raios de luz de fundo */}
                <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
                
                <div className="bg-slate-950 rounded-[20px] p-6 relative z-10 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center border border-emerald-500/30">
                        <CalendarMonth className="text-emerald-400" sx={{ fontSize: 32 }} />
                    </div>

                    <div>
                        <h2 className="text-2xl font-black text-white italic uppercase">
                            Login Diário
                        </h2>
                        <p className="text-emerald-400 font-bold uppercase text-xs tracking-widest mt-1">
                            Sequência: {rewardData?.dia} Dias 🔥
                        </p>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-center gap-3">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Você ganhou</p>
                            <p className="text-3xl font-black text-white leading-none">
                                +{rewardData?.valor}
                            </p>
                        </div>
                        <MonetizationOn className="text-yellow-400" sx={{ fontSize: 40 }} />
                    </div>

                    <button 
                        onClick={() => setOpen(false)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        <CheckCircle sx={{ fontSize: 16 }} /> RESGATAR
                    </button>
                    
                    <p className="text-[9px] text-slate-600">
                        Volte amanhã para ganhar mais!
                    </p>
                </div>
            </Box>
        </Modal>
    );
}