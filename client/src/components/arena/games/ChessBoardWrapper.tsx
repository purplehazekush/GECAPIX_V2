import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

interface Props {
    fen: string;
    myColor: 'white' | 'black';
    isMyTurn: boolean;
    onMove: (moveData: { from: string; to: string; promotion?: string }) => void;
}

export default function ChessBoardWrapper({ fen, myColor, isMyTurn, onMove }: Props) {
    const [game, setGame] = useState(new Chess(fen));

    // Sincroniza quando o servidor manda um novo estado
    useEffect(() => {
        try {
            const newGame = new Chess(fen);
            setGame(newGame);
        } catch (e) {
            console.error("FEN inválido:", fen);
        }
    }, [fen]);

    const onDrop = (sourceSquare: string, targetSquare: string) => {
        // 1. Logs de Diagnóstico (Abra o F12 para ver)
        console.log(`♟️ TENTATIVA DE MOVE: ${sourceSquare} -> ${targetSquare}`);
        console.log(`Minha Cor: ${myColor} | Turno do Tabuleiro: ${game.turn()}`);
        console.log(`É minha vez no sistema? ${isMyTurn}`);

        // 2. Validações Básicas
        if (!isMyTurn) {
            console.warn("🚫 BLOQUEADO: Não é sua vez no sistema.");
            return false;
        }

        // game.turn() retorna 'w' ou 'b'. myColor é 'white' ou 'black'.
        const currentTurnColor = game.turn() === 'w' ? 'white' : 'black';
        if (currentTurnColor !== myColor) {
            console.warn(`🚫 BLOQUEADO: Você é ${myColor}, mas é a vez das ${currentTurnColor}.`);
            return false;
        }

        try {
            // 3. Validação Lógica (Simulação)
            const tempGame = new Chess(game.fen());
            
            // Tenta mover. SE for promoção, assume Queen ('q').
            // A biblioteca chess.js é inteligente: se passarmos promotion: 'q' num movimento normal,
            // ela geralmente ignora, mas vamos garantir que o movimento seja possível.
            
            const moveAttempt = tempGame.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q', 
            });

            if (!moveAttempt) {
                console.warn("🚫 BLOQUEADO: Movimento ilegal pelas regras do Xadrez.");
                return false;
            }

            // 4. Sucesso! Envia pro Servidor
            console.log("✅ VÁLIDO! Enviando para o servidor...");
            
            onMove({ 
                from: sourceSquare, 
                to: targetSquare, 
                promotion: 'q' 
            });

            // Otimismo: Atualiza visualmente na hora (opcional, mas deixa fluido)
            setGame(tempGame); 
            
            return true;
        } catch (e) {
            console.error("Erro ao processar movimento:", e);
            return false;
        }
    };

    const ChessboardAny = Chessboard as any;

    return (
        <div className="w-full max-w-[350px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700 bg-slate-800">
            <ChessboardAny 
                position={game.fen()} 
                onPieceDrop={onDrop}
                // Trava visualmente se não for a vez (Mouse vira 'proibido')
                arePiecesDraggable={isMyTurn} 
                boardOrientation={myColor} 
                customDarkSquareStyle={{ backgroundColor: '#334155' }}
                customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
                animationDuration={200}
            />
        </div>
    );
}