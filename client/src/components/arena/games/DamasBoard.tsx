import { useState, useEffect } from 'react';
import { Circle } from '@mui/icons-material';

interface Props {
    board: any[]; // Array de 64 posições
    mySymbol: 'red' | 'black'; // 'red' (começa embaixo), 'black' (começa em cima)
    isMyTurn: boolean;
    onMove: (newBoard: any[], winnerSymbol: string | null, isDraw: boolean) => void;
}

// TIPOS DE PEÇAS NO ARRAY:
// null = vazio
// 'r' = red, 'R' = red king
// 'b' = black, 'B' = black king

export default function DamasBoard({ board, mySymbol, isMyTurn, onMove }: Props) {
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [validMoves, setValidMoves] = useState<number[]>([]);

    // Limpa seleção se o turno mudar ou tabuleiro atualizar
    useEffect(() => {
        setSelectedIdx(null);
        setValidMoves([]);
    }, [board, isMyTurn]);

    // LÓGICA DE MOVIMENTOS VÁLIDOS
    const getValidMoves = (idx: number, currentBoard: any[]) => {
        const piece = currentBoard[idx];
        if (!piece) return [];

        const isKing = piece === 'R' || piece === 'B';
        const isRed = piece === 'r' || piece === 'R';
        const moves: number[] = [];
        const captures: number[] = [];

        // Direções: [rowDiff, colDiff]
        // Vermelho sobe (-1), Preto desce (+1). Reis vão para ambos.
        let directions = [];
        if (isRed || isKing) directions.push([-1, -1], [-1, 1]); // Cima
        if (!isRed || isKing) directions.push([1, -1], [1, 1]);   // Baixo

        const row = Math.floor(idx / 8);
        const col = idx % 8;

        directions.forEach(([dRow, dCol]) => {
            // 1. Movimento Simples
            const newRow = row + dRow;
            const newCol = col + dCol;
            if (isValidPos(newRow, newCol)) {
                const targetIdx = newRow * 8 + newCol;
                if (!currentBoard[targetIdx]) {
                    moves.push(targetIdx);
                } else {
                    // 2. Captura
                    const targetPiece = currentBoard[targetIdx];
                    const isEnemy = isRed ? (targetPiece === 'b' || targetPiece === 'B') : (targetPiece === 'r' || targetPiece === 'R');
                    
                    if (isEnemy) {
                        const jumpRow = newRow + dRow;
                        const jumpCol = newCol + dCol;
                        if (isValidPos(jumpRow, jumpCol)) {
                            const jumpIdx = jumpRow * 8 + jumpCol;
                            if (!currentBoard[jumpIdx]) {
                                captures.push(jumpIdx); // Prioridade para capturas futuramente?
                                moves.push(jumpIdx);
                            }
                        }
                    }
                }
            }
        });

        return moves;
    };

    const isValidPos = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

    const handleSquareClick = (idx: number) => {
        if (!isMyTurn) return;

        const piece = board[idx];
        const isMyPiece = piece && (mySymbol === 'red' ? (piece === 'r' || piece === 'R') : (piece === 'b' || piece === 'B'));

        // 1. Selecionar Peça
        if (isMyPiece) {
            setSelectedIdx(idx);
            setValidMoves(getValidMoves(idx, board));
            return;
        }

        // 2. Mover para casa vazia (se estiver selecionado e for válido)
        if (selectedIdx !== null && validMoves.includes(idx)) {
            executeMove(selectedIdx, idx);
        }
    };

    const executeMove = (from: number, to: number) => {
        const newBoard = [...board];
        const piece = newBoard[from];
        newBoard[from] = null;
        newBoard[to] = piece;

        // Lógica de Captura (se andou mais de 1 casa, comeu alguém)
        const rowFrom = Math.floor(from / 8);
        const rowTo = Math.floor(to / 8);
        const dist = Math.abs(rowFrom - rowTo);

        if (dist === 2) {
            const capturedRow = (rowFrom + rowTo) / 2;
            const colFrom = from % 8;
            const colTo = to % 8;
            const capturedCol = (colFrom + colTo) / 2;
            const capturedIdx = capturedRow * 8 + capturedCol;
            newBoard[capturedIdx] = null; // Remove a peça comida
        }

        // Promoção a Dama (King)
        if (piece === 'r' && rowTo === 0) newBoard[to] = 'R';
        if (piece === 'b' && rowTo === 7) newBoard[to] = 'B';

        // Verifica Vitória
        const winner = checkWinner(newBoard);
        
        onMove(newBoard, winner, false);
    };

    return (
        <div className="w-full max-w-[350px] aspect-square bg-[#D18B47] border-4 border-[#5d4037] rounded-lg shadow-2xl grid grid-cols-8 overflow-hidden">
            {board.map((piece, idx) => {
                const row = Math.floor(idx / 8);
                const col = idx % 8;
                const isBlackSquare = (row + col) % 2 === 1;
                const isSelected = selectedIdx === idx;
                const isValidMove = validMoves.includes(idx);

                return (
                    <div 
                        key={idx}
                        onClick={() => handleSquareClick(idx)}
                        className={`
                            relative flex items-center justify-center
                            ${isBlackSquare ? 'bg-[#FFCE9E]' : 'bg-[#D18B47]'}
                            ${isValidMove ? 'cursor-pointer' : ''}
                        `}
                    >
                        {/* Highlights */}
                        {isSelected && <div className="absolute inset-0 bg-yellow-400/50"></div>}
                        {isValidMove && <div className="w-4 h-4 rounded-full bg-green-500/80 animate-pulse"></div>}

                        {/* A Peça */}
                        {piece && (
                            <div className={`
                                w-[80%] h-[80%] rounded-full shadow-[0_4px_4px_rgba(0,0,0,0.4)] flex items-center justify-center
                                transition-transform duration-200
                                ${piece.toLowerCase() === 'r' 
                                    ? 'bg-red-600 border-4 border-red-800' 
                                    : 'bg-slate-800 border-4 border-black'}
                                ${isSelected ? 'scale-110' : ''}
                            `}>
                                {/* Coroa se for Rei */}
                                {(piece === 'R' || piece === 'B') && (
                                    <Circle className="text-yellow-400" sx={{ fontSize: 16 }} />
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function checkWinner(board: any[]) {
    const hasRed = board.some(p => p === 'r' || p === 'R');
    const hasBlack = board.some(p => p === 'b' || p === 'B');

    if (!hasRed) return 'black'; // Black ganhou
    if (!hasBlack) return 'red'; // Red ganhou
    return null;
}