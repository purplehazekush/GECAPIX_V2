// client/src/pages/arena/Dating.tsx
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Style, Mail, Person2TwoTone } from '@mui/icons-material';

// Importa Módulos
import { DatingIntro } from '../../components/arena/dating/DatingIntro';
import { ProfileBuilder } from '../../components/arena/dating/ProfileBuilder';
import { SwipeDeck } from '../../components/arena/dating/SwipeDeck';
import { Mailbox } from '../../components/arena/dating/Mailbox';
import { DatingFilters } from '../../components/arena/dating/DatingFilters';
import { SentLikes } from '../../components/arena/dating/SentLikes';

export default function Dating() {
    useAuth();
    const [hasProfile, setHasProfile] = useState<boolean | null>(null); // null = loading
    const [showIntro, setShowIntro] = useState(false);
    const [tab, setTab] = useState(0); // 0=Swipe, 1=Sent, 2=Mailbox
    // Filtros
    const [filters, setFilters] = useState({
        altura: 'TODOS', biotipo: 'TODOS', bebe: 'TODOS', fuma: 'TODOS', festa: 'TODOS'
    });

    // Checa se usuário já tem perfil de dating
    useEffect(() => {
        // Tenta buscar candidatos. Se der 404 no perfil, sabemos que não tem.
        // Ou melhor: criar um endpoint específico /dating/me.
        // Workaround rápido: Tentar ler a mailbox. Se der erro de perfil off, mostramos intro.
        api.get('/dating/mailbox')
            .then(() => setHasProfile(true))
            .catch((err) => {
                if(err.response?.status === 404) {
                    setHasProfile(false);
                    // Se não tiver localstorage dizendo que já viu, mostra intro
                    if(!localStorage.getItem('dating_intro_seen')) setShowIntro(true);
                }
            });
    }, []);

    const handleIntroAccept = () => {
        setShowIntro(false);
        localStorage.setItem('dating_intro_seen', 'true');
    };

    if (hasProfile === null) return null; // Loading silencioso

    // Se não tem perfil e já fechou a intro, mostra o Builder
    if (!hasProfile) {
        return (
            <div className="p-4">
                {showIntro && <DatingIntro onAccept={handleIntroAccept} onDecline={() => window.history.back()} />}
                <ProfileBuilder onComplete={() => setHasProfile(true)} />
            </div>
        );
    }

    // Se tem perfil, mostra o App
    return (
        <div className="pb-20 p-4 max-w-md mx-auto">
            {/* Header */}
            <header className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 italic uppercase">
                    GecaMatch
                </h2>
                
                <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex">
                    <button onClick={() => setTab(0)} className={`p-2 rounded-lg transition-all ${tab===0 ? 'bg-purple-600 text-white' : 'text-slate-500'}`}><Style fontSize="small"/></button>
                    <button onClick={() => setTab(1)} className={`p-2 rounded-lg transition-all ${tab===1 ? 'bg-purple-600 text-white' : 'text-slate-500'}`}><Person2TwoTone fontSize="small"/></button> {/* Ícone Histórico */}
                    <button onClick={() => setTab(2)} className={`p-2 rounded-lg transition-all ${tab===2 ? 'bg-purple-600 text-white' : 'text-slate-500'}`}><Mail fontSize="small"/></button>
                </div>
            </header>

            {/* Renderização Condicional */}
            {tab === 0 && (
                <>
                    <DatingFilters filters={filters} setFilters={setFilters} />
                    {/* Precisamos passar os filtros pro SwipeDeck */}
                    <SwipeDeck filters={filters} />
                </>
            )}
            
            {tab === 1 && <SentLikes />}
            
            {tab === 2 && <Mailbox />}
        </div>
    );
}