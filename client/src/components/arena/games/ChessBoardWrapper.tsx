// client/src/components/arena/games/ChessBoardWrapper.tsx
import { useState, useEffect } from 'react';
import { Chess, type Square } from 'chess.js'; // Importamos o tipo Square
import { Chessboard } from 'react-chessboard';

interface Props {
    fen: string;
    myColor: 'white' | 'black';
    isMyTurn: boolean;
    onMove: (moveData: { from: string; to: string; promotion: string }) => void;
}

export default function ChessBoardWrapper({ fen, myColor, isMyTurn, onMove }: Props) {
    const [game, setGame] = useState(new Chess(fen));
    
    // Agora o state sabe que guarda uma 'Square' ou null
    const [moveFrom, setMoveFrom] = useState<Square | null>(null);
    const [optionSquares, setOptionSquares] = useState({}); 

    useEffect(() => {
        try {
            const newGame = new Chess(fen);
            setGame(newGame);
            setMoveFrom(null);
            setOptionSquares({});
        } catch (e) {
            console.error("FEN Error:", fen);
        }
    }, [fen]);

    function getMoveOptions(square: Square) {
        // CORREÇÃO 1: TypeScript agora sabe que 'moves' retorna objetos detalhados
        const moves = game.moves({
            square: square,
            verbose: true,
        });
        
        if (moves.length === 0) {
            setOptionSquares({});
            return false;
        }

        const newSquares: any = {};
        
        // CORREÇÃO 2: Tipagem correta dentro do map
        moves.map((move) => {
            // Pegamos as peças com segurança (verificando se existem)
            const targetPiece = game.get(move.to); // move.to já é do tipo Square
            const sourcePiece = game.get(square);

            const isCapture = targetPiece && sourcePiece && targetPiece.color !== sourcePiece.color;

            newSquares[move.to] = {
                background: isCapture
                        ? 'radial-gradient(circle, rgba(255,0,0,.5) 85%, transparent 85%)' 
                        : 'radial-gradient(circle, rgba(97, 218, 251, 0.5) 25%, transparent 25%)',
                borderRadius: '50%',
            };
            return move;
        });
        
        newSquares[square] = {
            background: 'rgba(255, 255, 0, 0.4)', 
        };
        
        setOptionSquares(newSquares);
        return true;
    }

    // O argumento 'square' vem como string da biblioteca visual
    function onSquareClick(squareString: string) {
        // CORREÇÃO 3: Casting forçado de string -> Square
        const square = squareString as Square;

        if (!isMyTurn) {
            console.warn("🚫 Espere sua vez!");
            return;
        }

        // 2. Se não tinha peça selecionada -> Tenta Selecionar
        if (!moveFrom) {
            const piece = game.get(square);
            if (!piece) return; 

            const pieceColor = piece.color === 'w' ? 'white' : 'black';
            if (pieceColor !== myColor) {
                console.warn(`⛔ Essa peça é ${pieceColor}, você é ${myColor}`);
                return;
            }

            const hasMoves = getMoveOptions(square);
            if (hasMoves) setMoveFrom(square);
            
            return;
        }

        // 3. Se JÁ tinha peça selecionada -> Tenta Mover ou Trocar
        
        if (moveFrom === square) {
            setMoveFrom(null);
            setOptionSquares({});
            return;
        }

        const piece = game.get(square);
        if (piece && (piece.color === 'w' ? 'white' : 'black') === myColor) {
            setMoveFrom(square);
            getMoveOptions(square);
            return;
        }

        // C. Tenta Mover
        try {
            const tempGame = new Chess(game.fen());
            
            // CORREÇÃO 4: Passando Square tipado corretamente
            const move = tempGame.move({
                from: moveFrom,
                to: square,
                promotion: 'q', 
            });

            if (!move) {
                console.warn("Movimento inválido");
                setMoveFrom(null);
                setOptionSquares({});
                return;
            }

            console.log(`✅ Movendo: ${moveFrom} -> ${square}`);
            
            onMove({
                from: moveFrom,
                to: square,
                promotion: 'q',
            });

            setGame(tempGame);
            setMoveFrom(null);
            setOptionSquares({});

        } catch (error) {
            console.error("Erro no movimento:", error);
            setMoveFrom(null);
            setOptionSquares({});
        }
    }

    const ChessboardAny = Chessboard as any;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="text-[10px] font-mono bg-black/50 p-2 rounded text-white w-full max-w-[350px] flex justify-between">
                <span>Sou: <b className="text-yellow-400">{myColor}</b></span>
                <span>Vez: <b className={isMyTurn ? "text-green-400" : "text-red-400"}>{isMyTurn ? "MINHA" : "DELE"}</b></span>
            </div>

            <div className="w-full max-w-[350px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700 bg-slate-800">
                <ChessboardAny 
                    id="ClickToMoveBoard" 
                    position={game.fen()} 
                    arePiecesDraggable={false} 
                    onSquareClick={onSquareClick}
                    customSquareStyles={optionSquares}
                    boardOrientation={myColor} 
                    customDarkSquareStyle={{ backgroundColor: '#334155' }}
                    customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
                    animationDuration={200}
                />
            </div>
            
            <p className="text-xs text-slate-500 mt-1">
                {isMyTurn ? "Toque na peça para selecionar, depois no destino." : "Aguarde o oponente..."}
            </p>
        </div>
    );
}