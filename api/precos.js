// API Vercel para gerenciar preços e descontos dos produtos
// Com proteção contra ataques de IP

const security = require('./security');

let precosGlobais = {};

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
        // GET - Retorna todos os preços e descontos
        if (req.method === 'GET') {
            return res.status(200).json({
                precos: precosGlobais,
                timestamp: new Date().toISOString()
            });
        }

        // POST - Registrar preço e desconto inicial ou novo
        if (req.method === 'POST') {
            const { produtoNome, variacaoNome, preco, desconto } = req.body || {};

            if (!produtoNome || preco === undefined) {
                return res.status(400).json({ error: 'Nome do produto e preço são obrigatórios' });
            }

            // Validar e sanitizar entrada
            const nomeLimpo = security.sanitizeInput(produtoNome);
            const variacaoLimpa = variacaoNome ? security.sanitizeInput(variacaoNome) : null;
            
            // Validar valores numéricos
            const precoNumerico = parseFloat(preco);
            const descontoNumerico = parseInt(desconto) || 0;

            if (isNaN(precoNumerico) || precoNumerico < 0) {
                return res.status(400).json({ error: 'Preço inválido' });
            }

            if (descontoNumerico < 0 || descontoNumerico > 100) {
                return res.status(400).json({ error: 'Desconto deve estar entre 0 e 100%' });
            }

            // Usar chave composta se tiver variação
            const chave = variacaoLimpa ? `${nomeLimpo}||${variacaoLimpa}` : nomeLimpo;
            
            precosGlobais[chave] = {
                preco: precoNumerico,
                desconto: descontoNumerico
            };

            console.log(`Preço registrado: ${chave} = R$ ${precoNumerico} (${descontoNumerico}% DESC)`);

            return res.status(201).json({
                success: true,
                chave,
                dados: precosGlobais[chave],
                todosPrecos: precosGlobais
            });
        }

        // PUT - Atualizar preço e desconto
        if (req.method === 'PUT') {
            const { produtoNome, variacaoNome, preco, desconto } = req.body || {};

            if (!produtoNome || preco === undefined) {
                return res.status(400).json({ error: 'Nome do produto e preço são obrigatórios' });
            }

            // Usar chave composta se tiver variação
            const chave = variacaoNome ? `${produtoNome}||${variacaoNome}` : produtoNome;
            
            precosGlobais[chave] = {
                preco: parseFloat(preco),
                desconto: desconto !== undefined ? parseInt(desconto) : 0
            };

            console.log(`Preço atualizado: ${chave} = R$ ${preco} (${desconto || 0}% DESC)`);

            return res.status(200).json({
                success: true,
                chave,
                dados: precosGlobais[chave],
                todosPrecos: precosGlobais
            });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro na API:', error);
        return res.status(500).json({ error: error.message });
    }
};
