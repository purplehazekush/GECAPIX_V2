// server/controllers/gameController.js
const UsuarioModel = require('../models/Usuario');

// Armazenamento em memória
// Estrutura: { roomId: { id, gameType, players: [], config: { isPrivate, password, timeLimit }, state: {...} } }
let rooms = {}; 

// --- 1. LISTAR SALAS (Para o Lobby) ---
exports.getRooms = (io, socket) => {
    // Retorna array simplificado para o front
    const publicRooms = Object.values(rooms)
        .filter(r => !r.config.isPrivate && r.players.length < 2) // Apenas públicas e não cheias
        .map(r => ({
            id: r.id,
            gameType: r.gameType,
            playersCount: r.players.length,
            bet: r.pot / 2, // Aposta original (aprox)
            creator: r.playerData[0]?.nome || 'Anônimo'
        }));
    
    socket.emit('rooms_list', publicRooms);
};

// --- 2. CRIAR SALA CUSTOMIZADA ---
exports.createRoom = async (io, socket, { gameType, userEmail, betAmount, isPrivate, password, timeLimit }) => {
    try {
        const user = await UsuarioModel.findOne({ email: userEmail });
        if (!user || user.saldo_coins < betAmount) {
            return socket.emit('error', { message: 'Saldo insuficiente.' });
        }

        const roomId = `room_${Math.random().toString(36).substr(2, 6).toUpperCase()}`; // IDs curtos (ex: A4X9)
        
        rooms[roomId] = {
            id: roomId,
            gameType,
            players: [socket.id],
            playerData: [{ 
                email: userEmail, 
                nome: user.nome, 
                socketId: socket.id,
                avatar: user.avatar_slug 
            }],
            pot: betAmount,
            turnIndex: 0,
            boardState: null,
            // Configurações da Sala
            config: {
                isPrivate,
                password: password || null,
                timeLimit: timeLimit || 60, // Segundos por turno (Padrão 60)
            },
            // Timers (Implementaremos na Bateria B)
            timers: { [socket.id]: timeLimit || 60 }, 
            lastMoveTime: Date.now()
        };

        socket.join(roomId);
        socket.emit('room_created', { roomId }); // Avisa o criador que deu certo
        
        // Atualiza a lista para todos no lobby
        io.emit('rooms_update'); 

    } catch (e) {
        console.error("Erro createRoom:", e);
    }
};

// --- 3. ENTRAR EM SALA ESPECÍFICA ---
exports.joinSpecificRoom = async (io, socket, { roomId, userEmail, password }) => {
    const room = rooms[roomId];
    
    // Validações
    if (!room) return socket.emit('error', { message: 'Sala não encontrada.' });
    if (room.players.length >= 2) return socket.emit('error', { message: 'Sala cheia.' });
    if (room.config.isPrivate && room.config.password !== password) {
        return socket.emit('error', { message: 'Senha incorreta.' });
    }

    const user = await UsuarioModel.findOne({ email: userEmail });
    // Assume que a aposta é igual a metade do pote atual (o valor que o criador pôs)
    const betAmount = room.pot; 

    if (!user || user.saldo_coins < betAmount) {
        return socket.emit('error', { message: 'Saldo insuficiente.' });
    }

    // Entra
    room.players.push(socket.id);
    room.playerData.push({ 
        email: userEmail, 
        nome: user.nome, 
        socketId: socket.id,
        avatar: user.avatar_slug 
    });
    room.timers[socket.id] = room.config.timeLimit; // Inicializa tempo do P2
    room.pot += betAmount;

    socket.join(roomId);

    // Notifica início
    io.to(roomId).emit('player_joined', { players: room.playerData, roomId });
    
    // Inicia Lógica do Jogo
    startGameLogic(io, room);
    
    // Remove da lista de "disponíveis"
    io.emit('rooms_update'); 
};

// --- 4. MOVIMENTOS E REGRAS ---
exports.makeMove = async (io, socket, { roomId, move, newState }) => {
    const room = rooms[roomId];
    if (!room) return;

    const currentPlayerSocket = room.playerData[room.turnIndex].socketId;
    if (socket.id !== currentPlayerSocket) return;

    // --- LÓGICA DE TEMPO (BATERIA B - Placeholder) ---
    // Aqui vamos descontar o tempo gasto no futuro
    room.lastMoveTime = Date.now(); 

    room.boardState = newState;
    room.turnIndex = room.turnIndex === 0 ? 1 : 0;
    const nextPlayerSocket = room.playerData[room.turnIndex].socketId;

    io.to(roomId).emit('move_made', {
        move,
        newState,
        nextTurn: nextPlayerSocket
    });
};

// --- AUXILIARES ---
function startGameLogic(io, room) {
    if (room.gameType === 'velha') room.boardState = Array(9).fill(null);
    if (room.gameType === 'xadrez') room.boardState = 'start';
    if (room.gameType === 'connect4') room.boardState = Array(42).fill(null);
    if (room.gameType === 'damas') {
        // Lógica de damas (igual ao anterior)
        const b = Array(64).fill(null);
        for(let i=0; i<24; i++) if((Math.floor(i/8)+i%8)%2===0) b[i]='b';
        for(let i=40; i<64; i++) if((Math.floor(i/8)+i%8)%2===0) b[i]='r';
        room.boardState = b;
    }

    io.to(room.id).emit('game_start', {
        boardState: room.boardState,
        turn: room.playerData[0].socketId,
        pot: room.pot,
        config: room.config // Envia config para o front saber o tempo
    });
    console.log(`🔥 Jogo ${room.gameType} iniciado.`);
}

exports.handleWinClaim = async (io, socket, { roomId, winnerSymbol, draw }) => {
    const room = rooms[roomId];
    if (!room) return;
    
    // Se for empate
    if (draw) {
        io.to(roomId).emit('game_over', { winner: null, prize: 0, draw: true });
        delete rooms[roomId];
        io.emit('rooms_update');
        return;
    }

    // Se for vitória (usa o socketId de quem mandou o claim)
    await processGameOver(io, roomId, socket.id);
};

async function processGameOver(io, roomId, winnerSocketId) {
    const room = rooms[roomId];
    if(!room) return;

    const winner = room.playerData.find(p => p.socketId === winnerSocketId);
    const loser = room.playerData.find(p => p.socketId !== winnerSocketId);

    if (winner) {
        const premio = Math.floor(room.pot * 0.60);
        await UsuarioModel.findOneAndUpdate({ email: winner.email }, { 
            $inc: { saldo_coins: premio, xp: 50 },
            $push: { extrato: { tipo: 'ENTRADA', valor: premio, descricao: `Vitória: ${room.gameType}`, data: new Date() } }
        });
        
        if (loser) {
            await UsuarioModel.findOneAndUpdate({ email: loser.email }, { $inc: { xp: 10 } });
        }

        io.to(roomId).emit('game_over', { winner: winner.nome, prize: premio });
    }
    delete rooms[roomId];
    io.emit('rooms_update'); // Atualiza lobby
}