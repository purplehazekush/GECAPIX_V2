import { Close, Circle } from '@mui/icons-material';

interface Props {
    board: Array<'X' | 'O' | null>;
    mySymbol: 'X' | 'O';
    isMyTurn: boolean;
    // Simplificamos a prop. Agora só passa o DADO do movimento.
    onMove: (moveData: { index: number }) => void; 
}

export default function TicTacToeBoard({ board, isMyTurn, onMove }: Props) {
    
    const handleClick = (index: number) => {
        if (!isMyTurn || board[index]) return;
        
        // NÃO calcula novo estado. NÃO checa vitória.
        // Apenas avisa a intenção.
        onMove({ index }); 
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