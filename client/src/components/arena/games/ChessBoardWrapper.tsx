import { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';

interface Props {
    fen: string;
    myColor: 'white' | 'black';
    isMyTurn: boolean;
    onMove: (moveData: { from: string; to: string; promotion: string }) => void;
}

const PIECE_IMAGES: Record<string, string> = {
    'wP': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    'wN': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    'wB': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'wR': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'wQ': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    'wK': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    'bP': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    'bN': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    'bB': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'bR': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'bQ': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    'bK': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
};

export default function ChessBoardWrapper({ fen, myColor, isMyTurn, onMove }: Props) {
    const [game, setGame] = useState(new Chess(fen));
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [validMoves, setValidMoves] = useState<Square[]>([]);

    useEffect(() => {
        try {
            const newGame = new Chess(fen);
            setGame(newGame);
            setSelectedSquare(null);
            setValidMoves([]);
        } catch (e) { console.error(e); }
    }, [fen]);

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    let boardSquares: Square[] = [];
    for (let r of ranks) {
        for (let f of files) {
            boardSquares.push(`${f}${r}` as Square);
        }
    }
    if (myColor === 'black') boardSquares.reverse();

    const handleSquareClick = (square: Square) => {
        if (!isMyTurn) return;

        if (selectedSquare) {
            if (selectedSquare === square) {
                setSelectedSquare(null);
                setValidMoves([]);
                return;
            }
            if (validMoves.includes(square)) {
                // Otimismo
                const tempGame = new Chess(game.fen());
                tempGame.move({ from: selectedSquare, to: square, promotion: 'q' });
                setGame(tempGame);
                setSelectedSquare(null);
                setValidMoves([]);
                onMove({ from: selectedSquare, to: square, promotion: 'q' });
                return;
            }
            const piece = game.get(square);
            if (piece && piece.color === (myColor === 'white' ? 'w' : 'b')) {
                selectPiece(square);
                return;
            }
            setSelectedSquare(null);
            setValidMoves([]);
        } else {
            selectPiece(square);
        }
    };

    const selectPiece = (square: Square) => {
        const piece = game.get(square);
        if (piece && piece.color === (myColor === 'white' ? 'w' : 'b')) {
            setSelectedSquare(square);
            const moves = game.moves({ square, verbose: true });
            setValidMoves(moves.map(m => m.to as Square));
        }
    };

    return (
        <div className="flex flex-col items-center gap-2 select-none">
            {/* Status Panel */}
            <div className="flex justify-between w-full max-w-[350px] text-[10px] font-mono font-bold bg-slate-900 p-2 rounded border border-slate-700">
                <span className={myColor === 'white' ? 'text-white' : 'text-slate-500'}>
                    ● BRANCAS {myColor === 'white' && '(VOCÊ)'}
                </span>
                <span className={isMyTurn ? 'text-green-400 animate-pulse' : 'text-red-500'}>
                    {isMyTurn ? "SUA VEZ" : "AGUARDE..."}
                </span>
                <span className={myColor === 'black' ? 'text-white' : 'text-slate-500'}>
                    ● PRETAS {myColor === 'black' && '(VOCÊ)'}
                </span>
            </div>

            {/* TABULEIRO FIXO */}
            <div className="relative w-full max-w-[350px] aspect-square bg-slate-800 border-4 border-slate-800 rounded-lg shadow-2xl overflow-hidden">
                <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                    {boardSquares.map((square) => {
                        const piece = game.get(square);
                        const isSelected = selectedSquare === square;
                        const isValidMove = validMoves.includes(square);
                        
                        const fileIdx = files.indexOf(square[0]);
                        const rankIdx = ranks.indexOf(square[1]);
                        const isDark = (fileIdx + rankIdx) % 2 === 1;

                        return (
                            <div
                                key={square}
                                onClick={() => handleSquareClick(square)}
                                className={`
                                    relative flex items-center justify-center w-full h-full
                                    ${isDark ? 'bg-slate-600' : 'bg-slate-400'}
                                    ${isSelected ? 'ring-inset ring-4 ring-yellow-400' : ''}
                                    ${isValidMove && !piece ? 'after:content-[""] after:w-3 after:h-3 after:bg-green-400/50 after:rounded-full' : ''}
                                    ${isValidMove && piece ? 'ring-inset ring-4 ring-red-500/50' : ''}
                                `}
                            >
                                {piece && (
                                    <img 
                                        src={PIECE_IMAGES[`${piece.color}${piece.type.toUpperCase()}`]} 
                                        alt=""
                                        className="w-[85%] h-[85%] object-contain pointer-events-none"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}