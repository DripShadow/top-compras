// API Vercel para gerenciar vendas compartilhadas
// Com proteção contra ataques de IP

const security = require('./security');

let vendasGlobais = {};

module.exports = async (req, res) => {
    // Aplicar middleware de segurança
    const securityCheck = security.securityMiddleware(req);
    if (securityCheck) {
        return res.status(securityCheck.statusCode).json(JSON.parse(securityCheck.body));
    }

    // Headers CORS seguros
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // GET - Retorna todas as vendas
        if (req.method === 'GET') {
            return res.status(200).json({
                vendas: vendasGlobais,
                total: Object.values(vendasGlobais).reduce((a, b) => a + b, 0),
                timestamp: new Date().toISOString()
            });
        }

        // POST - Registrar nova venda
        if (req.method === 'POST') {
            const { produtoNome, quantidade = 1 } = req.body || {};

            if (!produtoNome || produtoNome.trim() === '') {
                return res.status(400).json({ error: 'Nome do produto é obrigatório' });
            }

            // Validar e sanitizar entrada
            const nomeLimpo = security.sanitizeInput(produtoNome);
            const qtdNumerica = parseInt(quantidade) || 1;

            if (qtdNumerica < 1 || qtdNumerica > 1000) {
                return res.status(400).json({ error: 'Quantidade inválida' });
            }

            // Inicializar produto se não existir
            if (!vendasGlobais[nomeLimpo]) {
                vendasGlobais[nomeLimpo] = 0;
            }

            // Adicionar venda
            vendasGlobais[nomeLimpo] += qtdNumerica;

            console.log(`Venda registrada: ${nomeLimpo} x${qtdNumerica}. Total: ${vendasGlobais[nomeLimpo]}`);

            return res.status(201).json({
                success: true,
                produtoNome: nomeLimpo,
                quantidade: qtdNumerica,
                totalVendas: vendasGlobais[nomeLimpo],
                todasVendas: vendasGlobais
            });
        }

        // PUT - Atualizar vendas (para admin)
        if (req.method === 'PUT') {
            const { produtoNome, quantidade, acao } = req.body || {};

            if (!produtoNome || produtoNome.trim() === '') {
                return res.status(400).json({ error: 'Nome do produto é obrigatório' });
            }

            // Inicializar produto se não existir
            if (!vendasGlobais[produtoNome]) {
                vendasGlobais[produtoNome] = 0;
            }

            if (acao === 'set') {
                // Definir valor exato
                vendasGlobais[produtoNome] = parseInt(quantidade) || 0;
            } else if (acao === 'add') {
                // Adicionar
                vendasGlobais[produtoNome] += parseInt(quantidade) || 1;
            } else if (acao === 'subtract') {
                // Subtrair
                vendasGlobais[produtoNome] = Math.max(0, vendasGlobais[produtoNome] - (parseInt(quantidade) || 1));
            }

            console.log(`Vendas atualizadas: ${produtoNome} = ${vendasGlobais[produtoNome]}`);

            return res.status(200).json({
                success: true,
                produtoNome,
                totalVendas: vendasGlobais[produtoNome],
                todasVendas: vendasGlobais
            });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro na API:', error);
        return res.status(500).json({ error: error.message });
    }
};
