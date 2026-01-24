// Netlify Function para gerenciar preços e descontos dos produtos
// Com proteção contra ataques de IP

const security = require('./security');

let precosGlobais = {};

exports.handler = async (event, context) => {
    // Aplicar middleware de segurança
    const securityCheck = security.securityMiddleware(event);
    if (securityCheck) return securityCheck;

    // Headers CORS seguros
    const headers = security.getSecureHeaders();

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // GET - Retorna todos os preços e descontos
        if (event.httpMethod === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    precos: precosGlobais,
                    timestamp: new Date().toISOString()
                })
            };
        }

        // POST - Registrar preço e desconto inicial ou novo
        if (event.httpMethod === 'POST') {
            const { produtoNome, variacaoNome, preco, desconto } = JSON.parse(event.body || '{}');

            if (!produtoNome || preco === undefined) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Nome do produto e preço são obrigatórios' })
                };
            }

            // Validar e sanitizar entrada
            const nomeLimpo = security.sanitizeInput(produtoNome);
            const variacaoLimpa = variacaoNome ? security.sanitizeInput(variacaoNome) : null;
            
            // Validar valores numéricos
            const precoNumerico = parseFloat(preco);
            const descontoNumerico = parseInt(desconto) || 0;

            if (isNaN(precoNumerico) || precoNumerico < 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Preço inválido' })
                };
            }

            if (descontoNumerico < 0 || descontoNumerico > 100) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Desconto deve estar entre 0 e 100%' })
                };
            }

            // Usar chave composta se tiver variação
            const chave = variacaoLimpa ? `${nomeLimpo}||${variacaoLimpa}` : nomeLimpo;
            
            precosGlobais[chave] = {
                preco: precoNumerico,
                desconto: descontoNumerico
            };

            console.log(`Preço registrado: ${chave} = R$ ${precoNumerico} (${descontoNumerico}% DESC)`);

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    success: true,
                    chave,
                    dados: precosGlobais[chave],
                    todosPrecos: precosGlobais
                })
            };
        }

        // PUT - Atualizar preço e desconto
        if (event.httpMethod === 'PUT') {
            const { produtoNome, variacaoNome, preco, desconto } = JSON.parse(event.body || '{}');

            if (!produtoNome || preco === undefined) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Nome do produto e preço são obrigatórios' })
                };
            }

            // Usar chave composta se tiver variação
            const chave = variacaoNome ? `${produtoNome}||${variacaoNome}` : produtoNome;
            
            precosGlobais[chave] = {
                preco: parseFloat(preco),
                desconto: desconto !== undefined ? parseInt(desconto) : 0
            };

            console.log(`Preço atualizado: ${chave} = R$ ${preco} (${desconto || 0}% DESC)`);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    chave,
                    dados: precosGlobais[chave],
                    todosPrecos: precosGlobais
                })
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método não permitido' })
        };
    } catch (error) {
        console.error('Erro na function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
