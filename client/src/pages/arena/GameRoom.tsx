// client/src/pages/arena/GameRoom.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { ArrowBack, ContentCopy } from '@mui/icons-material';
import toast from 'react-hot-toast';

// Componentes dos Jogos
import TicTacToeBoard from '../../components/arena/games/TicTacToeBoard';
import ChessBoardWrapper from '../../components/arena/games/ChessBoardWrapper';
import Connect4Board from '../../components/arena/games/Connect4Board';
import DamasBoard from '../../components/arena/games/DamasBoard';

const SOCKET_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : 'http://72.62.87.8:3001';

export default function GameRoom() {
    const location = useLocation(); 
    const password = location.state?.password || ''; 
    const { roomId } = useParams();
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    
    // Estados Conexão
    const [socket, setSocket] = useState<Socket | null>(null);
    const [status, setStatus] = useState<'connecting' | 'waiting' | 'playing' | 'finished'>('connecting');
    const [gameType, setGameType] = useState<string | null>(null);
    
    // Estados Jogo
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [mySymbol, setMySymbol] = useState<any>(null); // 'X', 'white', 'red', etc.
    const [boardState, setBoardState] = useState<any>(null);
    const [opponentName, setOpponentName] = useState<string>('Esperando...');

    // Lógica Blindada de Símbolos (Declarada antes do useEffect para uso interno)
    const defineMySymbol = (type: string, players: any[]) => {
        if (!dbUser || !players) return;

        // Busca pelo E-mail (Identificador único e imutável)
        const myIndex = players.findIndex((p: any) => p.email === dbUser.email);
        const me = players[myIndex];
        
        console.log("🧐 DEFININDO IDENTIDADE:", { 
            eu: dbUser.email, 
            encontrado: !!me, 
            index: myIndex, 
            corVindaDoBack: me?.color 
        });

        if (myIndex === -1 || !me) {
            console.error("❌ ERRO CRÍTICO: Jogador não encontrado na lista da sala.");
            return;
        }

        let symbol = null;

        if (type === 'xadrez') {
            // Prioridade: Cor vinda do back -> Posição no array (Fallback)
            symbol = me.color || (myIndex === 0 ? 'white' : 'black');
        } 
        else if (type === 'velha') {
            symbol = myIndex === 0 ? 'X' : 'O';
        }
        else if (type === 'connect4') {
            symbol = myIndex === 0 ? 'red' : 'yellow';
        }
        else if (type === 'damas') {
            symbol = myIndex === 0 ? 'red' : 'black';
        }

        console.log("✅ Símbolo Definido:", symbol);
        setMySymbol(symbol);
    };

    useEffect(() => {
        if (!dbUser || !roomId) return; 

        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        // Tenta entrar na sala
        newSocket.emit('join_specific_room', {
            roomId: roomId,
            userEmail: dbUser.email,
            password: password
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
            console.log("🚦 GAME START - Payload:", data);
            setGameType(data.gameType);
            setBoardState(data.boardState);
            setStatus('playing');
            
            // 1. Define Vez
            const souEuVez = data.nextTurnEmail === dbUser.email;
            setIsMyTurn(souEuVez);

            // 2. Define Identidade
            defineMySymbol(data.gameType, data.players);
            
            toast.success("PARTIDA INICIADA!");
        });

        newSocket.on('reconnect_success', (data: any) => {
            console.log("🔄 RECONECTADO:", data);
            setGameType(data.gameType);
            setBoardState(data.boardState);
            setStatus('playing');
            
            setIsMyTurn(data.isMyTurn);
            
            if (data.opponent) setOpponentName(data.opponent);
            
            // Tenta recuperar a cor. Se o backend não mandou players no reconnect (falha nossa anterior),
            // tentamos inferir, mas o ideal é que players venha aqui também.
            // Para garantir, vamos pedir um refresh da sala se faltar dados.
            if (data.players) {
                defineMySymbol(data.gameType, data.players);
            } else {
                // Fallback de emergência para xadrez se não tiver lista de players
                // Se é minha vez e o turno do xadrez é 'w', eu sou 'white'.
                // Isso é um hack, mas salva a UX no F5.
                if (data.gameType === 'xadrez' && data.boardState) {
                    const fenTurn = data.boardState.split(' ')[1]; // 'w' ou 'b'
                    if (data.isMyTurn) {
                        setMySymbol(fenTurn === 'w' ? 'white' : 'black');
                    } else {
                        setMySymbol(fenTurn === 'w' ? 'black' : 'white');
                    }
                }
            }

            toast("Você voltou para o jogo!", { icon: '🔄' });
        });

        newSocket.on('move_made', (data: any) => {
            console.log("📢 JOGADA RECEBIDA:", data);
            
            setBoardState(data.newState);

            if (dbUser && data.nextTurnEmail === dbUser.email) {
                console.log("🟢 SUA VEZ");
                setIsMyTurn(true);
            } else {
                console.log("🔴 VEZ DO OPONENTE");
                setIsMyTurn(false);
            }
        });

        newSocket.on('game_over', (data: any) => {
            setStatus('finished');
            if (data.draw) toast("EMPATE! Moedas devolvidas.", { icon: '🤝' });
            else if (data.winner === dbUser.nome) toast.success(`VITÓRIA! 🏆 +${data.prize} Coins`);
            else toast.error("DERROTA!");
            
            setTimeout(() => navigate('/arena/games'), 5000);
        });

        newSocket.on('error', (err: any) => {
            toast.error(err.message);
            if (err.message.includes('Sala cheia') || err.message.includes('inexistente')) {
                navigate('/arena/games');
            }
        });

        return () => { newSocket.disconnect(); };
    }, [roomId, dbUser]); // Dependências do Effect

    // Função de Movimento Unificada
    const handleMove = (moveData: any) => {
        if (!isMyTurn) return;
        setIsMyTurn(false); // Otimismo
        socket?.emit('make_move', { roomId, moveData });
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
                        {gameType === 'velha' ? 'JOGO DA VELHA' : (gameType || 'CARREGANDO...')}
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
                
                {status === 'connecting' && (
                    <div className="animate-pulse text-cyan-500 font-bold">CONECTANDO...</div>
                )}

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
                        <p className="text-xs text-slate-500">Mande o ID ou a Senha para o oponente.</p>
                    </div>
                )}

                {status === 'playing' && (
                    <>
                        <div className={`mb-6 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${isMyTurn ? 'bg-emerald-500 text-slate-900 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
                            {isMyTurn ? "Sua Vez de Jogar" : `Vez de ${opponentName.split(' ')[0]}`}
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

                {status === 'finished' && (
                    <div className="text-center animate-bounce">
                        <h1 className="text-4xl font-black text-white mb-2">FIM DE JOGO</h1>
                        <p className="text-slate-400">Voltando ao lobby...</p>
                    </div>
                )}
            </div>
        </div>
    );
}