import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { MessageSquare, LogOut } from 'lucide-react';

// Componentes
import ChessBoardWrapper from '../../components/arena/games/ChessBoardWrapper'; // Aquele nosso Grid
import { GameTimer } from '../../components/arena/GameTimer';

const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://72.62.87.8:3001';

export default function GameRoom() {
    const { id: roomId } = useParams(); // Pega o ID da URL
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    
    // Estados de Conexão
    const socketRef = useRef<Socket | null>(null);
    const [] = useState(false);
    
    // Estados do Jogo
    const [gameType, setGameType] = useState<string>('');
    const [boardState, setBoardState] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [myColor, setMyColor] = useState<'white' | 'black'>('white'); // Apenas para xadrez
    const [status, setStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
    
    // Estados de Tempo e Chat
    const [timers, setTimers] = useState<[number, number]>([600, 600]);
    const [myIndex, setMyIndex] = useState<number>(-1); // 0 ou 1
    const [chatMsg, setChatMsg] = useState('');
    const [chatHistory, setChatHistory] = useState<any[]>([]);

    useEffect(() => {
        // 1. Conexão
        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("Conectado ao servidor de jogos.");
            // Tenta entrar na sala específica usando o ID da URL
            socket.emit('join_specific_room', {
                roomId,
                userEmail: dbUser?.email,
                password: '' // Se tiver senha, teria que pedir antes, mas vamos simplificar
            });
        });

        // 2. Listeners de Jogo
        socket.on('game_start', (data) => {
            setGameType(data.gameType);
            setBoardState(data.boardState);
            setPlayers(data.players);
            setStatus('playing');
            
            // Define quem sou eu
            const idx = data.players.findIndex((p: any) => p.email === dbUser?.email);
            setMyIndex(idx);
            
            // Define cor (Xadrez)
            if (data.gameType === 'xadrez' && idx !== -1) {
                setMyColor(data.players[idx].color);
            }

            // Define turno inicial
            const isMe = data.players[idx]?.socketId === data.turn; // O back manda o socketId de quem começa
            setIsMyTurn(isMe); // Mas vamos confiar no nextTurnEmail abaixo que é mais seguro

            // Sincroniza Timer
            if (data.timers) setTimers(data.timers);
            
            toast.success("A partida começou!", { icon: '⚔️' });
        });

        socket.on('move_made', (data) => {
            setBoardState(data.newState);
            setIsMyTurn(data.nextTurnEmail === dbUser?.email);
            if (data.timers) setTimers(data.timers); // Atualiza relógio do servidor
        });

        socket.on('game_over', (data) => {
            setStatus('finished');
            if (data.draw) {
                toast("Empate!", { icon: '🤝' });
            } else if (data.winner === dbUser?.nome) {
                toast.success(`Vitória! Você ganhou ${data.prize} Coins!`);
            } else {
                toast.error("Derrota. Mais sorte na próxima.");
            }
        });

        socket.on('game_over_timeout', (data) => {
            setStatus('finished');
            if (data.loser === myIndex) {
                toast.error("TEMPO ESGOTADO! Você perdeu.");
            } else {
                toast.success("O tempo do oponente acabou! Você venceu.");
            }
        });

        socket.on('game_chat', (msg) => {
            setChatHistory(prev => [...prev, msg]);
        });

        socket.on('error', (err) => {
            toast.error(err.message);
            if (err.message === 'Sala inexistente.' || err.message === 'Sala cheia.') {
                navigate('/arena/games');
            }
        });

        return () => { socket.disconnect(); };
    }, [roomId, dbUser, navigate]);

    // --- AÇÕES ---

    const handleMove = (moveData: any) => {
        if (!isMyTurn || status !== 'playing') return;
        
        // Otimismo: O tabuleiro local já pode ter atualizado visualmente, 
        // agora mandamos pro servidor validar.
        socketRef.current?.emit('make_move', { roomId, moveData });
        setIsMyTurn(false); // Bloqueia até o servidor confirmar a volta
    };

    const sendChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatMsg.trim()) return;
        socketRef.current?.emit('game_chat', { roomId, nome: dbUser?.nome, text: chatMsg });
        setChatMsg('');
    };

    // --- RENDERIZADORES DE TABULEIRO ---

    const renderBoard = () => {
        if (!gameType || !boardState) return <div className="text-white animate-pulse">Carregando tabuleiro...</div>;

        // ♟️ XADREZ
        if (gameType === 'xadrez') {
            return (
                <ChessBoardWrapper 
                    fen={boardState}
                    myColor={myColor}
                    isMyTurn={isMyTurn}
                    onMove={(move) => handleMove(move)} // Passa objeto completo {from, to, promotion}
                />
            );
        }

        // ⭕ JOGO DA VELHA
        if (gameType === 'velha') {
            return (
                <div className="grid grid-cols-3 gap-2 w-64 h-64 mx-auto">
                    {boardState.map((cell: string | null, idx: number) => (
                        <button
                            key={idx}
                            onClick={() => handleMove({ index: idx })}
                            disabled={cell !== null || !isMyTurn}
                            className={`w-full h-full bg-slate-800 rounded-xl text-4xl font-black flex items-center justify-center transition-all ${
                                cell === null && isMyTurn ? 'hover:bg-slate-700 cursor-pointer' : ''
                            } ${cell === 'X' ? 'text-cyan-400' : 'text-pink-500'}`}
                        >
                            {cell}
                        </button>
                    ))}
                </div>
            );
        }

        // 🔴 LIG 4 (Connect 4)
        if (gameType === 'connect4') {
            // Grid 7 colunas x 6 linhas
            // boardState é array linear de 42 posições
            const grid = [];
            for (let r = 0; r < 6; r++) {
                for (let c = 0; c < 7; c++) {
                    const idx = r * 7 + c;
                    const val = boardState[idx]; // 'red' ou 'yellow' ou null
                    grid.push(
                        <div 
                            key={idx} 
                            onClick={() => handleMove({ colIndex: c })} // Clica na coluna
                            className="w-10 h-10 bg-slate-900 rounded-full border-4 border-slate-800 flex items-center justify-center cursor-pointer hover:border-slate-600"
                        >
                            {val && (
                                <div className={`w-full h-full rounded-full ${val === 'red' ? 'bg-red-500' : 'bg-yellow-400'} shadow-inner`}></div>
                            )}
                        </div>
                    );
                }
            }
            return (
                <div className="bg-blue-900 p-4 rounded-xl shadow-2xl border-4 border-blue-800">
                    <div className="grid grid-cols-7 gap-2">
                        {grid}
                    </div>
                </div>
            );
        }

        return <div className="text-red-500">Jogo desconhecido: {gameType}</div>;
    };

    // --- LAYOUT ---

    // Define qual timer é de quem
    // Se myIndex for 0 (Player 1), meu tempo é timers[0].
    // Se myIndex for 1 (Player 2), meu tempo é timers[1].
    const opponentIndex = myIndex === 0 ? 1 : 0;

    return (
        <div className="min-h-screen bg-slate-950 p-4 flex flex-col items-center">
            
            {/* TOPO: Informações e Sair */}
            <div className="w-full max-w-lg flex justify-between items-center mb-6">
                <button onClick={() => navigate('/arena/games')} className="text-slate-500 hover:text-white flex items-center gap-1">
                    <LogOut size={16} /> Sair
                </button>
                <div className="text-xs font-mono text-slate-600 uppercase">Sala: {roomId}</div>
            </div>

            {/* AREA DO JOGO */}
            {status === 'waiting' ? (
                <div className="flex flex-col items-center justify-center h-64 animate-pulse">
                    <h2 className="text-2xl font-black text-white italic uppercase">Aguardando Oponente...</h2>
                    <p className="text-slate-500 text-sm mt-2">Compartilhe o código da sala ou espere no lobby.</p>
                </div>
            ) : (
                <div className="w-full max-w-md">
                    
                    {/* PLACAR E TIMERS */}
                    <div className="flex justify-between items-center mb-6">
                        {/* OPONENTE */}
                        <div className="flex flex-col items-start">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
                                    {players[opponentIndex]?.nome.charAt(0)}
                                </div>
                                <span className="text-sm text-slate-300 font-bold">{players[opponentIndex]?.nome}</span>
                            </div>
                            <GameTimer initialTime={timers[opponentIndex]} isActive={!isMyTurn && status === 'playing'} />
                        </div>

                        {/* VS */}
                        <div className="text-center">
                            <h1 className="text-3xl font-black text-slate-800 italic">VS</h1>
                        </div>

                        {/* EU */}
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-cyan-400 font-bold">Você</span>
                                <div className="w-8 h-8 rounded bg-cyan-900 flex items-center justify-center text-xs font-bold text-cyan-200">
                                    {dbUser?.nome.charAt(0)}
                                </div>
                            </div>
                            <GameTimer initialTime={timers[myIndex]} isActive={isMyTurn && status === 'playing'} />
                        </div>
                    </div>

                    {/* STATUS BAR */}
                    <div className={`mb-4 text-center py-2 rounded-lg font-black uppercase text-sm tracking-widest transition-colors ${
                        status === 'finished' ? 'bg-slate-800 text-slate-400' :
                        isMyTurn ? 'bg-emerald-500 text-slate-900 animate-pulse' : 'bg-slate-900 text-slate-500'
                    }`}>
                        {status === 'finished' ? 'Fim de Jogo' : (isMyTurn ? 'SUA VEZ' : 'AGUARDE...')}
                    </div>

                    {/* TABULEIRO */}
                    <div className="flex justify-center mb-8">
                        {renderBoard()}
                    </div>

                    {/* CHAT RÁPIDO (Opcional) */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                        <div className="h-24 overflow-y-auto mb-2 text-xs space-y-1 custom-scrollbar">
                            {chatHistory.map((msg, i) => (
                                <div key={i}>
                                    <span className="font-bold text-slate-400">{msg.nome}:</span> <span className="text-slate-300">{msg.text}</span>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={sendChat} className="flex gap-2">
                            <input 
                                value={chatMsg}
                                onChange={e => setChatMsg(e.target.value)}
                                placeholder="Enviar mensagem..." 
                                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
                            />
                            <button type="submit" className="bg-slate-800 hover:bg-slate-700 text-white p-1 rounded">
                                <MessageSquare size={14} />
                            </button>
                        </form>
                    </div>

                </div>
            )}
        </div>
    );
}