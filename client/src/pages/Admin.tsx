import { useEffect, useState } from 'react';
import { 
  Shield, 
  CheckCircle, 
  Cancel, 
  Person, 
  AddCircle, 
  Delete,
  // --- FALTAVA IMPORTAR ESSES ÍCONES: ---
  LockOpen, 
  Lock, 
  Public, 
  Security 
} from '@mui/icons-material';
import { api } from "../lib/api"; // <--- IMPORTANTE: ADICIONE ISSO


interface User {
  _id: string;
  nome: string;
  email: string;
  role: 'admin' | 'membro';
  status: 'ativo' | 'pendente';
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
  const [modoAberto, setModoAberto] = useState(false);

  // State para Novo Produto
  const [novoProd, setNovoProd] = useState({ nome: '', preco: '' });

  // --- CARREGAMENTO DE DADOS ---
  const fetchData = async () => {
    try {
      const [resUsers, resProds, resConfig] = await Promise.all([
        // USE api.get e limpe as URLs
        api.get('/admin/usuarios'),
        api.get('/produtos'),
        api.get('/config/modo-aberto')
      ]);
      setUsuarios(resUsers.data);
      setProdutos(resProds.data);
      setModoAberto(resConfig.data.aberto);
    } catch (error) {
      console.error("Erro dados", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- FALTAVA ESSA FUNÇÃO: ALTERNAR MODO ---
  const toggleModoAberto = async () => {
    const novoValor = !modoAberto;
    setModoAberto(novoValor); // Muda na tela na hora (otimista)
    try {
        await api.put(`/config/modo-aberto`, { valor: novoValor });
    } catch (error) {
        setModoAberto(!novoValor); // Desfaz se der erro
        alert("Erro ao mudar configuração");
    }
  };

  // --- AÇÕES DE USUÁRIOS ---
  const alterarStatus = async (email: string, novoStatus: 'ativo' | 'pendente') => {
    try {
      await api.put(`/admin/usuarios`, { email, novoStatus });
      fetchData(); 
    } catch (error) {
      alert("Erro ao alterar status");
    }
  };

  // --- AÇÕES DE PRODUTOS ---
  const criarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoProd.nome || !novoProd.preco) return;

    try {
      await api.post(`${API_URL}/produtos`, {
        nome: novoProd.nome,
        preco: parseFloat(novoProd.preco.replace(',', '.'))
      });
      setNovoProd({ nome: '', preco: '' });
      fetchData();
    } catch (error) {
      alert("Erro ao criar produto");
    }
  };

  return (
    <div className="pb-24 animate-fade-in space-y-8">
      
      {/* --- FALTAVA ESSE BLOCO INTEIRO: PAINEL DE CONTROLE GLOBAL --- */}
      <div className={`glass-panel p-6 rounded-xl border-l-4 transition-colors duration-500 ${modoAberto ? 'border-emerald-500 bg-emerald-900/10' : 'border-red-500 bg-red-900/10'}`}>
        <div className="flex justify-between items-center">
            <div>
                <h2 className={`text-xl font-bold flex items-center gap-2 ${modoAberto ? 'text-emerald-400' : 'text-red-400'}`}>
                    {modoAberto ? <Public /> : <Security />}
                    {modoAberto ? 'SISTEMA ABERTO (LIBERADO)' : 'SISTEMA SEGURO (RESTRITO)'}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                    {modoAberto 
                        ? 'Qualquer pessoa com conta Google pode acessar o Feed.' 
                        : 'Apenas membros aprovados manualmente podem acessar.'}
                </p>
            </div>
            
            <button
                onClick={toggleModoAberto}
                className={`px-6 py-3 rounded-lg font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
                    modoAberto 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30'
                }`}
            >
                {modoAberto ? <Lock /> : <LockOpen />}
                {modoAberto ? 'FECHAR SISTEMA' : 'LIBERAR GERAL'}
            </button>
        </div>
      </div>

      {/* --- SEÇÃO 1: GESTÃO DE MEMBROS --- */}
      <div className="glass-panel p-6 rounded-xl border border-yellow-500/20">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
            <Shield sx={{ color: '#eab308' }} />
            <h2 className="text-xl font-bold text-yellow-500">Gestão de Membros</h2>
        </div>

        <div className="space-y-3">
          {loading ? (
             <p className="text-center text-slate-500">Carregando...</p>
          ) : usuarios.map(u => (
            <div key={u._id} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-600">
                        <Person sx={{ color: '#94a3b8' }} />
                    </div>
                    <div>
                        <div className="font-bold text-white flex items-center gap-2">
                            {u.nome}
                            {u.role === 'admin' && (
                                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 rounded border border-purple-500/30">ADMIN</span>
                            )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                    </div>
                </div>

                {/* Botões de Ação */}
                {u.role !== 'admin' && (
                    u.status === 'ativo' ? (
                        <button 
                            onClick={() => alterarStatus(u.email, 'pendente')}
                            className="flex items-center gap-1 text-xs text-red-400 border border-red-500/30 px-3 py-1.5 rounded hover:bg-red-500/10 transition-colors"
                        >
                            <Cancel fontSize="small" /> BLOQUEAR
                        </button>
                    ) : (
                        <button 
                            onClick={() => alterarStatus(u.email, 'ativo')}
                            className="flex items-center gap-1 text-xs text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded hover:bg-emerald-500/10 transition-colors font-bold"
                        >
                            <CheckCircle fontSize="small" /> APROVAR
                        </button>
                    )
                )}
            </div>
          ))}
        </div>
      </div>

      {/* --- SEÇÃO 2: GESTÃO DE PRODUTOS --- */}
      <div className="glass-panel p-6 rounded-xl border border-cyan-500/20">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
            <AddCircle sx={{ color: '#22d3ee' }} />
            <h2 className="text-xl font-bold text-cyan-400">Produtos</h2>
        </div>

        <form onSubmit={criarProduto} className="flex gap-2 mb-6">
            <input 
                type="text" 
                placeholder="Nome (ex: Cerveja)" 
                value={novoProd.nome}
                onChange={e => setNovoProd({...novoProd, nome: e.target.value})}
                className="flex-[2] bg-slate-900/50 border border-slate-700 rounded-lg px-3 text-sm text-white focus:border-cyan-500 outline-none"
            />
            <input 
                type="text" 
                placeholder="Preço (10.50)" 
                value={novoProd.preco}
                onChange={e => setNovoProd({...novoProd, preco: e.target.value})}
                className="w-24 bg-slate-900/50 border border-slate-700 rounded-lg px-3 text-sm text-white focus:border-cyan-500 outline-none"
            />
            <button 
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-lg transition-colors"
            >
                <AddCircle />
            </button>
        </form>

        <div className="grid grid-cols-2 gap-2">
            {produtos.map(p => (
                <div key={p._id} className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-200">{p.nome}</span>
                    <span className="text-xs font-mono text-emerald-400">R$ {p.preco.toFixed(2)}</span>
                </div>
            ))}
        </div>
      </div>

    </div>
  );
}