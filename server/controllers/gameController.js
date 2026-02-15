const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');
const { Chess } = require('chess.js');

let rooms = {};

// ==========================================
// 1. UTILITÁRIOS & REGRAS
// ==========================================

const checkWinnerConnect4 = (board) => {
    const getCell = (r, c) => (r < 0 || r >= 6 || c < 0 || c >= 7) ? null : board[r * 7 + c];
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            const p = getCell(r, c);
            if (!p) continue;
            const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
            for (let [dr, dc] of directions) {
                let match = true;
                for (let k = 1; k < 4; k++) {
                    if (getCell(r + dr * k, c + dc * k) !== p) { match = false; break; }
                }
                if (match) return p;
            }
        }
    }
    return null;
}

const checkWinnerVelha = (board) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(let i of lines) {
        const [a,b,c] = i;
        if(board[a] && board[a]===board[b] && board[a]===board[c]) return board[a];
    }
    return null;
};

// 🔥 NOVO: Verificador de Limite Diário
const checkDailyLimit = async (user) => {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    const ultimoJogo = user.ultimo_jogo_data ? new Date(user.ultimo_jogo_data) : new Date(0);
    ultimoJogo.setHours(0,0,0,0);

    // Se o último jogo não foi hoje, reseta o contador
    if (ultimoJogo.getTime() < hoje.getTime()) {
        user.jogos_hoje = 0;
    }

    if (user.jogos_hoje >= TOKEN.GAMES.DAILY_LIMIT) {
        return false; // Bloqueia
    }
    
    return true; // Libera
};

// ==========================================
// 2. CONTROLLER PRINCIPAL
// ==========================================

exports.getRooms = (io, socket) => {
    const availableRooms = Object.values(rooms)
        .filter(r => r.players.length < 2 && r.status === 'waiting')
        .map(r => ({
            id: r.id,
            gameType: r.gameType,
            bet: r.pot, 
            creator: r.playerData[0]?.nome || 'Host',
            isPrivate: r.config.isPrivate
        }));
    socket.emit('rooms_list', availableRooms);
};

exports.createRoom = async (io, socket, { gameType, userEmail, betAmount, isPrivate, password, timeLimit }) => {
    try {
        const user = await UsuarioModel.findOne({ email: userEmail });
        if (!user) return socket.emit('error', { message: 'Usuário não encontrado.' });
        
        // Check de Limite
        if (!(await checkDailyLimit(user))) {
            return socket.emit('error', { message: 'Limite diário de partidas atingido (5/5).' });
        }

        if (user.saldo_coins < betAmount) return socket.emit('error', { message: 'Saldo insuficiente.' });
        if (gameType === 'damas') return socket.emit('error', { message: 'Jogo desativado temporariamente.' });

        // Debita e Incrementa Contador
        await UsuarioModel.updateOne({ _id: user._id }, { 
            $inc: { saldo_coins: -betAmount, jogos_hoje: 1 },
            $set: { ultimo_jogo_data: new Date() }, // Marca que jogou hoje
            $push: { extrato: { tipo: 'SAIDA', valor: betAmount, descricao: `Aposta: ${gameType}`, categoria: 'GAME', data: new Date() } }
        });

        const roomId = `room_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        let initialBoard = null;
        if (gameType === 'velha') initialBoard = Array(9).fill(null);
        if (gameType === 'xadrez') initialBoard = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        if (gameType === 'connect4') initialBoard = Array(42).fill(null);

        const timeLimitSeconds = timeLimit || 600;

        rooms[roomId] = {
            id: roomId,
            gameType,
            players: [socket.id],
            playerData: [{ email: userEmail, nome: user.nome, socketId: socket.id, avatar: user.avatar_slug }],
            pot: betAmount,
            turnIndex: 0,
            boardState: initialBoard,
            config: { isPrivate, password },
            status: 'waiting',
            initialTime: timeLimitSeconds,
            timers: [timeLimitSeconds, timeLimitSeconds],
            lastMoveTime: null 
        };

        socket.join(roomId);
        socket.emit('room_created', { roomId, gameType });
        io.emit('rooms_update');

    } catch (e) {
        console.error(e);
        socket.emit('error', { message: 'Erro ao criar sala.' });
    }
};

exports.joinSpecificRoom = async (io, socket, { roomId, userEmail, password }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error', { message: 'Sala inexistente.' });

    // RECONEXÃO (Não conta como novo jogo)
    const existingIdx = room.playerData.findIndex(p => p.email === userEmail);
    if (existingIdx !== -1) {
        room.playerData[existingIdx].socketId = socket.id;
        room.players[existingIdx] = socket.id;
        socket.join(roomId);
        
        let currentTimers = [...room.timers];
        if (room.status === 'playing' && room.lastMoveTime) {
            const now = Date.now();
            const timeSpent = (now - room.lastMoveTime) / 1000;
            currentTimers[room.turnIndex] -= timeSpent;
        }

        socket.emit('reconnect_success', {
            gameType: room.gameType,
            boardState: room.boardState,
            isMyTurn: room.turnIndex === existingIdx,
            opponent: room.playerData.find(p => p.email !== userEmail)?.nome,
            timers: currentTimers
        });
        return;
    }

    // NOVO JOGADOR
    if (room.players.length >= 2) return socket.emit('error', { message: 'Sala cheia.' });
    if (room.config.isPrivate && room.config.password !== password) return socket.emit('error', { message: 'Senha incorreta.' });

    const user = await UsuarioModel.findOne({ email: userEmail });
    if (!user) return socket.emit('error', { message: 'Usuário não encontrado.' });

    // Check de Limite
    if (!(await checkDailyLimit(user))) {
        return socket.emit('error', { message: 'Limite diário de partidas atingido (5/5).' });
    }

    if (user.saldo_coins < room.pot) return socket.emit('error', { message: 'Saldo insuficiente.' });

    // Debita e Incrementa Contador
    await UsuarioModel.updateOne({ _id: user._id }, { 
        $inc: { saldo_coins: -room.pot, jogos_hoje: 1 },
        $set: { ultimo_jogo_data: new Date() },
        $push: { extrato: { tipo: 'SAIDA', valor: room.pot, descricao: `Aposta: ${room.gameType}`, categoria: 'GAME', data: new Date() } }
    });

    room.players.push(socket.id);
    room.playerData.push({ email: userEmail, nome: user.nome, socketId: socket.id, avatar: user.avatar_slug });
    room.pot += room.pot;
    room.status = 'playing';

    socket.join(roomId);
    
    // Sorteio e Cores
    room.turnIndex = Math.random() < 0.5 ? 0 : 1; 
    
    const p1 = room.playerData[0];
    const p2 = room.playerData[1];

    if (room.gameType === 'xadrez') {
        p1.color = room.turnIndex === 0 ? 'white' : 'black';
        p2.color = room.turnIndex === 1 ? 'white' : 'black';
    } else {
        p1.color = 'p1_color'; 
        p2.color = 'p2_color';
    }

    io.to(roomId).emit('player_joined', { players: room.playerData });
    
    room.lastMoveTime = Date.now();

    io.to(roomId).emit('game_start', { 
        gameType: room.gameType, 
        boardState: room.boardState, 
        turn: room.players[room.turnIndex],
        players: room.playerData,
        nextTurnEmail: room.playerData[room.turnIndex].email,
        timers: room.timers
    });
    
    io.emit('rooms_update');
};

// ==========================================
// 3. MOVIMENTO E FIM DE JOGO
// ==========================================

exports.makeMove = async (io, socket, { roomId, moveData }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;

    const currentPlayer = room.playerData[room.turnIndex];
    if (currentPlayer.socketId !== socket.id) {
        return socket.emit('error', { message: 'Não é sua vez!' });
    }

    const now = Date.now();
    const lastTime = room.lastMoveTime || now;
    const timeSpent = (now - lastTime) / 1000;
    
    room.timers[room.turnIndex] -= timeSpent;
    room.lastMoveTime = now;

    if (room.timers[room.turnIndex] <= 0) {
        room.timers[room.turnIndex] = 0;
        const winnerIndex = room.turnIndex === 0 ? 1 : 0;
        await processEndGame(io, room, winnerIndex);
        io.to(roomId).emit('game_over_timeout', { loser: room.turnIndex });
        return;
    }

    let nextState = null;
    let winnerIndex = null;

    if (room.gameType === 'velha') {
        const idx = moveData.index;
        if (room.boardState[idx] !== null) return;
        const symbol = room.turnIndex === 0 ? 'X' : 'O';
        const newBoard = [...room.boardState];
        newBoard[idx] = symbol;
        nextState = newBoard;
        const winSymbol = checkWinnerVelha(newBoard);
        if (winSymbol) winnerIndex = room.turnIndex;
        else if (newBoard.every(c => c !== null)) winnerIndex = 'draw';
    }

    else if (room.gameType === 'xadrez') {
        try {
            const chess = new Chess(room.boardState);
            const move = chess.move(moveData); 
            if (!move) return socket.emit('error', { message: 'Movimento ilegal' });
            nextState = chess.fen();
            if (chess.isCheckmate()) winnerIndex = room.turnIndex;
            else if (chess.isDraw() || chess.isStalemate()) winnerIndex = 'draw';
        } catch (e) { return; }
    }

    else if (room.gameType === 'connect4') {
        const col = moveData.colIndex;
        let rowToFill = -1;
        for (let r = 5; r >= 0; r--) {
            if (!room.boardState[r * 7 + col]) { rowToFill = r; break; }
        }
        if (rowToFill === -1) return;
        
        const symbol = room.turnIndex === 0 ? 'red' : 'yellow';
        const newBoard = [...room.boardState];
        newBoard[rowToFill * 7 + col] = symbol;
        nextState = newBoard;
        
        const winSymbol = checkWinnerConnect4(newBoard);
        if (winSymbol) winnerIndex = room.turnIndex;
        else if (newBoard.every(c => c !== null)) winnerIndex = 'draw';
    }

    if (nextState) {
        room.boardState = nextState;
        
        if (winnerIndex !== null) {
            await processEndGame(io, room, winnerIndex);
        } else {
            room.turnIndex = room.turnIndex === 0 ? 1 : 0;
            const nextPlayer = room.playerData[room.turnIndex];
            
            io.to(roomId).emit('move_made', { 
                newState: nextState, 
                nextTurnEmail: nextPlayer.email,
                timers: room.timers 
            });
        }
    }
};

exports.claimTimeout = async (io, socket, { roomId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;

    const now = Date.now();
    const lastTime = room.lastMoveTime || now;
    const timeSpent = (now - lastTime) / 1000;

    room.timers[room.turnIndex] -= timeSpent;
    room.lastMoveTime = now;

    // Tolerância de 2s para lag
    if (room.timers[room.turnIndex] <= 2) {
        room.timers[room.turnIndex] = 0;
        const loserIndex = room.turnIndex;
        const winnerIndex = loserIndex === 0 ? 1 : 0; 
        
        await processEndGame(io, room, winnerIndex);
        io.to(roomId).emit('game_over_timeout', { loser: loserIndex });
    } else {
        socket.emit('sync_timer', { timers: room.timers });
    }
};

exports.handleWinClaim = () => {}; 
exports.handleDisconnect = (io, socket) => {};

// ==========================================
// 4. PAGAMENTO E FINALIZAÇÃO
// ==========================================
async function processEndGame(io, room, result) {
    const winnerData = result === 'draw' ? null : room.playerData[result];
    const loserData = result === 'draw' ? null : room.playerData[result === 0 ? 1 : 0];
    
    const tax = Math.floor(room.pot * TOKEN.GAMES.TAX_RATE);
    const prize = room.pot - tax;

    if (result === 'draw') {
        // EMPATE: Reembolso Integral (Sem taxas)
        const reembolso = room.pot / 2;
        for (let p of room.playerData) {
            await UsuarioModel.updateOne({ email: p.email }, { 
                $inc: { saldo_coins: reembolso },
                $push: { extrato: { tipo: 'ENTRADA', valor: reembolso, descricao: 'Reembolso: Empate', categoria: 'GAME', data: new Date() } }
            });
        }
        io.to(room.id).emit('game_over', { winner: null, draw: true });
    } else {
        // VITÓRIA
        await UsuarioModel.updateOne({ email: winnerData.email }, {
            $inc: { saldo_coins: prize, xp: TOKEN.XP.GAME_WIN },
            $push: { extrato: { tipo: 'ENTRADA', valor: prize, descricao: `Vitória: ${room.gameType}`, categoria: 'GAME', data: new Date() } }
        });
        // XP de Consolação para o perdedor
        await UsuarioModel.updateOne({ email: loserData.email }, {
            $inc: { xp: TOKEN.XP.GAME_LOSS }
        });

        // Coleta da Taxa para o Tesouro
        if (tax > 0) {
             await UsuarioModel.updateOne({ email: TOKEN.WALLETS.TREASURY }, {
                $inc: { saldo_coins: tax },
                $push: { extrato: { tipo: 'ENTRADA', valor: tax, descricao: `Taxa Jogo: ${room.gameType}`, categoria: 'SYSTEM', data: new Date() } }
            });
        }

        io.to(room.id).emit('game_over', { winner: winnerData.nome, prize, draw: false });
    }

    room.status = 'finished';
    delete rooms[room.id];
    io.emit('rooms_update');
}