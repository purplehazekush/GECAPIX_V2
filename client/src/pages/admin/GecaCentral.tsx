import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
    Save, AlertOctagon, TrendingUp, DollarSign, 
    Cpu, ShieldAlert, Activity 
} from 'lucide-react';

// Interfaces para os componentes auxiliares
interface ControlSliderProps {
    label: string;
    desc: string;
    value: number;
    onChange: (val: number) => void;
    min: number;
    max: number;
    step: number;
    unit: string;
    color: 'cyan' | 'orange' | 'purple';
}

interface NumberInputProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
    color?: 'green' | 'purple' | 'pink';
}

export default function GecaCentral() {
    const { dbUser } = useAuth();
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Carregar config inicial
    useEffect(() => {
        api.get('/admin/config')
            .then(res => { setConfig(res.data); setLoading(false); })
            .catch(() => toast.error("Erro ao carregar configs"));
    }, []);

    const handleChange = (key: string, val: string | number | boolean) => {
        setConfig((prev: any) => ({ ...prev, [key]: val }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/admin/config', config);
            toast.success("🔥 PARÂMETROS ATUALIZADOS COM SUCESSO!");
        } catch (e) {
            toast.error("Erro ao salvar.");
        } finally {
            setSaving(false);
        }
    };

    const toggleEmergency = () => {
        const novoEstado = !config.EMERGENCY_STOP;
        if(novoEstado && !window.confirm("ATENÇÃO: ISSO VAI PARAR TODO O SISTEMA. CONFIRMA?")) return;
        
        handleChange('EMERGENCY_STOP', novoEstado);
        // Salva imediatamente
        api.put('/admin/config', { ...config, EMERGENCY_STOP: novoEstado })
            .then(() => toast(novoEstado ? "SISTEMA TRAVADO" : "SISTEMA LIBERADO", { icon: novoEstado ? '🛑' : '🟢' }));
    };

    if (loading) return <div className="p-10 text-center text-cyan-500 font-mono">CARREGANDO SISTEMA CENTRAL...</div>;
    
    // Verificação de permissão corrigida com os novos tipos
    if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'gm')) return <div className="p-10 text-white">ACESSO NEGADO</div>;

    return (
        <div className={`min-h-screen p-6 pb-24 transition-colors duration-500 ${config.EMERGENCY_STOP ? 'bg-red-950/30' : 'bg-slate-950'}`}>
            
            {/* HEADER */}
            <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-2">
                        GECA<span className="text-cyan-400">CENTRAL</span>
                        {config.EMERGENCY_STOP && <span className="text-red-500 text-sm bg-red-950 px-2 py-1 rounded border border-red-500 animate-pulse">LOCKDOWN ATIVO</span>}
                    </h1>
                    <p className="text-slate-500 font-mono text-xs">Controle Econômico em Tempo Real v1.0</p>
                </div>
                
                <div className="flex gap-4">
                    <button 
                        onClick={toggleEmergency}
                        className={`px-4 py-2 rounded font-bold border-2 flex items-center gap-2 transition-all ${
                            config.EMERGENCY_STOP 
                            ? 'bg-red-500 border-red-500 text-white animate-pulse' 
                            : 'border-red-900 text-red-700 hover:bg-red-900/20'
                        }`}
                    >
                        <AlertOctagon size={18} />
                        {config.EMERGENCY_STOP ? 'DESTRAVAR SISTEMA' : 'EMERGENCY STOP'}
                    </button>

                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow-lg shadow-cyan-900/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Activity className="animate-spin" /> : <Save size={18} />}
                        DEPLOY CONFIG
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. MACROECONOMIA */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="text-cyan-500" /> Macroeconomia
                    </h2>
                    
                    <div className="space-y-6">
                        <ControlSlider 
                            label="Taxa de Rede (TAX_RATE)" 
                            desc="Imposto sobre jogos e p2p"
                            value={config.TAX_RATE * 100} 
                            onChange={(v) => handleChange('TAX_RATE', v/100)} 
                            min={0} max={20} step={0.5} unit="%" color="cyan"
                        />
                        <ControlSlider 
                            label="Rendimento Títulos (APR)" 
                            desc="Juros diários do banco (Locked)"
                            value={config.LOCKED_APR_DAILY * 100} 
                            onChange={(v) => handleChange('LOCKED_APR_DAILY', v/100)} 
                            min={0} max={5} step={0.1} unit="%" color="cyan"
                        />
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-400">Peg (1000 Coins = R$)</label>
                            <input 
                                type="number" 
                                value={config.EXCHANGE_PEG}
                                onChange={e => handleChange('EXCHANGE_PEG', parseFloat(e.target.value))}
                                className="bg-transparent text-right font-mono text-cyan-400 font-bold outline-none border-b border-slate-700 focus:border-cyan-500 w-24"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. FAUCETS (Entradas) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <DollarSign className="text-green-500" /> Faucets (Emissão)
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <NumberInput label="Welcome Bonus" value={config.WELCOME_BONUS} onChange={(v) => handleChange('WELCOME_BONUS', v)} />
                        <NumberInput label="Referral (Fixo)" value={config.REFERRAL_FIXED} onChange={(v) => handleChange('REFERRAL_FIXED', v)} />
                        <NumberInput label="Login Base" value={config.DAILY_LOGIN_BASE} onChange={(v) => handleChange('DAILY_LOGIN_BASE', v)} />
                        <NumberInput label="Login Step" value={config.DAILY_LOGIN_STEP} onChange={(v) => handleChange('DAILY_LOGIN_STEP', v)} />
                        <NumberInput label="Vitória Jogo (XP)" value={config.GAME_WIN_XP} onChange={(v) => handleChange('GAME_WIN_XP', v)} />
                        <NumberInput label="Match Dating" value={config.MATCH_BONUS} onChange={(v) => handleChange('MATCH_BONUS', v)} />
                    </div>
                </div>

                {/* 3. SINKS (Saídas) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Cpu className="text-purple-500" /> Sinks (Queima)
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <NumberInput label="Oráculo (Coins)" value={config.ORACLE_COST_COINS} onChange={(v) => handleChange('ORACLE_COST_COINS', v)} color="purple" />
                        <NumberInput label="Oráculo (Glue)" value={config.ORACLE_COST_GLUE} onChange={(v) => handleChange('ORACLE_COST_GLUE', v)} color="pink" />
                        <NumberInput label="Postar Spotted" value={config.SPOTTED_POST_COST} onChange={(v) => handleChange('SPOTTED_POST_COST', v)} color="purple" />
                        <NumberInput label="Like Dating" value={config.DATING_LIKE_COST} onChange={(v) => handleChange('DATING_LIKE_COST', v)} color="purple" />
                        <div className="col-span-2">
                            <NumberInput label="Super Like (Coins)" value={config.DATING_SUPERLIKE_COST} onChange={(v) => handleChange('DATING_SUPERLIKE_COST', v)} color="purple" />
                        </div>
                    </div>
                </div>

                {/* 4. RPG BALANCING */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <ShieldAlert className="text-orange-500" /> Balanceamento RPG
                    </h2>
                    
                    <div className="space-y-6">
                        <ControlSlider 
                            label="Mult. Bardo (Referral)" 
                            desc="Bônus da classe Bardo"
                            value={config.BARDO_BONUS_MULT} 
                            onChange={(v) => handleChange('BARDO_BONUS_MULT', v)} 
                            min={1} max={3} step={0.1} unit="x" color="orange"
                        />
                        <ControlSlider 
                            label="Desconto Tecnomante" 
                            desc="Desconto na IA"
                            value={config.TECNOMANTE_DISCOUNT * 100} 
                            onChange={(v) => handleChange('TECNOMANTE_DISCOUNT', v/100)} 
                            min={0} max={100} step={5} unit="%" color="orange"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}

// --- SUBCOMPONENTES (Agora tipados corretamente) ---

const ControlSlider = ({ label, desc, value, onChange, min, max, step, unit, color }: ControlSliderProps) => {
    const colors: Record<string, string> = { cyan: 'text-cyan-400', orange: 'text-orange-400', purple: 'text-purple-400' };
    
    return (
        <div>
            <div className="flex justify-between mb-2">
                <div>
                    <label className="text-slate-300 font-bold text-sm block">{label}</label>
                    <p className="text-[10px] text-slate-500">{desc}</p>
                </div>
                <span className={`font-mono font-bold ${colors[color] || 'text-white'}`}>{value.toFixed(1)}{unit}</span>
            </div>
            <input 
                type="range" 
                min={min} max={max} step={step} 
                value={value} 
                onChange={e => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
        </div>
    );
};

const NumberInput = ({ label, value, onChange, color = 'green' }: NumberInputProps) => {
    const textColors: Record<string, string> = { green: 'text-green-400', purple: 'text-purple-400', pink: 'text-pink-500' };
    
    return (
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">{label}</label>
            <input 
                type="number" 
                value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                className={`bg-transparent w-full font-mono font-bold outline-none ${textColors[color]}`}
            />
        </div>
    );
};