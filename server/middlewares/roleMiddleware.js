// server/middlewares/roleMiddleware.js

/**
 * @param {string[]} allowedRoles - Array de roles permitidas ex: ['admin', 'gm']
 */
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // req.user é populado pelo authMiddleware anterior
        if (!req.user) {
            return res.status(401).json({ error: "Não autenticado." });
        }

        if (!allowedRoles.includes(req.user.role)) {
            console.warn(`⛔ Acesso negado: User ${req.user.email} (${req.user.role}) tentou acessar rota protegida para ${allowedRoles}.`);
            return res.status(403).json({ error: "Sem permissão para esta ação." });
        }

        next();
    };
};

module.exports = checkRole;