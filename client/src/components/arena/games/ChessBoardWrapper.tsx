import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

interface Props {
    fen: string;
    myColor: 'white' | 'black';
    isMyTurn: boolean;
    // CORREÇÃO: Assinatura padronizada com os outros jogos (3 argumentos)
    onMove: (fen: string, winner: string | null, isDraw: boolean) => void;
}

export default function ChessBoardWrapper({ fen, myColor, isMyTurn, onMove }: Props) {
    const [game, setGame] = useState(new Chess(fen));

    useEffect(() => {
        try {
            setGame(new Chess(fen));
        } catch (e) {
            // Proteção contra FEN inválido
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

            setGame(tempGame);

            const newFen = tempGame.fen();
            const isOver = tempGame.isGameOver();
            
            // Lógica de Vitória Simplificada para bater com a interface
            let winner = null;
            if (isOver && tempGame.isCheckmate()) {
                // Se o jogo acabou em checkmate e fui EU que movi, eu ganhei (myColor)
                winner = myColor; 
            }

            // CORREÇÃO: Envia apenas 3 argumentos
            onMove(newFen, winner, tempGame.isDraw());
            return true;
        } catch (e) { return false; }
    };

    // SOLUÇÃO NUCLEAR PARA O ERRO DE TIPO DA LIB
    const ChessboardAny = Chessboard as any;

    return (
        <div className="w-full max-w-[350px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700 bg-slate-800">
            <ChessboardAny 
                position={game.fen()} 
                onPieceDrop={onDrop}
                boardOrientation={myColor}
                customDarkSquareStyle={{ backgroundColor: '#334155' }}
                customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
            />
        </div>
    );
}