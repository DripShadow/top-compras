// Sistema de segurança compartilhado para proteção contra ataques de IP

// Armazenar requisições por IP (em memória, reseta a cada deploy)
const ipRequests = {};
const blockedIPs = new Set();
const suspiciousPatterns = {};

// Configurações de segurança
const SECURITY_CONFIG = {
    // Rate limiting
    MAX_REQUESTS_PER_MINUTE: 60,      // Máx requisições por minuto por IP
    MAX_REQUESTS_PER_HOUR: 1000,       // Máx requisições por hora por IP
    
    // DDoS detection
    SPIKE_THRESHOLD: 20,               // Se >20 requisições em 10 segundos = DDoS
    SPIKE_WINDOW_MS: 10000,           // 10 segundos
    
    // Timeout
    REQUEST_TIMEOUT_MS: 30000,         // 30 segundos
    
    // Bloqueio automático
    AUTO_BLOCK_THRESHOLD: 5,           // Bloquear após 5 comportamentos suspeitos
    BLOCK_DURATION_MS: 3600000,        // 1 hora de bloqueio
};

// Obter IP do cliente
function getClientIP(event) {
    return (
        event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        event.headers['x-client-ip'] ||
        event.headers['cf-connecting-ip'] ||
        event.headers['x-real-ip'] ||
        'unknown'
    );
}

// Verificar se IP está bloqueado
function isIPBlocked(ip) {
    if (blockedIPs.has(ip)) {
        const blockInfo = suspiciousPatterns[ip];
        if (blockInfo && Date.now() < blockInfo.blockedUntil) {
            return true;
        } else {
            // Desbloquear após expiração
            blockedIPs.delete(ip);
            delete suspiciousPatterns[ip];
        }
    }
    return false;
}

// Rate limiting por IP
function checkRateLimit(ip) {
    if (!ipRequests[ip]) {
        ipRequests[ip] = [];
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // Remover requisições antigas
    ipRequests[ip] = ipRequests[ip].filter(t => t > oneHourAgo);

    // Contar requisições no último minuto
    const requestsLastMinute = ipRequests[ip].filter(t => t > oneMinuteAgo).length;

    // Registrar nova requisição
    ipRequests[ip].push(now);

    // Verificar limite por minuto
    if (requestsLastMinute >= SECURITY_CONFIG.MAX_REQUESTS_PER_MINUTE) {
        return {
            allowed: false,
            reason: `Rate limit exceeded: ${requestsLastMinute} requests in 1 minute`
        };
    }

    // Verificar limite por hora
    if (ipRequests[ip].length >= SECURITY_CONFIG.MAX_REQUESTS_PER_HOUR) {
        return {
            allowed: false,
            reason: `Rate limit exceeded: ${ipRequests[ip].length} requests in 1 hour`
        };
    }

    return { allowed: true };
}

// Detectar padrão de DDoS
function detectDDoS(ip) {
    if (!ipRequests[ip]) return false;

    const now = Date.now();
    const spikeWindow = now - SECURITY_CONFIG.SPIKE_WINDOW_MS;

    // Contar requisições na janela de spike
    const recentRequests = ipRequests[ip].filter(t => t > spikeWindow).length;

    if (recentRequests > SECURITY_CONFIG.SPIKE_THRESHOLD) {
        return true;
    }

    return false;
}

// Registrar comportamento suspeito
function recordSuspiciousBehavior(ip, behavior) {
    if (!suspiciousPatterns[ip]) {
        suspiciousPatterns[ip] = {
            behaviors: [],
            count: 0,
            blockedUntil: null
        };
    }

    suspiciousPatterns[ip].behaviors.push({
        type: behavior,
        timestamp: new Date().toISOString()
    });
    suspiciousPatterns[ip].count++;

    // Bloquear após múltiplos comportamentos suspeitos
    if (suspiciousPatterns[ip].count >= SECURITY_CONFIG.AUTO_BLOCK_THRESHOLD) {
        blockedIPs.add(ip);
        suspiciousPatterns[ip].blockedUntil = Date.now() + SECURITY_CONFIG.BLOCK_DURATION_MS;
        console.log(`🚨 IP BLOQUEADO: ${ip} (${suspiciousPatterns[ip].count} comportamentos suspeitos)`);
    }
}

// Middleware de segurança
function securityMiddleware(event) {
    const ip = getClientIP(event);

    // Verificar se IP está bloqueado
    if (isIPBlocked(ip)) {
        return {
            statusCode: 403,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': '3600'
            },
            body: JSON.stringify({
                error: 'Access denied',
                message: 'Seu IP foi bloqueado temporariamente por atividade suspeita.'
            })
        };
    }

    // Verificar rate limit
    const rateLimitCheck = checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
        recordSuspiciousBehavior(ip, 'rate_limit_exceeded');
        return {
            statusCode: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': '60'
            },
            body: JSON.stringify({
                error: 'Too many requests',
                message: rateLimitCheck.reason
            })
        };
    }

    // Detectar DDoS
    if (detectDDoS(ip)) {
        recordSuspiciousBehavior(ip, 'ddos_pattern_detected');
        console.log(`⚠️ PADRÃO DE DDOS DETECTADO: ${ip}`);
        return {
            statusCode: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': '60'
            },
            body: JSON.stringify({
                error: 'Suspicious activity detected',
                message: 'Padrão suspeito de requisições detectado.'
            })
        };
    }

    return null; // Passou na verificação
}

// Validar CORS
function validateCORS(event, allowedOrigins) {
    const origin = event.headers['origin'] || event.headers['referer'];
    
    if (origin && !allowedOrigins.includes(new URL(origin).hostname)) {
        return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'CORS not allowed' })
        };
    }

    return null;
}

// Sanitizar dados de entrada
function sanitizeInput(data) {
    if (typeof data === 'string') {
        return data
            .replace(/[<>]/g, '')  // Remove < e >
            .trim()
            .substring(0, 500);    // Limitar tamanho
    }
    return data;
}

// Criar headers de resposta segura
function getSecureHeaders(allowedDomain) {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedDomain || process.env.ALLOWED_DOMAIN || 'https://top-compras.netlify.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
    };
}

module.exports = {
    SECURITY_CONFIG,
    getClientIP,
    isIPBlocked,
    checkRateLimit,
    detectDDoS,
    recordSuspiciousBehavior,
    securityMiddleware,
    validateCORS,
    sanitizeInput,
    getSecureHeaders,
    blockedIPs,
    suspiciousPatterns
};
