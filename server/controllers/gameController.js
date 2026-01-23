// server/controllers/gameController.js
const UsuarioModel = require('../models/Usuario');

// Armazenamento em memória (Rápido para jogos)
// Estrutura: { roomId: { players: [socketId, socketId], gameType: 'xadrez', boardState: '...', pot: 20, turn: 0 } }
let rooms = {}; 

exports.joinGame = async (io, socket, { gameType, userEmail, betAmount }) => {
    try {
        // Procura uma sala aberta desse jogo
        let roomId = Object.keys(rooms).find(id => 
            rooms[id].gameType === gameType && 
            rooms[id].players.length < 2 &&
            !rooms[id].isPrivate // Futuro: Salas privadas
        );

        // Se não achar, cria uma sala
        if (!roomId) {
            roomId = `room_${Math.random().toString(36).substr(2, 9)}`;
            rooms[roomId] = {
                id: roomId,
                gameType,
                players: [],
                playerData: [], // { email, nome, socketId }
                boardState: null, // Estado inicial depende do jogo
                pot: 0,
                turnIndex: 0
            };
        }

        const room = rooms[roomId];

        // Verifica saldo do usuário antes de entrar
        const user = await UsuarioModel.findOne({ email: userEmail });
        if (!user || user.saldo_coins < betAmount) {
            socket.emit('error', { message: 'Saldo insuficiente para apostar.' });
            return;
        }

        // Adiciona jogador
        room.players.push(socket.id);
        room.playerData.push({ 
            email: userEmail, 
            nome: user.nome, 
            socketId: socket.id,
            avatar: user.avatar_slug 
        });
        room.pot += betAmount;

        socket.join(roomId);

        // Notifica a sala
        io.to(roomId).emit('player_joined', { 
            players: room.playerData, 
            roomId 
        });

        // Se encheu (2 jogadores), começa!
        if (room.players.length === 2) {
            // Inicializa estado baseado no jogo
            if (gameType === 'velha') room.boardState = Array(9).fill(null);
            if (gameType === 'xadrez') room.boardState = 'start'; // FEN string inicial

            io.to(roomId).emit('game_start', {
                boardState: room.boardState,
                turn: room.playerData[0].socketId, // Primeiro a entrar começa
                pot: room.pot
            });
            console.log(`🔥 Jogo ${gameType} iniciado na sala ${roomId}. Pote: ${room.pot}`);
        }

    } catch (e) {
        console.error("Erro joinGame:", e);
    }
};

exports.makeMove = async (io, socket, { roomId, move, newState }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Validação básica de turno (O Frontend valida as regras do jogo)
    const currentPlayerSocket = room.playerData[room.turnIndex].socketId;
    if (socket.id !== currentPlayerSocket) return;

    // Atualiza estado
    room.boardState = newState;
    
    // Passa a vez
    room.turnIndex = room.turnIndex === 0 ? 1 : 0;
    const nextPlayerSocket = room.playerData[room.turnIndex].socketId;

    // Emite o movimento para o oponente
    io.to(roomId).emit('move_made', {
        move,
        newState,
        nextTurn: nextPlayerSocket
    });

    // CHECK DE VITÓRIA (Simplificado: O Frontend avisa quem ganhou e o Back confere/paga)
    // Em produção robusta, o Back deve validar a vitória para evitar cheats.
    // Para MVP, confiamos no sinal do cliente 'game_over'.
};

// Quando o jogo acaba (Recebe do Front quem ganhou)
exports.handleGameOver = async (io, roomId, winnerSocketId) => {
    const room = rooms[roomId];
    if (!room) return;

    const winner = room.playerData.find(p => p.socketId === winnerSocketId);
    const loser = room.playerData.find(p => p.socketId !== winnerSocketId);

    if (winner && loser) {
        // LÓGICA ECONÔMICA (60% do Pote para Vencedor, Perdedor mantém aposta)
        // Como o perdedor não perde, na verdade o vencedor ganha um bônus da casa.
        // O Pote é virtual aqui.
        
        const premioVencedor = Math.floor(room.pot * 0.60); // Ex: Apostaram 10+10=20. Ganha 12.
        
        // Atualiza Vencedor
        await UsuarioModel.findOneAndUpdate(
            { email: winner.email },
            { 
                $inc: { saldo_coins: premioVencedor, xp: 50 },
                $push: { extrato: { tipo: 'ENTRADA', valor: premioVencedor, descricao: `Vitória: ${room.gameType}`, data: new Date() } }
            }
        );

        // Perdedor ganha XP de consolação
        await UsuarioModel.findOneAndUpdate(
            { email: loser.email },
            { $inc: { xp: 10 } }
        );

        io.to(roomId).emit('game_over', { 
            winner: winner.nome, 
            prize: premioVencedor 
        });
    }

    // Limpa a sala
    delete rooms[roomId];
};

exports.handleDisconnect = (io, socket) => {
    // Achar sala do jogador e cancelar jogo (W.O.)
    // Implementar depois para evitar travamentos
};

// Adicione isso ao final do arquivo ou junto aos exports

exports.handleWinClaim = async (io, socket, { roomId, winnerSymbol, draw }) => {
    const room = rooms[roomId];
    if (!room) return;

    // EMPATE (Draw)
    if (draw) {
        io.to(roomId).emit('game_over', { winner: null, prize: 0, draw: true });
        // Devolvemos a aposta ou damos XP de consolação (opcional)
        delete rooms[roomId];
        return;
    }

    // VITÓRIA
    // No Xadrez, o cheque-mate é validado pela lib. Na velha, pelo front.
    // Confiamos no socketId de quem mandou o claim.
    exports.handleGameOver(io, roomId, socket.id);
};