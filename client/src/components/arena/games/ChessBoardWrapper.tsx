import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

interface Props {
    fen: string;
    myColor: 'white' | 'black';
    isMyTurn: boolean;
    onMove: (moveData: { from: string; to: string; promotion?: string }) => void;
}

export default function ChessBoardWrapper({ fen, myColor, isMyTurn, onMove }: Props) {
    const [game, setGame] = useState(new Chess(fen));

    // Atualiza o jogo interno quando o servidor manda um novo FEN
    useEffect(() => {
        try {
            const newGame = new Chess(fen);
            setGame(newGame);
        } catch (e) {
            console.error("FEN Error:", fen);
        }
    }, [fen]);

    // Disparado quando você CLICA na peça
    const onDragStart = (piece: string) => {
        console.log("🖱️ Tentando arrastar:", piece);
        // A peça vem como 'wP' (white Pawn), 'bK' (black King), etc.
        const pieceColor = piece[0] === 'w' ? 'white' : 'black';
        
        if (pieceColor !== myColor) {
            console.warn(`⛔ Ops! Você é ${myColor} e tentou pegar ${pieceColor}`);
            return false; // Bloqueia peças do inimigo
        }
        return true;
    };

    // Disparado quando você SOLTA a peça
    const onDrop = (sourceSquare: string, targetSquare: string) => {
        console.log(`🎯 Soltou: ${sourceSquare} -> ${targetSquare}`);

        // 1. Valida Turno do Sistema
        if (!isMyTurn) {
            console.error("❌ REJEITADO: O sistema diz que NÃO é sua vez.");
            return false;
        }

        // 2. Valida Regra do Xadrez Local
        try {
            const tempGame = new Chess(game.fen());
            
            // Tenta o movimento na engine local
            const move = tempGame.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q', // Sempre Queen para simplificar
            });

            if (!move) {
                console.warn("❌ REJEITADO: Movimento ilegal no xadrez.");
                return false;
            }

            // 3. Sucesso -> Envia pro Servidor
            console.log("✅ VÁLIDO! Enviando socket...");
            onMove({ 
                from: sourceSquare, 
                to: targetSquare, 
                promotion: 'q' 
            });
            
            // Atualiza visualmente instantâneo (Otimismo)
            setGame(tempGame);
            return true;

        } catch (e) {
            console.error("Erro critico no onDrop:", e);
            return false;
        }
    };

    const ChessboardAny = Chessboard as any;

    return (
        <div className="flex flex-col items-center gap-2">
            {/* --- DEBUG PANEL (Apague depois que funcionar) --- */}
            <div className="text-[10px] font-mono bg-black/50 p-2 rounded text-white w-full max-w-[350px]">
                <p>Eu sou: <span className="font-bold text-yellow-400">{myColor}</span></p>
                <p>É minha vez? <span className={isMyTurn ? "text-green-400" : "text-red-400"}>{isMyTurn ? "SIM" : "NÃO"}</span></p>
                <p>Turno do Tabuleiro: {game.turn() === 'w' ? 'Brancas' : 'Pretas'}</p>
            </div>
            {/* ------------------------------------------------ */}

            <div className="w-full max-w-[350px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700 bg-slate-800">
                <ChessboardAny 
                    position={game.fen()} 
                    onPieceDrop={onDrop}
                    onPieceDragBegin={onDragStart} // Novo Listener
                    
                    // MUDANÇA CRÍTICA: Sempre true para gerar logs, o onDragStart filtra depois
                    arePiecesDraggable={true} 
                    
                    boardOrientation={myColor} 
                    customDarkSquareStyle={{ backgroundColor: '#334155' }}
                    customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
                    animationDuration={200}
                />
            </div>
        </div>
    );
}