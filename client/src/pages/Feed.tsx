import { useEffect, useState } from 'react';
import type { Pix } from '../types';
import { Refresh, ShoppingBag, Add, Save } from '@mui/icons-material'; // <--- Imports organizados e sem PixIcon
import { Fab, Tooltip } from '@mui/material'; 
import { api } from "../lib/api";
import { useAuth } from '../context/AuthContext';
import NewSaleModal from '../components/NewSaleModal';

export default function Feed() {
  const [transacoes, setTransacoes] = useState<Pix[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para o Modal de Venda Manual
  const [modalOpen, setModalOpen] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]); // <--- Tipagem segura

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

  const fetchProdutos = async () => {
    try {
        const res = await api.get('/produtos');
        setProdutos(res.data);
    } catch (error) { console.error("Erro produtos", error); }
  };

  useEffect(() => {
    fetchFeed();
    fetchProdutos(); 
  }, []);

  return (
    <div className="max-w-3xl mx-auto pb-24 animate-fade-in relative">
      
      {/* Cabeçalho */}
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

      {/* Lista */}
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

      {/* FAB - Botão Flutuante */}
      <div className="fixed bottom-24 right-6 md:right-12 z-50">
        <Tooltip title="Registrar Venda em Dinheiro" placement="left">
            <Fab 
                onClick={() => setModalOpen(true)}
                sx={{ 
                    bgcolor: '#22c55e', 
                    color: '#fff', 
                    '&:hover': { bgcolor: '#16a34a' } 
                }}
            >
                <Add />
            </Fab>
        </Tooltip>
      </div>

      <NewSaleModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={fetchFeed} 
        produtos={produtos}
      />
    </div>
  );
}

function CardItem({ pix, onUpdate }: { pix: Pix, onUpdate: () => void }) {
  const { user } = useAuth();
  const [produto, setProduto] = useState("");
  const [loadingSave, setLoadingSave] = useState(false);
  
  const isVendido = !!pix.item_vendido;
  const isDinheiro = pix.tipo === 'DINHEIRO';

  const formatVendedor = (email: string) => {
    if (!email) return 'Sistema';
    return email.split('@')[0].substring(0, 12);
  };

  const salvar = async () => {
    if (!produto) return;
    setLoadingSave(true);
    try {
        await api.put(`/pix/${pix._id}`, {
            item: produto,
            quantidade: 1,
            editor_email: user?.email 
        });
        onUpdate();
    } catch (e) {
        alert("Erro ao salvar");
    } finally {
        setLoadingSave(false);
    }
  };

  return (
    <div className={`
        relative flex items-center justify-between p-3 rounded-lg border-l-4 transition-all
        ${isDinheiro ? 'bg-emerald-900/10 border-emerald-500 hover:bg-emerald-900/20' : 'bg-white/5 border-cyan-500 hover:bg-white/10'}
        mb-2
    `}>
        
        {/* ESQUERDA */}
        <div className="flex items-center gap-3 overflow-hidden">
            <div className={`
                w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-md
                ${isDinheiro ? 'bg-emerald-600 text-white' : 'bg-cyan-600 text-white'}
            `}>
                {/* Aqui você usou CHAR e não ICONE, por isso removi o import lá em cima */}
                {isDinheiro ? '$' : pix.remetente_extraido.charAt(0).toUpperCase()}
            </div>

            <div className="flex flex-col min-w-0">
                <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white truncate max-w-[120px] md:max-w-[200px]">
                        {pix.remetente_extraido}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(pix.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <div className="text-xs text-slate-400 truncate">
                   {isVendido ? (
                       <span className="flex items-center gap-1">
                           <span className={isDinheiro ? "text-emerald-400" : "text-cyan-400"}>✔ Vendido por:</span>
                           {formatVendedor(pix.vendedor_email || pix.vendedor_nome || "")}
                       </span>
                   ) : (
                       <span className="text-yellow-500/80 animate-pulse">⚠ Aguardando identificação...</span>
                   )}
                </div>
            </div>
        </div>

        {/* DIREITA */}
        <div className="flex flex-col items-end gap-1">
            <div className={`font-mono font-bold text-lg ${isDinheiro ? 'text-emerald-400' : 'text-cyan-400'}`}>
                R$ {pix.valor_extraido}
            </div>

            {isVendido ? (
                <div className="text-sm font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {(pix.quantidade || 1) > 1 ? `${pix.quantidade}x ` : ''}
                    {pix.item_vendido?.toUpperCase()}
                </div>
            ) : (
                <div className="flex gap-1">
                    <select 
                        value={produto}
                        onChange={(e) => setProduto(e.target.value)}
                        className="w-32 bg-slate-900 border border-slate-700 rounded text-xs text-white px-2 py-1 focus:border-cyan-500 outline-none"
                    >
                        <option value="" disabled>Selecione...</option>
                        <option value="Cerveja">Cerveja</option>
                        <option value="Água">Água</option>
                        <option value="Refrigerante">Refri</option>
                        <option value="Dose">Dose</option>
                        <option value="Combo">Combo</option>
                    </select>
                    <button 
                        onClick={salvar}
                        disabled={loadingSave || !produto}
                        className="bg-cyan-600 text-white rounded px-2 hover:bg-cyan-500 disabled:opacity-50 flex items-center"
                    >
                        {loadingSave ? '...' : <Save sx={{ fontSize: 16 }} />}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}