// server/controllers/gameController.js
const UsuarioModel = require('../models/Usuario');

let rooms = {}; 

// --- 1. LISTAR SALAS ---
exports.getRooms = (io, socket) => {
    const publicRooms = Object.values(rooms)
        .filter(r => !r.config.isPrivate && r.players.length < 2)
        .map(r => ({
            id: r.id,
            gameType: r.gameType,
            bet: r.pot / (r.players.length + 1 || 1), // Estimativa da aposta
            creator: r.playerData[0]?.nome || 'Anônimo'
        }));
    socket.emit('rooms_list', publicRooms);
};

// --- 2. CRIAR SALA ---
exports.createRoom = async (io, socket, { gameType, userEmail, betAmount, isPrivate, password, timeLimit }) => {
    try {
        // Validação de Saldo
        const user = await UsuarioModel.findOne({ email: userEmail });
        if (!user || user.saldo_coins < betAmount) {
            return socket.emit('error', { message: 'Saldo insuficiente.' });
        }

        const roomId = `room_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        rooms[roomId] = {
            id: roomId,
            gameType,
            players: [socket.id],
            playerData: [{ email: userEmail, nome: user.nome, socketId: socket.id, avatar: user.avatar_slug }],
            pot: betAmount,
            turnIndex: 0,
            boardState: null,
            config: { isPrivate, password, timeLimit: timeLimit || 60 },
            status: 'waiting' // waiting | playing
        };

        socket.join(roomId);
        socket.emit('room_created', { roomId, gameType });
        io.emit('rooms_update'); 

    } catch (e) {
        console.error("Erro createRoom:", e);
    }
};

// --- 3. ENTRAR EM SALA (COM RECONEXÃO) ---
exports.joinSpecificRoom = async (io, socket, { roomId, userEmail, password }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error', { message: 'Sala não encontrada.' });

    // A. LÓGICA DE RECONEXÃO (Se o usuário já estava na sala)
    const existingPlayerIndex = room.playerData.findIndex(p => p.email === userEmail);
    
    if (existingPlayerIndex !== -1) {
        // Atualiza o socket do jogador existente
        room.playerData[existingPlayerIndex].socketId = socket.id;
        room.players[existingPlayerIndex] = socket.id;
        socket.join(roomId);
        
        // Devolve o estado atual pra ele
        socket.emit('reconnect_success', {
            gameType: room.gameType,
            boardState: room.boardState,
            turn: room.playerData[room.turnIndex].socketId,
            isMyTurn: room.turnIndex === existingPlayerIndex,
            opponent: room.playerData.find(p => p.email !== userEmail)?.nome
        });
        console.log(`♻️ Jogador ${userEmail} reconectado na sala ${roomId}`);
        return;
    }

    // B. LÓGICA DE NOVO JOGADOR
    if (room.players.length >= 2) return socket.emit('error', { message: 'Sala cheia.' });
    if (room.config.isPrivate && room.config.password !== password) {
        return socket.emit('error', { message: 'Senha incorreta.' });
    }

    // Cobrança da Aposta (Entrada)
    const betAmount = room.pot; // Paga o mesmo que o criador pôs
    const user = await UsuarioModel.findOne({ email: userEmail });
    if (!user || user.saldo_coins < betAmount) {
        return socket.emit('error', { message: 'Saldo insuficiente.' });
    }

    // Adiciona
    room.players.push(socket.id);
    room.playerData.push({ email: userEmail, nome: user.nome, socketId: socket.id, avatar: user.avatar_slug });
    room.pot += betAmount;
    
    socket.join(roomId);
    io.to(roomId).emit('player_joined', { players: room.playerData, roomId });
    
    // Inicia Jogo
    startGameLogic(io, room);
    io.emit('rooms_update'); 
};

// --- 4. MOVIMENTOS ---
exports.makeMove = async (io, socket, { roomId, move, newState }) => {
    const room = rooms[roomId];
    if (!room) return;

    const currentPlayerSocket = room.playerData[room.turnIndex].socketId;
    if (socket.id !== currentPlayerSocket) return;

    room.boardState = newState;
    room.turnIndex = room.turnIndex === 0 ? 1 : 0;
    const nextPlayerSocket = room.playerData[room.turnIndex].socketId;

    io.to(roomId).emit('move_made', {
        move,
        newState,
        nextTurn: nextPlayerSocket
    });
};

// --- 5. LOGICA DE VITORIA ---
exports.handleWinClaim = async (io, socket, { roomId, winnerSymbol, draw }) => {
    const room = rooms[roomId];
    if (!room) return;
    
    if (draw) {
        io.to(roomId).emit('game_over', { winner: null, prize: 0, draw: true });
        delete rooms[roomId];
        io.emit('rooms_update');
        return;
    }
    await processGameOver(io, roomId, socket.id);
};

// --- AUXILIARES ---
function startGameLogic(io, room) {
    if (!room.boardState) { // Só inicializa se não tiver estado (evita reset em reconexão estranha)
        if (room.gameType === 'velha') room.boardState = Array(9).fill(null);
        if (room.gameType === 'xadrez') room.boardState = 'start';
        if (room.gameType === 'connect4') room.boardState = Array(42).fill(null);
        if (room.gameType === 'damas') {
            const b = Array(64).fill(null);
            for(let i=0; i<24; i++) if((Math.floor(i/8)+i%8)%2===0) b[i]='b';
            for(let i=40; i<64; i++) if((Math.floor(i/8)+i%8)%2===0) b[i]='r';
            room.boardState = b;
        }
    }
    room.status = 'playing';

    io.to(room.id).emit('game_start', {
        gameType: room.gameType, // Importante enviar isso pro front saber o que renderizar!
        boardState: room.boardState,
        turn: room.playerData[0].socketId,
        pot: room.pot
    });
}

async function processGameOver(io, roomId, winnerSocketId) {
    const room = rooms[roomId];
    if(!room) return;

    const winner = room.playerData.find(p => p.socketId === winnerSocketId);
    const loser = room.playerData.find(p => p.socketId !== winnerSocketId);

    if (winner) {
        // Lucro de 60% sobre o pote total (Ex: Pote 20 -> Ganha 12. Lucro liquido de 2)
        // Ajuste conforme seu Tokenomics
        const premio = Math.floor(room.pot * 0.60); 
        
        await UsuarioModel.findOneAndUpdate({ email: winner.email }, { 
            $inc: { saldo_coins: premio, xp: 50 },
            $push: { extrato: { tipo: 'ENTRADA', valor: premio, descricao: `Vitória: ${room.gameType}`, data: new Date() } }
        });
        
        if (loser) await UsuarioModel.findOneAndUpdate({ email: loser.email }, { $inc: { xp: 10 } });

        io.to(roomId).emit('game_over', { winner: winner.nome, prize: premio });
    }
    delete rooms[roomId];
    io.emit('rooms_update');
}