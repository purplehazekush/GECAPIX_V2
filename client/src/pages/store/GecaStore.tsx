import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { School } from 'lucide-react';

// Componentes Dumb
import { StoreHeader } from './StoreHeader';
import { HeroBanner } from './HeroBanner';
import { CategoryFilters } from './CategoryFilter';
import { ProductCard } from './ProductCard';
import { MiniCart } from './MiniCart';
import { CheckoutDrawer } from './CheckoutDrawer';
import VerificationModal from '../../components/auth/VerificationModal';

interface Product {
    _id: string;
    nome: string;
    preco: number;
    imagem_url: string;
    categoria: string;
    cashback_xp: number;
    badge?: string;
}

export default function GecaStore() {
    const { dbUser } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<Record<string, number>>({});
    const [filter, setFilter] = useState('TODOS');
    const [isDrawerOpen, setDrawerOpen] = useState(false);
    const [useCoins, setUseCoins] = useState(false);
    const [showValidationModal, setShowValidationModal] = useState(false);
    
    // Estados do Checkout
    const [checkoutStep, setCheckoutStep] = useState<'CART' | 'PIX' | 'SUCCESS'>('CART');
    const [pixTimer, setPixTimer] = useState(900); // 15 min

    // Carregar Produtos
    useEffect(() => {
        api.get('/produtos')
            .then(res => setProducts(res.data))
            .catch(() => toast.error("Erro ao carregar estoque."));
    }, []);

    // Timer do Pix
    useEffect(() => {
        if (checkoutStep === 'PIX' && pixTimer > 0) {
            const interval = setInterval(() => setPixTimer(t => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [checkoutStep, pixTimer]);

    // Lógica do Carrinho
    const updateQty = (id: string, delta: number) => {
        setCart(prev => {
            const novo = { ...prev };
            novo[id] = (novo[id] || 0) + delta;
            if (novo[id] <= 0) delete novo[id];
            return novo;
        });
    };

    const cartItems = products
        .filter(p => cart[p._id])
        .map(p => ({ product: p, qty: cart[p._id] }));

    const subtotal = cartItems.reduce((acc, item) => acc + (item.product.preco * item.qty), 0);
    const itemCount = Object.values(cart).reduce((a, b) => a + b, 0);
    
    const discount = useCoins ? Math.min(subtotal, 5) : 0; 
    const finalTotal = subtotal - discount;

    const formatTimer = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

    // Ações
    const handleCheckout = () => {
        if (itemCount === 0) return;
        setCheckoutStep('PIX');
        // TODO: Aqui entra a integração com Mercado Pago futuramente
    };

    const handleSimulatePayment = () => {
        setCheckoutStep('SUCCESS');
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22d3ee', '#ec4899']
        });
        setTimeout(() => {
            setCart({});
            setDrawerOpen(false);
            setCheckoutStep('CART');
        }, 5000);
    };

    const filteredProducts = filter === 'TODOS' 
        ? products 
        : products.filter(p => p.categoria === filter);

    return (
        <div className="min-h-screen bg-slate-950 pb-40 text-white font-sans">
            <StoreHeader coins={dbUser?.saldo_coins || 0} glue={dbUser?.saldo_glue || 0} />
            
            {/* 🔥 BANNER DE VALIDAÇÃO (Só para Pendentes) */}
            {dbUser?.status === 'pendente' && (
                <div 
                    onClick={() => setShowValidationModal(true)}
                    className="mx-4 mt-4 bg-gradient-to-r from-indigo-900 to-slate-900 p-3 rounded-xl border border-indigo-500/30 flex items-center justify-between cursor-pointer relative overflow-hidden group shadow-lg shadow-indigo-900/20"
                >
                    <div className="absolute inset-0 bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors"></div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="bg-indigo-500/20 p-2 rounded-full text-indigo-300">
                            <School size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white uppercase">Valide seu Email UFMG</p>
                            <p className="text-[10px] text-indigo-300">Ganhe 100 Coins e acesso à Arena</p>
                        </div>
                    </div>
                    <div className="relative z-10">
                        <span className="bg-indigo-600 text-white text-[9px] font-black px-3 py-1.5 rounded shadow hover:bg-indigo-500 transition-colors">VALIDAR</span>
                    </div>
                </div>
            )}

            <HeroBanner />
            
            <CategoryFilters current={filter} onSelect={setFilter} />
            
            {/* Grid com padding extra no final para o scroll não cortar */}
            <div className="px-4 grid grid-cols-2 gap-4">
                {filteredProducts.map(p => (
                    <ProductCard 
                        key={p._id} 
                        product={p} 
                        qty={cart[p._id] || 0} 
                        onUpdateQty={(delta) => updateQty(p._id, delta)} 
                    />
                ))}
            </div>

            {/* CORREÇÃO DO BOTÃO: 'bottom-28' e z-[100] */}
            <div className="fixed bottom-28 left-4 right-4 z-[100]">
                <MiniCart 
                    count={itemCount} 
                    total={subtotal} 
                    onClick={() => setDrawerOpen(true)} 
                />
            </div>

            <CheckoutDrawer 
                isOpen={isDrawerOpen} 
                onClose={() => setDrawerOpen(false)}
                step={checkoutStep}
                cartItems={cartItems}
                total={finalTotal}
                userCoins={dbUser?.saldo_coins || 0}
                useCoins={useCoins}
                setUseCoins={setUseCoins}
                pixTimerStr={formatTimer(pixTimer)}
                onCheckout={handleCheckout}
                onSimulateSuccess={handleSimulatePayment}
            />

            {/* MODAL DE VALIDAÇÃO */}
            <VerificationModal 
                isOpen={showValidationModal} 
                onClose={() => setShowValidationModal(false)} 
            />
        </div>
    );
}