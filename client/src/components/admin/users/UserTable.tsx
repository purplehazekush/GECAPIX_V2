import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import { Shield, UserCheck, Ban, MoreHorizontal } from 'lucide-react';

interface UserData {
    _id: string;
    nome: string;
    email: string;
    role: string;
    status: string;
    saldo_coins: number;
    xp: number;
    data_criacao: string;
}

export function UserTable() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch (e) { toast.error("Erro ao carregar usuários"); } 
        finally { setLoading(false); }
    };

    const handlePromote = async (userId: string, newRole: string) => {
        if(!confirm(`Promover usuário para ${newRole}?`)) return;
        try {
            await api.put('/admin/users', { userId, role: newRole });
            toast.success("Usuário atualizado!");
            loadUsers();
        } catch (e) { toast.error("Erro ao atualizar."); }
    };

    const handleStatus = async (userId: string, newStatus: string) => {
        try {
            await api.put('/admin/users', { userId, status: newStatus });
            toast.success(`Status alterado para ${newStatus}`);
            loadUsers();
        } catch (e) { toast.error("Erro ao atualizar."); }
    };

    if (loading) return <div className="text-slate-500 p-4">Carregando base de dados...</div>;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                            <th className="p-4">Usuário</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Saldo</th>
                            <th className="p-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {users.map(u => (
                            <tr key={u._id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="p-4">
                                    <p className="font-bold text-white">{u.nome}</p>
                                    <p className="text-xs text-slate-500">{u.email}</p>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                        u.role === 'admin' ? 'bg-purple-900 text-purple-200' :
                                        u.role === 'gm' ? 'bg-cyan-900 text-cyan-200' :
                                        'bg-slate-800 text-slate-400'
                                    }`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {u.status === 'ativo' 
                                        ? <span className="text-emerald-400 flex items-center gap-1"><UserCheck size={14}/> Verificado</span>
                                        : <span className="text-yellow-500 flex items-center gap-1"><Shield size={14}/> Pendente</span>
                                    }
                                </td>
                                <td className="p-4 text-right font-mono text-white">
                                    {u.saldo_coins.toLocaleString()} GC
                                </td>
                                <td className="p-4 flex justify-center gap-2">
                                    <button onClick={() => handleStatus(u._id, u.status === 'ativo' ? 'pendente' : 'ativo')} className="p-2 bg-slate-800 rounded hover:bg-slate-700 text-slate-400" title="Alternar Status">
                                        <Shield size={16} />
                                    </button>
                                    <button onClick={() => handlePromote(u._id, 'gm')} className="p-2 bg-slate-800 rounded hover:bg-cyan-900 text-cyan-400" title="Promover a GM">
                                        <MoreHorizontal size={16} />
                                    </button>
                                    <button onClick={() => handleStatus(u._id, 'banido')} className="p-2 bg-slate-800 rounded hover:bg-red-900 text-red-400" title="Banir">
                                        <Ban size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}