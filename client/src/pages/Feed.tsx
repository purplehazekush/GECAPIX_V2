import { useEffect, useState } from 'react';
import type { Pix } from '../types';
// Importando TUDO que vamos usar para garantir zero erros de "unused"
import { 
    Refresh, ShoppingBag, Add, Save, LocalAtm, Pix as PixIcon, 
    Person, Inventory2, FilterList, Remove, Edit, Search, 
    ArrowDownward, Close, MonetizationOn 
} from '@mui/icons-material';
import { 
    Tooltip, IconButton, CircularProgress, TextField, 
    InputAdornment, Fade, Chip, Badge 
} from '@mui/material'; 
import { api } from "../lib/api";
import { useAuth } from '../context/AuthContext';
import NewSaleModal from '../components/NewSaleModal';

export default function Feed() {
  // Estados de Dados
  const [transacoes, setTransacoes] = useState<Pix[]>([]);
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  
  // Estados de UI/Controle
  const [modalOpen, setModalOpen] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'registrados'>('todos');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showSearch, setShowSearch] = useState(false); // Controle da barra de busca
  const [searchTerm, setSearchTerm] = useState("");

  // --- LÓGICA DE BUSCA E PAGINAÇÃO ---
  const fetchFeed = async (reset = false) => {
    if (loading) return;
    setLoading(true);
    
    try {
      const paginaParaBuscar = reset ? 1 : page;
      // Adicionamos 'q' para busca (precisa ajustar no backend se quiser busca real pelo servidor)
      // Por enquanto, o backend ignora 'q' se não foi implementado, mas o front já manda.
      const res = await api.get(`/pix?page=${paginaParaBuscar}&limit=15&status=${filtro}&q=${searchTerm}`);
      
      const novosItens = res.data.data || [];
      
      if (reset) {
          setTransacoes(novosItens);
          setPage(2);
      } else {
          setTransacoes(prev => [...prev, ...novosItens]);
          setPage(prev => prev + 1);
      }
      
      // Lógica para saber se tem mais (se veio menos que o limite, acabou)
      setHasMore(novosItens.length === 15);

    } catch (error) { console.error("Erro ao carregar feed", error); } 
    finally { setLoading(false); }
  };

  const fetchProdutos = async () => {
    try {
        const res = await api.get('/produtos');
        setProdutos(res.data);
    } catch (error) { console.error(error); }
  };

  // Efeitos (Triggers)
  useEffect(() => { fetchFeed(true); }, [filtro]); // Recarrega ao mudar filtro
  useEffect(() => { 
      // Debounce simples para busca (espera parar de digitar)
      const delay = setTimeout(() => { if(showSearch) fetchFeed(true); }, 800);
      return () => clearTimeout(delay);
  }, [searchTerm]);
  
  useEffect(() => { fetchProdutos(); }, []);

  return (
    <div className="max-w-2xl mx-auto pb-24 animate-fade-in relative min-h-screen">
      
      {/* --- HEADER FIXO E PODEROSO --- */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 shadow-2xl transition-all">
        
        {/* Linha Superior: Botões de Ação */}
        <div className="p-3 flex items-center justify-between gap-3">
            
            {/* Botão NOVA VENDA (Destaque) */}
            <Tooltip title="Lançar venda manual (Dinheiro)" arrow>
                <button 
                    onClick={() => setModalOpen(true)}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50 active:scale-95 transition-all text-sm group"
                >
                    <Add className="group-hover:rotate-90 transition-transform"/> 
                    <span>NOVA VENDA</span>
                </button>
            </Tooltip>

            {/* Ações Secundárias (Busca e Refresh) */}
            <div className="flex gap-1">
                <Tooltip title={showSearch ? "Fechar busca" : "Pesquisar cliente"}>
                    <IconButton 
                        onClick={() => setShowSearch(!showSearch)} 
                        sx={{ color: showSearch ? '#22d3ee' : 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        {showSearch ? <Close /> : <Search />}
                    </IconButton>
                </Tooltip>

                <Tooltip title="Atualizar lista">
                    <IconButton 
                        onClick={() => fetchFeed(true)} 
                        disabled={loading}
                        sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <Refresh className={loading ? "animate-spin" : ""} />
                    </IconButton>
                </Tooltip>
            </div>
        </div>

        {/* Barra de Pesquisa (Condicional com Animação) */}
        <Fade in={showSearch} unmountOnExit>
            <div className="px-3 pb-3">
                <TextField
                    fullWidth
                    placeholder="Buscar por nome..."
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ 
                        bgcolor: 'rgba(0,0,0,0.3)', 
                        borderRadius: 2,
                        '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: '#334155' } }
                    }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search sx={{ color: '#64748b' }}/></InputAdornment>,
                    }}
                />
            </div>
        </Fade>

        {/* --- FILTROS INTELIGENTES (Scrollable) --- */}
        <div className="px-4 pb-0 flex gap-3 overflow-x-auto scrollbar-hide border-t border-white/5 pt-2">
            <div className="flex items-center text-slate-500 mr-1">
                <FilterList fontSize="small" />
            </div>
            <FilterChip 
                label="Todos" 
                active={filtro === 'todos'} 
                onClick={() => setFiltro('todos')} 
            />
            <Badge badgeContent={0} color="error" variant="dot" invisible={filtro !== 'pendentes'}>
                <FilterChip 
                    label="Pendentes" 
                    active={filtro === 'pendentes'} 
                    onClick={() => setFiltro('pendentes')} 
                    color="cyan"
                />
            </Badge>
            <FilterChip 
                label="Registrados" 
                active={filtro === 'registrados'} 
                onClick={() => setFiltro('registrados')} 
                color="emerald"
            />
        </div>
        {/* Barra de Progresso sutil ao carregar */}
        {loading && <div className="h-0.5 w-full bg-cyan-500/30 overflow-hidden"><div className="h-full bg-cyan-400 animate-progress"></div></div>}
      </div>

      {/* --- LISTA DE TRANSAÇÕES (TIMELINE) --- */}
      <div className="relative border-l-2 border-slate-800 ml-6 md:ml-8 my-6 space-y-8 pr-3">
        {transacoes.length === 0 && !loading ? (
           <div className="ml-[-17px] flex flex-col items-center py-12 opacity-50 animate-fade-in">
              <ShoppingBag sx={{ fontSize: 60, mb: 2, color: '#475569' }} />
              <p className="text-slate-400 font-medium">Nenhuma venda encontrada.</p>
              <p className="text-slate-600 text-xs">Tente mudar o filtro.</p>
           </div>
        ) : (
          transacoes.map((pix, index) => (
            <TimelineItem 
                key={pix._id} 
                pix={pix} 
                onUpdate={() => fetchFeed(true)} 
                index={index} 
            />
          ))
        )}
      </div>

      {/* BOTÃO CARREGAR MAIS */}
      {hasMore && transacoes.length > 0 && (
          <div className="text-center pb-8 pt-4">
              <Tooltip title="Ver transações mais antigas">
                  <button 
                    onClick={() => fetchFeed(false)}
                    disabled={loading}
                    className="group text-cyan-400 text-xs font-bold border border-cyan-500/30 px-6 py-2 rounded-full hover:bg-cyan-500/10 transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
                  >
                      {loading ? <CircularProgress size={14} color="inherit"/> : (
                          <>
                            CARREGAR MAIS <ArrowDownward sx={{ fontSize: 14 }} className="group-hover:translate-y-1 transition-transform"/>
                          </>
                      )}
                  </button>
              </Tooltip>
          </div>
      )}

      {/* MODAL DE VENDA */}
      <NewSaleModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSuccess={() => fetchFeed(true)} 
        produtos={produtos} 
      />
    </div>
  );
}

// --- SUB-COMPONENTES DE UI ---

function FilterChip({ label, active, onClick, color = 'cyan' }: any) {
    const activeClass = color === 'emerald' 
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';

    return (
        <Chip 
            label={label} 
            onClick={onClick}
            variant={active ? "filled" : "outlined"}
            className={`cursor-pointer transition-all font-bold ${active ? activeClass : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
            sx={{ 
                height: '28px', 
                fontSize: '0.75rem', 
                backgroundColor: active ? '' : 'transparent' // Override MUI default
            }}
        />
    )
}

// --- ITEM DA TIMELINE (A MÁGICA ACONTECE AQUI) ---
function TimelineItem({ pix, onUpdate, index }: { pix: Pix, onUpdate: () => void, index: number }) {
  const { user } = useAuth();
  const [editMode, setEditMode] = useState(!pix.item_vendido);
  const [produto, setProduto] = useState(pix.item_vendido || "");
  const [qtd, setQtd] = useState(pix.quantidade || 1);
  const [loadingSave, setLoadingSave] = useState(false);
  
  const isDinheiro = pix.tipo === 'DINHEIRO';
  const theme = isDinheiro ? {
      color: 'emerald',
      light: '#34d399',
      dark: '#059669',
      bg: 'bg-emerald-500',
      text: 'text-emerald-400'
  } : {
      color: 'cyan',
      light: '#22d3ee',
      dark: '#0891b2',
      bg: 'bg-cyan-500',
      text: 'text-cyan-400'
  };

  const salvar = async () => {
    if (!produto) return;
    setLoadingSave(true);
    try {
        await api.put(`/pix/${pix._id}`, { 
            item: produto, 
            quantidade: qtd, 
            editor_email: user?.email 
        });
        setEditMode(false);
        onUpdate();
    } catch (e) { alert("Erro ao salvar"); } 
    finally { setLoadingSave(false); }
  };

  const formatVendedor = (nome: string) => nome ? nome.split(' ')[0] : 'Sistema';

  return (
    <div className="relative pl-6 animate-fade-in group" style={{ animationDelay: `${index < 10 ? index * 50 : 0}ms` }}>
        
        {/* BOLINHA DA TIMELINE (CONECTOR) */}
        <div className={`
            absolute -left-[19px] top-0 w-10 h-10 rounded-full border-4 border-slate-900 
            ${theme.bg} text-slate-900 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10 transition-transform group-hover:scale-110
        `}>
            {isDinheiro ? <LocalAtm sx={{ fontSize: 20 }} /> : <PixIcon sx={{ fontSize: 20 }} />}
        </div>

        {/* CARD PRINCIPAL */}
        <div className={`
            relative p-4 rounded-2xl border border-slate-700/50 bg-slate-800/40 backdrop-blur-sm
            hover:border-${theme.color}-500/30 hover:bg-slate-800/60 transition-all duration-300 shadow-sm
        `}>
            {/* HEADER DO CARD */}
            <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-2">
                <div className="flex flex-col">
                    <span className="text-white font-bold text-sm tracking-wide">{pix.remetente_extraido}</span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                        <Tooltip title="Horário da transação"><span>{new Date(pix.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></Tooltip>
                        {pix.vendedor_nome && <span className="text-slate-600">•</span>}
                        {pix.vendedor_nome && <span>{pix.vendedor_nome.split(' ')[0]}</span>}
                    </div>
                </div>
                
                {/* VALOR */}
                <div className={`font-mono font-bold text-lg ${theme.text} flex items-center gap-1`}>
                    <span className="text-xs opacity-50">R$</span>
                    {pix.valor_extraido}
                </div>
            </div>

            {/* CONTEÚDO DINÂMICO */}
            <div className="flex flex-col gap-2">
                
                {/* MODO VISUALIZAÇÃO */}
                {!editMode ? (
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {/* Chip de Quantidade e Produto */}
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-${theme.color}-500/10 text-${theme.color}-300 border border-${theme.color}-500/20`}>
                                <Inventory2 sx={{ fontSize: 14 }} />
                                <span>{(pix.quantidade || 1)}x</span>
                            </div>
                            <span className="text-white font-medium text-sm drop-shadow-md">{pix.item_vendido?.toUpperCase()}</span>
                        </div>
                        
                        {/* Quem identificou + Botão Editar */}
                        <div className="flex items-center gap-2">
                            <Tooltip title={`Venda registrada por: ${formatVendedor(pix.vendedor_nome || pix.vendedor_email || "Desconhecido")}`}>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-900/50 px-2 py-1 rounded-full border border-white/5">
                                    <Person sx={{ fontSize: 12 }} />
                                    <span className="max-w-[60px] truncate">{formatVendedor(pix.vendedor_nome || pix.vendedor_email || "")}</span>
                                </div>
                            </Tooltip>
                            <Tooltip title="Corrigir venda">
                                <IconButton onClick={() => setEditMode(true)} size="small" sx={{ color: '#64748b', '&:hover': { color: 'white' } }}>
                                    <Edit sx={{ fontSize: 16 }}/>
                                </IconButton>
                            </Tooltip>
                        </div>
                    </div>
                ) : (
                    // MODO EDIÇÃO (Formulário)
                    <div className="flex flex-col gap-3 w-full animate-fade-in bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                        
                        {/* Select de Produto Customizado */}
                        <div className="relative">
                            <select 
                                value={produto}
                                onChange={(e) => setProduto(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg text-xs text-white pl-3 pr-8 py-3 outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Selecione o produto...</option>
                                <option value="Cerveja">🍺 Cerveja</option>
                                <option value="Água">💧 Água</option>
                                <option value="Refrigerante">🥤 Refrigerante</option>
                                <option value="Dose">🥃 Dose</option>
                                <option value="Combo">🍹 Combo</option>
                            </select>
                            <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                                <ArrowDownward sx={{ fontSize: 14 }} />
                            </div>
                        </div>

                        {/* Controles de Quantidade e Ação */}
                        <div className="flex gap-2">
                            {/* Controlador Numérico */}
                            <div className="flex items-center bg-slate-800 border border-slate-600 rounded-lg h-9">
                                <button 
                                    onClick={() => setQtd(Math.max(1, qtd - 1))}
                                    className="w-8 h-full text-slate-400 hover:text-white hover:bg-slate-700 rounded-l-lg transition-colors flex items-center justify-center"
                                >
                                    <Remove sx={{ fontSize: 14 }} />
                                </button>
                                <span className="text-white font-mono font-bold text-sm min-w-[24px] text-center">{qtd}</span>
                                <button 
                                    onClick={() => setQtd(qtd + 1)}
                                    className="w-8 h-full text-slate-400 hover:text-white hover:bg-slate-700 rounded-r-lg transition-colors flex items-center justify-center"
                                >
                                    <Add sx={{ fontSize: 14 }} />
                                </button>
                            </div>

                            {/* Botão Salvar com Feedback */}
                            <button 
                                onClick={salvar}
                                disabled={!produto || loadingSave}
                                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs font-bold shadow-lg"
                            >
                                {loadingSave ? <CircularProgress size={14} color="inherit"/> : (
                                    <>
                                        <Save sx={{ fontSize: 16 }} /> SALVAR REGISTRO
                                    </>
                                )}
                            </button>
                            
                            {/* Botão Cancelar Edição (Só aparece se já foi vendido antes) */}
                            {!!pix.item_vendido && (
                                <Tooltip title="Cancelar edição">
                                    <button onClick={() => setEditMode(false)} className="px-2 text-slate-500 hover:text-red-400">
                                        <Close fontSize="small" />
                                    </button>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Ícone Decorativo de Fundo (Marca d'água) */}
            <div className="absolute right-2 bottom-2 opacity-5 pointer-events-none">
                 <MonetizationOn sx={{ fontSize: 40 }} />
            </div>
        </div>
    </div>
  );
}