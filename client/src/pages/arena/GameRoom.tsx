import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { Close, Circle, ArrowBack, Bolt } from '@mui/icons-material';
import toast from 'react-hot-toast';

// LIBS
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

// Ajuste o IP conforme necessário (VPS ou Local)
const SOCKET_URL = 'http://72.62.87.8:3001'; 

export default function GameRoom() {
    const { gameId } = useParams(); 
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    
    // SOCKET & STATUS
    const [socket, setSocket] = useState<Socket | null>(null);
    const [status, setStatus] = useState<'connecting' | 'waiting' | 'playing' | 'finished'>('connecting');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [opponent, setOpponent] = useState<string | null>(null);
    
    // GERAIS
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [mySymbol, setMySymbol] = useState<any>(null); // Pode ser 'X', 'white', 'red' (connect4)

    // ESTADOS DOS JOGOS
    const [boardVelha, setBoardVelha] = useState(Array(9).fill(null));
    const [boardConnect4, setBoardConnect4] = useState(Array(42).fill(null)); // 6 linhas x 7 colunas
    const [gameChess, setGameChess] = useState(new Chess());

    useEffect(() => {
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

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

            // SETUP INICIAL POR JOGO
            if (gameId === 'velha') {
                setBoardVelha(Array(9).fill(null));
                setMySymbol(souEuOPrimeiro ? 'X' : 'O');
            } else if (gameId === 'xadrez') {
                setGameChess(new Chess());
                setMySymbol(souEuOPrimeiro ? 'white' : 'black');
            } else if (gameId === 'connect4') {
                setBoardConnect4(Array(42).fill(null));
                // Player 1 é Vermelho, Player 2 é Amarelo
                setMySymbol(souEuOPrimeiro ? 'red' : 'yellow');
            }
            toast.success("VALENDO! 🎮");
        });

        newSocket.on('move_made', (data: any) => {
            const isMeNext = data.nextTurn === newSocket.id;
            setIsMyTurn(isMeNext);

            if (gameId === 'velha') setBoardVelha(data.newState);
            else if (gameId === 'xadrez') setGameChess(new Chess(data.newState));
            else if (gameId === 'connect4') setBoardConnect4(data.newState);
        });

        newSocket.on('game_over', (data: any) => {
            setStatus('finished');
            if (data.draw) toast("EMPATE! Ninguém perdeu.", { icon: '🤝' });
            else if (data.winner === dbUser?.nome) toast.success(`VITÓRIA! +${data.prize} Coins! 🏆`);
            else toast.error("DERROTA! Mais sorte na próxima.");
            
            setTimeout(() => navigate('/arena/games'), 4000);
        });

        return () => { newSocket.disconnect(); };
    }, []);

    // --- LÓGICA: VELHA ---
    const handleVelhaClick = (index: number) => {
        if (status !== 'playing' || !isMyTurn || boardVelha[index]) return;
        const newBoard = [...boardVelha];
        newBoard[index] = mySymbol;
        setBoardVelha(newBoard);
        setIsMyTurn(false);

        const winner = checkWinnerVelha(newBoard);
        const isDraw = !winner && newBoard.every(c => c !== null);
        finalizeMove(newBoard, winner ? mySymbol : null, isDraw);
    };

    // --- LÓGICA: XADREZ ---
    const onDropChess = (sourceSquare: string, targetSquare: string) => {
        if (status !== 'playing' || !isMyTurn) return false;
        try {
            const tempGame = new Chess(gameChess.fen());
            const move = tempGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
            if (!move) return false;
            
            setGameChess(tempGame);
            setIsMyTurn(false);

            if (tempGame.isGameOver()) {
                finalizeMove(tempGame.fen(), tempGame.isCheckmate() ? mySymbol : null, tempGame.isDraw());
            } else {
                finalizeMove(tempGame.fen(), null, false);
            }
            return true;
        } catch (e) { return false; }
    };

    // --- LÓGICA: CONNECT 4 (LIG 4) ---
    const handleConnect4Click = (colIndex: number) => {
        if (status !== 'playing' || !isMyTurn) return;

        // 1. APLICAR GRAVIDADE (Achar a linha vazia mais baixa na coluna)
        // O tabuleiro é 6 linhas x 7 colunas (Indices 0 a 41)
        // Coluna 0 tem indices: 0, 7, 14, 21, 28, 35
        let rowToFill = -1;
        for (let r = 5; r >= 0; r--) {
            const idx = r * 7 + colIndex;
            if (!boardConnect4[idx]) {
                rowToFill = r;
                break;
            }
        }

        if (rowToFill === -1) return; // Coluna cheia

        const finalIndex = rowToFill * 7 + colIndex;
        const newBoard = [...boardConnect4];
        newBoard[finalIndex] = mySymbol; // 'red' ou 'yellow'
        
        setBoardConnect4(newBoard);
        setIsMyTurn(false);

        // 2. CHECAR VITÓRIA
        const winner = checkWinnerConnect4(newBoard);
        const isDraw = !winner && newBoard.every(c => c !== null);
        finalizeMove(newBoard, winner, isDraw);
    };

    // --- FUNÇÃO DE ENVIO UNIFICADA ---
    const finalizeMove = (newState: any, winnerSymbol: any, isDraw: boolean) => {
        if (winnerSymbol || isDraw) {
            socket?.emit('game_win_claim', { roomId, winnerSymbol, draw: isDraw });
        } else {
            socket?.emit('make_move', { roomId, move: 'generic', newState });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 p-4 animate-fade-in overflow-hidden">
            {/* HUD */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => navigate('/arena/games')} className="text-slate-400 hover:text-white p-2">
                    <ArrowBack />
                </button>
                <div className="text-center">
                    <h2 className="text-white font-black italic text-xl uppercase">{gameId === 'connect4' ? 'LIG 4' : gameId}</h2>
                    <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                        <span>{dbUser?.nome?.split(' ')[0]}</span>
                        <span className="text-red-500 font-bold">VS</span>
                        <span>{opponent || '...'}</span>
                    </div>
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
                            {isMyTurn ? "SUA VEZ" : "AGUARDE"}
                        </div>

                        {/* --- TABULEIRO VELHA --- */}
                        {gameId === 'velha' && (
                            <div className="grid grid-cols-3 gap-3 bg-slate-800 p-3 rounded-2xl shadow-2xl">
                                {boardVelha.map((cell, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleVelhaClick(idx)}
                                        disabled={!!cell || !isMyTurn}
                                        className={`w-20 h-20 rounded-xl flex items-center justify-center text-5xl font-black transition-all ${cell === 'X' ? 'bg-cyan-900/30 text-cyan-400' : ''} ${cell === 'O' ? 'bg-purple-900/30 text-purple-400' : ''} ${!cell ? 'bg-slate-900' : ''}`}
                                    >
                                        {cell === 'X' && <Close fontSize="inherit" />}
                                        {cell === 'O' && <Circle fontSize="inherit" />}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* --- TABULEIRO XADREZ --- */}
                        {gameId === 'xadrez' && (
                            <div className="w-full max-w-[350px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700">
                                {/* @ts-ignore */}
                                <Chessboard 
                                    position={gameChess.fen()} 
                                    onPieceDrop={onDropChess}
                                    boardOrientation={mySymbol === 'black' ? 'black' : 'white'}
                                    customDarkSquareStyle={{ backgroundColor: '#334155' }}
                                    customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
                                />
                            </div>
                        )}

                        {/* --- TABULEIRO CONNECT 4 (LIG 4) --- */}
                        {gameId === 'connect4' && (
                            <div className="bg-blue-700 p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-b-8 border-blue-900">
                                {/* O Grid é 7 Colunas */}
                                <div className="grid grid-cols-7 gap-2">
                                    {[0,1,2,3,4,5,6].map(col => (
                                        <div key={col} className="flex flex-col gap-2 group cursor-pointer" onClick={() => handleConnect4Click(col)}>
                                            {/* Renderiza as 6 linhas dessa coluna */}
                                            {[0,1,2,3,4,5].map(row => {
                                                const cellValue = boardConnect4[row * 7 + col];
                                                return (
                                                    <div key={row} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900 shadow-inner flex items-center justify-center relative overflow-hidden">
                                                        {cellValue && (
                                                            <div className={`w-full h-full rounded-full animate-bounce-short shadow-inner ${
                                                                cellValue === 'red' 
                                                                    ? 'bg-red-500 border-4 border-red-600' 
                                                                    : 'bg-yellow-400 border-4 border-yellow-500'
                                                            }`}></div>
                                                        )}
                                                        {/* Hover Effect na Coluna Vazia */}
                                                        {!cellValue && isMyTurn && (
                                                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none"></div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex justify-between px-4">
                                    <div className="h-4 w-4 rounded-full bg-red-500 border border-red-600 shadow"></div>
                                    <div className="h-4 w-4 rounded-full bg-yellow-400 border border-yellow-500 shadow"></div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// === ALGORITMOS DE VITÓRIA ===

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

function checkWinnerConnect4(board: any[]) {
    // Tabuleiro 7 cols x 6 rows (Flat array 0..41)
    // Helper para pegar valor x,y
    const getCell = (r: number, c: number) => {
        if (r < 0 || r >= 6 || c < 0 || c >= 7) return null;
        return board[r * 7 + c];
    };

    // Checa todas as posições
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            const player = getCell(r, c);
            if (!player) continue;

            // Checa 4 direções a partir de cada célula
            // Direita, Baixo, Diagonal Dir-Baixo, Diagonal Esq-Baixo
            const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

            for (let [dr, dc] of directions) {
                let match = true;
                for (let k = 1; k < 4; k++) {
                    if (getCell(r + dr * k, c + dc * k) !== player) {
                        match = false;
                        break;
                    }
                }
                if (match) return player;
            }
        }
    }
    return null;
}