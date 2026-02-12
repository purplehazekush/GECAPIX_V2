const ProdutoModel = require('../models/Produto');

exports.getProdutos = async (req, res) => {
    try {
        // Busca apenas ativos, ordenados por categoria e nome
        const produtos = await ProdutoModel.find({ ativo: true }).sort({ categoria: 1, nome: 1 });
        res.json(produtos);
    } catch (error) {
        console.error("Erro produtos:", error);
        res.status(500).json([]);
    }
};

exports.createProduto = async (req, res) => {
    try {
        // Agora aceita o payload completo da Loja V2
        const { nome, preco, imagem_url, categoria, cashback_xp, badge, estoque } = req.body;
        
        if (!nome || !preco) {
            return res.status(400).json({ error: "Nome e preço obrigatórios" });
        }

        const novo = await ProdutoModel.create({ 
            nome, 
            preco, 
            imagem_url, 
            categoria, 
            cashback_xp, 
            badge, 
            estoque 
        });
        
        res.json(novo);
    } catch (error) {
        res.status(500).json({ error: "Erro ao criar produto" });
    }
};