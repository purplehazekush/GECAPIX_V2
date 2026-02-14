import { ToggleLeft, ToggleRight } from 'lucide-react'; // Simulação do toggle

interface Props {
    isOpen: boolean;
    onToggle: () => void;
}

export function AdminHeader({ isOpen, onToggle }: Props) {
    return (
        <header className="sticky top-0 z-50 px-4 py-3 flex justify-between items-center shadow-xl bg-slate-900/90 backdrop-blur-md border-b border-white/5">
            <div className="flex flex-col">
                <h1 className="text-xl font-black italic tracking-tighter text-white flex items-center gap-2">
                    GECA <span className="text-slate-500 text-xs not-italic font-mono bg-slate-950 px-1 rounded">ADMIN v2.1</span>
                </h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Operador: <span className="text-cyan-400">Você</span> • <span className="text-emerald-400">Online</span></p>
            </div>
            
            <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
                <span className="text-[9px] font-bold uppercase text-slate-400">{isOpen ? "Loja Aberta" : "Loja Fechada"}</span>
                {isOpen ? (
                    <ToggleRight className="text-emerald-500 w-8 h-8" />
                ) : (
                    <ToggleLeft className="text-slate-600 w-8 h-8" />
                )}
            </div>
        </header>
    );
}