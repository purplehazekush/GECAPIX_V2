import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

interface Props {
    fen: string;
    myColor: 'white' | 'black';
    isMyTurn: boolean;
    onMove: (moveData: { from: string; to: string; promotion: string }) => void;
}

export default function ChessBoardWrapper({ fen, myColor, isMyTurn, onMove }: Props) {
    // Mantemos uma instância local para a UI responder rápido ao clique
    const [game, setGame] = useState(new Chess(fen));

    // Sempre que o servidor manda um novo FEN, atualizamos o tabuleiro visual
    useEffect(() => {
        try {
            const newGame = new Chess(fen);
            setGame(newGame);
        } catch (e) {
            console.error("FEN inválido recebido:", fen);
        }
    }, [fen]);

    const onDrop = (sourceSquare: string, targetSquare: string) => {
        // 1. Bloqueia se não for minha vez ou se eu tentar mover peça do oponente
        if (!isMyTurn) return false;
        if (game.turn() !== myColor.charAt(0)) return false; // 'w' ou 'b'

        try {
            // 2. Tenta mover na instância LOCAL (apenas para ver se é válido pelas regras do xadrez)
            const tempGame = new Chess(game.fen());
            const move = tempGame.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q', // Sempre Queen por enquanto
            });

            // Se for inválido (ex: cavalo andar em linha reta), cancela
            if (!move) return false;

            // 3. Se for válido, ENVIA PRO SERVIDOR
            // Nota: Não damos setGame(tempGame) aqui. Esperamos o servidor mandar o novo FEN.
            // Isso evita desincronia. O tabuleiro vai "piscar" a peça voltando se o servidor rejeitar,
            // ou vai confirmar o movimento quando o FEN voltar no useEffect acima.
            
            onMove({ 
                from: sourceSquare, 
                to: targetSquare, 
                promotion: 'q' 
            });

            return true; // Permite a peça "soltar" visualmente (otimismo)
        } catch (e) {
            return false;
        }
    };

    // Fix de tipagem da lib
    const ChessboardAny = Chessboard as any;

    return (
        <div className="w-full max-w-[350px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700 bg-slate-800">
            <ChessboardAny 
                position={game.fen()} 
                onPieceDrop={onDrop}
                // Trava o tabuleiro para eu só mexer nas minhas peças
                arePiecesDraggable={isMyTurn} 
                boardOrientation={myColor} // Gira o tabuleiro se eu for Preto
                customDarkSquareStyle={{ backgroundColor: '#334155' }}
                customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
                animationDuration={200}
            />
        </div>
    );
}