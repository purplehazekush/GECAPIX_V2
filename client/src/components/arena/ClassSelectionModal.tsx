// client/src/components/arena/ClassSelectionModal.tsx
import { useState } from 'react';
import { Modal, Box } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { AutoFixHigh, TrendingUp, SmartToy, Campaign } from '@mui/icons-material';

// Estilo dos Cards
const classes = [
    {
        id: 'BRUXO',
        nome: 'O Bruxo',
        icone: <AutoFixHigh fontSize="large" className="text-purple-500" />,
        desc: 'Rei da gambiarra e do caos.',
        bonus: 'Sorte Crítica em Drops',
        color: 'border-purple-500/50 hover:bg-purple-900/20'
    },
    {
        id: 'ESPECULADOR',
        nome: 'O Especulador',
        icone: <TrendingUp fontSize="large" className="text-emerald-500" />,
        desc: 'Faria Limer do campus.',
        bonus: '+50% Rendimento no Banco',
        color: 'border-emerald-500/50 hover:bg-emerald-900/20'
    },
    {
        id: 'TECNOMANTE',
        nome: 'O Tecnomante',
        icone: <SmartToy fontSize="large" className="text-cyan-500" />,
        desc: 'Engenheiro Hardcore.',
        bonus: '50% Desconto no Oráculo IA',
        color: 'border-cyan-500/50 hover:bg-cyan-900/20'
    },
    {
        id: 'BARDO',
        nome: 'O Bardo',
        icone: <Campaign fontSize="large" className="text-yellow-500" />,
        desc: 'Influencer e Social.',
        bonus: '+20% Bônus de Indicação',
        color: 'border-yellow-500/50 hover:bg-yellow-900/20'
    }
];

export default function ClassSelectionModal() {
    const { dbUser, setDbUser } = useAuth();
    const [loading, setLoading] = useState(false);

    // Só mostra se for NOVATO
    if (!dbUser || dbUser.classe !== 'NOVATO') return null;

    const handleSelect = async (classeId: string) => {
        if(!window.confirm(`Tem certeza? Você será um ${classeId} para sempre!`)) return;
        
        setLoading(true);
        try {
            // Rota rápida para atualizar perfil (reaproveitando updatePerfil ou criando rota específica)
            await api.put('/arena/perfil', { email: dbUser.email, classe: classeId });
            
            setDbUser({ ...dbUser, classe: classeId });
            toast.success(`Você agora é um ${classeId}!`);
        } catch (e) {
            toast.error("Erro ao escolher classe.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={true} sx={{display:'flex', alignItems:'center', justifyContent:'center', p:2}}>
            <Box className="bg-slate-950 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl outline-none max-h-[90vh] overflow-y-auto">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black text-white italic uppercase">Escolha sua Classe</h2>
                    <p className="text-slate-400 text-xs mt-2">Isso definirá seu bônus econômico na Season 1.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {classes.map((cls) => (
                        <button
                            key={cls.id}
                            onClick={() => handleSelect(cls.id)}
                            disabled={loading}
                            className={`flex flex-col items-center p-6 rounded-2xl border bg-slate-900 transition-all active:scale-95 ${cls.color}`}
                        >
                            <div className="mb-3">{cls.icone}</div>
                            <h3 className="font-black text-white uppercase italic">{cls.nome}</h3>
                            <p className="text-[10px] text-slate-400 my-2">{cls.desc}</p>
                            <span className="text-[9px] font-bold bg-white/10 px-2 py-1 rounded text-white mt-auto">
                                {cls.bonus}
                            </span>
                        </button>
                    ))}
                </div>
            </Box>
        </Modal>
    );
}