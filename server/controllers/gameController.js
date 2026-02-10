const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics');
const { Chess } = require('chess.js'); // A engine oficial de xadrez

let rooms = {};

// ==========================================
// 1. UTILITÁRIOS DE JOGO (Lógica Pura)
// ==========================================

// ... imports ...

const checkWinnerConnect4 = (board) => {
    // Helper para pegar célula segura (retorna null se sair da borda)
    const getCell = (r, c) => (r < 0 || r >= 6 || c < 0 || c >= 7) ? null : board[r * 7 + c];
    
    // Varre todo o tabuleiro
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            const p = getCell(r, c);
            if (!p) continue;
            
            // Checa 4 direções: Direita, Baixo, Diagonal Dir-Baixo, Diagonal Esq-Baixo
            const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
            
            for (let [dr, dc] of directions) {
                let match = true;
                // Verifica os próximos 3 na direção
                for (let k = 1; k < 4; k++) {
                    if (getCell(r + dr * k, c + dc * k) !== p) { 
                        match = false; 
                        break; 
                    }
                }
                if (match) return p; // Retorna 'red' ou 'yellow'
            }
        }
    }
    return null;
}

// ... exports.getRooms ...

const checkWinnerVelha = (board) => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(let i of lines) {
        const [a,b,c] = i;
        if(board[a] && board[a]===board[b] && board[a]===board[c]) return board[a];
    }
    return null;
};

// ==========================================
// 2. CONTROLLER PRINCIPAL
// ==========================================

exports.getRooms = (io, socket) => {
    const availableRooms = Object.values(rooms)
        // REMOVI O "!r.config.isPrivate"
        // Agora mostramos privadas, desde que não estejam cheias ou já jogando
        .filter(r => r.players.length < 2 && r.status === 'waiting')
        .map(r => ({
            id: r.id,
            gameType: r.gameType,
            bet: r.pot, 
            creator: r.playerData[0]?.nome || 'Host',
            isPrivate: r.config.isPrivate // Importante enviar essa flag pro Front desenhar o cadeado
        }));
    socket.emit('rooms_list', availableRooms);
};

exports.createRoom = async (io, socket, { gameType, userEmail, betAmount, isPrivate, password, timeLimit }) => {
    try {
        const user = await UsuarioModel.findOne({ email: userEmail });
        if (!user) return socket.emit('error', { message: 'Usuário não encontrado.' });
        if (user.saldo_coins < betAmount) return socket.emit('error', { message: 'Saldo insuficiente.' });

        // Debita a aposta (Custódia)
        await UsuarioModel.updateOne({ _id: user._id }, { 
            $inc: { saldo_coins: -betAmount },
            $push: { extrato: { tipo: 'SAIDA', valor: betAmount, descricao: `Aposta Bloqueada: ${gameType}`, data: new Date() } }
        });

        const roomId = `room_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        // Estado Inicial Server-Side
        let initialBoard = null;
        if (gameType === 'velha') initialBoard = Array(9).fill(null);
        if (gameType === 'xadrez') initialBoard = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        if (gameType === 'connect4') initialBoard = Array(42).fill(null);
        if (gameType === 'damas') initialBoard = Array(64).fill(null); // Placeholder

        rooms[roomId] = {
            id: roomId,
            gameType,
            players: [socket.id],
            playerData: [{ email: userEmail, nome: user.nome, socketId: socket.id, avatar: user.avatar_slug }],
            pot: betAmount,
            turnIndex: 0,
            boardState: initialBoard, // O SERVIDOR É O DONO DISSO
            config: { isPrivate, password, timeLimit: timeLimit || 60 },
            status: 'waiting',
            lastMoveTime: Date.now()
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

    // Lógica de Reconexão (Segurança: Verifica Email)
    const existingIdx = room.playerData.findIndex(p => p.email === userEmail);
    if (existingIdx !== -1) {
        room.playerData[existingIdx].socketId = socket.id;
        room.players[existingIdx] = socket.id;
        socket.join(roomId);
        
        // Envia estado atual para quem reconectou
        socket.emit('reconnect_success', {
            gameType: room.gameType,
            boardState: room.boardState,
            isMyTurn: room.turnIndex === existingIdx,
            opponent: room.playerData.find(p => p.email !== userEmail)?.nome
        });
        return;
    }

    // Novo Jogador
    if (room.players.length >= 2) return socket.emit('error', { message: 'Sala cheia.' });
    if (room.config.isPrivate && room.config.password !== password) return socket.emit('error', { message: 'Senha incorreta.' });

    const user = await UsuarioModel.findOne({ email: userEmail });
    if (!user || user.saldo_coins < room.pot) return socket.emit('error', { message: 'Saldo insuficiente.' });

    // Debita Aposta
    await UsuarioModel.updateOne({ _id: user._id }, { 
        $inc: { saldo_coins: -room.pot },
        $push: { extrato: { tipo: 'SAIDA', valor: room.pot, descricao: `Aposta: ${room.gameType}`, data: new Date() } }
    });

    room.players.push(socket.id);
    room.playerData.push({ email: userEmail, nome: user.nome, socketId: socket.id, avatar: user.avatar_slug });
    room.pot += room.pot; // Dobra o pote (aposta casada)
    room.status = 'playing';

    socket.join(roomId);
    
    // Inicia Jogo
    io.to(roomId).emit('player_joined', { players: room.playerData });
    io.to(roomId).emit('game_start', { 
        gameType: room.gameType, 
        boardState: room.boardState, 
        turn: room.players[room.turnIndex], // Manda o SocketID de quem começa
        players: room.playerData
    });
    io.emit('rooms_update');
};

// ==========================================
// 3. O CORAÇÃO DA SEGURANÇA (MAKE MOVE)
// ==========================================
exports.makeMove = async (io, socket, { roomId, moveData }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'playing') return;

    // Log para debug
    console.log(`[MOVE] Sala: ${roomId} | Player: ${socket.id} | Turno Atual Index: ${room.turnIndex}`);

    // 1. Valida Turno (Segurança)
    // Compara com o socketId salvo no playerData para ser mais preciso
    const currentPlayer = room.playerData[room.turnIndex];
    if (currentPlayer.socketId !== socket.id) {
        console.warn(`[MOVE BLOQUEADO] Tentativa de ${socket.id} fora de vez.`);
        return socket.emit('error', { message: 'Não é sua vez!' });
    }

    let nextState = null;
    let winnerIndex = null; // 0, 1 ou 'draw'

    // --- LÓGICA ESPECÍFICA POR JOGO ---
    
    // A. JOGO DA VELHA
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

    // B. XADREZ
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

    // C. CONNECT 4
    else if (room.gameType === 'connect4') {
        const col = moveData.colIndex;
        if (col === undefined || col < 0 || col > 6) return;

        // Gravidade
        let rowToFill = -1;
        for (let r = 5; r >= 0; r--) {
            if (!room.boardState[r * 7 + col]) {
                rowToFill = r;
                break;
            }
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

    // --- APLICAÇÃO DO ESTADO ---
    if (nextState) {
        room.boardState = nextState;
        
        if (winnerIndex !== null) {
            await processEndGame(io, room, winnerIndex);
        } else {
            // Troca o turno
            room.turnIndex = room.turnIndex === 0 ? 1 : 0;
            
            // Pega o socket ATUALIZADO do próximo jogador
            const nextPlayer = room.playerData[room.turnIndex];
            
            console.log(`[MOVE SUCESSO] Próximo Turno: ${nextPlayer.nome} (${nextPlayer.socketId})`);

            io.to(roomId).emit('move_made', { 
                newState: nextState, 
                nextTurn: nextPlayer.socketId // Envia o ID correto
            });
        }
    }
};

// Não existe mais 'handleWinClaim' público. O servidor decide.
exports.handleWinClaim = () => {}; 

exports.handleDisconnect = (io, socket) => {
    // TODO: Implementar timer de reconexão (se não voltar em 60s, perde por W.O.)
    console.log(`🔌 Player caiu: ${socket.id}`);
};

// ==========================================
// 4. PAGAMENTO (O COFRE)
// ==========================================
async function processEndGame(io, room, result) {
    const winnerData = result === 'draw' ? null : room.playerData[result];
    const loserData = result === 'draw' ? null : room.playerData[result === 0 ? 1 : 0];

    // Taxa da Casa (5%)
    const tax = Math.floor(room.pot * TOKEN.GAMES.TAX_RATE);
    const prize = room.pot - tax;

    if (result === 'draw') {
        // Devolve dinheiro (menos taxa ou integral? Vamos devolver integral no empate)
        const reembolso = room.pot / 2;
        for (let p of room.playerData) {
            await UsuarioModel.updateOne({ email: p.email }, { 
                $inc: { saldo_coins: reembolso },
                $push: { extrato: { tipo: 'ENTRADA', valor: reembolso, descricao: 'Reembolso: Empate', data: new Date() } }
            });
        }
        io.to(room.id).emit('game_over', { winner: null, draw: true });
    } else {
        // Paga Vencedor
        await UsuarioModel.updateOne({ email: winnerData.email }, {
            $inc: { saldo_coins: prize, xp: TOKEN.XP.GAME_WIN },
            $push: { extrato: { tipo: 'ENTRADA', valor: prize, descricao: `Vitória: ${room.gameType}`, data: new Date() } }
        });
        // XP de Consolação
        await UsuarioModel.updateOne({ email: loserData.email }, {
            $inc: { xp: TOKEN.XP.GAME_LOSS }
        });

        io.to(room.id).emit('game_over', { winner: winnerData.nome, prize, draw: false });
    }

    room.status = 'finished';
    delete rooms[room.id];
    io.emit('rooms_update');
}