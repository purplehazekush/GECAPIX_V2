// client/src/components/arena/Chat/SolutionParts/SolutionHeader.tsx
import { Bolt, School, Assignment, ZoomIn } from '@mui/icons-material';

interface Props {
    topico: string;
    dificuldade: string;
    activeTab: string;
    onTabChange: (tab: 'rapida' | 'passos' | 'completa') => void;
    onExpandImage: () => void;
    hasImage: boolean;
}

export const SolutionHeader = ({ topico, dificuldade, activeTab, onTabChange, onExpandImage, hasImage }: Props) => {
    
    const getDiffColor = (d: string) => {
        const lower = d.toLowerCase();
        if (lower.includes('easy') || lower.includes('fácil')) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
        if (lower.includes('hard') || lower.includes('difícil')) return 'text-red-400 border-red-500/30 bg-red-500/10';
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    };

    return (
        <div className="bg-slate-900 border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl">
            {/* Imagem (Se houver) */}
            {hasImage && (
                <div onClick={onExpandImage} className="w-full h-24 bg-black/50 relative group cursor-pointer border-b border-purple-500/20 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <span className="text-white text-xs font-bold flex items-center gap-1"><ZoomIn fontSize="small"/> Ver Original</span>
                    </div>
                    {/* A imagem real é renderizada pelo pai via CSS background ou img tag se preferir, 
                        mas aqui vamos assumir que o pai cuida ou passamos a URL */}
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/50 text-[9px] text-white">Imagem Enviada</div>
                </div>
            )}

            {/* Info Rápida */}
            <div className="flex justify-between items-center p-3 border-b border-slate-800 bg-slate-950">
                <span className="text-[10px] font-black uppercase text-purple-400">Oráculo Gemini</span>
                <div className="flex gap-2">
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 uppercase">{topico}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${getDiffColor(dificuldade)}`}>{dificuldade}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950">
                <TabBtn active={activeTab === 'rapida'} onClick={() => onTabChange('rapida')} icon={<Bolt sx={{fontSize:16}}/>} label="Resumo" color="text-yellow-400" />
                <TabBtn active={activeTab === 'passos'} onClick={() => onTabChange('passos')} icon={<Assignment sx={{fontSize:16}}/>} label="Passos" color="text-cyan-400" />
                <TabBtn active={activeTab === 'completa'} onClick={() => onTabChange('completa')} icon={<School sx={{fontSize:16}}/>} label="Aula" color="text-purple-400" />
            </div>
        </div>
    );
};

const TabBtn = ({ active, onClick, icon, label, color }: any) => (
    <button onClick={onClick} className={`py-3 flex flex-col items-center justify-center gap-1 transition-all relative ${active ? 'bg-slate-900' : 'bg-slate-950 hover:bg-slate-900/50'}`}>
        <div className={`${active ? color : 'text-slate-600'} transition-colors`}>{icon}</div>
        <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'text-white' : 'text-slate-600'}`}>{label}</span>
        {active && <div className={`absolute bottom-0 w-full h-0.5 ${color.replace('text-', 'bg-')} shadow-[0_-2px_6px_currentColor]`}></div>}
    </button>
);