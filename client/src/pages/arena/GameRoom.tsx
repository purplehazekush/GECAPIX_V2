// client/src/pages/arena/GameRoom.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { ArrowBack, ContentCopy } from '@mui/icons-material';
import toast from 'react-hot-toast';

// Componentes
import TicTacToeBoard from '../../components/arena/games/TicTacToeBoard';
import ChessBoardWrapper from '../../components/arena/games/ChessBoardWrapper';
import Connect4Board from '../../components/arena/games/Connect4Board';
import DamasBoard from '../../components/arena/games/DamasBoard';

import { useLocation } from 'react-router-dom'; // <--- Importe

const SOCKET_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : 'http://72.62.87.8:3001';

export default function GameRoom() {
    const location = useLocation(); // <--- Pegar state
    const password = location.state?.password || ''; // <--- A senha vem daqui
    const { roomId } = useParams(); // Pega ID da URL
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    
    // Estados Conexão
    const [socket, setSocket] = useState<Socket | null>(null);
    const [status, setStatus] = useState<'connecting' | 'waiting' | 'playing' | 'finished'>('connecting');
    const [gameType, setGameType] = useState<string | null>(null); // Servidor que manda
    
    // Estados Jogo
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [mySymbol, setMySymbol] = useState<any>(null);
    const [boardState, setBoardState] = useState<any>(null);
    const [opponentName, setOpponentName] = useState<string>('Esperando...');

    useEffect(() => {
        // TRAVA DE SEGURANÇA: Só roda se tiver usuário e ID
        if (!dbUser || !roomId) return; 

        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        // Tenta entrar na sala específica
        // Se for privada, o usuário deveria ter vindo do Lobby com senha, 
        // mas aqui simplificamos: se falhar, volta pro lobby.
        newSocket.emit('join_specific_room', {
            roomId: roomId,
            userEmail: dbUser.email,
            password: password // <--- Enviando a senha certa
        });

        // --- LISTENERS ---

        newSocket.on('player_joined', (data: any) => {
            if (data.players.length === 1) {
                setStatus('waiting');
            } else {
                const opp = data.players.find((p: any) => p.email !== dbUser.email);
                if (opp) setOpponentName(opp.nome);
            }
        });

        newSocket.on('game_start', (data: any) => {
            console.log("Game Start:", data);
            setGameType(data.gameType); // Define qual tabuleiro mostrar
            setBoardState(data.boardState);
            setStatus('playing');
            
            const souEu = data.turn === newSocket.id;
            setIsMyTurn(souEu);
            setupSymbols(data.gameType, souEu);
            
            toast.success("PARTIDA INICIADA!");
        });

        // Listener especial para reconexão (F5)
        newSocket.on('reconnect_success', (data: any) => {
            console.log("Reconectado com sucesso!");
            setGameType(data.gameType);
            setBoardState(data.boardState);
            setStatus('playing');
            setIsMyTurn(data.isMyTurn);
            if (data.opponent) setOpponentName(data.opponent);
            
            setupSymbols(data.gameType, data.isMyTurn);
            toast("Você voltou para o jogo!", { icon: '🔄' });
        });

        newSocket.on('move_made', (data: any) => {
            setBoardState(data.newState);
            setIsMyTurn(data.nextTurn === newSocket.id);
        });

        newSocket.on('game_over', (data: any) => {
            setStatus('finished');
            if (data.draw) toast("EMPATE!", { icon: '🤝' });
            else if (data.winner === dbUser.nome) toast.success(`VITÓRIA! 🏆`);
            else toast.error("DERROTA!");
            
            setTimeout(() => navigate('/arena/games'), 4000);
        });

        newSocket.on('error', (err: any) => {
            toast.error(err.message);
            navigate('/arena/games');
        });

        return () => { newSocket.disconnect(); };
    }, [roomId, dbUser]);

    const setupSymbols = (type: string, isFirst: boolean) => {
        if (type === 'velha') setMySymbol(isFirst ? 'X' : 'O');
        else if (type === 'xadrez') setMySymbol(isFirst ? 'white' : 'black');
        else if (type === 'connect4') setMySymbol(isFirst ? 'red' : 'yellow');
        else if (type === 'damas') setMySymbol(isFirst ? 'red' : 'black');
    };

    // Função genérica que os tabuleiros vão chamar
    const handleMove = (moveData: any) => {
        // moveData pode ser { index: 0 } pro velha
        // ou { from: 'e2', to: 'e4' } pro xadrez
        socket?.emit('make_move', { roomId, moveData });
        
        // Otimismo: Podemos atualizar localmente E esperar confirmação, 
        // ou esperar o servidor mandar o 'move_made'. 
        // Vamos esperar o servidor para garantir integridade.
        setIsMyTurn(false); 
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId || "");
        toast.success("ID da sala copiado!");
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 p-4 animate-fade-in overflow-hidden">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => navigate('/arena/games')} className="text-slate-400 hover:text-white p-2">
                    <ArrowBack />
                </button>
                <div className="text-center">
                    <h2 className="text-white font-black italic text-xl uppercase tracking-tighter">
                        {gameType || 'CARREGANDO...'}
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                        <span className="text-white font-bold">{dbUser?.nome?.split(' ')[0]}</span>
                        <span className="text-red-500 font-bold">VS</span>
                        <span>{opponentName}</span>
                    </div>
                </div>
                <div className="w-10"></div> 
            </div>

            {/* ÁREA CENTRAL */}
            <div className="flex-1 flex flex-col items-center justify-center relative w-full max-w-md mx-auto">
                
                {status === 'waiting' && (
                    <div className="text-center animate-pulse space-y-4">
                        <div className="w-20 h-20 border-4 border-t-cyan-500 border-cyan-900 rounded-full animate-spin mx-auto"></div>
                        <h3 className="text-white font-bold text-lg">Aguardando Rival...</h3>
                        
                        <div 
                            onClick={copyRoomId}
                            className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors"
                        >
                            <span className="text-cyan-400 font-mono text-xl tracking-widest font-black">{roomId}</span>
                            <ContentCopy className="text-slate-500" fontSize="small" />
                        </div>
                        <p className="text-xs text-slate-500">Toque para copiar o ID e mandar pro amigo.</p>
                    </div>
                )}

                {status === 'playing' && (
                    <>
                        <div className={`mb-6 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${isMyTurn ? 'bg-emerald-500 text-slate-900 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                            {isMyTurn ? "Sua Vez de Jogar" : "Vez do Oponente"}
                        </div>

                        {/* RENDERIZAÇÃO DINÂMICA DO TABULEIRO */}
                        <div className="w-full flex justify-center">
                            {gameType === 'velha' && boardState && (
                                <TicTacToeBoard board={boardState} mySymbol={mySymbol} isMyTurn={isMyTurn} onMove={handleMove} />
                            )}
                            {gameType === 'xadrez' && boardState && (
                                <ChessBoardWrapper fen={boardState} myColor={mySymbol} isMyTurn={isMyTurn} onMove={handleMove} />
                            )}
                            {gameType === 'connect4' && boardState && (
                                <Connect4Board board={boardState} mySymbol={mySymbol} isMyTurn={isMyTurn} onMove={handleMove} />
                            )}
                            {gameType === 'damas' && boardState && (
                                <DamasBoard board={boardState} mySymbol={mySymbol} isMyTurn={isMyTurn} onMove={handleMove} />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}