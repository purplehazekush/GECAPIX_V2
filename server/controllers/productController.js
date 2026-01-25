// server/controllers/productController.js
const ProdutoModel = require('../models/Produto');

exports.getProdutos = async (req, res) => {
    try {
        // Busca apenas produtos ativos e ordena por nome
        const produtos = await ProdutoModel.find({ ativo: true }).sort({ nome: 1 });
        res.json(produtos);
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        res.json([]); // Retorna array vazio em caso de erro para não quebrar o front
    }
};

exports.createProduto = async (req, res) => {
    try {
        const { nome, preco } = req.body;
        
        if (!nome || !preco) {
            return res.status(400).json({ error: "Nome e preço são obrigatórios" });
        }

        const novo = await ProdutoModel.create({ nome, preco });
        res.json(novo);
    } catch (error) {
        res.status(500).json({ error: "Erro ao criar produto" });
    }
};