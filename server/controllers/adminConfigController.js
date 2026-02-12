const ConfigService = require('../services/ConfigService');

exports.getConfig = (req, res) => {
    res.json(ConfigService.get());
};

exports.updateConfig = async (req, res) => {
    try {
        const newConfig = await ConfigService.update(req.body);
        res.json({ success: true, config: newConfig });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};