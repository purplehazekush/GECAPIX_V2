require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// --- MODELOS (DEFINIÇÃO DOS SCHEMAS) ---

// 1. Pix
const PixSchema = new mongoose.Schema({
    raw_body: Object,
    mensagem_texto: String,
    valor_extraido: String,
    remetente_extraido: String,
    item_vendido: { type: String, default: "" },
    quantidade: { type: Number, default: 1 },
    vendedor_email: String,
    historico_edicoes: [{
        alterado_por: String,
        valor_antigo: String,
        item_antigo: String,
        data_alteracao: { type: Date, default: Date.now }
    }],
    data: { type: Date, default: Date.now },
    tipo: { type: String, default: 'PIX' }, // 'PIX' ou 'DINHEIRO'
    vendedor_nome: String, // Quem lançou a venda no sistema
});
const PixModel = mongoose.models.Pix || mongoose.model('Pix', PixSchema);

// 2. Usuario
const UsuarioSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    role: { type: String, default: 'membro' },
    nome: String,
    status: { type: String, default: 'pendente' }
});
const UsuarioModel = mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);

// 3. Produto
const ProdutoSchema = new mongoose.Schema({
    nome: String,
    preco: Number,
    ativo: { type: Boolean, default: true }
});
const ProdutoModel = mongoose.models.Produto || mongoose.model('Produto', ProdutoSchema);

// 4. Configuração (O QUE FALTAVA OU ESTAVA FORA DE LUGAR)
const ConfigSchema = new mongoose.Schema({
    chave: { type: String, unique: true },
    valor: Boolean
});
const ConfigModel = mongoose.models.Config || mongoose.model('Config', ConfigSchema);


// --- CONFIGURAÇÃO DO SERVIDOR ---
const app = express();
app.use(express.json());
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://gecapix-v2.vercel.app", // Verifique se o endereço na Vercel é exatamente este
        /\.vercel\.app$/ // Isso aceita qualquer subdomínio da vercel (útil para testes)
    ],
    credentials: true
}));
// ...

// --- CONEXÃO MONGODB ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("--> MongoDB Conectado! 🍃");
    } catch (error) {
        console.error("--> Erro MongoDB:", error);
    }
};
connectDB();

// ================= ROTAS DA API =================

// --- 1. CONFIGURAÇÃO GERAL (Modo Festa) ---
app.get('/api/config/modo-aberto', async (req, res) => {
    try {
        let config = await ConfigModel.findOne({ chave: 'sistema_aberto' });
        // Se não existir, cria o padrão (FECHADO/FALSE)
        if (!config) {
            config = await ConfigModel.create({ chave: 'sistema_aberto', valor: false });
        }
        res.json({ aberto: config.valor });
    } catch (error) {
        console.error("Erro config:", error);
        res.status(500).json({ error: "Erro ao ler config" });
    }
});

app.put('/api/config/modo-aberto', async (req, res) => {
    try {
        const { valor } = req.body;
        // Upsert: Atualiza se existe, cria se não existe
        const config = await ConfigModel.findOneAndUpdate(
            { chave: 'sistema_aberto' },
            { valor: valor },
            { upsert: true, new: true }
        );
        res.json({ aberto: config.valor });
    } catch (error) {
        console.error("Erro update config:", error);
        res.status(500).json({ error: "Erro ao mudar config" });
    }
});

// --- 2. AUTENTICAÇÃO ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, nome } = req.body;
        // ATENÇÃO: COLOQUE SEU EMAIL AQUI
        const EMAILS_ADMINS = ["joaovictorrabelo95@gmail.com", "caiogcosta03@gmail.com"]; 
        
        const totalUsers = await UsuarioModel.countDocuments();
        let user = await UsuarioModel.findOne({ email });

        if (!user) {
            const isVip = EMAILS_ADMINS.includes(email);
            const isFirst = totalUsers === 0;
            user = await UsuarioModel.create({
                email, nome,
                role: (isVip || isFirst) ? 'admin' : 'membro',
                status: (isVip || isFirst) ? 'ativo' : 'pendente'
            });
        } else {
            if (EMAILS_ADMINS.includes(email)) {
                let mudou = false;
                if (user.role !== 'admin') { user.role = 'admin'; mudou = true; }
                if (user.status !== 'ativo') { user.status = 'ativo'; mudou = true; }
                if (mudou) await user.save();
            }
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Erro no Login" });
    }
});

// --- 3. FEED PIX ---
app.get('/api/pix', async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'todos' } = req.query;
        const skip = (page - 1) * limit;

        // Monta o filtro
        let query = {};
        if (status === 'pendentes') {
            // Busca itens onde item_vendido é null, vazio ou não existe
            query.$or = [{ item_vendido: { $exists: false } }, { item_vendido: "" }, { item_vendido: null }];
        } else if (status === 'registrados') {
            // Busca itens que TEM texto no item_vendido
            query.item_vendido = { $ne: "", $exists: true };
        }

        // Busca com Paginação
        const pixList = await PixModel.find(query)
            .sort({ data: -1 }) // Mais recentes primeiro
            .skip(skip)
            .limit(parseInt(limit));

        // Conta total para saber se tem mais páginas
        const total = await PixModel.countDocuments(query);

        res.json({
            data: pixList,
            meta: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar feed" }); 
    }
});

app.post('/api/pix', async (req, res) => {
    try {
        const body = req.body;
        const texto = body.mensagem_texto || body.text || JSON.stringify(body);
        const regex = /"(.*?)" te enviou um Pix de R\$ ([\d,.]+)/;
        const match = texto.match(regex);
        let remetente = "Desconhecido";
        let valor = "0,00";
        if (match) { remetente = match[1]; valor = match[2]; }

        await PixModel.create({
            raw_body: body,
            mensagem_texto: texto,
            remetente_extraido: remetente,
            valor_extraido: valor
        });
        res.status(200).send('OK');
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ATUALIZE ESTA ROTA
app.put('/api/pix/:id', async (req, res) => {
    try {
        // Agora aceitamos vendedor_nome também
        const { item, quantidade, editor_email, vendedor_nome } = req.body;
        
        const pixAtual = await PixModel.findById(req.params.id);
        if (!pixAtual) return res.status(404).json({ error: "Não encontrado" });

        // Histórico de alterações
        pixAtual.historico_edicoes.push({
            alterado_por: editor_email,
            valor_antigo: pixAtual.valor_extraido,
            item_antigo: pixAtual.item_vendido,
            data_alteracao: new Date()
        });

        pixAtual.item_vendido = item;
        pixAtual.quantidade = quantidade || 1;
        
        // ATUALIZAÇÃO CRÍTICA: Salva quem editou como o "Vendedor" daquela transação
        pixAtual.vendedor_email = editor_email;
        if (vendedor_nome) {
            pixAtual.vendedor_nome = vendedor_nome; 
        }

        await pixAtual.save();
        res.json({ success: true });
    } catch (error) { 
        console.error("Erro update pix:", error);
        res.status(500).json({ error: "Erro ao salvar venda" }); 
    }
});

// --- 4. PRODUTOS ---
app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await ProdutoModel.find({ ativo: true }).sort({ nome: 1 });
        res.json(produtos);
    } catch (error) { res.json([]); }
});

app.post('/api/produtos', async (req, res) => {
    try {
        const { nome, preco } = req.body;
        const novo = await ProdutoModel.create({ nome, preco });
        res.json(novo);
    } catch (error) { res.status(500).json({ error: "Erro ao criar produto" }); }
});

// --- 5. ADMINISTRAÇÃO ---
app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const usuarios = await UsuarioModel.find().sort({ nome: 1 });
        res.json(usuarios);
    } catch (error) { res.status(500).json({ error: "Erro buscar usuários" }); }
});

app.put('/api/admin/usuarios', async (req, res) => {
    try {
        // AGORA ACEITA novoRole TAMBÉM
        const { email, novoStatus, novoRole } = req.body;
        
        const dadosParaAtualizar = {};
        if (novoStatus) dadosParaAtualizar.status = novoStatus;
        if (novoRole) dadosParaAtualizar.role = novoRole;

        const user = await UsuarioModel.findOneAndUpdate(
            { email }, 
            dadosParaAtualizar, 
            { new: true }
        );
        res.json({ success: true, user });
    } catch (error) { 
        res.status(500).json({ error: "Erro atualizar usuário" }); 
    }
});

// --- 6. STATS ---
// --- 6. STATS AVANÇADOS ---
app.get('/api/stats', async (req, res) => {
    try {
        const hoje = new Date();
        const diaSemanaHoje = hoje.getDay() + 1; // Mongo usa 1=Domingo, 7=Sábado
        
        // Pega transações do mês para totais gerais
        const inicioMes = new Date();
        inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
        
        const transacoes = await PixModel.find({ data: { $gte: inicioMes } });
        
        // Busca TODAS as transações da história para calcular a média do dia da semana
        const historicoDiaSemana = await PixModel.aggregate([
            {
                $project: {
                    diaSemana: { $dayOfWeek: "$data" },
                    hora: { $hour: { date: "$data", timezone: "America/Sao_Paulo" } }, // Ajuste o Timezone se precisar
                    valor: { 
                        $toDouble: { 
                            $replaceAll: { input: { $replaceAll: { input: "$valor_extraido", find: ".", replacement: "" } }, find: ",", replacement: "." } 
                        }
                    }
                }
            },
            { $match: { diaSemana: diaSemanaHoje } }, // Filtra só as Sextas (se hoje for sexta)
            { $group: { _id: "$hora", total: { $sum: "$valor" }, count: { $sum: 1 } } }
        ]);

        let faturamentoTotal = 0;
        let totalPix = 0;
        let totalDinheiro = 0;
        let vendasPorHoraHoje = Array(24).fill(0);
        let vendasPorHoraMedia = Array(24).fill(0);

        // Preenche a média histórica
        historicoDiaSemana.forEach(h => {
            // Divide o total histórico pelo número estimado de semanas (simplificação: média bruta)
            // Para ser exato, precisaríamos contar quantas sextas-feiras existiram, mas vamos usar o total absoluto para comparar "Pico"
            if(h._id >= 0 && h._id < 24) vendasPorHoraMedia[h._id] = h.total;
        });

        // Processa as transações DO MÊS ATUAL
        let statsProdutos = {}; 
        let statsVendedores = {};

        transacoes.forEach(pix => {
            let valorFloat = 0;
            if (pix.valor_extraido) {
                const limpo = pix.valor_extraido.toString().replace(/[^\d,]/g, '').replace(',', '.');
                valorFloat = parseFloat(limpo) || 0;
                faturamentoTotal += valorFloat;

                if (pix.tipo === 'DINHEIRO') totalDinheiro += valorFloat;
                else totalPix += valorFloat;

                // Se a transação for DE HOJE, soma no heatmap de hoje
                const dataTransacao = new Date(pix.data);
                if (dataTransacao.getDate() === hoje.getDate() && dataTransacao.getMonth() === hoje.getMonth()) {
                    const hora = dataTransacao.getHours();
                    vendasPorHoraHoje[hora] += valorFloat;
                }
            }

            // ... (Lógica de Ranking igual a anterior) ...
            if (pix.item_vendido) {
                const item = pix.item_vendido.toUpperCase();
                const qtd = pix.quantidade || 1;
                
                if (!statsProdutos[item]) statsProdutos[item] = { qtd: 0, total: 0 };
                statsProdutos[item].qtd += qtd;
                statsProdutos[item].total += valorFloat; 
                
                const vendedor = pix.vendedor_email ? pix.vendedor_email.split('@')[0] : (pix.vendedor_nome || 'Sistema');
                if (!statsVendedores[vendedor]) statsVendedores[vendedor] = 0;
                statsVendedores[vendedor] += valorFloat;
            }
        });

        // Monta o objeto final
        const heatmapData = vendasPorHoraHoje.map((total, hora) => ({
            hora: `${hora}h`,
            hoje: total,
            historico: vendasPorHoraMedia[hora] / 4 // Divide por 4 para estimar uma média semanal (aprox)
        }));

        const ranking = Object.entries(statsProdutos)
            .map(([nome, dados]) => ({ nome, qtd: dados.qtd, total: dados.total }))
            .sort((a, b) => b.total - a.total).slice(0, 10);

        const rankingVendedores = Object.entries(statsVendedores).sort((a, b) => b[1] - a[1]);
        const topVendedor = rankingVendedores.length > 0 
            ? { nome: rankingVendedores[0][0], total: rankingVendedores[0][1] }
            : { nome: "--", total: 0 };

        res.json({
            faturamento_mes: faturamentoTotal.toFixed(2),
            total_transacoes: transacoes.length,
            ticket_medio: (transacoes.length ? faturamentoTotal / transacoes.length : 0).toFixed(2),
            top_vendedor: topVendedor,
            ranking: ranking,
            heatmap: heatmapData, // Agora tem 'hoje' e 'historico'
            distribuicao: [ { name: 'Pix', value: totalPix }, { name: 'Dinheiro', value: totalDinheiro } ]
        });

    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Erro stats" }); 
    }
});

// Rota para registrar venda manual (Dinheiro)
app.post('/api/vendas/manual', async (req, res) => {
    try {
        const { item, valor, quantidade, vendedor_nome } = req.body;
        
        // Formata o valor para string "00,00" para manter compatibilidade com o regex do Pix
        // (Ou idealmente, migre tudo para Number no futuro, mas vamos manter o padrão atual)
        const valorFormatado = parseFloat(valor).toFixed(2).replace('.', ',');

        await PixModel.create({
            tipo: 'DINHEIRO',
            remetente_extraido: "Venda Balcão (Dinheiro)",
            valor_extraido: valorFormatado,
            mensagem_texto: `Venda manual: ${quantidade}x ${item}`,
            item_vendido: item,
            quantidade: quantidade,
            vendedor_nome: vendedor_nome,
            data: new Date()
        });

        res.status(201).json({ success: true });
    } catch (error) {
        console.error("Erro venda manual:", error);
        res.status(500).json({ error: "Erro ao registrar venda" });
    }
});

const PORT = process.env.PORT || 3001;



// Mude a linha do listen para garantir que ele aceite conexões externas na VPS
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando em http://0.0.0.0:${PORT}`);
});