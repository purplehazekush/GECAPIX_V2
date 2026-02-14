import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

interface Props {
    initialTime: number; // Tempo em segundos recebido do servidor
    isActive: boolean;   // Se o relógio está rodando
}

export function GameTimer({ initialTime, isActive }: Props) {
    const [time, setTime] = useState(initialTime);

    useEffect(() => {
        setTime(initialTime); // Sincroniza sempre que o servidor manda update
    }, [initialTime]);

    useEffect(() => {
        let interval: any; // <--- Mudamos para 'any' ou 'number' para compatibilidade com browser
        
        if (isActive && time > 0) {
            interval = setInterval(() => {
                setTime(t => Math.max(0, t - 1));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, time]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border font-mono font-bold text-sm transition-colors ${
            isActive 
            ? 'bg-slate-800 border-emerald-500 text-white animate-pulse' 
            : 'bg-slate-900 border-slate-800 text-slate-500'
        }`}>
            <Timer size={14} className={isActive ? 'text-emerald-400' : 'text-slate-600'} />
            <span>{formatTime(time)}</span>
        </div>
    );
}