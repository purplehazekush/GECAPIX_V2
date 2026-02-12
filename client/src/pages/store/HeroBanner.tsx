export function HeroBanner() {
    return (
        <div className="p-4">
            <div className="relative w-full h-40 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 group">
                <img 
                    src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop" 
                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
                    alt="Banner"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-pink-900/90 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 max-w-[70%]">
                    <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase mb-1 inline-block">Destaque</span>
                    <h2 className="text-2xl font-black italic leading-none uppercase text-white drop-shadow-lg">
                        Calourada 2026
                    </h2>
                    <p className="text-xs text-pink-200 mt-1 font-medium">Ingressos Lote 1 liberados!</p>
                </div>
            </div>
        </div>
    );
}