module.exports = (req, res, next) => {
    // AuthMiddleware já deve ter rodado e populado req.user
    if (!req.user) return res.status(401).json({ error: "Não autenticado." });

    if (req.user.status !== 'ativo' && req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: "Conta não verificada. Envie seu comprovante de matrícula na Loja para desbloquear a economia." 
        });
    }
    
    next();
};