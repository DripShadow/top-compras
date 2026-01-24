// Netlify Function para gerenciar feedbacks compartilhados
// Com proteção contra ataques de IP

const security = require('./security');

let feedbacksGlobais = [];

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
        // GET - Retorna todos os feedbacks
        if (event.httpMethod === 'GET') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    feedbacks: feedbacksGlobais,
                    timestamp: new Date().toISOString()
                })
            };
        }

        // POST - Adiciona novo feedback
        if (event.httpMethod === 'POST') {
            const feedback = JSON.parse(event.body || '{}');

            if (feedback.texto && feedback.texto.trim()) {
                // Sanitizar todas as entradas
                const novoFeedback = {
                    id: feedback.id || Date.now(),
                    nome: security.sanitizeInput(feedback.nome || 'Cliente Anônimo'),
                    texto: security.sanitizeInput(feedback.texto),
                    email: security.sanitizeInput(feedback.email || ''),
                    data: feedback.data || new Date().toLocaleDateString('pt-BR'),
                    hora: feedback.hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    likes: 0,
                    likedBy: []
                };

                // Adicionar no início (mais recentes primeiro)
                feedbacksGlobais.unshift(novoFeedback);

                // Manter apenas os últimos 100 feedbacks
                if (feedbacksGlobais.length > 100) {
                    feedbacksGlobais = feedbacksGlobais.slice(0, 100);
                }

                console.log('Novo feedback adicionado:', novoFeedback);

                return {
                    statusCode: 201,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        feedback: novoFeedback,
                        total: feedbacksGlobais.length
                    })
                };
            }

            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Feedback vazio' })
            };
        }

        // PUT - Atualizar likes de um feedback
        if (event.httpMethod === 'PUT') {
            const { feedbackId, usuarioId, acao } = JSON.parse(event.body || '{}');

            const feedback = feedbacksGlobais.find(f => f.id === parseInt(feedbackId));
            
            if (!feedback) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Feedback não encontrado' })
                };
            }

            // Inicializar arrays se não existirem
            if (!feedback.likedBy) {
                feedback.likedBy = [];
            }
            if (!feedback.likes) {
                feedback.likes = 0;
            }

            if (acao === 'like') {
                // Adicionar like se não tiver curtido ainda
                if (!feedback.likedBy.includes(usuarioId)) {
                    feedback.likedBy.push(usuarioId);
                    feedback.likes += 1;
                    
                    console.log(`Like adicionado ao feedback ${feedbackId}. Total: ${feedback.likes}`);
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            feedback,
                            action: 'liked'
                        })
                    };
                } else {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Já curtiu este feedback' })
                    };
                }
            } else if (acao === 'unlike') {
                // Remover like
                const index = feedback.likedBy.indexOf(usuarioId);
                if (index > -1) {
                    feedback.likedBy.splice(index, 1);
                    feedback.likes = Math.max(0, feedback.likes - 1);
                    
                    console.log(`Like removido do feedback ${feedbackId}. Total: ${feedback.likes}`);
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            feedback,
                            action: 'unliked'
                        })
                    };
                } else {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Ainda não curtiu este feedback' })
                    };
                }
            }
        }

        // DELETE - Deletar um feedback
        if (event.httpMethod === 'DELETE') {
            const { feedbackId } = JSON.parse(event.body || '{}');

            if (!feedbackId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'ID do feedback é obrigatório' })
                };
            }

            const index = feedbacksGlobais.findIndex(f => f.id === parseInt(feedbackId));
            
            if (index === -1) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Feedback não encontrado' })
                };
            }

            const feedbackRemovido = feedbacksGlobais.splice(index, 1)[0];
            console.log(`Feedback deletado: ${feedbackRemovido.id} - ${feedbackRemovido.nome}`);

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Feedback deletado com sucesso',
                    feedbackId: feedbackRemovido.id,
                    total: feedbacksGlobais.length
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

