interface Props {
    current: string;
    onSelect: (cat: string) => void;
}

const CATEGORIES = ['TODOS', 'CERVEJA', 'DESTILADO', 'MERCH', 'INGRESSO'];

export function CategoryFilters({ current, onSelect }: Props) {
    return (
        <div className="px-4 mb-6 overflow-x-auto pb-2 flex gap-2 no-scrollbar">
            {CATEGORIES.map(cat => (
                <button 
                    key={cat}
                    onClick={() => onSelect(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-all ${
                        current === cat 
                        ? 'bg-white text-slate-950 scale-105 shadow-lg' 
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}