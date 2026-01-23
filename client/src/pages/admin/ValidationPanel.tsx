// client/src/pages/admin/ValidationPanel.tsx
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, Cancel, VerifiedUser, School } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

export default function ValidationPanel() {
    const { dbUser } = useAuth();
    const [fila, setFila] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const carregarFila = async () => {
        try {
            const res = await api.get('admin/validacao');
            setFila(res.data);
        } catch (error) {
            alert("Erro ao carregar fila.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        carregarFila();
    }, []);

    const moderar = async (email: string, acao: 'aprovar' | 'rejeitar') => {
        if (!confirm(`Tem certeza que deseja ${acao.toUpperCase()} este usuário?`)) return;
        
        try {
            await api.post('admin/validacao', { email, acao });
            // Remove da lista localmente para não precisar recarregar tudo
            setFila(prev => prev.filter(u => u.email !== email));
        } catch (e) {
            alert("Erro na ação.");
        }
    };

    // Proteção básica no front (o ideal é ter no back também)
    if (dbUser?.role !== 'admin') {
        return <div className="p-10 text-white text-center">ACESSO NEGADO 🔒</div>;
    }

    return (
        <div className="p-4 pb-24 animate-fade-in space-y-6">
            <header className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="bg-yellow-500/20 p-3 rounded-xl">
                    <VerifiedUser className="text-yellow-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white uppercase italic">Central de Validação</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                        {fila.length} Alunos aguardando aprovação
                    </p>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center p-10"><CircularProgress color="secondary" /></div>
            ) : fila.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <VerifiedUser className="text-6xl text-slate-700 mb-4" />
                    <h3 className="text-white font-bold">Tudo Limpo!</h3>
                    <p className="text-sm text-slate-500">Nenhum comprovante pendente.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {fila.map(aluno => (
                        <div key={aluno._id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col">
                            {/* A FOTO DO COMPROVANTE (Clique para ampliar) */}
                            <div className="relative group cursor-pointer" onClick={() => window.open(aluno.comprovante_url, '_blank')}>
                                <img 
                                    src={aluno.comprovante_url} 
                                    className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                    alt="Comprovante"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
                                    <span className="text-white text-xs font-bold border border-white px-3 py-1 rounded-full">VER ORIGINAL</span>
                                </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col gap-2">
                                <h3 className="text-lg font-black text-white">{aluno.nome}</h3>
                                <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono">
                                    <School fontSize="inherit" /> {aluno.curso || "Curso N/A"}
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono">{aluno.email}</p>
                            </div>

                            {/* AÇÕES */}
                            <div className="grid grid-cols-2 border-t border-slate-800">
                                <button 
                                    onClick={() => moderar(aluno.email, 'rejeitar')}
                                    className="p-4 flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 font-black text-xs uppercase transition-colors border-r border-slate-800"
                                >
                                    <Cancel fontSize="small" /> Rejeitar
                                </button>
                                <button 
                                    onClick={() => moderar(aluno.email, 'aprovar')}
                                    className="p-4 flex items-center justify-center gap-2 text-emerald-500 hover:bg-emerald-500/10 font-black text-xs uppercase transition-colors"
                                >
                                    <CheckCircle fontSize="small" /> Aprovar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}