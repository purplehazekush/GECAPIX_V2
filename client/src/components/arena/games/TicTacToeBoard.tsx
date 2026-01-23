import { Close, Circle } from '@mui/icons-material';

interface Props {
    board: Array<'X' | 'O' | null>;
    mySymbol: 'X' | 'O';
    isMyTurn: boolean;
    onMove: (newBoard: any[], winnerSymbol: string | null, isDraw: boolean) => void;
}

export default function TicTacToeBoard({ board, mySymbol, isMyTurn, onMove }: Props) {
    
    const handleClick = (index: number) => {
        if (!isMyTurn || board[index]) return;

        const newBoard = [...board];
        newBoard[index] = mySymbol;

        const winner = checkWinner(newBoard);
        const isDraw = !winner && newBoard.every(cell => cell !== null);

        onMove(newBoard, winner ? mySymbol : null, isDraw);
    };

    return (
        <div className="grid grid-cols-3 gap-3 bg-slate-800 p-3 rounded-2xl shadow-2xl">
            {board.map((cell, idx) => (
                <button
                    key={idx}
                    onClick={() => handleClick(idx)}
                    disabled={!!cell || !isMyTurn}
                    className={`
                        w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center text-5xl font-black transition-all
                        ${!cell && isMyTurn ? 'hover:bg-slate-700 cursor-pointer' : ''}
                        ${cell === 'X' ? 'bg-cyan-900/30 text-cyan-400' : ''}
                        ${cell === 'O' ? 'bg-purple-900/30 text-purple-400' : ''}
                        ${!cell ? 'bg-slate-900' : ''}
                    `}
                >
                    {cell === 'X' && <Close fontSize="inherit" />}
                    {cell === 'O' && <Circle fontSize="inherit" />}
                </button>
            ))}
        </div>
    );
}

function checkWinner(squares: any[]) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
    }
    return null;
}