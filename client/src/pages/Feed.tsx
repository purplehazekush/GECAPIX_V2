// client/src/pages/Feed.tsx
import { useEffect, useState } from 'react';
import {
    Refresh, Add, LocalAtm, Pix as PixIcon,
    CheckCircle, Inventory2, WarningAmber, History
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { api } from "../lib/api";
import { useAuth } from '../context/AuthContext';
import NewSaleModal from '../components/NewSaleModal';
import type { Pix, Produto } from '../types';

export default function Feed() {
    const [transacoes, setTransacoes] = useState<Pix[]>([]);
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    // MODO DE VISÃO: 'pendentes' (Trabalho) ou 'historico' (Consulta)
    const [viewMode, setViewMode] = useState<'pendentes' | 'historico'>('pendentes');

    // Busca Inteligente
    const fetchFeed = async () => {
        setLoading(true);
        try {
            // limit=100 para garantir que pega um bom histórico
            const res = await api.get('/pix?limit=100');
            // Proteção contra formatos diferentes de resposta
            const dados = Array.isArray(res.data) ? res.data : (res.data.data || []);
            setTransacoes(dados);
        } catch (error) { console.error("Erro feed", error); }
        finally { setLoading(false); }
    };

    const fetchProdutos = async () => {
        try {
            const res = await api.get('/produtos');
            setProdutos(res.data);
        } catch (error) { console.error("Erro produtos", error); }
    };

    useEffect(() => { fetchFeed(); fetchProdutos(); }, []);

    // Filtros no Cliente
    const pendentes = transacoes.filter(t => !t.item_vendido);
    const listaAtual = viewMode === 'pendentes' ? pendentes : transacoes;

    return (
        <div className="max-w-xl mx-auto pb-24 animate-fade-in min-h-screen px-4">

            {/* --- HEADER DE COMANDO --- */}
            <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md -mx-4 px-4 pt-4 pb-2 border-b border-white/10 shadow-2xl mb-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-xl font-black text-white italic tracking-tighter">GECAPIX <span className="text-cyan-400">CMD</span></h1>
                        <p className="text-[10px] text-slate-400 font-mono">OPERADOR LOGADO</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setModalOpen(true)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white p-2 rounded-lg shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                            <Add />
                        </button>
                        <button onClick={fetchFeed} className="bg-slate-800 text-cyan-400 p-2 rounded-lg border border-slate-700">
                            <Refresh className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* --- ABAS DE NAVEGAÇÃO --- */}
                <div className="flex bg-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('pendentes')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'pendentes'
                                ? 'bg-amber-500 text-slate-900 shadow-lg'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <WarningAmber sx={{ fontSize: 16 }} />
                        A FAZER
                        {pendentes.length > 0 && (
                            <span className="bg-slate-900 text-amber-500 px-1.5 rounded-full text-[10px] ml-1">
                                {pendentes.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setViewMode('historico')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'historico'
                                ? 'bg-cyan-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <History sx={{ fontSize: 16 }} />
                        HISTÓRICO
                    </button>
                </div>
            </div>

            {/* --- ÁREA DE CARDS --- */}
            <div className="space-y-4">
                {listaAtual.length === 0 ? (
                    <div className="text-center py-20 opacity-50 flex flex-col items-center">
                        {viewMode === 'pendentes' ? (
                            <>
                                <CheckCircle sx={{ fontSize: 60 }} className="text-emerald-500 mb-4" />
                                <h3 className="text-white font-bold text-lg">Tudo Limpo!</h3>
                                <p className="text-slate-400 text-sm">Você zerou a fila de vendas.</p>
                            </>
                        ) : (
                            <p>Nenhuma venda registrada.</p>
                        )}
                    </div>
                ) : (
                    listaAtual.map(pix => (
                        <GameCard
                            key={pix._id}
                            pix={pix}
                            produtos={produtos}
                            onResolve={fetchFeed}
                            isPending={!pix.item_vendido}
                        />
                    ))
                )}
            </div>

            {/* Modal de Venda Manual */}
            <NewSaleModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={fetchFeed}
                produtos={produtos}
            />
        </div>
    );
}

// --- O CARTÃO DE JOGO ---
function GameCard({ pix, produtos, onResolve, isPending }: { pix: Pix, produtos: Produto[], onResolve: () => void, isPending: boolean }) {
    const { user, dbUser } = useAuth();
    const [produto, setProduto] = useState("");
    const [qtd, setQtd] = useState(1);
    const [loading, setLoading] = useState(false);

    const isDinheiro = pix.tipo === 'DINHEIRO';

    // --- FUNÇÃO PARA CORRIGIR O NOME VISUALMENTE ---
    const formatVendedor = (nome?: string, email?: string) => {
        // 1. Prioridade: Nome salvo no banco
        if (nome && nome !== "Sistema") return nome.split(' ')[0];
        // 2. Fallback: Email (estilo v1)
        if (email) return email.split('@')[0];
        // 3. Último caso
        return 'Sistema';
    };

    const salvar = async () => {
        if (!produto) return;
        setLoading(true);

        // Lógica Robusta para definir o nome
        let nomeParaSalvar = "Anônimo";
        if (dbUser?.nome) nomeParaSalvar = dbUser.nome;
        else if (user?.displayName) nomeParaSalvar = user.displayName;
        else if (user?.email) nomeParaSalvar = user.email.split('@')[0];

        try {
            await api.put(`/pix/${pix._id}`, {
                item: produto,
                quantidade: qtd,
                editor_email: user?.email,
                vendedor_nome: nomeParaSalvar // Envia o nome garantido
            });
            onResolve();
        } catch (e) { alert("Erro ao salvar"); }
        finally { setLoading(false); }
    };

    if (isPending) {
        // --- MODO: A FAZER ---
        return (
            <div className={`
                relative overflow-hidden rounded-2xl p-5 border-2 animate-fade-in
                bg-slate-800/80 backdrop-blur-sm
                ${isDinheiro ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'}
            `}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-slate-900 ${isDinheiro ? 'bg-emerald-400' : 'bg-amber-400'}`}>
                            {isDinheiro ? <LocalAtm /> : <PixIcon />}
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg leading-none">{pix.remetente_extraido}</h3>
                            <span className="text-xs text-slate-400 font-mono">
                                {new Date(pix.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                    <div className={`text-xl font-black font-mono ${isDinheiro ? 'text-emerald-400' : 'text-amber-400'}`}>
                        R$ {pix.valor_extraido}
                    </div>
                </div>

                <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-bold">O QUE FOI VENDIDO?</p>
                    <div className="flex flex-col gap-3">
                        <select
                            value={produto}
                            onChange={e => setProduto(e.target.value)}
                            className="w-full bg-slate-800 text-white text-sm p-3 rounded-lg border border-slate-600 focus:border-cyan-500 outline-none"
                        >
                            <option value="" disabled>Selecione um item...</option>
                            {produtos.map(p => (
                                <option key={p._id} value={p.nome}>
                                    {p.nome} - R$ {p.preco}
                                </option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <div className="flex items-center bg-slate-800 rounded-lg border border-slate-600 h-10">
                                <button onClick={() => setQtd(Math.max(1, qtd - 1))} className="px-3 text-slate-400 hover:text-white">-</button>
                                <span className="text-white font-bold w-6 text-center">{qtd}</span>
                                <button onClick={() => setQtd(qtd + 1)} className="px-3 text-slate-400 hover:text-white">+</button>
                            </div>
                            <button
                                onClick={salvar}
                                disabled={!produto || loading}
                                className={`
                                    flex-1 font-bold rounded-lg text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2
                                    ${loading ? 'bg-slate-700 text-slate-500' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'}
                                `}
                            >
                                {loading ? <CircularProgress size={16} /> : <><CheckCircle fontSize="small" /> CONFIRMAR</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    } else {
        // --- MODO: HISTÓRICO ---
        return (
            <div className={`
                flex justify-between items-center p-3 rounded-xl border border-white/5 bg-slate-800/30 
                hover:bg-slate-800/50 transition-colors opacity-75 hover:opacity-100
            `}>
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-10 rounded-full ${isDinheiro ? 'bg-emerald-500/50' : 'bg-cyan-500/50'}`}></div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-sm">{pix.remetente_extraido}</span>
                            <span className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                                {new Date(pix.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <Inventory2 sx={{ fontSize: 12 }} />
                            <span className={isDinheiro ? 'text-emerald-400' : 'text-cyan-400'}>
                                {pix.quantidade}x {pix.item_vendido}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-white font-mono font-bold">R$ {pix.valor_extraido}</div>
                    <div className="text-[10px] text-slate-500">
                        {/* AQUI ESTÁ O USO DA FUNÇÃO MÁGICA */}
                        {formatVendedor(pix.vendedor_nome, pix.vendedor_email)}
                    </div>
                </div>
            </div>
        );
    }
}