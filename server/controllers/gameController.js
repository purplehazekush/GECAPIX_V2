const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics'); 

let rooms = {}; 

// --- 1. LISTAR SALAS ---
exports.getRooms = (io, socket) => {
    const publicRooms = Object.values(rooms)
        .filter(r => !r.config.isPrivate && r.players.length < 2)
        .map(r => ({
            id: r.id,
            gameType: r.gameType,
            bet: r.pot / (r.players.length + 1 || 1),
            creator: r.playerData[0]?.nome || 'Anônimo'
        }));
    socket.emit('rooms_list', publicRooms);
};

// --- 2. CRIAR SALA ---
exports.createRoom = async (io, socket, { gameType, userEmail, betAmount, isPrivate, password, timeLimit }) => {
    try {
        const user = await UsuarioModel.findOne({ email: userEmail });
        if (!user) return socket.emit('error', { message: 'Usuário não encontrado.' });

        if (verificarLimiteDiario(user)) {
            return socket.emit('error', { message: `Limite diário de ${TOKEN.GAMES.DAILY_LIMIT} jogos atingido!` });
        }

        if (user.saldo_coins < betAmount) {
            return socket.emit('error', { message: 'Saldo insuficiente.' });
        }

        await UsuarioModel.updateOne(
            { _id: user._id },
            { 
                $inc: { saldo_coins: -betAmount },
                $push: { extrato: { tipo: 'SAIDA', valor: betAmount, descricao: `Aposta: ${gameType}`, data: new Date() } }
            }
        );

        const roomId = `room_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        rooms[roomId] = {
            id: roomId,
            gameType,
            players: [socket.id],
            playerData: [{ 
                email: userEmail, 
                nome: user.nome, 
                socketId: socket.id, 
                avatar: user.avatar_slug || 'default' 
            }],
            pot: betAmount,
            turnIndex: 0,
            boardState: null,
            config: { isPrivate, password, timeLimit: timeLimit || 60 },
            status: 'waiting'
        };

        socket.join(roomId);
        socket.emit('room_created', { roomId, gameType });
        io.emit('rooms_update'); 

    } catch (e) {
        console.error("Erro createRoom:", e);
        socket.emit('error', { message: 'Erro interno ao criar sala.' });
    }
};

// --- 3. ENTRAR EM SALA ---
exports.joinSpecificRoom = async (io, socket, { roomId, userEmail, password }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error', { message: 'Sala não encontrada ou finalizada.' });

    // Reconexão
    const existingPlayerIndex = room.playerData.findIndex(p => p.email === userEmail);
    if (existingPlayerIndex !== -1) {
        room.playerData[existingPlayerIndex].socketId = socket.id;
        room.players[existingPlayerIndex] = socket.id;
        socket.join(roomId);
        
        socket.emit('reconnect_success', {
            gameType: room.gameType,
            boardState: room.boardState,
            turn: room.playerData[room.turnIndex].socketId,
            isMyTurn: room.turnIndex === existingPlayerIndex,
            opponent: room.playerData.find(p => p.email !== userEmail)?.nome
        });
        return;
    }

    // Novo Jogador
    if (room.players.length >= 2) return socket.emit('error', { message: 'Sala cheia.' });
    if (room.config.isPrivate && room.config.password !== password) {
        return socket.emit('error', { message: 'Senha incorreta.' });
    }

    const user = await UsuarioModel.findOne({ email: userEmail });
    if (!user) return socket.emit('error', { message: 'Usuário inválido.' });

    if (verificarLimiteDiario(user)) {
        return socket.emit('error', { message: 'Seu limite diário acabou.' });
    }

    const betAmount = room.pot; 
    if (user.saldo_coins < betAmount) {
        return socket.emit('error', { message: 'Saldo insuficiente.' });
    }

    await UsuarioModel.updateOne(
        { _id: user._id },
        { 
            $inc: { saldo_coins: -betAmount },
            $push: { extrato: { tipo: 'SAIDA', valor: betAmount, descricao: `Aposta: ${room.gameType}`, data: new Date() } }
        }
    );

    room.players.push(socket.id);
    room.playerData.push({ 
        email: userEmail, 
        nome: user.nome, 
        socketId: socket.id, 
        avatar: user.avatar_slug || 'default' 
    });
    room.pot += betAmount;

    socket.join(roomId);
    io.to(roomId).emit('player_joined', { players: room.playerData, roomId });
    
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

    io.to(roomId).emit('move_made', { move, newState, nextTurn: nextPlayerSocket });
};

// --- 5. VITÓRIA ---
exports.handleWinClaim = async (io, socket, { roomId, winnerSymbol, draw }) => {
    const room = rooms[roomId];
    if (!room) return;
    
    if (draw) {
        const apostaOriginal = room.pot / 2;
        for (let player of room.playerData) {
            await UsuarioModel.findOneAndUpdate({ email: player.email }, {
                $inc: { saldo_coins: apostaOriginal, jogos_hoje: 1 },
                $set: { ultimo_jogo_data: new Date() },
                $push: { extrato: { tipo: 'ENTRADA', valor: apostaOriginal, descricao: `Reembolso Empate: ${room.gameType}`, data: new Date() } }
            });
        }
        io.to(roomId).emit('game_over', { winner: null, prize: 0, draw: true });
        delete rooms[roomId];
        io.emit('rooms_update');
        return;
    }
    await processGameOver(io, roomId, socket.id);
};

// --- 🔥 A CORREÇÃO DO CRASH ---
exports.handleDisconnect = (io, socket) => {
    // Apenas logamos por enquanto. No futuro, podemos iniciar um timer de W.O.
    // O importante é NÃO deixar o servidor crashar por falta dessa função.
    console.log(`🔌 Socket desconectado: ${socket.id}`);
};

// --- AUXILIARES ---
function verificarLimiteDiario(user) {
    const hoje = new Date().setHours(0,0,0,0);
    const ultimoJogo = user.ultimo_jogo_data ? new Date(user.ultimo_jogo_data).setHours(0,0,0,0) : 0;
    let jogosHoje = user.jogos_hoje || 0;
    if (hoje > ultimoJogo) jogosHoje = 0;
    return jogosHoje >= TOKEN.GAMES.DAILY_LIMIT;
}

function startGameLogic(io, room) {
    if (!room.boardState) { 
        if (room.gameType === 'velha') room.boardState = Array(9).fill(null);
        
        // --- CORREÇÃO AQUI ---
        // Em vez de 'start', usamos o FEN oficial da posição inicial
        if (room.gameType === 'xadrez') room.boardState = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        
        if (room.gameType === 'connect4') room.boardState = Array(42).fill(null);
        if (room.gameType === 'damas') {
            const b = Array(64).fill(null);
            for(let i=0; i<24; i++) if((Math.floor(i/8)+i%8)%2===0) b[i]='b';
            for(let i=40; i<64; i++) if((Math.floor(i/8)+i%8)%2===0) b[i]='r';
            room.boardState = b;
        }
    }
    // ... resto da função
}

async function processGameOver(io, roomId, winnerSocketId) {
    const room = rooms[roomId];
    if(!room) return;

    const winner = room.playerData.find(p => p.socketId === winnerSocketId);
    const loser = room.playerData.find(p => p.socketId !== winnerSocketId);

    if (winner) {
        const premio = Math.floor(room.pot * 0.60); 
        await UsuarioModel.findOneAndUpdate({ email: winner.email }, { 
            $inc: { saldo_coins: premio, xp: TOKEN.XP.GAME_WIN, jogos_hoje: 1 },
            $set: { ultimo_jogo_data: new Date() },
            $push: { extrato: { tipo: 'ENTRADA', valor: premio, descricao: `Vitória: ${room.gameType}`, data: new Date() } }
        });
        
        if (loser) await UsuarioModel.findOneAndUpdate({ email: loser.email }, { 
            $inc: { xp: TOKEN.XP.GAME_LOSS, jogos_hoje: 1 },
            $set: { ultimo_jogo_data: new Date() } 
        });

        io.to(roomId).emit('game_over', { winner: winner.nome, prize: premio });
    }
    delete rooms[roomId];
    io.emit('rooms_update');
}