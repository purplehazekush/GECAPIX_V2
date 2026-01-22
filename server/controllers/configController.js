const ConfigModel = require('../models/Config');

exports.getModoAberto = async (req, res) => {
    try {
        let config = await ConfigModel.findOne({ chave: 'sistema_aberto' });
        
        // Se não existir configuração, cria uma padrão (Fechado)
        if (!config) {
            config = await ConfigModel.create({ chave: 'sistema_aberto', valor: false });
        }
        
        res.json({ aberto: config.valor });
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar configuração" });
    }
};

exports.setModoAberto = async (req, res) => {
    try {
        const { valor } = req.body; // true ou false
        
        // Upsert: Atualiza se existir, cria se não existir
        const config = await ConfigModel.findOneAndUpdate(
            { chave: 'sistema_aberto' }, 
            { valor: valor }, 
            { upsert: true, new: true }
        );
        
        res.json({ aberto: config.valor });
    } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar configuração" });
    }
};