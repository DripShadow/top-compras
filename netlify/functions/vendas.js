// Netlify Function para gerenciar vendas compartilhadas
// Com proteção contra ataques de IP

const security = require('./security');

let vendasGlobais = {};

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
        // GET - Retorna todas as vendas
        if (event.httpMethod === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    vendas: vendasGlobais,
                    total: Object.values(vendasGlobais).reduce((a, b) => a + b, 0),
                    timestamp: new Date().toISOString()
                })
            };
        }

        // POST - Registrar nova venda
        if (event.httpMethod === 'POST') {
            const { produtoNome, quantidade = 1 } = JSON.parse(event.body || '{}');

            if (!produtoNome || produtoNome.trim() === '') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Nome do produto é obrigatório' })
                };
            }

            // Validar e sanitizar entrada
            const nomeLimpo = security.sanitizeInput(produtoNome);
            const qtdNumerica = parseInt(quantidade) || 1;

            if (qtdNumerica < 1 || qtdNumerica > 1000) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Quantidade inválida' })
                };
            }

            // Inicializar produto se não existir
            if (!vendasGlobais[nomeLimpo]) {
                vendasGlobais[nomeLimpo] = 0;
            }

            // Adicionar venda
            vendasGlobais[nomeLimpo] += qtdNumerica;

            console.log(`Venda registrada: ${nomeLimpo} x${qtdNumerica}. Total: ${vendasGlobais[nomeLimpo]}`);

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({
                    success: true,
                    produtoNome: nomeLimpo,
                    quantidade: qtdNumerica,
                    totalVendas: vendasGlobais[nomeLimpo],
                    todasVendas: vendasGlobais
                })
            };
        }

        // PUT - Atualizar vendas (para admin)
        if (event.httpMethod === 'PUT') {
            const { produtoNome, quantidade, acao } = JSON.parse(event.body || '{}');

            if (!produtoNome || produtoNome.trim() === '') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Nome do produto é obrigatório' })
                };
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

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    produtoNome,
                    totalVendas: vendasGlobais[produtoNome],
                    todasVendas: vendasGlobais
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
