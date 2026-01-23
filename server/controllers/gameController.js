// server/controllers/gameController.js
const UsuarioModel = require('../models/Usuario');
const TOKEN = require('../config/tokenomics'); // Certifique-se que o arquivo existe

// Armazenamento em memória das salas
// Estrutura: { roomId: { id, gameType, players: [], playerData: [], pot: 0, ... } }
let rooms = {}; 

// --- 1. LISTAR SALAS PÚBLICAS (Para o Lobby) ---
exports.getRooms = (io, socket) => {
    const publicRooms = Object.values(rooms)
        .filter(r => !r.config.isPrivate && r.players.length < 2)
        .map(r => ({
            id: r.id,
            gameType: r.gameType,
            // Se tem 1 jogador, a aposta é o pote atual. Se 0, é 0.
            bet: r.players.length > 0 ? r.pot : 0, 
            creator: r.playerData[0]?.nome || 'Anônimo'
        }));
    
    socket.emit('rooms_list', publicRooms);
};

// --- 2. CRIAR SALA ---
exports.createRoom = async (io, socket, { gameType, userEmail, betAmount, isPrivate, password, timeLimit }) => {
    try {
        const user = await UsuarioModel.findOne({ email: userEmail });
        if (!user) return socket.emit('error', { message: 'Usuário não encontrado.' });

        // A. Validação de Limite Diário
        if (verificarLimiteDiario(user)) {
            return socket.emit('error', { message: `Limite diário de ${TOKEN.GAMES.DAILY_LIMIT} jogos atingido!` });
        }

        // B. Validação de Saldo
        if (user.saldo_coins < betAmount) {
            return socket.emit('error', { message: 'Saldo insuficiente.' });
        }

        // C. Desconta aposta IMEDIATAMENTE (Atomicamente) para evitar fraude
        await UsuarioModel.updateOne(
            { _id: user._id },
            { 
                $inc: { saldo_coins: -betAmount },
                $push: { extrato: { tipo: 'SAIDA', valor: betAmount, descricao: `Aposta: ${gameType}`, data: new Date() } }
            }
        );

        // D. Cria a Sala na Memória
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
            pot: betAmount, // O pote começa com a aposta do criador
            turnIndex: 0,
            boardState: null,
            config: { isPrivate, password, timeLimit: timeLimit || 60 },
            status: 'waiting'
        };

        socket.join(roomId);
        socket.emit('room_created', { roomId, gameType });
        io.emit('rooms_update'); // Avisa o lobby

    } catch (e) {
        console.error("Erro createRoom:", e);
        socket.emit('error', { message: 'Erro interno ao criar sala.' });
    }
};

// --- 3. ENTRAR EM SALA (Join / Reconnect) ---
exports.joinSpecificRoom = async (io, socket, { roomId, userEmail, password }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit('error', { message: 'Sala não encontrada ou finalizada.' });

    // A. LÓGICA DE RECONEXÃO (F5 na página)
    const existingPlayerIndex = room.playerData.findIndex(p => p.email === userEmail);
    
    if (existingPlayerIndex !== -1) {
        // Atualiza Socket ID
        room.playerData[existingPlayerIndex].socketId = socket.id;
        room.players[existingPlayerIndex] = socket.id;
        socket.join(roomId);
        
        // Devolve o estado do jogo para o jogador voltar
        socket.emit('reconnect_success', {
            gameType: room.gameType,
            boardState: room.boardState,
            turn: room.playerData[room.turnIndex].socketId,
            isMyTurn: room.turnIndex === existingPlayerIndex,
            opponent: room.playerData.find(p => p.email !== userEmail)?.nome
        });
        return;
    }

    // B. LÓGICA DE NOVO JOGADOR (Desafiante)
    if (room.players.length >= 2) return socket.emit('error', { message: 'Sala cheia.' });
    if (room.config.isPrivate && room.config.password !== password) {
        return socket.emit('error', { message: 'Senha incorreta.' });
    }

    const user = await UsuarioModel.findOne({ email: userEmail });
    if (!user) return socket.emit('error', { message: 'Usuário inválido.' });

    // Validações
    if (verificarLimiteDiario(user)) {
        return socket.emit('error', { message: 'Seu limite diário acabou.' });
    }

    // Aposta do Desafiante deve ser igual à aposta inicial do Criador
    // (Pote atual tem a aposta do criador, então a aposta de entrada é igual ao pote atual)
    const betAmount = room.pot; 

    if (user.saldo_coins < betAmount) {
        return socket.emit('error', { message: 'Saldo insuficiente.' });
    }

    // Desconta Aposta Atomicamente
    await UsuarioModel.updateOne(
        { _id: user._id },
        { 
            $inc: { saldo_coins: -betAmount },
            $push: { extrato: { tipo: 'SAIDA', valor: betAmount, descricao: `Aposta: ${room.gameType}`, data: new Date() } }
        }
    );

    // Atualiza Sala
    room.players.push(socket.id);
    room.playerData.push({ 
        email: userEmail, 
        nome: user.nome, 
        socketId: socket.id, 
        avatar: user.avatar_slug || 'default' 
    });
    room.pot += betAmount; // Pote dobra (Ex: 10 + 10 = 20)

    socket.join(roomId);
    
    // Notifica players
    io.to(roomId).emit('player_joined', { players: room.playerData, roomId });
    
    // Inicia a Lógica do Tabuleiro
    startGameLogic(io, room);
    
    // Remove do Lobby (pois encheu)
    io.emit('rooms_update'); 
};

// --- 4. REALIZAR MOVIMENTO ---
exports.makeMove = async (io, socket, { roomId, move, newState }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Segurança: Só quem é a vez pode mover
    const currentPlayerSocket = room.playerData[room.turnIndex].socketId;
    if (socket.id !== currentPlayerSocket) return;

    // Atualiza Estado
    room.boardState = newState;
    
    // Passa a Vez
    room.turnIndex = room.turnIndex === 0 ? 1 : 0;
    const nextPlayerSocket = room.playerData[room.turnIndex].socketId;

    io.to(roomId).emit('move_made', {
        move,
        newState,
        nextTurn: nextPlayerSocket
    });
};

// --- 5. REIVINDICAR VITÓRIA ---
exports.handleWinClaim = async (io, socket, { roomId, winnerSymbol, draw }) => {
    const room = rooms[roomId];
    if (!room) return;
    
    // EMPATE
    if (draw) {
        // Devolve o dinheiro de todos (Reembolso)
        const apostaOriginal = room.pot / 2;
        
        for (let player of room.playerData) {
            await UsuarioModel.findOneAndUpdate({ email: player.email }, {
                $inc: { saldo_coins: apostaOriginal, jogos_hoje: 1 }, // Conta como jogo, mas devolve grana
                $set: { ultimo_jogo_data: new Date() },
                $push: { extrato: { tipo: 'ENTRADA', valor: apostaOriginal, descricao: `Reembolso Empate: ${room.gameType}`, data: new Date() } }
            });
        }

        io.to(roomId).emit('game_over', { winner: null, prize: 0, draw: true });
        delete rooms[roomId];
        io.emit('rooms_update');
        return;
    }

    // VITÓRIA (Chama a função de pagamento)
    // Confiamos no socketId de quem enviou o claim para identificar o vencedor
    await processGameOver(io, roomId, socket.id);
};

// ==========================================
//              FUNÇÕES AUXILIARES
// ==========================================

function verificarLimiteDiario(user) {
    const hoje = new Date().setHours(0,0,0,0);
    const ultimoJogo = user.ultimo_jogo_data ? new Date(user.ultimo_jogo_data).setHours(0,0,0,0) : 0;

    // Se mudou o dia, reseta mentalmente (o banco atualiza no fim do jogo)
    let jogosHoje = user.jogos_hoje || 0;
    if (hoje > ultimoJogo) {
        jogosHoje = 0;
    }

    return jogosHoje >= TOKEN.GAMES.DAILY_LIMIT;
}

function startGameLogic(io, room) {
    // Inicializa tabuleiro se estiver vazio
    if (!room.boardState) {
        if (room.gameType === 'velha') room.boardState = Array(9).fill(null);
        if (room.gameType === 'xadrez') room.boardState = 'start';
        if (room.gameType === 'connect4') room.boardState = Array(42).fill(null);
        if (room.gameType === 'damas') {
            const b = Array(64).fill(null);
            for(let i=0; i<24; i++) if((Math.floor(i/8)+i%8)%2===0) b[i]='b'; // Black
            for(let i=40; i<64; i++) if((Math.floor(i/8)+i%8)%2===0) b[i]='r'; // Red
            room.boardState = b;
        }
    }
    room.status = 'playing';

    io.to(room.id).emit('game_start', {
        gameType: room.gameType,
        boardState: room.boardState,
        turn: room.playerData[0].socketId, // Player 1 começa
        pot: room.pot,
        config: room.config
    });
}

async function processGameOver(io, roomId, winnerSocketId) {
    const room = rooms[roomId];
    if(!room) return;

    const winner = room.playerData.find(p => p.socketId === winnerSocketId);
    const loser = room.playerData.find(p => p.socketId !== winnerSocketId);

    if (winner && loser) {
        // --- CÁLCULO ECONÔMICO (Inflationary Model) ---
        // Pote Total = Aposta P1 + Aposta P2 (Ex: 10 + 10 = 20)
        
        // Vencedor: Ganha 60% do Pote Total
        const premioVencedor = Math.floor(room.pot * 0.60); // 20 * 0.6 = 12
        
        // Perdedor: Recebe de volta sua aposta original (50% do pote)
        const reembolsoPerdedor = Math.floor(room.pot * 0.50); // 20 * 0.5 = 10

        // Resultado Final:
        // Vencedor: Pagou 10, Recebeu 12. Lucro +2.
        // Perdedor: Pagou 10, Recebeu 10. Lucro 0.
        // Custo do Sistema: +2 Coins criadas (Inflação).

        // ATUALIZA VENCEDOR
        await UsuarioModel.findOneAndUpdate({ email: winner.email }, { 
            $inc: { saldo_coins: premioVencedor, xp: TOKEN.XP.GAME_WIN, jogos_hoje: 1 },
            $set: { ultimo_jogo_data: new Date() },
            $push: { extrato: { tipo: 'ENTRADA', valor: premioVencedor, descricao: `Vitória: ${room.gameType}`, data: new Date() } }
        });
        
        // ATUALIZA PERDEDOR
        await UsuarioModel.findOneAndUpdate({ email: loser.email }, { 
            $inc: { saldo_coins: reembolsoPerdedor, xp: TOKEN.XP.GAME_LOSS, jogos_hoje: 1 },
            $set: { ultimo_jogo_data: new Date() },
            $push: { extrato: { tipo: 'ENTRADA', valor: reembolsoPerdedor, descricao: `Reembolso: ${room.gameType}`, data: new Date() } }
        });

        io.to(roomId).emit('game_over', { 
            winner: winner.nome, 
            prize: premioVencedor 
        });
    }

    // Destrói a sala
    delete rooms[roomId];
    io.emit('rooms_update');
}