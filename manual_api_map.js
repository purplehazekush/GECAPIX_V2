/**
 * MAPA MANUAL DE ROTAS -> CONTROLLERS
 * Este arquivo serve como um "link dedicado" para garantir que a navegação
 * do visualizador funcione mesmo quando o regex automático falha.
 */

const MANUAL_API_MAP = {
    // 1. AUTENTICAÇÃO
    "/auth/login": "server/controllers/authController.js",

    // 2. TOKENOMICS & ESTATÍSTICAS
    "/tokenomics": "server/controllers/statsController.js",
    "/tokenomics/history": "server/controllers/statsController.js",
    "/tokenomics/ledger": "server/controllers/statsController.js",
    "/tokenomics/status": "server/models/SystemState.js", // Rota inline que usa SystemState
    "/stats": "server/controllers/statsController.js",

    // 3. PIX & VENDAS
    "/pix": "server/controllers/pixController.js",
    "/pix/:id": "server/controllers/pixController.js",
    "/vendas/manual": "server/controllers/pixController.js",

    // 4. ARENA & GAMIFICAÇÃO
    "/arena/memes": "server/controllers/memeController.js",
    "/arena/memes/invest": "server/controllers/memeController.js",
    "/arena/ranking": "server/controllers/arenaController.js",
    "/arena/perfil/:id": "server/controllers/arenaController.js",
    "/arena/perfil": "server/controllers/arenaController.js",
    "/arena/quests": "server/controllers/questController.js",
    "/arena/quests/claim": "server/controllers/questController.js",
    "/arena/spotted": "server/controllers/spottedController.js",
    "/arena/spotted/comentar": "server/controllers/spottedController.js",
    "/arena/transferir": "server/controllers/arenaController.js",
    "/arena/ai/solve": "server/controllers/aiController.js",

    // 5. CHAT
    "/chat/:materia": "server/controllers/chatController.js",
    "/chat": "server/controllers/chatController.js",

    // 6. ADMINISTRAÇÃO
    "/admin/validacao": "server/controllers/adminController.js",
    "/admin/recursos": "server/controllers/adminController.js",
    "/admin/reset": "server/controllers/adminController.js",
    "/admin/usuarios": "server/models/Usuario.js", // Rota legado inline
    "/debug/fechar-mercado": "server/controllers/memeController.js",

    // 7. PRODUTOS
    "/produtos": "server/controllers/productController.js",

    // 8. BANCO & TÍTULOS (Bonds)
    "/bank/deposit": "server/controllers/bankController.js",
    "/bank/withdraw": "server/controllers/bankController.js",
    "/bank/bond/buy": "server/controllers/bankController.js",
    "/bank/bond/redeem": "server/controllers/bankController.js",
    "/bank/bonds": "server/controllers/bankController.js",

    // 9. STORE (P2P)
    "/store/p2p": "server/controllers/storeController.js",
    "/store/p2p/criar": "server/controllers/storeController.js",
    "/store/p2p/comprar": "server/controllers/storeController.js",
    "/store/p2p/cancelar": "server/controllers/storeController.js"
};

module.exports = MANUAL_API_MAP;