import { useEffect, useState, useRef } from 'react';
import { Timer, AlertCircle } from 'lucide-react';

interface Props {
    serverTime: number; // Tempo em segundos vindo do servidor
    isActive: boolean;  // O relógio está rodando?
    label?: string;     // "Você" ou "Rival"
    onExpire?: () => void; // Função para chamar quando bater 0
}

export function GameTimer({ serverTime, isActive, label, onExpire }: Props) {
    // Inicializa com o tempo do servidor
    const [time, setTime] = useState(Math.max(0, serverTime));
    const intervalRef = useRef<any>(null);

    // 1. Sincronia Absoluta: Sempre que o servidor manda um tempo novo (ex: após jogada), atualizamos.
    useEffect(() => {
        setTime(Math.max(0, serverTime));
    }, [serverTime]);

    // 2. Contagem Regressiva Local
    useEffect(() => {
        if (isActive && time > 0) {
            intervalRef.current = setInterval(() => {
                setTime((prev) => {
                    const novoTempo = prev - 1;
                    if (novoTempo <= 0) {
                        clearInterval(intervalRef.current);
                        // 🔥 AVISA O PAI QUE O TEMPO ACABOU
                        if (onExpire) onExpire(); 
                        return 0;
                    }
                    return novoTempo;
                });
            }, 1000);
        } else {
            clearInterval(intervalRef.current);
        }

        return () => clearInterval(intervalRef.current);
    }, [isActive, onExpire]); // Removemos 'time' das dependências para evitar loops, usamos o functional update do setState

    // Formatação
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Estilos Visuais
    const isCritical = time <= 30; // Menos de 30s
    const isZero = time === 0;

    return (
        <div className={`flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-105 opacity-100' : 'opacity-60 scale-95'}`}>
            <div className={`
                relative flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black text-2xl shadow-xl border-4
                ${isZero ? 'bg-red-950 border-red-600 text-red-500 animate-pulse' : 
                  isCritical ? 'bg-red-900/80 border-red-500 text-red-100 animate-pulse' : 
                  isActive ? 'bg-slate-800 border-emerald-400 text-white shadow-emerald-500/20' : 
                  'bg-slate-900 border-slate-700 text-slate-500'}
            `}>
                {isActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>}
                
                {isCritical ? <AlertCircle size={20} /> : <Timer size={20} />}
                <span>{timeString}</span>
            </div>
            
            {/* Barra de Progresso Visual */}
            <div className="w-full h-1 bg-slate-800 mt-2 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (time / 600) * 100)}%` }} // Assumindo 10min base, ajustável
                ></div>
            </div>

            {label && (
                <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${isActive ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {label}
                </span>
            )}
        </div>
    );
}