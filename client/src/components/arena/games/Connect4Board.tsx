interface Props {
    board: Array<'red' | 'yellow' | null>; // Array 42
    mySymbol: 'red' | 'yellow';
    isMyTurn: boolean;
    // MUDANÇA: Agora só envia a coluna clicada
    onMove: (moveData: { colIndex: number }) => void;
}

export default function Connect4Board({ board, isMyTurn, onMove }: Props) {

    const handleColumnClick = (colIndex: number) => {
        if (!isMyTurn) return;

        // NÃO calcula gravidade.
        // NÃO verifica vitória.
        // Apenas avisa: "Quero soltar na coluna X"
        onMove({ colIndex });
    };

    return (
        <div className="bg-blue-700 p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-b-8 border-blue-900">
            <div className="grid grid-cols-7 gap-2">
                {[0,1,2,3,4,5,6].map(col => (
                    <div key={col} className="flex flex-col gap-2 group cursor-pointer" onClick={() => handleColumnClick(col)}>
                        {[0,1,2,3,4,5].map(row => {
                            // Renderiza baseado no estado que veio do servidor
                            const cellValue = board[row * 7 + col];
                            return (
                                <div key={row} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900 shadow-inner flex items-center justify-center relative overflow-hidden">
                                    {cellValue && (
                                        <div className={`w-full h-full rounded-full animate-bounce-short shadow-inner ${
                                            cellValue === 'red' ? 'bg-red-500 border-4 border-red-600' : 'bg-yellow-400 border-4 border-yellow-500'
                                        }`}></div>
                                    )}
                                    {/* Preview Fantasma (Opcional, só visual) */}
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