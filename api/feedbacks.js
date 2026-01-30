// API Vercel para gerenciar feedbacks compartilhados
// Com proteção contra ataques de IP

const security = require('./security');

let feedbacksGlobais = [];

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
        // GET - Retorna todos os feedbacks
        if (req.method === 'GET') {
            return res.status(200).json({
                feedbacks: feedbacksGlobais,
                timestamp: new Date().toISOString()
            });
        }

        // POST - Adiciona novo feedback
        if (req.method === 'POST') {
            const feedback = req.body || {};

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

                return res.status(201).json({
                    success: true,
                    feedback: novoFeedback,
                    total: feedbacksGlobais.length
                });
            }

            return res.status(400).json({ error: 'Feedback vazio' });
        }

        // PUT - Atualizar likes de um feedback
        if (req.method === 'PUT') {
            const { feedbackId, usuarioId, acao } = req.body || {};

            const feedback = feedbacksGlobais.find(f => f.id === parseInt(feedbackId));
            
            if (!feedback) {
                return res.status(404).json({ error: 'Feedback não encontrado' });
            }

            // Inicializar arrays se não existirem
            if (!feedback.likedBy) {
                feedback.likedBy = [];
            }
            if (!feedback.likes) {
                feedback.likes = 0;
            }

            if (acao === 'like') {
                // Adicionar like se não existe
                if (!feedback.likedBy.includes(usuarioId)) {
                    feedback.likedBy.push(usuarioId);
                    feedback.likes++;
                }
            } else if (acao === 'unlike') {
                // Remover like
                const index = feedback.likedBy.indexOf(usuarioId);
                if (index > -1) {
                    feedback.likedBy.splice(index, 1);
                    feedback.likes = Math.max(0, feedback.likes - 1);
                }
            }

            console.log(`Feedback atualizado: ${feedback.id} - Likes: ${feedback.likes}`);

            return res.status(200).json({
                success: true,
                feedback: feedback,
                total: feedbacksGlobais.length
            });
        }

        // DELETE - Remover feedback
        if (req.method === 'DELETE') {
            const { feedbackId } = req.body || {};

            const index = feedbacksGlobais.findIndex(f => f.id === parseInt(feedbackId));

            if (index === -1) {
                return res.status(404).json({ error: 'Feedback não encontrado' });
            }

            const feedback = feedbacksGlobais[index];
            feedbacksGlobais.splice(index, 1);

            console.log(`Feedback removido: ${feedbackId}`);

            return res.status(200).json({
                success: true,
                feedback: feedback,
                total: feedbacksGlobais.length
            });
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('Erro na API:', error);
        return res.status(500).json({ error: error.message });
    }
};
