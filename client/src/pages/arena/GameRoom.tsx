import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { ArrowBack, HourglassEmpty } from '@mui/icons-material'; // Imports limpos

// Componentes dos Jogos
import TicTacToeBoard from '../../components/arena/games/TicTacToeBoard';
import ChessBoardWrapper from '../../components/arena/games/ChessBoardWrapper';
import Connect4Board from '../../components/arena/games/Connect4Board';
// O Timer novo
import { GameTimer } from '../../components/arena/GameTimer';

const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'http://72.62.87.8:3001';

// Interface para o resultado do jogo (Correção do Erro TS)
interface GameResult {
    winner?: string;
    prize?: number;
    reason?: string;
    draw?: boolean; // <--- Adicionado aqui
    loser?: number;
}

export default function GameRoom() {
    const { roomId } = useParams();
    const { dbUser } = useAuth();
    const navigate = useNavigate();

    // Conexão
    const socketRef = useRef<Socket | null>(null);
    const [status, setStatus] = useState<'connecting' | 'waiting' | 'playing' | 'finished'>('connecting');

    // Estado do Jogo
    const [gameType, setGameType] = useState<string | null>(null);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [boardState, setBoardState] = useState<any>(null);
    const [mySymbol, setMySymbol] = useState<any>(null);

    // Dados dos Jogadores
    const [players, setPlayers] = useState<any[]>([]);
    const [myIndex, setMyIndex] = useState<number>(-1); // 0 ou 1

    // Timers
    const [timers, setTimers] = useState<[number, number]>([600, 600]);

    // Resultado Final (Tipado Corretamente)
    const [resultData, setResultData] = useState<GameResult | null>(null);

    // Função disparada quando o relógio local bate 0
    const handleTimeoutClaim = () => {
        // Só reivindica se for a vez do cara e o relógio dele zerou.
        // Se for MINHA vez e MEU relógio zerou, eu perdi (o servidor vai saber, mas posso avisar)
        // Se for vez do OPONENTE e o relógio DELE zerou, eu aviso o servidor pra encerrar.

        console.log("⌛ CHECK DE TEMPO ACIONADO");
        socketRef.current?.emit('claim_timeout', { roomId });
    };

    // --- EFEITOS DE VITÓRIA ---
    const triggerWinEffect = () => {
        const duration = 3000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#22d3ee', '#ec4899', '#fbbf24']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#22d3ee', '#ec4899', '#fbbf24']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    };

    // --- INICIALIZAÇÃO ---
    useEffect(() => {
        if (!dbUser || !roomId) return;

        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("🔌 Socket conectado");
            socket.emit('join_specific_room', { roomId, userEmail: dbUser.email });
        });

        // --- LISTENERS DE JOGO ---

        socket.on('game_start', (data: any) => {
            console.log("🚦 START:", data);
            setGameType(data.gameType);
            setBoardState(data.boardState);
            setPlayers(data.players);
            setStatus('playing');

            if (data.timers) setTimers(data.timers);

            // Quem sou eu?
            const idx = data.players.findIndex((p: any) => p.email === dbUser.email);
            setMyIndex(idx);

            // Minha Vez?
            setIsMyTurn(data.nextTurnEmail === dbUser.email);

            // Minha Cor/Símbolo?
            if (data.gameType === 'xadrez') {
                const me = data.players[idx];
                setMySymbol(me?.color || (idx === 0 ? 'white' : 'black'));
            } else if (data.gameType === 'velha') {
                setMySymbol(idx === 0 ? 'X' : 'O');
            } else if (data.gameType === 'connect4') {
                setMySymbol(idx === 0 ? 'red' : 'yellow');
            }

            toast.success("PARTIDA INICIADA!", { icon: '⚔️' });
        });

        socket.on('move_made', (data: any) => {
            setBoardState(data.newState);
            setIsMyTurn(data.nextTurnEmail === dbUser.email);
            if (data.timers) setTimers(data.timers); // Atualiza relógios
        });

        socket.on('reconnect_success', (data: any) => {
            setGameType(data.gameType);
            setBoardState(data.boardState);
            setStatus('playing');
            setIsMyTurn(data.isMyTurn);
            if (data.timers) setTimers(data.timers);
        });

        // --- GAME OVER (Normal) ---
        socket.on('game_over', (data: any) => {
            setStatus('finished');
            setResultData(data); // Guarda dados pra exibir na tela

            if (data.winner === dbUser.nome) {
                triggerWinEffect(); // 🎉
                toast.success(`VITÓRIA! +${data.prize} Coins`);
            } else if (data.draw) {
                toast("Empate.", { icon: '🤝' });
            } else {
                toast.error("Derrota.");
            }
        });

        // --- GAME OVER (Tempo Esgotado) ---
        socket.on('game_over_timeout', (data: any) => {
            setStatus('finished');

            const souEuPerdedor = data.loser === myIndex;

            if (souEuPerdedor) {
                setResultData({ reason: "TEMPO ESGOTADO", winner: "Oponente", draw: false });
                toast.error("SEU TEMPO ACABOU!");
            } else {
                setResultData({ reason: "TEMPO DO OPONENTE ACABOU", winner: dbUser.nome, draw: false });
                triggerWinEffect(); // 🎉
                toast.success("VITÓRIA POR TEMPO!");
            }
        });

        socket.on('error', (err: any) => {
            toast.error(err.message);
            if (err.message.includes('Sala')) navigate('/arena/games');
        });

        return () => { socket.disconnect(); };
    }, [roomId, dbUser, navigate]);


    const handleMove = (moveData: any) => {
        if (!isMyTurn || status !== 'playing') return;
        setIsMyTurn(false); // Otimismo UI
        socketRef.current?.emit('make_move', { roomId, moveData });
    };

    // Helpers de UI
    const opponentIndex = myIndex === 0 ? 1 : 0;
    const opponentName = players[opponentIndex]?.nome || "Oponente";

    return (
        <div className="flex flex-col h-screen bg-slate-950 overflow-hidden relative">

            {/* OVERLAY DE RESULTADO (Aparece no final) */}
            {status === 'finished' && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade-in">
                    <div className="bg-slate-900 border-2 border-slate-700 p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full">
                        {resultData?.draw ? (
                            <>
                                <div className="text-6xl mb-4">🤝</div>
                                <h2 className="text-3xl font-black text-slate-300 uppercase mb-2">Empate</h2>
                                <p className="text-slate-500 text-sm">Ninguém perdeu pontos.</p>
                            </>
                        ) : resultData?.winner === dbUser?.nome ? (
                            <>
                                <div className="text-6xl mb-4 animate-bounce">🏆</div>
                                <h2 className="text-4xl font-black text-yellow-400 uppercase mb-2">VITÓRIA!</h2>
                                <p className="text-slate-400 text-sm mb-4">{resultData?.reason || "Você dominou a partida."}</p>
                                <div className="bg-slate-800 p-3 rounded-xl inline-flex items-center gap-2 border border-yellow-500/30">
                                    <span className="text-yellow-400 font-black">+XP</span>
                                    <span className="text-white font-bold">Ganho Confirmado</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-6xl mb-4">💀</div>
                                <h2 className="text-4xl font-black text-red-500 uppercase mb-2">DERROTA</h2>
                                <p className="text-slate-400 text-sm mb-4">{resultData?.reason || "Mais sorte na próxima."}</p>
                            </>
                        )}

                        <button
                            onClick={() => navigate('/arena/games')}
                            className="mt-8 w-full bg-white text-slate-900 font-black py-3 rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-widest"
                        >
                            Voltar ao Lobby
                        </button>
                    </div>
                </div>
            )}

            {/* HEADER SIMPLES */}
            <div className="p-4 flex items-center justify-between bg-slate-900 border-b border-slate-800">
                <button onClick={() => navigate('/arena/games')} className="text-slate-400 hover:text-white">
                    <ArrowBack />
                </button>
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                    Sala: {roomId?.substring(0, 6)}
                </span>
                <div className="w-6"></div>
            </div>

            {/* ÁREA DE JOGO */}
            <div className="flex-1 flex flex-col items-center justify-center p-4">

                {status === 'waiting' && (
                    <div className="text-center animate-pulse">
                        <HourglassEmpty className="text-cyan-500 text-6xl mb-4 mx-auto" />
                        <h2 className="text-xl font-bold text-white">Aguardando Rival...</h2>
                        <p className="text-slate-500 text-xs mt-2">O jogo começará automaticamente.</p>
                    </div>
                )}

                {status === 'playing' && (
                    <div className="w-full max-w-md flex flex-col h-full justify-between">

                        {/* 1. HUD DO OPONENTE (Topo) */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-400 border border-slate-700">
                                    {opponentName.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-300">{opponentName}</p>
                                    <p className="text-[10px] text-slate-500 uppercase">Rival</p>
                                </div>
                            </div>
                            {/* Timer do Oponente */}
                            <GameTimer
                                serverTime={timers[opponentIndex] || 600}
                                isActive={!isMyTurn && status === 'playing'}
                                label={opponentName}
                                onExpire={handleTimeoutClaim} // <--- SE O TEMPO DELE ACABAR, EU REIVINDICO VITÓRIA
                            />
                        </div>

                        {/* 2. TABULEIRO (Centro) */}
                        <div className="flex-1 flex items-center justify-center my-4">
                            <div className={`transition-all duration-500 ${!isMyTurn ? 'opacity-90 grayscale-[0.3] scale-95' : 'scale-100 shadow-2xl'}`}>
                                {gameType === 'velha' && boardState && (
                                    <TicTacToeBoard board={boardState} mySymbol={mySymbol} isMyTurn={isMyTurn} onMove={handleMove} />
                                )}
                                {gameType === 'xadrez' && boardState && (
                                    <ChessBoardWrapper fen={boardState} myColor={mySymbol} isMyTurn={isMyTurn} onMove={handleMove} />
                                )}
                                {gameType === 'connect4' && boardState && (
                                    <Connect4Board board={boardState} mySymbol={mySymbol} isMyTurn={isMyTurn} onMove={handleMove} />
                                )}
                            </div>
                        </div>

                        {/* 3. MEU HUD (Baixo) */}
                        <div className="flex justify-between items-end mt-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-cyan-900 flex items-center justify-center font-bold text-cyan-200 border border-cyan-700 shadow-lg shadow-cyan-900/50">
                                    {dbUser?.nome.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-base font-black text-white">Você</p>
                                    <p className={`text-[10px] uppercase font-bold ${isMyTurn ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`}>
                                        {isMyTurn ? 'SUA VEZ DE JOGAR' : 'AGUARDE...'}
                                    </p>
                                </div>
                            </div>
                            {/* Meu Timer */}
                            <GameTimer
                                serverTime={timers[myIndex] || 600}
                                isActive={isMyTurn && status === 'playing'}
                                label="Seu Tempo"
                            // onExpire={handleTimeoutClaim} // Opcional: Avisar que eu perdi, mas o back pega.
                            />
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}