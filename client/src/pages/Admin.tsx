import { useEffect, useState } from 'react';
import { 
    Shield, CheckCircle, Cancel, Person, AddCircle, 
    Security, AdminPanelSettings, Search, Delete
} from '@mui/icons-material'; 
import { api } from "../lib/api";
import toast from 'react-hot-toast';

interface User {
    _id: string;
    nome: string;
    email: string;
    role: 'admin' | 'gm2' | 'gm' | 'gestao' | 'membro';
    status: 'ativo' | 'pendente' | 'banido';
}

interface Produto {
    _id: string;
    nome: string;
    preco: number;
}

export default function Admin() {
    const [usuarios, setUsuarios] = useState<User[]>([]);
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('');
    
    // Novo Produto
    const [novoProd, setNovoProd] = useState({ nome: '', preco: '' });

    const fetchData = async () => {
        try {
            const [resUsers, resProds] = await Promise.all([
                api.get('/admin/usuarios'),
                api.get('/produtos')
            ]);
            setUsuarios(resUsers.data);
            setProdutos(resProds.data);
        } catch (error) { 
            toast.error("Erro ao carregar dados administrativos");
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchData(); }, []);

    // --- AÇÕES DE USUÁRIO ---
    const alterarStatus = async (email: string, novoStatus: string) => {
        try {
            await api.put(`/admin/usuarios`, { email, novoStatus });
            toast.success(`Status alterado para ${novoStatus.toUpperCase()}`);
            fetchData(); 
        } catch (error) { toast.error("Erro ao alterar status"); }
    };

    const promoverUsuario = async (email: string, novoRole: string) => {
        if (!confirm(`Confirmar promoção de ${email} para ${novoRole.toUpperCase()}?`)) return;
        try {
            await api.put(`/admin/usuarios`, { email, novoRole });
            toast.success("Cargo atualizado!");
            fetchData();
        } catch (error) { toast.error("Erro na promoção"); }
    };

    // --- AÇÕES DE PRODUTO ---
    const criarProduto = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!novoProd.nome || !novoProd.preco) return;
        try {
            await api.post(`/produtos`, {
                nome: novoProd.nome,
                preco: parseFloat(novoProd.preco.replace(',', '.'))
            });
            toast.success("Produto criado!");
            setNovoProd({ nome: '', preco: '' });
            fetchData();
        } catch (error) { toast.error("Erro ao criar produto"); }
    };

    const deletarProduto = async () => {
        if (!confirm("Deletar este produto?")) return;
        // Se ainda não tiver rota de delete no backend, precisaremos criar.
        // Por enquanto, vou deixar comentado ou assumir que existe.
        // await api.delete(`/produtos/${id}`);
        toast("Função de deletar em breve", { icon: '🚧' });
    };

    // Filtro de Busca
    const usuariosFiltrados = usuarios.filter(u => 
        u.nome.toLowerCase().includes(filtro.toLowerCase()) || 
        u.email.toLowerCase().includes(filtro.toLowerCase())
    );

    return (
        <div className="pb-24 animate-fade-in space-y-8 max-w-5xl mx-auto px-4 pt-6">
            
            {/* CABEÇALHO */}
            <div className="flex items-center gap-3">
                <div className="bg-purple-500/20 p-3 rounded-2xl text-purple-400">
                    <Security fontSize="large" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white uppercase italic">Painel de Gestão</h1>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                        Administração Geral do GECA
                    </p>
                </div>
            </div>

            {/* GESTÃO DE MEMBROS */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Shield className="text-yellow-500" />
                        <h2 className="text-xl font-bold text-white">Membros</h2>
                    </div>
                    
                    {/* Barra de Busca */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fontSize="small"/>
                        <input 
                            type="text" 
                            placeholder="Buscar nome ou email..." 
                            value={filtro}
                            onChange={e => setFiltro(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-purple-500 outline-none"
                        />
                    </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto p-2 space-y-2">
                    {loading ? <p className="text-center py-10 text-slate-500">Carregando...</p> : usuariosFiltrados.map(u => (
                        <div key={u._id} className="flex flex-col md:flex-row justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors gap-4">
                            
                            {/* Info */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${u.role === 'admin' ? 'bg-purple-900/50 border-purple-500' : 'bg-slate-800 border-slate-700'}`}>
                                    {u.role === 'admin' ? <AdminPanelSettings className="text-purple-400"/> : <Person className="text-slate-500" />}
                                </div>
                                <div>
                                    <div className="font-bold text-white flex items-center gap-2">
                                        {u.nome}
                                        <span className={`text-[9px] px-1.5 rounded border uppercase font-bold ${
                                            u.status === 'ativo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                            u.status === 'banido' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                        }`}>
                                            {u.status}
                                        </span>
                                        {u.role !== 'membro' && (
                                            <span className="text-[9px] bg-purple-500/10 text-purple-300 px-1.5 rounded border border-purple-500/20 uppercase">
                                                {u.role}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                                </div>
                            </div>

                            {/* Ações */}
                            <div className="flex gap-2">
                                {u.role !== 'admin' && (
                                    <>
                                        {/* Banir/Desbanir */}
                                        {u.status === 'banido' ? (
                                            <button onClick={() => alterarStatus(u.email, 'ativo')} className="p-2 text-emerald-400 bg-emerald-500/10 rounded hover:bg-emerald-500/20 transition-colors" title="Desbanir">
                                                <CheckCircle fontSize="small" />
                                            </button>
                                        ) : (
                                            <button onClick={() => alterarStatus(u.email, 'banido')} className="p-2 text-red-400 bg-red-500/10 rounded hover:bg-red-500/20 transition-colors" title="Banir">
                                                <Cancel fontSize="small" />
                                            </button>
                                        )}

                                        {/* Promover GM */}
                                        <button 
                                            onClick={() => promoverUsuario(u.email, u.role === 'gm' ? 'membro' : 'gm')} 
                                            className={`px-3 py-1 rounded text-xs font-bold uppercase transition-colors ${u.role === 'gm' ? 'bg-slate-700 text-white' : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'}`}
                                        >
                                            {u.role === 'gm' ? 'Rebaixar' : 'Promover GM'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* GESTÃO DE PRODUTOS (Para o PDV) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                    <AddCircle className="text-cyan-400" />
                    <h2 className="text-xl font-bold text-white">Catálogo de Produtos</h2>
                </div>

                <form onSubmit={criarProduto} className="flex gap-2 mb-6">
                    <input 
                        type="text" placeholder="Nome (ex: Cerveja)" value={novoProd.nome}
                        onChange={e => setNovoProd({...novoProd, nome: e.target.value})}
                        className="flex-[2] bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none"
                    />
                    <input 
                        type="text" placeholder="Preço" value={novoProd.preco}
                        onChange={e => setNovoProd({...novoProd, preco: e.target.value})}
                        className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none"
                    />
                    <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 rounded-xl transition-colors font-bold text-sm shadow-lg shadow-cyan-900/20">
                        CRIAR
                    </button>
                </form>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {produtos.map(p => (
                        <div key={p._id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center group hover:border-cyan-500/30 transition-colors">
                            <div>
                                <p className="text-sm font-bold text-slate-200">{p.nome}</p>
                                <p className="text-xs font-mono text-emerald-400 font-bold">R$ {p.preco.toFixed(2)}</p>
                            </div>
                            <button onClick={() => deletarProduto()} className="text-slate-600 hover:text-red-400 transition-colors">
                                <Delete fontSize="small"/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}