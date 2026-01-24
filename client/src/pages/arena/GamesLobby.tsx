// client/src/pages/arena/GamesLobby.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { 
    AddCircle, Lock, 
    MonetizationOn, Search, VideogameAsset
} from '@mui/icons-material';
import { Modal, Box } from '@mui/material';
import toast from 'react-hot-toast';

const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://72.62.87.8:3001';

const GAMES = [
    { id: 'velha', nome: 'Jogo da Velha' },
    { id: 'xadrez', nome: 'Xadrez' },
    { id: 'connect4', nome: 'Lig 4' },
    { id: 'damas', nome: 'Damas' },
];

export default function GamesLobby() {
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    const [socket, setSocket] = useState<any>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    
    // Modal de Criação
    const [createModal, setCreateModal] = useState(false);
    const [newGameConfig, setNewGameConfig] = useState({
        gameType: 'velha',
        betAmount: 10,
        timeLimit: 60,
        isPrivate: false,
        password: ''
    });

    useEffect(() => {
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        // Pede lista inicial
        newSocket.emit('get_rooms');

        // Listeners
        newSocket.on('rooms_list', (data) => setRooms(data));
        newSocket.on('rooms_update', () => newSocket.emit('get_rooms'));
        
        newSocket.on('room_created', (data) => {
            toast.success("Sala criada! Aguardando oponente...");
            navigate(`/arena/games/play/${data.roomId}`); // Redireciona para a sala criada (que usa ID agora)
        });

        newSocket.on('error', (err) => toast.error(err.message));

        return () => { newSocket.disconnect(); };
    }, []);

    const handleCreate = () => {
        if (!dbUser) return;
        socket.emit('create_room', {
            ...newGameConfig,
            userEmail: dbUser.email
        });
    };

    const handleJoin = (roomId: string, isPrivate: boolean) => {
        let password = '';
        if (isPrivate) {
            password = prompt("Digite a senha da sala:") || '';
            if (!password) return;
        }
        
        // Aqui enviamos um evento específico de JOIN e esperamos o redirecionamento ou erro
        socket.emit('join_specific_room', {
            roomId,
            userEmail: dbUser?.email,
            password
        });

        // Ouvimos a confirmação de entrada na própria sala (player_joined)
        // Mas como o GameRoom se conecta do zero, podemos apenas navegar para a URL da sala
        // O GameRoom vai tentar reconectar e o Back vai aceitar pois ele já está na lista?
        // NÃO! O GameRoom atual cria nova conexão.
        // ESTRATÉGIA: Navegar para a URL com o ID. O GameRoom vai precisar ser adaptado para aceitar ROOM ID na URL.
        navigate(`/arena/games/play/${roomId}`); 
    };

    return (
        <div className="p-4 pb-24 animate-fade-in space-y-6">
            
            {/* Header */}
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Lobby</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase">Encontre um desafio</p>
                </div>
                <button 
                    onClick={() => setCreateModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                    <AddCircle fontSize="small" /> CRIAR SALA
                </button>
            </header>

            {/* Lista de Salas */}
            <div className="space-y-3">
                {rooms.length === 0 ? (
                    <div className="text-center py-20 opacity-50 border-2 border-dashed border-slate-800 rounded-3xl">
                        <Search sx={{ fontSize: 40 }} className="mb-2" />
                        <p>Nenhuma sala pública encontrada.</p>
                        <p className="text-xs">Crie a sua agora!</p>
                    </div>
                ) : (
                    rooms.map((room) => (
                        <div key={room.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center hover:border-slate-700 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-800 p-3 rounded-xl text-purple-400">
                                    <VideogameAsset />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white uppercase">{GAMES.find(g=>g.id===room.gameType)?.nome}</h3>
                                        {room.isPrivate && <Lock sx={{ fontSize: 12 }} className="text-yellow-500"/>}
                                    </div>
                                    <p className="text-xs text-slate-500">Host: {room.creator}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-emerald-400 font-mono font-bold text-sm flex items-center justify-end gap-1">
                                    <MonetizationOn sx={{ fontSize: 14 }} /> {room.bet}
                                </div>
                                <button 
                                    onClick={() => handleJoin(room.id, false)} // Salas listadas aqui são públicas
                                    className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-lg mt-1 hover:bg-purple-600 transition-colors"
                                >
                                    ENTRAR
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL CRIAR SALA */}
            <Modal open={createModal} onClose={() => setCreateModal(false)}>
                <Box className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl outline-none">
                    <h2 className="text-xl font-black text-white italic mb-4 uppercase">Configurar Partida</h2>
                    
                    <div className="space-y-4">
                        {/* Jogo */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Jogo</label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                {GAMES.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => setNewGameConfig({...newGameConfig, gameType: g.id})}
                                        className={`p-2 rounded-lg text-xs font-bold border ${
                                            newGameConfig.gameType === g.id 
                                            ? 'bg-purple-600 border-purple-500 text-white' 
                                            : 'bg-slate-950 border-slate-800 text-slate-400'
                                        }`}
                                    >
                                        {g.nome}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Aposta */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Aposta (Coins)</label>
                            <input 
                                type="number" 
                                value={newGameConfig.betAmount}
                                onChange={e => setNewGameConfig({...newGameConfig, betAmount: parseInt(e.target.value)})}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-purple-500"
                            />
                        </div>

                        {/* Tempo */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Tempo por Jogador (Segundos)</label>
                            <select 
                                value={newGameConfig.timeLimit}
                                onChange={e => setNewGameConfig({...newGameConfig, timeLimit: parseInt(e.target.value)})}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none"
                            >
                                <option value={30}>30s (Blitz)</option>
                                <option value={60}>1 min (Rápido)</option>
                                <option value={180}>3 min (Padrão)</option>
                                <option value={300}>5 min (Longo)</option>
                            </select>
                        </div>

                        {/* Privacidade */}
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                checked={newGameConfig.isPrivate}
                                onChange={e => setNewGameConfig({...newGameConfig, isPrivate: e.target.checked})}
                                className="w-4 h-4 rounded bg-slate-800 border-slate-700"
                            />
                            <label className="text-xs text-white">Sala Privada (Requer Senha)</label>
                        </div>

                        {newGameConfig.isPrivate && (
                            <input 
                                type="text" 
                                placeholder="Defina uma senha..."
                                value={newGameConfig.password}
                                onChange={e => setNewGameConfig({...newGameConfig, password: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-yellow-500"
                            />
                        )}

                        <button 
                            onClick={handleCreate}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 py-3 rounded-xl text-slate-900 font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all mt-4"
                        >
                            CRIAR PARTIDA
                        </button>
                    </div>
                </Box>
            </Modal>
        </div>
    );
}