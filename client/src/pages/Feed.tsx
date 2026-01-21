import { useEffect, useState } from 'react';
import type { Pix } from '../types';
import { Refresh, ShoppingBag, Add, Save, LocalAtm, Pix as PixIcon, CheckCircle } from '@mui/icons-material';
import { Fab, Tooltip, Chip } from '@mui/material'; 
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
    } catch (error) { console.error("Erro", error); } 
    finally { setLoading(false); }
  };

  const fetchProdutos = async () => {
    try {
        const res = await api.get('/produtos');
        setProdutos(res.data);
    } catch (error) { console.error("Erro produtos", error); }
  };

  useEffect(() => { fetchFeed(); fetchProdutos(); }, []);

  return (
    <div className="max-w-2xl mx-auto pb-32 animate-fade-in px-4">
      
      {/* Cabeçalho Compacto e Fixo */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-md py-4 border-b border-white/5 mb-6 flex justify-between items-center -mx-4 px-4">
        <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Fluxo de Caixa</h2>
            <p className="text-xs text-slate-400 font-mono">
                {transacoes.length} vendas hoje
            </p>
        </div>
        <button 
          onClick={fetchFeed}
          disabled={loading}
          className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-all border border-slate-700"
        >
          <Refresh className={loading ? "animate-spin" : ""} fontSize="small" />
        </button>
      </div>

      {/* Container da Timeline */}
      <div className="relative border-l-2 border-slate-800 ml-4 space-y-8">
        {loading && transacoes.length === 0 ? (
           <div className="pl-8 text-slate-500 font-mono text-sm animate-pulse">Sincronizando blockchain...</div>
        ) : transacoes.length === 0 ? (
           <div className="ml-[-17px] flex flex-col items-center py-10 opacity-40">
              <ShoppingBag sx={{ fontSize: 40, mb: 2, color: '#94a3b8' }} />
              <p className="text-slate-400 text-sm">Nenhuma movimentação.</p>
           </div>
        ) : (
          transacoes.map((pix, index) => (
            <TimelineItem key={pix._id} pix={pix} onUpdate={fetchFeed} index={index} />
          ))
        )}
      </div>

      {/* FAB - Botão Flutuante (Mantido igual) */}
      <div className="fixed bottom-6 right-6 z-50">
        <Tooltip title="Venda Dinheiro" placement="left">
            <Fab onClick={() => setModalOpen(true)} sx={{ bgcolor: '#10b981', color: '#fff', '&:hover': { bgcolor: '#059669' } }}>
                <Add />
            </Fab>
        </Tooltip>
      </div>

      <NewSaleModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchFeed} produtos={produtos} />
    </div>
  );
}

// --- NOVO COMPONENTE DE TIMELINE ---
function TimelineItem({ pix, onUpdate, index }: { pix: Pix, onUpdate: () => void, index: number }) {
  const { user } = useAuth();
  const [produto, setProduto] = useState("");
  const [loadingSave, setLoadingSave] = useState(false);
  
  const isVendido = !!pix.item_vendido;
  const isDinheiro = pix.tipo === 'DINHEIRO';
  
  // Cores Baseadas no Tipo
  const themeColor = isDinheiro ? 'text-emerald-400' : 'text-cyan-400';
  const themeBorder = isDinheiro ? 'border-emerald-500/30' : 'border-cyan-500/30';
  const themeBg = isDinheiro ? 'bg-emerald-500/10' : 'bg-cyan-500/10';

  const salvar = async () => {
    if (!produto) return;
    setLoadingSave(true);
    try {
        await api.put(`/pix/${pix._id}`, { item: produto, quantidade: 1, editor_email: user?.email });
        onUpdate();
    } catch (e) { alert("Erro ao salvar"); } 
    finally { setLoadingSave(false); }
  };

  return (
    <div className="relative pl-8 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
        
        {/* A "BOLINHA" DA TIMELINE (O Conector Visual) */}
        <div className={`
            absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 border-slate-900 
            ${isDinheiro ? 'bg-emerald-500' : 'bg-cyan-500'} 
            shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10
        `}></div>

        {/* O CARD (Agora mais limpo e profissional) */}
        <div className={`
            group relative p-4 rounded-xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm
            hover:bg-slate-800/80 transition-all duration-300 hover:border-slate-600
            ${!isVendido ? 'border-l-2 border-l-yellow-500/50' : ''}
        `}>
            
            {/* Cabeçalho do Item */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                    <span className="text-white font-bold text-sm tracking-wide">
                        {pix.remetente_extraido}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        {isDinheiro ? <LocalAtm sx={{fontSize: 10}} className="text-emerald-500"/> : <PixIcon sx={{fontSize: 10}} className="text-cyan-500"/>}
                        {new Date(pix.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {pix.vendedor_nome && ` • ${pix.vendedor_nome.split(' ')[0]}`}
                    </span>
                </div>
                
                <div className={`font-mono font-bold text-base ${themeColor}`}>
                    R$ {pix.valor_extraido}
                </div>
            </div>

            {/* Conteúdo / Ação */}
            <div className="mt-3">
                {isVendido ? (
                    <div className={`
                        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border
                        ${themeBg} ${themeColor} ${themeBorder}
                    `}>
                        <CheckCircle sx={{ fontSize: 14 }} />
                        <span className="uppercase tracking-wider">
                            {(pix.quantidade || 1) > 1 ? `${pix.quantidade}x ` : ''}
                            {pix.item_vendido}
                        </span>
                    </div>
                ) : (
                    // MODO EDIÇÃO (Discreto, mas funcional)
                    <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50 focus-within:border-cyan-500/50 transition-colors">
                        <select 
                            value={produto}
                            onChange={(e) => setProduto(e.target.value)}
                            className="bg-transparent text-xs text-white w-full outline-none px-2 py-1 placeholder-slate-500 appearance-none"
                        >
                            <option value="" disabled className="text-slate-500">Identificar venda...</option>
                            <option value="Cerveja" className="bg-slate-800">Cerveja</option>
                            <option value="Água" className="bg-slate-800">Água</option>
                            <option value="Refrigerante" className="bg-slate-800">Refrigerante</option>
                            <option value="Dose" className="bg-slate-800">Dose</option>
                            <option value="Combo" className="bg-slate-800">Combo</option>
                        </select>
                        <button 
                            onClick={salvar}
                            disabled={!produto || loadingSave}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white p-1 rounded-md transition-colors disabled:opacity-50"
                        >
                            {loadingSave ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save sx={{ fontSize: 16 }} />}
                        </button>
                    </div>
                )}
            </div>

            {/* Efeito Glow no Hover (Sutil) */}
            <div className={`
                absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                bg-gradient-to-r ${isDinheiro ? 'from-emerald-500/5' : 'from-cyan-500/5'} to-transparent
            `}/>
        </div>
    </div>
  );
}