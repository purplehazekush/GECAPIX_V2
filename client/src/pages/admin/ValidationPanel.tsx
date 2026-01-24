// client/src/pages/admin/ValidationPanel.tsx
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
// CORREÇÃO: Adicionado 'Lock' aqui na lista
import { CheckCircle, Cancel, VerifiedUser, School, AccessTime, Badge, Lock } from '@mui/icons-material';
import { CircularProgress, Chip } from '@mui/material';
import toast from 'react-hot-toast';

export default function ValidationPanel() {
    const { dbUser } = useAuth();
    const [fila, setFila] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const carregarFila = async () => {
        try {
            const res = await api.get('admin/validacao');
            setFila(res.data);
        } catch (error) {
            toast.error("Erro ao carregar fila.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { carregarFila(); }, []);

    const moderar = async (email: string, acao: 'aprovar' | 'rejeitar') => {
        const toastId = toast.loading("Processando...");
        try {
            await api.post('admin/validacao', { email, acao });
            setFila(prev => prev.filter(u => u.email !== email));
            toast.success(acao === 'aprovar' ? "Aluno aprovado!" : "Cadastro rejeitado.", { id: toastId });
        } catch (e) {
            toast.error("Erro na ação.", { id: toastId });
        }
    };

    // Permissão: Apenas Admin, GM2, GM ou Gestão podem validar
    const canModerate = ['admin', 'gm2', 'gm', 'gestao'].includes(dbUser?.role || '');

    if (!canModerate) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 animate-fade-in">
                <Lock fontSize="large" className="mb-2 text-red-500"/>
                <p className="text-xs font-bold uppercase">Área Restrita aos Oficiais</p>
            </div>
        );
    }

    return (
        <div className="p-4 pb-24 animate-fade-in space-y-6 max-w-4xl mx-auto">
            
            {/* Header */}
            <header className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="bg-yellow-500/20 p-3 rounded-2xl text-yellow-500">
                        <VerifiedUser fontSize="large" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase italic">Xerife</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Central de Validação de Identidade
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-black text-white">{fila.length}</span>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Pendentes</p>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center p-20"><CircularProgress color="secondary" /></div>
            ) : fila.length === 0 ? (
                <div className="text-center py-20 opacity-30 border-2 border-dashed border-slate-800 rounded-3xl">
                    <CheckCircle sx={{ fontSize: 60 }} className="mb-4" />
                    <h3 className="text-xl font-bold text-white">Fila Limpa!</h3>
                    <p className="text-sm">Nenhum aspirante aguardando.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {fila.map(aluno => (
                        <div key={aluno._id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-lg hover:border-slate-700 transition-colors">
                            
                            {/* Header do Card */}
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                                <div className="flex items-center gap-2">
                                    <AccessTime sx={{fontSize:14}} className="text-slate-500"/>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {new Date(aluno.data_criacao || Date.now()).toLocaleDateString()}
                                    </span>
                                </div>
                                <Chip label="ASPIRANTE" size="small" color="warning" sx={{fontSize:9, height:20, fontWeight:'bold'}} />
                            </div>

                            {/* Conteúdo */}
                            <div className="p-5 flex gap-4">
                                {/* Comprovante (Thumbnail) */}
                                <div className="relative group cursor-zoom-in shrink-0" onClick={() => window.open(aluno.comprovante_url, '_blank')}>
                                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-black">
                                        <img 
                                            src={aluno.comprovante_url} 
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                            alt="Doc"
                                        />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-slate-800 p-1 rounded-full border border-slate-600">
                                        <Badge sx={{fontSize:14}} className="text-white"/>
                                    </div>
                                </div>

                                {/* Dados */}
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="text-lg font-black text-white truncate">{aluno.nome}</h3>
                                    <p className="text-[11px] text-slate-400 font-mono truncate mb-2">{aluno.email}</p>
                                    
                                    <div className="flex flex-wrap gap-2">
                                        <span className="bg-slate-800 text-cyan-400 text-[9px] font-bold px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                                            <School sx={{fontSize:10}}/> {aluno.curso || "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Ações */}
                            <div className="grid grid-cols-2 mt-auto border-t border-slate-800">
                                <button 
                                    onClick={() => moderar(aluno.email, 'rejeitar')}
                                    className="p-4 flex items-center justify-center gap-2 text-red-400 hover:bg-red-900/20 font-black text-xs uppercase transition-colors border-r border-slate-800"
                                >
                                    <Cancel fontSize="small" /> REJEITAR
                                </button>
                                <button 
                                    onClick={() => moderar(aluno.email, 'aprovar')}
                                    className="p-4 flex items-center justify-center gap-2 text-emerald-400 hover:bg-emerald-900/20 font-black text-xs uppercase transition-colors"
                                >
                                    <CheckCircle fontSize="small" /> APROVAR
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}