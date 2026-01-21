import { useEffect, useState } from 'react';
import type { Pix } from '../types';
import { Refresh, ShoppingBag, Add, Save, LocalAtm, Pix as PixIcon, CheckCircle, Person, Inventory2 } from '@mui/icons-material';
import { Chip, IconButton } from '@mui/material'; 
import { api } from "../lib/api";
import { useAuth } from '../context/AuthContext';
import NewSaleModal from '../components/NewSaleModal';

export default function Feed() {
  const [transacoes, setTransacoes] = useState<Pix[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pix');
      setTransacoes(res.data);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const fetchProdutos = async () => {
    try {
        const res = await api.get('/produtos');
        setProdutos(res.data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchFeed(); fetchProdutos(); }, []);

  return (
    <div className="max-w-2xl mx-auto pb-20 animate-fade-in relative">
      
      {/* --- BARRA DE AÇÃO FIXA (NO TOPO) --- */}
      <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-white/10 shadow-2xl">
        <div className="p-4 flex items-center justify-between gap-4">
            
            {/* Botão Principal de Venda (Grande e Verde) */}
            <button 
                onClick={() => setModalOpen(true)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
                <Add />
                <span>NOVA VENDA</span>
            </button>

            {/* Botão Refresh Discreto */}
            <IconButton onClick={fetchFeed} disabled={loading} sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Refresh className={loading ? "animate-spin" : ""} />
            </IconButton>
        </div>
      </div>

      {/* Stats Rápidos Abaixo da Barra */}
      <div className="px-4 py-3 flex justify-between items-center text-xs text-slate-400 border-b border-white/5 bg-slate-900/50">
          <span>📅 Hoje</span>
          <span>{transacoes.length} vendas registradas</span>
      </div>

      {/* Lista Timeline */}
      <div className="relative border-l-2 border-slate-800 ml-8 my-6 space-y-6 pr-4">
        {loading && transacoes.length === 0 ? (
           <div className="pl-6 text-slate-500 font-mono text-sm animate-pulse">Sincronizando caixa...</div>
        ) : transacoes.length === 0 ? (
           <div className="ml-[-17px] flex flex-col items-center py-10 opacity-40">
              <ShoppingBag sx={{ fontSize: 40, mb: 2, color: '#94a3b8' }} />
              <p className="text-slate-400 text-sm">Caixa aberto. Aguardando vendas.</p>
           </div>
        ) : (
          transacoes.map((pix, index) => (
            <TimelineItem key={pix._id} pix={pix} onUpdate={fetchFeed} index={index} />
          ))
        )}
      </div>

      <NewSaleModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchFeed} produtos={produtos} />
    </div>
  );
}

// --- ITEM DA TIMELINE RICO ---
function TimelineItem({ pix, onUpdate, index }: { pix: Pix, onUpdate: () => void, index: number }) {
  const { user } = useAuth();
  const [produto, setProduto] = useState("");
  const [qtdManual, setQtdManual] = useState(1); // Caso queira editar qtd no futuro
  const [loadingSave, setLoadingSave] = useState(false);
  
  const isVendido = !!pix.item_vendido;
  const isDinheiro = pix.tipo === 'DINHEIRO';
  
  // Cores Temáticas
  const color = isDinheiro ? 'emerald' : 'cyan'; // Usado para classes dinâmicas
  const txtColor = isDinheiro ? 'text-emerald-400' : 'text-cyan-400';
  const bgColor = isDinheiro ? 'bg-emerald-500' : 'bg-cyan-500';

  const salvar = async () => {
    if (!produto) return;
    setLoadingSave(true);
    try {
        await api.put(`/pix/${pix._id}`, { item: produto, quantidade: 1, editor_email: user?.email });
        onUpdate();
    } catch (e) { alert("Erro ao salvar"); } 
    finally { setLoadingSave(false); }
  };

  const formatVendedor = (nome: string) => nome ? nome.split(' ')[0] : 'Sistema';

  return (
    <div className="relative pl-6 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
        
        {/* Bolinha da Timeline (Ícone dentro) */}
        <div className={`
            absolute -left-[19px] top-0 w-10 h-10 rounded-full border-4 border-slate-900 
            ${bgColor} text-slate-900 flex items-center justify-center shadow-lg z-10
        `}>
            {isDinheiro ? <LocalAtm sx={{ fontSize: 20 }} /> : <PixIcon sx={{ fontSize: 20 }} />}
        </div>

        {/* Card Principal */}
        <div className={`
            group relative p-4 rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm
            hover:border-${color}-500/30 transition-all duration-300
        `}>
            {/* Cabeçalho: Hora e Valor */}
            <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-2">
                <div className="flex flex-col">
                    <span className="text-white font-bold text-sm">{pix.remetente_extraido}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                         {new Date(pix.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className={`font-mono font-bold text-lg ${txtColor}`}>
                    R$ {pix.valor_extraido}
                </div>
            </div>

            {/* Corpo: Detalhes da Venda */}
            <div className="flex flex-col gap-2">
                {isVendido ? (
                    // MODO VENDIDO (Visual Rico)
                    <div className="flex justify-between items-center">
                        
                        {/* 1. Produto e Quantidade */}
                        <div className="flex items-center gap-2">
                            <div className={`
                                flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold
                                ${isDinheiro ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'}
                            `}>
                                <Inventory2 sx={{ fontSize: 14 }} />
                                <span>{pix.quantidade || 1}x</span>
                            </div>
                            <span className="text-white font-medium text-sm">{pix.item_vendido?.toUpperCase()}</span>
                        </div>

                        {/* 2. Vendedor */}
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-900/50 px-2 py-1 rounded-full border border-white/5">
                            <Person sx={{ fontSize: 12 }} />
                            <span>{formatVendedor(pix.vendedor_nome || pix.vendedor_email || "")}</span>
                        </div>

                    </div>
                ) : (
                    // MODO IDENTIFICAÇÃO (Select Limpo)
                    <div className="flex gap-2 w-full">
                        <select 
                            value={produto}
                            onChange={(e) => setProduto(e.target.value)}
                            className="flex-1 bg-slate-900/80 border border-slate-600 rounded-lg text-xs text-white px-3 py-2 outline-none focus:border-cyan-500"
                        >
                            <option value="" disabled>O que foi vendido?</option>
                            <option value="Cerveja">Cerveja</option>
                            <option value="Água">Água</option>
                            <option value="Refrigerante">Refri</option>
                            <option value="Combo">Combo</option>
                        </select>
                        <button 
                            onClick={salvar}
                            disabled={!produto || loadingSave}
                            className="bg-cyan-600 text-white px-3 rounded-lg hover:bg-cyan-500 transition-colors disabled:opacity-50"
                        >
                            {loadingSave ? '...' : <Save fontSize="small" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}