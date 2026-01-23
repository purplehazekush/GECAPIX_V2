import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { Close, Circle, ArrowBack, Bolt } from '@mui/icons-material';
import toast from 'react-hot-toast';

// URL DO SOCKET (Ajuste para seu IP se estiver testando local/vps)
// Em produção, se o front e back estiverem no mesmo domínio, pode ser apenas '/'
const SOCKET_URL = 'http://72.62.87.8:3001'; 

export default function GameRoom() {
    const { gameId } = useParams();
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    
    // Estados do Jogo
    const [socket, setSocket] = useState<Socket | null>(null);
    const [status, setStatus] = useState<'connecting' | 'waiting' | 'playing' | 'finished'>('connecting');
    const [board, setBoard] = useState(Array(9).fill(null));
    const [mySymbol, setMySymbol] = useState<'X' | 'O' | null>(null);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [opponent, setOpponent] = useState<string | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);

    // Refs para evitar problemas de closure no Socket
    const boardRef = useRef(board);
    boardRef.current = board;

    useEffect(() => {
        // 1. CONEXÃO
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        // 2. ENTRAR NA SALA
        newSocket.emit('join_game', {
            gameType: gameId, // 'velha'
            userEmail: dbUser?.email,
            betAmount: 10 // APOSTA FIXA DE TESTE
        });

        // 3. LISTENERS (Ouvidos do Socket)
        
        newSocket.on('player_joined', (data: any) => {
            console.log('Jogador entrou:', data);
            setRoomId(data.roomId);
            if (data.players.length === 1) {
                setStatus('waiting');
            } else {
                // Identifica oponente
                const opp = data.players.find((p: any) => p.email !== dbUser?.email);
                if (opp) setOpponent(opp.nome);
            }
        });

        newSocket.on('game_start', (data: any) => {
            console.log('JOGO COMEÇOU!', data);
            setStatus('playing');
            setBoard(data.boardState); // Array(9).fill(null)
            
            // Define quem sou eu baseado no socket ID
            // Se eu sou o 'turn' inicial, sou o X.
            const souEuOPrimeiro = data.turn === newSocket.id;
            setMySymbol(souEuOPrimeiro ? 'X' : 'O');
            setIsMyTurn(souEuOPrimeiro);
            
            toast.success("Partida iniciada! Valendo 20 Coins.");
        });

        newSocket.on('move_made', (data: any) => {
            // Atualiza tabuleiro com jogada do oponente ou minha (confirmada)
            setBoard(data.newState);
            setIsMyTurn(data.nextTurn === newSocket.id);
        });

        newSocket.on('game_over', (data: any) => {
            setStatus('finished');
            if (data.winner === dbUser?.nome) {
                toast.success(`VITÓRIA! Você ganhou ${data.prize} Coins! 🏆`, { duration: 5000 });
            } else {
                toast.error("DERROTA! Mais sorte na próxima.", { duration: 5000 });
            }
            setTimeout(() => navigate('/arena/games'), 4000);
        });

        newSocket.on('error', (data: any) => {
            toast.error(data.message);
            navigate('/arena/games');
        });

        // Cleanup ao sair da tela
        return () => {
            newSocket.disconnect();
        };
    }, []);

    // LÓGICA DO JOGO DA VELHA
    const handleCellClick = (index: number) => {
        if (status !== 'playing') return;
        if (!isMyTurn) return toast("Espere sua vez!");
        if (board[index]) return; // Célula ocupada

        // 1. Atualiza visualmente (Optimistic UI)
        const newBoard = [...board];
        newBoard[index] = mySymbol;
        setBoard(newBoard);
        setIsMyTurn(false); // Bloqueia cliques até o server confirmar

        // 2. Verifica Vitória Localmente
        const winner = checkWinner(newBoard);
        
        // 3. Envia para o Server
        if (socket && roomId) {
            socket.emit('make_move', {
                roomId,
                move: index,
                newState: newBoard
            });

            // Se ganhou, avisa o server para pagar
            if (winner) {
                // Aqui simplificamos: quem fez o movimento vencedor avisa
                // O ideal é o server validar, mas para MVP confiamos no cliente
                socket.emit('game_win_claim', { roomId }); // *Precisamos adicionar esse listener no back ou usar lógica de turno lá
                // ATENÇÃO: No código anterior do back eu fiz o check genérico. 
                // Vamos deixar o back processar ou mandar um flag 'game_over' se detectarmos aqui.
            }
        }
    };

    // Algoritmo de Vitória
    const checkWinner = (squares: any[]) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
            [0, 4, 8], [2, 4, 6]             // Diagonais
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a];
            }
        }
        return null;
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 p-4 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <button onClick={() => navigate('/arena/games')} className="text-slate-400 hover:text-white">
                    <ArrowBack />
                </button>
                <div className="text-center">
                    <h2 className="text-white font-black italic text-xl uppercase">TIC-TAC-TOE</h2>
                    <p className="text-[10px] text-emerald-400 font-bold tracking-widest flex items-center justify-center gap-1">
                        <Bolt sx={{ fontSize: 12 }}/> VALENDO 10 COINS
                    </p>
                </div>
                <div className="w-8"></div> {/* Espaçador */}
            </div>

            {/* Status do Jogo */}
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
                
                {status === 'waiting' && (
                    <div className="text-center animate-pulse">
                        <div className="w-16 h-16 border-4 border-t-cyan-500 border-cyan-900 rounded-full animate-spin mx-auto mb-4"></div>
                        <h3 className="text-white font-bold">Procurando Oponente...</h3>
                    </div>
                )}

                {status === 'playing' && (
                    <>
                        <div className="flex justify-between w-full max-w-xs px-4">
                            <div className={`flex flex-col items-center ${isMyTurn ? 'opacity-100 scale-110' : 'opacity-50'} transition-all`}>
                                <span className={`text-2xl font-black ${mySymbol === 'X' ? 'text-cyan-400' : 'text-purple-400'}`}>
                                    EU ({mySymbol})
                                </span>
                            </div>
                            <div className="text-slate-600 font-black text-2xl">VS</div>
                            <div className={`flex flex-col items-center ${!isMyTurn ? 'opacity-100 scale-110' : 'opacity-50'} transition-all`}>
                                <span className="text-white font-bold truncate max-w-[100px]">{opponent || 'Rival'}</span>
                            </div>
                        </div>

                        {/* O TABULEIRO */}
                        <div className="grid grid-cols-3 gap-3 bg-slate-800 p-3 rounded-2xl shadow-2xl">
                            {board.map((cell, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleCellClick(idx)}
                                    disabled={!!cell || !isMyTurn}
                                    className={`
                                        w-20 h-20 rounded-xl flex items-center justify-center text-4xl font-black transition-all
                                        ${!cell && isMyTurn ? 'hover:bg-slate-700 cursor-pointer' : ''}
                                        ${cell === 'X' ? 'bg-cyan-900/30 text-cyan-400' : ''}
                                        ${cell === 'O' ? 'bg-purple-900/30 text-purple-400' : ''}
                                        ${!cell ? 'bg-slate-900' : ''}
                                    `}
                                >
                                    {cell === 'X' && <Close fontSize="inherit" />}
                                    {cell === 'O' && <Circle fontSize="inherit" />}
                                </button>
                            ))}
                        </div>

                        <div className="h-8">
                            {isMyTurn && <p className="text-emerald-400 font-bold animate-bounce">SUA VEZ!</p>}
                            {!isMyTurn && <p className="text-slate-500 font-mono">Aguardando oponente...</p>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}