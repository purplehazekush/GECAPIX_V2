import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { ArrowBack, Bolt } from '@mui/icons-material';
import toast from 'react-hot-toast';

// Componentes Limpos
import TicTacToeBoard from '../../components/arena/games/TicTacToeBoard';
import ChessBoardWrapper from '../../components/arena/games/ChessBoardWrapper';
import Connect4Board from '../../components/arena/games/Connect4Board';

const SOCKET_URL = 'http://72.62.87.8:3001';

export default function GameRoom() {
    const { gameId } = useParams();
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    
    // Conexão
    const [socket, setSocket] = useState<Socket | null>(null);
    const [status, setStatus] = useState<'connecting' | 'waiting' | 'playing' | 'finished'>('connecting');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [opponent, setOpponent] = useState<string | null>(null);
    
    // Estado do Turno
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [mySymbol, setMySymbol] = useState<any>(null);

    // Estado Geral do Tabuleiro (Pode ser array ou string FEN)
    const [boardState, setBoardState] = useState<any>(null);

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
            setBoardState(data.boardState);

            // Definição de Símbolos por Jogo
            if (gameId === 'velha') setMySymbol(souEuOPrimeiro ? 'X' : 'O');
            else if (gameId === 'xadrez') setMySymbol(souEuOPrimeiro ? 'white' : 'black');
            else if (gameId === 'connect4') setMySymbol(souEuOPrimeiro ? 'red' : 'yellow');
            
            toast.success("VALENDO! 🎮");
        });

        newSocket.on('move_made', (data: any) => {
            setBoardState(data.newState);
            setIsMyTurn(data.nextTurn === newSocket.id);
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

    // Função Genérica de Envio de Movimento
    const handleMove = (newState: any, winnerSymbol: any, isDraw: boolean) => {
        // Atualiza visualmente para ser snappy (Otimista)
        setBoardState(newState);
        setIsMyTurn(false);

        if (winnerSymbol || isDraw) {
            socket?.emit('game_win_claim', { roomId, winnerSymbol, draw: isDraw });
        } else {
            socket?.emit('make_move', { roomId, move: 'generic', newState });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 p-4 animate-fade-in overflow-hidden">
            {/* Header */}
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
                    <p className="text-[10px] text-emerald-400 font-bold tracking-widest flex items-center justify-center gap-1 mt-1">
                        <Bolt sx={{ fontSize: 12 }}/> VALENDO 10 COINS
                    </p>
                </div>
                <div className="w-10"></div> 
            </div>

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

                        {/* RENDERIZAÇÃO ORGANIZADA */}
                        {gameId === 'velha' && boardState && (
                            <TicTacToeBoard 
                                board={boardState} 
                                mySymbol={mySymbol} 
                                isMyTurn={isMyTurn} 
                                onMove={handleMove} 
                            />
                        )}

                        {gameId === 'xadrez' && boardState && (
                            <ChessBoardWrapper 
                                fen={boardState} 
                                myColor={mySymbol} 
                                isMyTurn={isMyTurn} 
                                onMove={handleMove} 
                            />
                        )}

                        {gameId === 'connect4' && boardState && (
                            <Connect4Board 
                                board={boardState} 
                                mySymbol={mySymbol} 
                                isMyTurn={isMyTurn} 
                                onMove={handleMove} 
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}