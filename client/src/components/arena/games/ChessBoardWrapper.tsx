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
    const [game, setGame] = useState(new Chess(fen));
    
    // Estados para o Click-to-Move
    const [moveFrom, setMoveFrom] = useState<string | null>(null);
    const [optionSquares, setOptionSquares] = useState({}); // Casas iluminadas

    // Sincroniza com o servidor
    useEffect(() => {
        try {
            const newGame = new Chess(fen);
            setGame(newGame);
            // Limpa seleções ao receber atualização
            setMoveFrom(null);
            setOptionSquares({});
        } catch (e) {
            console.error("FEN Error:", fen);
        }
    }, [fen]);

    // Lógica para mostrar onde a peça pode ir (Visual)
    function getMoveOptions(square: string) {
        const moves = game.moves({
            square,
            verbose: true,
        });
        if (moves.length === 0) {
            setOptionSquares({});
            return false;
        }

        const newSquares: any = {};
        moves.map((move) => {
            newSquares[move.to] = {
                background:
                    game.get(move.to) && game.get(move.to).color !== game.get(square).color
                        ? 'radial-gradient(circle, rgba(255,0,0,.5) 85%, transparent 85%)' // Captura (Vermelho)
                        : 'radial-gradient(circle, rgba(97, 218, 251, 0.5) 25%, transparent 25%)', // Movimento (Azul Cyan)
                borderRadius: '50%',
            };
            return move;
        });
        
        // Destaca a peça selecionada também
        newSquares[square] = {
            background: 'rgba(255, 255, 0, 0.4)', // Amarelo
        };
        
        setOptionSquares(newSquares);
        return true;
    }

    // O CÉREBRO DO CLIQUE
    function onSquareClick(square: string) {
        // 1. Bloqueia se não for minha vez (exceto se for só pra ver tabuleiro, mas melhor bloquear)
        if (!isMyTurn) {
            console.warn("🚫 Espere sua vez!");
            return;
        }

        // 2. Se não tinha peça selecionada -> Tenta Selecionar
        if (!moveFrom) {
            const piece = game.get(square);
            if (!piece) return; // Clicou no vazio

            // Verifica se a peça é minha
            const pieceColor = piece.color === 'w' ? 'white' : 'black';
            if (pieceColor !== myColor) {
                console.warn(`⛔ Essa peça é ${pieceColor}, você é ${myColor}`);
                return;
            }

            // Seleciona e mostra opções
            const hasMoves = getMoveOptions(square);
            if (hasMoves) setMoveFrom(square);
            
            return;
        }

        // 3. Se JÁ tinha peça selecionada -> Tenta Mover ou Trocar
        
        // A. Clicou na mesma peça -> Deseleciona
        if (moveFrom === square) {
            setMoveFrom(null);
            setOptionSquares({});
            return;
        }

        // B. Clicou em outra peça MINHA -> Troca a seleção
        const piece = game.get(square);
        if (piece && (piece.color === 'w' ? 'white' : 'black') === myColor) {
            setMoveFrom(square);
            getMoveOptions(square);
            return;
        }

        // C. Tenta Mover (para vazio ou captura inimiga)
        try {
            const tempGame = new Chess(game.fen());
            const move = tempGame.move({
                from: moveFrom,
                to: square,
                promotion: 'q', // Sempre Queen
            });

            // Se o movimento for inválido, apenas limpa a seleção
            if (!move) {
                console.warn("Movimento inválido");
                setMoveFrom(null);
                setOptionSquares({});
                return;
            }

            // D. SUCESSO! Envia pro Servidor
            console.log(`✅ Movendo: ${moveFrom} -> ${square}`);
            
            onMove({
                from: moveFrom,
                to: square,
                promotion: 'q',
            });

            // Atualiza visualmente e limpa seleção
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
            {/* Debug Panel Simplificado */}
            <div className="text-[10px] font-mono bg-black/50 p-2 rounded text-white w-full max-w-[350px] flex justify-between">
                <span>Sou: <b className="text-yellow-400">{myColor}</b></span>
                <span>Vez: <b className={isMyTurn ? "text-green-400" : "text-red-400"}>{isMyTurn ? "MINHA" : "DELE"}</b></span>
            </div>

            <div className="w-full max-w-[350px] aspect-square shadow-2xl rounded-lg overflow-hidden border-4 border-slate-700 bg-slate-800">
                <ChessboardAny 
                    id="ClickToMoveBoard" 
                    position={game.fen()} 
                    
                    // Desativa o Drag and Drop nativo da lib (Evita bugs)
                    arePiecesDraggable={false} 
                    
                    // Usa nosso sistema de cliques
                    onSquareClick={onSquareClick}
                    
                    // Aplica as cores de seleção/movimento
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