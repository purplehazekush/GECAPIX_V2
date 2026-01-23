import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { Close, Circle, ArrowBack, Bolt } from '@mui/icons-material';
import toast from 'react-hot-toast';

// --- LIBS DE XADREZ ---
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const SOCKET_URL = 'http://72.62.87.8:3001'; // Ajuste para localhost se estiver testando local

export default function GameRoom() {
    const { gameId } = useParams(); // 'velha' ou 'xadrez'
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    
    // SOCKET & STATUS
    const [socket, setSocket] = useState<Socket | null>(null);
    const [status, setStatus] = useState<'connecting' | 'waiting' | 'playing' | 'finished'>('connecting');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [opponent, setOpponent] = useState<string | null>(null);
    
    // ESTADOS GERAIS
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [mySymbol, setMySymbol] = useState<'X' | 'O' | 'white' | 'black' | null>(null);

    // ESTADO: VELHA
    const [boardVelha, setBoardVelha] = useState(Array(9).fill(null));

    // ESTADO: XADREZ
    const [gameChess, setGameChess] = useState(new Chess());

    useEffect(() => {
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        // Entrar na Sala
        newSocket.emit('join_game', {
            gameType: gameId,
            userEmail: dbUser?.email,
            betAmount: 10
        });

        newSocket.on('player_joined', (data: any) => {
            setRoomId(data.roomId);
            if (data.players.length === 1) setStatus('waiting');
            else {
                const opp = data.players.find((p: any) => p.email !== dbUser?.email);
                if (opp) setOpponent(opp.nome);
            }
        });

        newSocket.on('game_start', (data: any) => {
            setStatus('playing');
            const souEuOPrimeiro = data.turn === newSocket.id;
            setIsMyTurn(souEuOPrimeiro);

            if (gameId === 'velha') {
                setBoardVelha(Array(9).fill(null));
                setMySymbol(souEuOPrimeiro ? 'X' : 'O');
            } else if (gameId === 'xadrez') {
                setGameChess(new Chess()); // Reset
                setMySymbol(souEuOPrimeiro ? 'white' : 'black');
            }
            toast.success("VALENDO! 🎮");
        });

        newSocket.on('move_made', (data: any) => {
            const isMeNext = data.nextTurn === newSocket.id;
            setIsMyTurn(isMeNext);

            if (gameId === 'velha') {
                setBoardVelha(data.newState);
            } else if (gameId === 'xadrez') {
                // Atualiza o estado local do xadrez com o movimento do oponente
                const newGame = new Chess(data.newState); // newState no xadrez é o FEN
                setGameChess(newGame);
            }
        });

        newSocket.on('game_over', (data: any) => {
            setStatus('finished');
            if (data.draw) {
                toast("EMPATE! Ninguém perdeu nada.", { icon: '🤝' });
            } else if (data.winner === dbUser?.nome) {
                toast.success(`VITÓRIA! +${data.prize} Coins! 🏆`);
            } else {
                toast.error("DERROTA! Mais sorte na próxima.");
            }
            setTimeout(() => navigate('/arena/games'), 4000);
        });

        return () => { newSocket.disconnect(); };
    }, []);

    // --- LÓGICA DA VELHA ---
    const handleVelhaClick = (index: number) => {
        if (status !== 'playing' || !isMyTurn || boardVelha[index]) return;

        const newBoard = [...boardVelha];
        newBoard[index] = mySymbol;
        setBoardVelha(newBoard);
        setIsMyTurn(false);

        // Check Local
        const winner = checkWinnerVelha(newBoard);
        const isDraw = !winner && newBoard.every(cell => cell !== null);

        if (winner || isDraw) {
            socket?.emit('game_win_claim', { roomId, winnerSymbol: mySymbol, draw: isDraw });
        } else {
            socket?.emit('make_move', { roomId, move: index, newState: newBoard });
        }
    };

    // --- LÓGICA DO XADREZ ---
    const onDropChess = (sourceSquare: string, targetSquare: string) => {
        if (status !== 'playing' || !isMyTurn) return false;

        try {
            const tempGame = new Chess(gameChess.fen());
            
            // Tenta mover (Validação da Lib)
            const move = tempGame.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q', // sempre promove pra rainha por simplicidade
            });

            if (!move) return false; // Movimento inválido

            setGameChess(tempGame);
            setIsMyTurn(false);

            // Check Mate ou Empate?
            if (tempGame.isGameOver()) {
                const isDraw = tempGame.isDraw();
                socket?.emit('game_win_claim', { roomId, winnerSymbol: mySymbol, draw: isDraw });
            } else {
                // Envia o FEN (String de estado do tabuleiro)
                socket?.emit('make_move', { roomId, move: move, newState: tempGame.fen() });
            }
            return true;
        } catch (e) { return false; }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 p-4 animate-fade-in overflow-hidden">
            {/* HUD Header */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => navigate('/arena/games')} className="text-slate-400 hover:text-white p-2">
                    <ArrowBack />
                </button>
                <div className="text-center">
                    <h2 className="text-white font-black italic text-xl uppercase">{gameId}</h2>
                    <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                        <span>{dbUser?.nome?.split(' ')[0]}</span>
                        <span className="text-red-500 font-bold">VS</span>
                        <span>{opponent || '...'}</span>
                    </div>
                    {/* Exibe o valor da aposta com o ícone Bolt */}
                    <p className="text-[10px] text-emerald-400 font-bold tracking-widest flex items-center justify-center gap-1 mt-1">
                        <Bolt sx={{ fontSize: 12 }}/> VALENDO 10 COINS
                    </p>
                </div>
                <div className="w-10"></div> 
            </div>

            {/* ÁREA DE JOGO */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                
                {status === 'waiting' && (
                    <div className="text-center animate-pulse">
                        <div className="w-16 h-16 border-4 border-t-cyan-500 border-cyan-900 rounded-full animate-spin mx-auto mb-4"></div>
                        <h3 className="text-white font-bold">Buscando Oponente...</h3>
                    </div>
                )}

                {status === 'playing' && (
                    <>
                        <div className={`mb-4 px-4 py-2 rounded-full font-bold text-sm transition-all ${isMyTurn ? 'bg-emerald-500 text-slate-900 scale-110 shadow-lg shadow-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                            {isMyTurn ? "SUA VEZ" : "AGUARDE O RIVAL"}
                        </div>

                        {/* RENDERIZAÇÃO CONDICIONAL */}
                        {gameId === 'velha' ? (
                            <div className="grid grid-cols-3 gap-3 bg-slate-800 p-3 rounded-2xl shadow-2xl">
                                {boardVelha.map((cell, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleVelhaClick(idx)}
                                        disabled={!!cell || !isMyTurn}
                                        className={`
                                            w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center text-5xl font-black transition-all
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
                        ) : (
                            <div className="w-full max-w-[350px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700">
                                {/* @ts-ignore - Ignorando erro de tipagem da biblioteca */}
                                <Chessboard 
                                    position={gameChess.fen()} 
                                    onPieceDrop={onDropChess}
                                    boardOrientation={mySymbol === 'black' ? 'black' : 'white'}
                                    customDarkSquareStyle={{ backgroundColor: '#334155' }}
                                    customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Algoritmo Auxiliar da Velha
function checkWinnerVelha(squares: any[]) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
        }
    }
    return null;
}