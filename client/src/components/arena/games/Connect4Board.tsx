// client/src/components/arena/games/Connect4Board.tsx
interface Props {
    board: Array<'red' | 'yellow' | null>; // Array 42
    mySymbol: 'red' | 'yellow';
    isMyTurn: boolean;
    onMove: (newBoard: any[], winnerSymbol: string | null, isDraw: boolean) => void;
}

export default function Connect4Board({ board, mySymbol, isMyTurn, onMove }: Props) {

    const handleColumnClick = (colIndex: number) => {
        if (!isMyTurn) return;

        // Gravidade
        let rowToFill = -1;
        for (let r = 5; r >= 0; r--) {
            if (!board[r * 7 + colIndex]) {
                rowToFill = r;
                break;
            }
        }
        if (rowToFill === -1) return;

        const newBoard = [...board];
        newBoard[rowToFill * 7 + colIndex] = mySymbol;

        const winner = checkWinner(newBoard);
        const isDraw = !winner && newBoard.every(c => c !== null);

        onMove(newBoard, winner, isDraw);
    };

    return (
        <div className="bg-blue-700 p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-b-8 border-blue-900">
            <div className="grid grid-cols-7 gap-2">
                {[0,1,2,3,4,5,6].map(col => (
                    <div key={col} className="flex flex-col gap-2 group cursor-pointer" onClick={() => handleColumnClick(col)}>
                        {[0,1,2,3,4,5].map(row => {
                            const cellValue = board[row * 7 + col];
                            return (
                                <div key={row} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900 shadow-inner flex items-center justify-center relative overflow-hidden">
                                    {cellValue && (
                                        <div className={`w-full h-full rounded-full animate-bounce-short shadow-inner ${
                                            cellValue === 'red' ? 'bg-red-500 border-4 border-red-600' : 'bg-yellow-400 border-4 border-yellow-500'
                                        }`}></div>
                                    )}
                                    {!cellValue && isMyTurn && (
                                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

function checkWinner(board: any[]) {
    const getCell = (r: number, c: number) => (r < 0 || r >= 6 || c < 0 || c >= 7) ? null : board[r * 7 + c];
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            const p = getCell(r, c);
            if (!p) continue;
            const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
            for (let [dr, dc] of directions) {
                let match = true;
                for (let k = 1; k < 4; k++) if (getCell(r + dr * k, c + dc * k) !== p) { match = false; break; }
                if (match) return p;
            }
        }
    }
    return null;
}