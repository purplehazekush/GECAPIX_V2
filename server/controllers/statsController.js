// server/controllers/statsController.js
const PixModel = require('../models/Pix');

exports.getStats = async (req, res) => {
    try {
        // Pega o primeiro dia do mês atual
        const inicioMes = new Date();
        inicioMes.setDate(1); 
        inicioMes.setHours(0,0,0,0);
        
        // Busca todas as transações deste mês
        const transacoes = await PixModel.find({ data: { $gte: inicioMes } });
        
        let faturamentoTotal = 0;

        // Soma os valores
        transacoes.forEach(pix => {
            if (pix.valor_extraido) {
                // Converte "1.250,00" para 1250.00
                const valorLimpo = pix.valor_extraido.replace('.', '').replace(',', '.');
                faturamentoTotal += parseFloat(valorLimpo) || 0;
            }
        });

        res.json({
            faturamento_mes: faturamentoTotal.toFixed(2),
            total_transacoes: transacoes.length,
            ticket_medio: (transacoes.length ? faturamentoTotal / transacoes.length : 0).toFixed(2)
        });
    } catch (error) { 
        console.error("Erro stats:", error);
        res.status(500).json({ error: "Erro ao calcular estatísticas" }); 
    }
};