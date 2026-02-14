import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface Props {
    serverTime: number; // Tempo recebido do socket
    isActive: boolean;  // Se é a vez desse relógio rodar
    label?: string;     // "Você" ou Nome do Oponente
}

export function GameTimer({ serverTime, isActive, label }: Props) {
    const [time, setTime] = useState(serverTime);

    // 1. Sincroniza com o servidor sempre que chega update
    useEffect(() => {
        setTime(serverTime);
    }, [serverTime]);

    // 2. Decrementa localmente para feedback visual suave
    useEffect(() => {
        let interval: any;
        
        if (isActive && time > 0) {
            interval = setInterval(() => {
                setTime((prev) => Math.max(0, prev - 1));
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isActive, time]); // Dependências corrigidas

    // Formatação MM:SS
    const formatTime = (s: number) => {
        const minutes = Math.floor(s / 60);
        const seconds = Math.floor(s % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Estilos dinâmicos
    const isCritical = time < 30; // Menos de 30s
    const isZero = time === 0;

    return (
        <div className={`flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-110' : 'opacity-80'}`}>
            <div className={`
                flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black text-xl shadow-lg border-2
                ${isZero ? 'bg-red-950 border-red-600 text-red-500' : 
                  isCritical ? 'bg-red-900/50 border-red-500 text-red-400 animate-pulse' : 
                  isActive ? 'bg-slate-800 border-cyan-400 text-white shadow-cyan-500/20' : 
                  'bg-slate-900 border-slate-800 text-slate-500'}
            `}>
                <Clock size={18} className={isActive ? 'animate-spin-slow' : ''} />
                <span>{formatTime(time)}</span>
            </div>
            {label && (
                <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${isActive ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {label}
                </span>
            )}
        </div>
    );
}