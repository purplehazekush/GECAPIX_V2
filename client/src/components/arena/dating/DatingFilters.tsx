// client/src/components/arena/dating/DatingFilters.tsx
import { FilterList, Close } from '@mui/icons-material';
import { useState } from 'react';

// Mesmas opções do ProfileBuilder, mas com 'TODOS' no início
const FILTER_OPTIONS = {
    altura: ['TODOS', '📏 Alto(a)', '📐 Médio(a)', '🤏 Baixo(a)'],
    biotipo: ['TODOS', '🏋️ Fitness', '🧸 Fofinho(a)', '🏃 Magro(a)', '💪 Atlético', '⚡ Normal'],
    bebe: ['TODOS', '🍻 Socialmente', '🥃 Gosto muito', '❌ Não bebo'],
    fuma: ['TODOS', '🚬 Sim', '🌬️ Vape', '❌ Não'],
    festa: ['TODOS', '🎉 Baladeiro(a)', '🏠 Caseiro(a)', '⚖️ Equilibrado']
};

interface DatingFiltersProps {
    filters: any;
    setFilters: (f: any) => void;
}

export const DatingFilters = ({ filters, setFilters }: DatingFiltersProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const activeCount = Object.values(filters).filter(v => v !== 'TODOS').length;

    return (
        <div className="mb-4 relative z-30">
            {/* Botão Gatilho */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isOpen ? 'bg-slate-800 border-purple-500' : 'bg-slate-900 border-slate-800'
                }`}
            >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <FilterList fontSize="small" className="text-purple-400"/>
                    Filtros de Busca
                </div>
                {activeCount > 0 && (
                    <span className="bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        {activeCount} ATIVOS
                    </span>
                )}
            </button>

            {/* Painel Expansível */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl animate-slide-down">
                    <div className="space-y-3">
                        {Object.entries(FILTER_OPTIONS).map(([key, options]) => (
                            <div key={key}>
                                <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 block">{key}</label>
                                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                    {options.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setFilters({ ...filters, [key]: opt })}
                                            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                                filters[key] === opt
                                                    ? 'bg-purple-600 border-purple-500 text-white'
                                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2"
                    >
                        <Close fontSize="small"/> FECHAR E BUSCAR
                    </button>
                </div>
            )}
        </div>
    );
};