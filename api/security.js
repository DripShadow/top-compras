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
function getClientIP(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-client-ip'] ||
        req.headers['cf-connecting-ip'] ||
        req.headers['x-real-ip'] ||
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
function recordSuspiciousBehavior(ip) {
    if (!suspiciousPatterns[ip]) {
        suspiciousPatterns[ip] = {
            count: 0,
            blockedUntil: null,
            behaviors: []
        };
    }

    suspiciousPatterns[ip].count++;
    suspiciousPatterns[ip].behaviors.push({
        timestamp: new Date().toISOString(),
        type: 'unknown'
    });

    // Auto-bloquear após 5 comportamentos suspeitos
    if (suspiciousPatterns[ip].count >= SECURITY_CONFIG.AUTO_BLOCK_THRESHOLD) {
        blockedIPs.add(ip);
        suspiciousPatterns[ip].blockedUntil = Date.now() + SECURITY_CONFIG.BLOCK_DURATION_MS;
        console.warn(`⚠️ IP bloqueado por comportamento suspeito: ${ip}`);
        return true;
    }

    return false;
}

// Sanitizar entrada
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .trim()
        .replace(/<[^>]*>/g, '')                    // Remove HTML tags
        .replace(/['"]/g, '')                        // Remove quotes
        .substring(0, 500);                          // Limitar tamanho
}

// Validar email
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Middleware de segurança para Vercel
function securityMiddleware(req) {
    const ip = getClientIP(req);
    
    // Verificar se IP está bloqueado
    if (isIPBlocked(ip)) {
        return {
            statusCode: 403,
            headers: getSecureHeaders(),
            body: JSON.stringify({ error: 'IP bloqueado por comportamento suspeito' })
        };
    }

    // Verificar rate limit
    const rateLimitCheck = checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
        recordSuspiciousBehavior(ip);
        return {
            statusCode: 429,
            headers: getSecureHeaders(),
            body: JSON.stringify({ error: rateLimitCheck.reason })
        };
    }

    // Detectar DDoS
    if (detectDDoS(ip)) {
        recordSuspiciousBehavior(ip);
        console.warn(`⚠️ Possível DDoS detectado do IP: ${ip}`);
    }

    return null; // Passou na segurança
}

// Headers CORS e segurança
function getSecureHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
    };
}

module.exports = {
    getClientIP,
    isIPBlocked,
    checkRateLimit,
    detectDDoS,
    recordSuspiciousBehavior,
    sanitizeInput,
    validateEmail,
    securityMiddleware,
    getSecureHeaders,
    SECURITY_CONFIG
};
