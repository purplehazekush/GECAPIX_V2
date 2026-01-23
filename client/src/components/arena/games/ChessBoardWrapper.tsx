import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

interface Props {
    fen: string;
    myColor: 'white' | 'black';
    isMyTurn: boolean;
    onMove: (fen: string, isGameOver: boolean, winner: string | null, isDraw: boolean) => void;
}

export default function ChessBoardWrapper({ fen, myColor, isMyTurn, onMove }: Props) {
    const [game, setGame] = useState(new Chess(fen));

    // Sincroniza estado interno se o FEN mudar externamente (jogada do oponente)
    useEffect(() => {
        try {
            setGame(new Chess(fen));
        } catch (e) {
            console.error("Erro FEN:", e);
        }
    }, [fen]);

    const onDrop = (sourceSquare: string, targetSquare: string) => {
        if (!isMyTurn) return false;

        try {
            const tempGame = new Chess(game.fen());
            
            const move = tempGame.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q', 
            });

            if (!move) return false;

            setGame(tempGame); // Atualiza visual instantâneo

            // Prepara dados para o Container
            const newFen = tempGame.fen();
            const isOver = tempGame.isGameOver();
            let winner = null;
            
            if (isOver && tempGame.isCheckmate()) {
                winner = myColor; // Se eu dei cheque-mate, eu ganhei
            }

            onMove(newFen, isOver, winner, tempGame.isDraw());
            return true;
        } catch (e) { return false; }
    };

    return (
        <div className="w-full max-w-[350px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700 bg-slate-800">
            {/* @ts-ignore 
                Motivo: A lib react-chessboard tem um bug na definição de tipos da prop 'position',
                mas ela funciona perfeitamente em runtime.
            */}
            <Chessboard 
                position={game.fen()} 
                onPieceDrop={onDrop}
                boardOrientation={myColor}
                customDarkSquareStyle={{ backgroundColor: '#334155' }}
                customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
            />
        </div>
    );
}