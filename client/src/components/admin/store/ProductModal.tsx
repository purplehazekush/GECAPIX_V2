import { X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

export function ProductModal({ isOpen, onClose, onSubmit }: Props) {
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData);
        onSubmit(data);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <X size={20} />
                </button>
                
                <h2 className="text-xl font-black text-white italic uppercase mb-1">Novo Produto</h2>
                <p className="text-[10px] text-slate-400 mb-6">Preencha os dados para cadastrar no estoque.</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nome</label>
                        <input name="nome" required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Preço</label>
                            <input name="preco" type="number" step="0.01" required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Categoria</label>
                            <select name="categoria" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none">
                                <option value="CERVEJA">Cerveja</option>
                                <option value="DESTILADO">Destilado</option>
                                <option value="MERCH">Merch</option>
                                <option value="INGRESSO">Ingresso</option>
                                <option value="OUTROS">Outros</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Imagem URL</label>
                        <input name="imagem_url" type="url" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-cyan-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">XP</label>
                            <input name="cashback_xp" type="number" defaultValue="0" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Estoque</label>
                            <input name="estoque" type="number" defaultValue="100" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Badge</label>
                            <input name="badge" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white outline-none" />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-xl font-bold uppercase shadow-lg shadow-cyan-900/40 transition-all mt-4">
                        Salvar Produto
                    </button>
                </form>
            </div>
        </div>
    );
}