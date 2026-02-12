import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

// Componentes Dumb
import { StoreHeader } from './StoreHeader';
import { HeroBanner } from './HeroBanner';
import { CategoryFilters } from './CategoryFilter';
import { ProductCard } from './ProductCard';
import { MiniCart } from './MiniCart';
import { CheckoutDrawer } from './CheckoutDrwaer';

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
        // TODO: Chamar API Pix Real
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
        <div className="min-h-screen bg-slate-950 pb-32 text-white font-sans">
            <StoreHeader coins={dbUser?.saldo_coins || 0} glue={dbUser?.saldo_glue || 0} />
            
            <HeroBanner />
            
            <CategoryFilters current={filter} onSelect={setFilter} />
            
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

            <MiniCart 
                count={itemCount} 
                total={subtotal} 
                onClick={() => setDrawerOpen(true)} 
            />

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
        </div>
    );
}