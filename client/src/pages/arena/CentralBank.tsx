import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Tabs, Tab, CircularProgress } from '@mui/material';
import { PieChart, Savings, LockClock } from '@mui/icons-material';

// Importa Componentes Refatorados
import { BankHeader } from '../../components/arena/bank/BankHeader';
import { OverviewTab } from '../../components/arena/bank/OverviewTab';
import { LiquidStakingTab } from '../../components/arena/bank/LiquidStakingTab';
import { BondsTab } from '../../components/arena/bank/BondsTab';

export default function CentralBank() {
    const { dbUser, setDbUser } = useAuth();
    const [tab, setTab] = useState(0); 
    const [loading, setLoading] = useState(true);
    
    // Dados Globais do Banco
    const [status, setStatus] = useState<any>(null);
    const [tokenomics, setTokenomics] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [s, t] = await Promise.all([
                    api.get('/tokenomics/status'),
                    api.get('/tokenomics')
                ]);
                setStatus(s.data);
                setTokenomics(t.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    if (loading) return <div className="flex justify-center p-20"><CircularProgress color="secondary" /></div>;

    const netWorth = (dbUser?.saldo_coins || 0) + (dbUser?.saldo_staking_liquido || 0);

    return (
        <div className="pb-28 p-4 animate-fade-in space-y-6 max-w-3xl mx-auto">
            <BankHeader seasonId={status?.season_id} totalNetWorth={netWorth} />

            <Tabs 
                value={tab} onChange={(_, v) => setTab(v)} 
                textColor="inherit" indicatorColor="secondary" variant="fullWidth" 
                className="bg-slate-900 rounded-xl border border-slate-800 shadow-inner mb-4"
            >
                <Tab icon={<PieChart fontSize="small"/>} label={<span className="text-[10px] font-black">VISÃO GERAL</span>} />
                <Tab icon={<Savings fontSize="small"/>} label={<span className="text-[10px] font-black">CDI (LÍQUIDO)</span>} />
                <Tab icon={<LockClock fontSize="small"/>} label={<span className="text-[10px] font-black">TESOURO (IPCA)</span>} />
            </Tabs>

            {tab === 0 && <OverviewTab status={status} tokenomics={tokenomics} />}
            
            {tab === 1 && <LiquidStakingTab user={dbUser} status={status} onUpdateUser={setDbUser} />}
            
            {tab === 2 && <BondsTab user={dbUser} status={status} onUpdateUser={setDbUser} />}
        </div>
    );
}