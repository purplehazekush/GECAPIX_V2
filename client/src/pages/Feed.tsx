import { useEffect, useState } from 'react';
import type { Pix } from '../types';
import { Refresh, ShoppingBag, Add, AttachMoney, Pix as PixIcon } from '@mui/icons-material';
import { Fab, Tooltip } from '@mui/material'; // Botão Flutuante do Material UI
import { api } from "../lib/api";
import NewSaleModal from '../components/NewSaleModal'; // <--- Importando seu componente novo

export default function Feed() {
  const [transacoes, setTransacoes] = useState<Pix[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para o Modal de Venda Manual
  const [modalOpen, setModalOpen] = useState(false);
  const [produtos, setProdutos] = useState([]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pix');
      setTransacoes(res.data);
    } catch (error) {
      console.error("Erro", error);
    } finally {
      setLoading(false);
    }
  };

  // Carrega produtos para o Select do Modal
  const fetchProdutos = async () => {
    try {
        const res = await api.get('/produtos');
        setProdutos(res.data);
    } catch (error) { console.error("Erro produtos", error); }
  };

  useEffect(() => {
    fetchFeed();
    fetchProdutos(); // Já carrega os produtos ao abrir a tela
  }, []);

  return (
    <div className="max-w-3xl mx-auto pb-24 animate-fade-in relative">
      
      {/* Cabeçalho com Botão de Refresh */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold neon-text">FEED AO VIVO</h2>
        <button 
          onClick={fetchFeed}
          disabled={loading}
          className="p-2 rounded-full hover:bg-white/10 text-cyan-400 transition-all"
          title="Atualizar Feed"
        >
          <Refresh className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Lista de Cards */}
      <div className="space-y-4">
        {loading && transacoes.length === 0 ? (
           <div className="text-center py-10 text-slate-500 font-mono animate-pulse">Carregando transações...</div>
        ) : transacoes.length === 0 ? (
           <div className="glass-panel p-10 rounded-2xl text-center flex flex-col items-center opacity-50">
              <ShoppingBag sx={{ fontSize: 40, mb: 2 }} />
              <p>Caixa fechado. Nenhuma venda hoje.</p>
           </div>
        ) : (
          transacoes.map((pix) => (
            <CardItem key={pix._id} pix={pix} onUpdate={fetchFeed} />
          ))
        )}
      </div>

      {/* --- BOTÃO FLUTUANTE (FAB) PARA VENDA MANUAL --- */}
      <div className="fixed bottom-24 right-6 md:right-12 z-50">
        <Tooltip title="Registrar Venda em Dinheiro" placement="left">
            <Fab 
                onClick={() => setModalOpen(true)}
                sx={{ 
                    bgcolor: '#22c55e', // Verde para dinheiro
                    color: '#fff', 
                    '&:hover': { bgcolor: '#16a34a' } 
                }}
            >
                <Add />
            </Fab>
        </Tooltip>
      </div>

      {/* --- COMPONENTE MODAL (Modularizado) --- */}
      <NewSaleModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={fetchFeed} // Recarrega o feed após vender
        produtos={produtos}
      />
    </div>
  );
}

// --- SUB-COMPONENTE CARD (Atualizado com visual Dinheiro vs Pix) ---
import { Save, CheckCircle } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext'; // Importando Auth

function CardItem({ pix, onUpdate }: { pix: Pix, onUpdate: () => void }) {
  const { user } = useAuth(); // Pegando usuário real para o log
  const [produto, setProduto] = useState("");
  const [loadingSave, setLoadingSave] = useState(false);
  
  const isVendido = !!pix.item_vendido;
  const isDinheiro = pix.tipo === 'DINHEIRO'; // Verifica se é dinheiro

  const salvar = async () => {
    if (!produto) return;
    setLoadingSave(true);
    try {
        await api.put(`/pix/${pix._id}`, {
            item: produto,
            quantidade: 1,
            editor_email: user?.email || "anonimo" // Usa o email real agora
        });
        onUpdate();
    } catch (e) {
        alert("Erro ao salvar");
    } finally {
        setLoadingSave(false);
    }
  };

  return (
    <div className={`glass-panel rounded-xl p-5 border-l-4 ${isDinheiro ? 'border-l-emerald-500' : 'border-l-cyan-500'} hover:bg-white/5 transition-all relative`}>
        
        {/* Cabeçalho do Card */}
        <div className="flex justify-between items-start mb-4 mt-2">
            <div className="flex gap-3">
                {/* Ícone Dinâmico: $ para Dinheiro, P para Pix */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg font-bold text-white text-lg ${
                    isDinheiro ? 'bg-emerald-600' : 'bg-gradient-to-tr from-cyan-500 to-blue-600'
                }`}>
                    {isDinheiro ? <AttachMoney /> : <PixIcon />}
                </div>
                
                <div>
                    <div className="text-white font-bold leading-tight text-lg">
                        {pix.remetente_extraido}
                    </div>
                    <div className="text-slate-400 text-xs mt-1 font-mono flex items-center gap-2">
                        <span>{new Date(pix.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {/* Se foi dinheiro, mostra quem lançou */}
                        {isDinheiro && pix.vendedor_nome && (
                            <span className="bg-emerald-500/20 text-emerald-300 px-1.5 rounded text-[10px] border border-emerald-500/30">
                                Por: {pix.vendedor_nome.split(' ')[0]}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="text-right">
                <div className={`font-mono font-bold text-xl ${isDinheiro ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    R$ {pix.valor_extraido}
                </div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    {pix.tipo || 'PIX'}
                </div>
            </div>
        </div>

        {/* Área de Ação */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
            {isVendido ? (
                <div className={`flex flex-col gap-1 text-sm px-3 py-2 rounded-lg border ${
                    isDinheiro ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-cyan-900/10 border-cyan-500/20'
                }`}>
                    <div className={`flex items-center gap-2 ${isDinheiro ? 'text-emerald-300' : 'text-cyan-300'}`}>
                        <CheckCircle sx={{ fontSize: 16 }} />
                        <span className="font-bold text-base">
                            {pix.quantidade && pix.quantidade > 1 ? `${pix.quantidade}x ` : ''}
                            {pix.item_vendido?.toUpperCase()}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2">
                    <select 
                        value={produto}
                        onChange={(e) => setProduto(e.target.value)}
                        className="flex-[2] bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none appearance-none"
                    >
                        <option value="" disabled>Identificar Pagamento...</option>
                        <option value="Cerveja">Cerveja</option>
                        <option value="Água">Água</option>
                        <option value="Refrigerante">Refrigerante</option>
                        <option value="Combo">Combo</option>
                    </select>
                    
                    <button 
                        onClick={salvar}
                        disabled={loadingSave || !produto}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white p-2 rounded-lg w-12 flex items-center justify-center"
                    >
                        {loadingSave ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save fontSize="small" />}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}