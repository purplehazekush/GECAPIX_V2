import { useEffect, useState } from 'react';
import type { Pix } from '../types';
import { Refresh, Save, CheckCircle, ShoppingBag } from '@mui/icons-material';
import { api } from "../lib/api"

export default function Feed() {
  const [transacoes, setTransacoes] = useState<Pix[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      // USE api.get E TIRE O ${API_URL}
      const res = await api.get('/pix');
      setTransacoes(res.data);
    } catch (error) {
      console.error("Erro", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  return (
    <div className="max-w-3xl mx-auto pb-24 animate-fade-in">
      
      {/* Botões de Ação (Estilo Original) */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={fetchFeed}
          disabled={loading}
          className="flex-1 py-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          <Refresh className={loading ? "animate-spin" : ""} />
          FEED AO VIVO
        </button>
      </div>

      {/* Lista de Cards */}
      <div className="space-y-4">
        {loading && transacoes.length === 0 ? (
           <div className="text-center py-10 text-slate-500 font-mono animate-pulse">Carregando transações...</div>
        ) : transacoes.length === 0 ? (
           <div className="glass-panel p-10 rounded-2xl text-center flex flex-col items-center opacity-50">
              <ShoppingBag sx={{ fontSize: 40, mb: 2 }} />
              <p>Sem vendas hoje.</p>
           </div>
        ) : (
          transacoes.map((pix) => (
            <CardItem key={pix._id} pix={pix} onUpdate={fetchFeed} />
          ))
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTE DO CARD (Isolado para organizar) ---
function CardItem({ pix, onUpdate }: { pix: Pix, onUpdate: () => void }) {
  const [produto, setProduto] = useState("");
  const [loadingSave, setLoadingSave] = useState(false);
  
  // Lógica para determinar se já foi vendido
  const isVendido = !!pix.item_vendido;

  const salvar = async () => {
    if (!produto) return;
    setLoadingSave(true);
    try {
        // Envia para o backend (ajuste a rota conforme seu server)
        await api.put(`/pix/${pix._id}`, {
            item: produto,
            quantidade: 1, // Pode implementar o select de qtd depois
            editor_email: "react@app.com" // Pegaremos do AuthContext depois
        });
        onUpdate(); // Atualiza a lista
    } catch (e) {
        alert("Erro ao salvar");
    } finally {
        setLoadingSave(false);
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 hover:border-cyan-500/30 transition-colors duration-300 relative group">
        
        {/* Cabeçalho do Card */}
        <div className="flex justify-between items-start mb-4 mt-2">
            <div className="flex gap-3">
                {/* Avatar com Gradiente */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg font-bold text-white text-lg">
                    {pix.remetente_extraido.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div className="text-white font-bold leading-tight text-lg">
                        {pix.remetente_extraido}
                    </div>
                    <div className="text-slate-400 text-xs mt-1 font-mono">
                        {new Date(pix.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-emerald-400 font-mono font-bold text-xl">
                    R$ {pix.valor_extraido}
                </div>
            </div>
        </div>

        {/* Área de Ação (Venda ou Select) */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
            {isVendido ? (
                // MODO VISUALIZAÇÃO
                <div className="flex flex-col gap-1 text-sm bg-cyan-900/10 px-3 py-2 rounded-lg border border-cyan-500/20">
                    <div className="flex items-center gap-2 text-cyan-300">
                        <CheckCircle sx={{ fontSize: 16 }} className="text-emerald-400" />
                        <span className="font-bold text-base">
                            {pix.quantidade && pix.quantidade > 1 ? `${pix.quantidade}x ` : ''}
                            {pix.item_vendido?.toUpperCase()}
                        </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono text-right mt-1 border-t border-cyan-500/10 pt-1">
                        Vendido por: <span className="text-cyan-200">{pix.vendedor_email?.split('@')[0] || 'Sistema'}</span>
                    </div>
                </div>
            ) : (
                // MODO EDIÇÃO
                <div className="flex gap-2">
                    <select 
                        value={produto}
                        onChange={(e) => setProduto(e.target.value)}
                        className="flex-[2] bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none appearance-none"
                    >
                        <option value="" disabled>Selecione o Item...</option>
                        <option value="Cerveja">Cerveja</option>
                        <option value="Água">Água</option>
                        <option value="Ingresso">Ingresso</option>
                        <option value="Combo">Combo</option>
                    </select>
                    
                    <button 
                        onClick={salvar}
                        disabled={loadingSave || !produto}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white p-2 rounded-lg transition-colors w-12 flex items-center justify-center"
                    >
                        {loadingSave ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save fontSize="small" />}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}