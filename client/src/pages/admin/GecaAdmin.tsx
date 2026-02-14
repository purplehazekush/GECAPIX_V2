import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import type { Product, LedgerItem } from '../../types/store';

// Componentes
import { AdminHeader } from '../../components/admin/store/AdminHeader';
import { KPICards } from '../../components/admin/store/KPICards';
import { POSGrid } from '../../components/admin/store/POSGrid';
import { POSCart } from '../../components/admin/store/POSCart';
import { ProductModal } from '../../components/admin/store/ProductModal';
import { FileText } from 'lucide-react';

export default function GecaAdmin() {
    const [tab, setTab] = useState<'pos' | 'ledger'>('pos');
    const [isStoreOpen, setStoreOpen] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<Record<string, number>>({});
    const [isModalOpen, setModalOpen] = useState(false);
    const [ledger, setLedger] = useState<LedgerItem[]>([]);
    
    // Stats (Poderiam vir da API)
    const [faturamento, setFaturamento] = useState(0);
    const [myCashback, setMyCashback] = useState(0);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const res = await api.get('/produtos');
            setProducts(res.data);
        } catch (e) { toast.error("Erro ao carregar produtos"); }
    };

    const handleAddToCart = (p: Product) => {
        setCart(prev => ({ ...prev, [p._id]: (prev[p._id] || 0) + 1 }));
    };

    const handleRemoveFromCart = (id: string) => {
        setCart(prev => {
            const next = { ...prev };
            if (next[id] > 1) next[id]--;
            else delete next[id];
            return next;
        });
    };

    const handleCheckout = async (method: string) => {
        if (Object.keys(cart).length === 0) return toast.error("Carrinho vazio");

        // Prepara resumo para salvar
        const items = Object.keys(cart).map(id => {
            const p = products.find(prod => prod._id === id);
            return p ? { nome: p.nome, qtd: cart[id], preco: p.preco, xp: p.cashback_xp } : null;
        }).filter(Boolean);

        const total = items.reduce((acc, i: any) => acc + (i.preco * i.qtd), 0);
        const totalXP = items.reduce((acc, i: any) => acc + (i.xp * i.qtd), 0);
        const desc = items.map((i: any) => `${i.qtd}x ${i.nome}`).join(', ');

        try {
            // Chama a API de Venda Manual (reaproveitando o pixController)
            await api.post('/vendas/manual', {
                item: desc,
                valor: total,
                quantidade: 1, // Pacote fechado
                vendedor_email: 'voce@geca.com' // Idealmente pegar do AuthContext
            });

            // Atualiza Ledger Local (ou faz refetch)
            setLedger(prev => [{
                _id: Date.now().toString(),
                time: new Date().toLocaleTimeString(),
                desc,
                val: total,
                xp: totalXP,
                method: method as any
            }, ...prev]);

            // Atualiza Stats
            setFaturamento(f => f + total);
            setMyCashback(c => c + totalXP);

            setCart({});
            toast.success(`Venda registrada! +${totalXP} XP`);
        } catch (e) {
            toast.error("Erro ao registrar venda.");
        }
    };

    const handleCreateProduct = async (data: any) => {
        try {
            await api.post('/produtos', {
                ...data,
                preco: parseFloat(data.preco),
                cashback_xp: parseInt(data.cashback_xp),
                estoque: parseInt(data.estoque)
            });
            toast.success("Produto criado!");
            setModalOpen(false);
            loadProducts();
        } catch (e) {
            toast.error("Erro ao criar produto.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 pb-20 text-white font-sans">
            <AdminHeader isOpen={isStoreOpen} onToggle={() => setStoreOpen(!isStoreOpen)} />

            <main className="max-w-7xl mx-auto p-4 space-y-6">
                <KPICards faturamento={faturamento} myCashback={myCashback} />

                {/* TABS */}
                <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 sticky top-16 z-40 shadow-lg max-w-md">
                    <button 
                        onClick={() => setTab('pos')}
                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${
                            tab === 'pos' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                    Caixa (PDV)
                    </button>
                    <button 
                        onClick={() => setTab('ledger')}
                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${
                            tab === 'ledger' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <FileText size={16} /> Histórico
                    </button>
                </div>

                {tab === 'pos' && (
                    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-280px)]">
                        <POSGrid 
                            products={products} 
                            onSelect={handleAddToCart} 
                            onNewProduct={() => setModalOpen(true)} 
                        />
                        <POSCart 
                            cart={cart} 
                            products={products} 
                            onRemove={handleRemoveFromCart}
                            onCheckout={handleCheckout}
                        />
                    </div>
                )}

                {tab === 'ledger' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg p-4">
                        <p className="text-slate-400 text-sm">Histórico de transações será implementado com tabela real.</p>
                        {/* TODO: Componente LedgerTable aqui */}
                        {ledger.map(l => (
                            <div key={l._id} className="border-b border-slate-800 p-2 flex justify-between">
                                <span>{l.time} - {l.desc}</span>
                                <span className="font-bold text-emerald-400">R$ {l.val.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <ProductModal 
                isOpen={isModalOpen} 
                onClose={() => setModalOpen(false)} 
                onSubmit={handleCreateProduct} 
            />
        </div>
    );
}