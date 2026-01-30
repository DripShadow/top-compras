// Sistema de rastreamento de vendas
class VendasTracker {
    constructor() {
        this.vendas = this.carregarVendas();
    }

    carregarVendas() {
        const saved = localStorage.getItem('topcompras_vendas');
        return saved ? JSON.parse(saved) : {};
    }

    salvarVendas() {
        localStorage.setItem('topcompras_vendas', JSON.stringify(this.vendas));
    }

    registrarVenda(produtoNome) {
        this.vendas[produtoNome] = (this.vendas[produtoNome] || 0) + 1;
        this.salvarVendas();
    }

    obterVendas(produtoNome) {
        return this.vendas[produtoNome] || 0;
    }

    obterTotalVendas() {
        return Object.values(this.vendas).reduce((a, b) => a + b, 0);
    }

    obterRanking(limite = 10) {
        return Object.entries(this.vendas)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limite)
            .map(([nome, quantidade]) => ({ nome, quantidade }));
    }

    obterVendasPorCategoria() {
        const resultado = {};
        Object.keys(this.vendas).forEach(produtoNome => {
            const produto = produtos.find(p => p.nome === produtoNome || p.variações?.some(v => `${p.nome} - ${v.nome}` === produtoNome));
            if (produto) {
                resultado[produto.categoria] = (resultado[produto.categoria] || 0) + this.vendas[produtoNome];
            }
        });
        return resultado;
    }

    // Métodos de Admin
    adicionarVendas(produtoNome, quantidade = 1) {
        this.vendas[produtoNome] = (this.vendas[produtoNome] || 0) + quantidade;
        this.salvarVendas();
    }

    removerVendas(produtoNome, quantidade = 1) {
        if (this.vendas[produtoNome]) {
            this.vendas[produtoNome] = Math.max(0, this.vendas[produtoNome] - quantidade);
            this.salvarVendas();
        }
    }

    definirVendas(produtoNome, quantidade) {
        this.vendas[produtoNome] = Math.max(0, quantidade);
        this.salvarVendas();
    }

    obterTodosProdutos() {
        return Object.entries(this.vendas).map(([nome, quantidade]) => ({ nome, quantidade }));
    }

    // Sincronizar vendas com servidor Vercel
    async sincronizar() {
        try {
            console.log('🔄 Sincronizando vendas...');
            const response = await fetch('/api/vendas');
            
            if (response.ok) {
                const data = await response.json();
                console.log('✓ Vendas do servidor:', data);
                
                // Mesclar vendas do servidor com locais (servidor tem prioridade)
                if (data.vendas && typeof data.vendas === 'object') {
                    this.vendas = { ...this.vendas, ...data.vendas };
                    this.salvarVendas();
                }
            }
        } catch (erro) {
            console.warn('⚠ Erro ao sincronizar vendas com servidor:', erro);
            // Continua usando localStorage
        }
    }

    // Registrar venda tanto localmente quanto no servidor
    async registrarVendaComSync(produtoNome) {
        // Primeiro registrar localmente
        this.registrarVenda(produtoNome);
        
        // Depois enviar para servidor
        try {
            const response = await fetch('/api/vendas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    produtoNome, 
                    quantidade: 1 
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✓ Venda sincronizada:', data);
            }
        } catch (erro) {
            console.warn('⚠ Erro ao sincronizar venda:', erro);
        }
    }
}

// Sistema de gerenciamento de preços
class PrecosManager {
    constructor() {
        this.precos = this.carregarPrecos();
    }

    carregarPrecos() {
        const saved = localStorage.getItem('topcompras_precos');
        return saved ? JSON.parse(saved) : {};
    }

    salvarPrecos() {
        localStorage.setItem('topcompras_precos', JSON.stringify(this.precos));
    }

    // Sincronizar preços com servidor - carrega dados do servidor
    async sincronizar() {
        try {
            console.log('🔄 Sincronizando preços...');
            const response = await fetch('/api/precos');
            
            if (response.ok) {
                const data = await response.json();
                console.log('✓ Preços do servidor:', data);
                
                if (data.precos && typeof data.precos === 'object') {
                    // Merge: valores do servidor + locais (locais têm prioridade)
                    const localPrecos = this.carregarPrecos();
                    this.precos = { ...data.precos, ...localPrecos };
                    this.salvarPrecos();
                }
            }
        } catch (erro) {
            console.warn('⚠ Erro ao sincronizar preços:', erro);
        }
    }

    // Obter preço de um produto/variação
    obterPreco(produtoNome, variacaoNome = null) {
        const chave = variacaoNome ? `${produtoNome}||${variacaoNome}` : produtoNome;
        const dados = this.precos[chave];
        
        if (dados && typeof dados === 'object') {
            return dados.preco;
        } else if (typeof dados === 'number') {
            // Compatibilidade com formato antigo
            return dados;
        }
        return undefined;
    }

    // Obter desconto de um produto/variação
    obterDesconto(produtoNome, variacaoNome = null) {
        const chave = variacaoNome ? `${produtoNome}||${variacaoNome}` : produtoNome;
        const dados = this.precos[chave];
        
        if (dados && typeof dados === 'object') {
            return dados.desconto || 0;
        }
        return 0;
    }

    // Definir preço e desconto
    definirPreco(produtoNome, variacaoNome = null, preco, desconto = 0) {
        const chave = variacaoNome ? `${produtoNome}||${variacaoNome}` : produtoNome;
        this.precos[chave] = {
            preco: parseFloat(preco),
            desconto: parseInt(desconto) || 0
        };
        this.salvarPrecos();
    }

    // Editar preço e desconto sincronizando com servidor
    async editarPrecoComSync(produtoNome, variacaoNome = null, preco, desconto = 0) {
        // Registrar localmente
        this.definirPreco(produtoNome, variacaoNome, preco, desconto);
        
        // Sincronizar com servidor
        try {
            const response = await fetch('/api/precos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    produtoNome,
                    variacaoNome: variacaoNome || null,
                    preco: parseFloat(preco),
                    desconto: parseInt(desconto) || 0
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✓ Preço sincronizado:', data);
                return true;
            }
        } catch (erro) {
            console.warn('⚠ Erro ao sincronizar preço:', erro);
        }
        return false;
    }

    // Obter todos os produtos com preços customizados
    obterPrecosCustomizados() {
        return this.precos;
    }
}

// Sistema de gerenciamento de feedbacks públicos
class FeedbackManager {
    constructor() {
        this.feedbacks = this.carregarFeedbacks();
        this.jsonBinId = '67906' + 'f9ac50e2c7e1a5f8c3b2' + '1a2b'; // ID do JSONBin
        this.sincronizar(); // Sincronizar ao inicializar
    }

    carregarFeedbacks() {
        const saved = localStorage.getItem('topcompras_feedbacks');
        return saved ? JSON.parse(saved) : [];
    }

    salvarFeedbacks() {
        localStorage.setItem('topcompras_feedbacks', JSON.stringify(this.feedbacks));
    }

    // Sincronizar com arquivo JSON local e Netlify Function
    async sincronizar() {
        try {
            // Tentar usar Vercel API primeiro
            console.log('🔄 Sincronizando feedbacks...');
            const response = await fetch('/api/feedbacks');
            
            if (response.ok) {
                const data = await response.json();
                console.log('✓ Netlify Function respondeu:', data);
                
                if (data.feedbacks && Array.isArray(data.feedbacks)) {
                    const feedbacksExternos = data.feedbacks;
                    const feedbacksLocais = this.feedbacks;
                    
                    console.log(`Feedbacks externos: ${feedbacksExternos.length}, Locais: ${feedbacksLocais.length}`);
                    
                    // Combinar e remover duplicatas
                    const todosFeedbacks = [...feedbacksExternos];
                    for (const local of feedbacksLocais) {
                        if (!todosFeedbacks.find(f => f.id === local.id)) {
                            todosFeedbacks.push(local);
                        }
                    }
                    
                    // Ordenar por data (mais recentes primeiro)
                    todosFeedbacks.sort((a, b) => b.id - a.id);
                    
                    this.feedbacks = todosFeedbacks;
                    this.salvarFeedbacks();
                    console.log('✓ Sincronização concluída:', this.feedbacks.length, 'feedbacks');
                    return;
                }
            }
        } catch (e) {
            console.log('⚠️ Netlify Function indisponível:', e.message);
        }

        // Fallback para arquivo JSON local
        try {
            console.log('📄 Tentando sincronizar com data.json...');
            const response = await fetch('data.json');
            if (response.ok) {
                const data = await response.json();
                if (data.feedbacks && Array.isArray(data.feedbacks)) {
                    const feedbacksExternos = data.feedbacks;
                    const feedbacksLocais = this.feedbacks;
                    
                    const todosFeedbacks = [...feedbacksExternos];
                    for (const local of feedbacksLocais) {
                        if (!todosFeedbacks.find(f => f.id === local.id)) {
                            todosFeedbacks.push(local);
                        }
                    }
                    
                    todosFeedbacks.sort((a, b) => b.id - a.id);
                    
                    this.feedbacks = todosFeedbacks;
                    this.salvarFeedbacks();
                    console.log('✓ data.json sincronizado');
                }
            }
        } catch (e) {
            console.log('⚠️ Sincronização offline - usando localStorage');
        }
    }

    adicionarFeedback(nome, texto, email = '') {
        const feedback = {
            id: Date.now(),
            nome: nome.trim() || 'Cliente Anônimo',
            texto: texto.trim(),
            email: email.trim(),
            data: new Date().toLocaleDateString('pt-BR'),
            hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            likes: 0,
            likedBy: []
        };
        
        if (feedback.texto) {
            this.feedbacks.unshift(feedback); // Adiciona no início
            this.salvarFeedbacks();
            
            // Tentar atualizar data.json via CORS
            this.salvarNoCloud(feedback);
            
            return true;
        }
        return false;
    }

    // Adicionar like a um feedback
    adicionarLike(feedbackId, usuarioId) {
        const feedback = this.feedbacks.find(f => f.id === feedbackId);
        if (feedback) {
            // Verificar se já curtiu
            if (!feedback.likedBy) {
                feedback.likedBy = [];
            }
            
            if (!feedback.likedBy.includes(usuarioId)) {
                feedback.likedBy.push(usuarioId);
                feedback.likes = (feedback.likes || 0) + 1;
                this.salvarFeedbacks();
                return true;
            }
            return false; // Já tinha curtido
        }
        return false;
    }

    // Remover like de um feedback
    removerLike(feedbackId, usuarioId) {
        const feedback = this.feedbacks.find(f => f.id === feedbackId);
        if (feedback && feedback.likedBy) {
            const index = feedback.likedBy.indexOf(usuarioId);
            if (index > -1) {
                feedback.likedBy.splice(index, 1);
                feedback.likes = Math.max(0, (feedback.likes || 1) - 1);
                this.salvarFeedbacks();
                return true;
            }
        }
        return false;
    }

    // Salvar feedback na nuvem (usando Vercel API ou localStorage)
    async salvarNoCloud(feedback) {
        try {
            console.log('📤 Enviando feedback para Vercel API:', feedback);
            // Tentar usar Vercel API
            const response = await fetch('/api/feedbacks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedback)
            });
            
            const result = await response.json();
            console.log('Resposta do servidor:', result);
            
            if (response.ok) {
                console.log('✓ Feedback salvo na nuvem:', feedback.id);
                return;
            } else {
                console.log('❌ Erro ao salvar:', result);
            }
        } catch (e) {
            console.log('⚠️ Vercel API falhou:', e.message);
        }
        
        // Fallback: salvar apenas em localStorage
        const syncData = {
            feedbacks: this.feedbacks
        };
        localStorage.setItem('topcompras_feedbacks_cloud', JSON.stringify(syncData));
    }

    obterFeedbacks(limite = 10) {
        return this.feedbacks.slice(0, limite);
    }

    removerFeedback(id) {
        this.feedbacks = this.feedbacks.filter(f => f.id !== id);
        this.salvarFeedbacks();
    }

    // Deletar feedback no servidor e localmente
    async deletarFeedbackComSync(feedbackId) {
        try {
            // Enviar para servidor
            const response = await fetch('/api/feedbacks', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedbackId })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✓ Feedback deletado no servidor:', data);
            }
        } catch (erro) {
            console.warn('⚠ Erro ao deletar feedback no servidor:', erro);
        }

        // Remover localmente também
        this.removerFeedback(feedbackId);
    }

    obterTodosFeedbacks() {
        return this.feedbacks;
    }
}

const vendasTracker = new VendasTracker();
const feedbackManager = new FeedbackManager();
const precosManager = new PrecosManager();

// Sincronizar vendas e preços ao carregar página
vendasTracker.sincronizar();
precosManager.sincronizar();

// Variáveis de autenticação
let adminAutenticado = false;
const ADMIN_PASSWORD = '@..Drip_Shadow..09..011..!..?..';

// Produtos com variações agrupadas
const produtos = [
    // JOGOS
    { 
        nome: "Minecraft", 
        emoji: "⛏️", 
        emojiUrl: "", 
        imagem: "https://696fe66876634d918b874757.imgix.net/Gemini_Generated_Image_q5b8mhq5b8mhq5b8.png?auto=format&fit=fill&w=384?auto=format&fit=crop&w=400&q=80", 
        categoria: "Jogos", 
        status: "disponivel",
        variações: [
            { nome: "Bedrock e Java - PERMANENTE", preco: 70.00, pagamento: ["pix", "cartao"], descricao: "Acesso vitalício a ambas as versões." },
            { nome: "Java Edition", preco: 35.00, pagamento: ["pix", "cartao"], descricao: "Versão original para PC." },
            { nome: "Bedrock", preco: 40.00, pagamento: ["pix", "cartao"], descricao: "Versão Windows 10/11." }
        ]
    },
    { 
        nome: "Xbox Game Pass", 
        emoji: "🎮", 
        emojiUrl: "", 
        imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_1c60g91c60g91c60.png?auto=format&fit=crop&w=400&q=80", 
        categoria: "Jogos", 
        status: "disponivel",
        etiqueta: "Mais vendido",
        variações: [
            { nome: "1 Mês", preco: 4.90, pagamento: ["pix", "cartao"], descricao: "Acesso a centenas de jogos." },
            { nome: "3 Meses", preco: 12.90, pagamento: ["pix", "cartao"], descricao: "3 meses de acesso premium." }
        ]
    },
    { 
        nome: "Steam Wallet", 
        emoji: "💰", 
        emojiUrl: "", 
        imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_soxw75soxw75soxw.png?auto=format&fit=crop&w=400&q=80", 
        categoria: "Jogos", 
        status: "disponivel",
        variações: [
            { nome: "20 Reais", preco: 20.00, pagamento: ["pix"], descricao: "Crédito para a loja Steam." },
            { nome: "50 Reais", preco: 50.00, pagamento: ["pix", "cartao"], descricao: "Crédito para a loja Steam." },
            { nome: "100 Reais", preco: 100.00, etiqueta: "Popular", pagamento: ["pix", "cartao"], descricao: "Crédito para a loja Steam." }
        ]
    },
    { nome: "Brawl Stars - 1000 Gems", preco: 19.90, emoji: "⭐", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_w90nvpw90nvpw90n.png?auto=format&fit=crop&w=400&q=80", descricao: "Moeda premium do jogo.", categoria: "Jogos", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Free Fire - 1000 Diamantes", preco: 24.90, emoji: "🔥", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_f3jjb1f3jjb1f3jj.png?auto=format&fit=crop&w=400&q=80", descricao: "Moeda premium do jogo.", categoria: "Jogos", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Fortnite - 1000 V-Bucks", preco: 29.90, emoji: "🎯", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_tq4yvvtq4yvvtq4y.png?auto=format&fit=crop&w=400&q=80", descricao: "Moeda premium para Fortnite.", categoria: "Jogos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Roblox - 400 Robux", preco: 14.90, emoji: "🎮", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_de7l0cde7l0cde7l.png?auto=format&fit=crop&w=400&q=80", descricao: "Moeda virtual de Roblox.", categoria: "Jogos", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "FIFA 24 - 2200 FIFA Points", preco: 79.90, emoji: "⚽", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_kovw31kovw31kovw.png?auto=format&fit=crop&w=400&q=80", descricao: "Pontos para Ultimate Team.", categoria: "Jogos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Valorant - 1275 Valorant Points", preco: 49.90, emoji: "🎯", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_kifaz4kifaz4kifa.png?auto=format&fit=crop&w=400&q=80", descricao: "Moeda premium de Valorant.", categoria: "Jogos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "League of Legends - 1350 RP", preco: 54.90, emoji: "⚔️", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_b16u3fb16u3fb16u.png?auto=format&fit=crop&w=400&q=80", descricao: "Moeda de League of Legends.", categoria: "Jogos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Dota 2 - 1000 Gems", preco: 34.90, emoji: "⚔️", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_ptlkeyptlkeyptlk.png?auto=format&fit=crop&w=400&q=80", descricao: "Moeda premium de Dota 2.", categoria: "Jogos", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Apex Legends - 1000 Apex Coins", preco: 44.90, emoji: "🎯", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_g3zdmdg3zdmdg3zd.png?auto=format&fit=crop&w=400&q=80", descricao: "Moeda premium de Apex.", categoria: "Jogos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Call of Duty - 2400 CP", preco: 89.90, emoji: "🎮", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_osypibosypibosyp.png?auto=format&fit=crop&w=400&q=80", descricao: "Pontos de Call of Duty.", categoria: "Jogos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Overwatch 2 - 2000 Overwatch Coins", preco: 79.90, emoji: "🎯", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_xm97z7xm97z7xm97.png?auto=format&fit=crop&w=400&q=80", descricao: "Moeda de Overwatch 2.", categoria: "Jogos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Rocket League - 2000 Credits", preco: 59.90, emoji: "🚗", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_dvm9hrdvm9hrdvm9.png?auto=format&fit=crop&w=400&q=80", descricao: "Moeda de Rocket League.", categoria: "Jogos", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Lost Ark - 1000 Crystals", preco: 44.90, emoji: "⚔️", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_sx0afzsx0afzsx0a.png?auto=format&fit=crop&w=400&q=80", descricao: "Cristais de Lost Ark.", categoria: "Jogos", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Genshin Impact - 980 Genesis Crystals", preco: 49.90, emoji: "✨", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_h5frmmh5frmmh5fr.png?auto=format&fit=crop&w=400&q=80", descricao: "Cristais de Genshin Impact.", categoria: "Jogos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },

    // STREAMING
    { 
        nome: "Netflix", 
        emoji: "📺", 
        emojiUrl: "", 
        imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_3ri8j43ri8j43ri8.png?auto=format&fit=crop&w=400&q=80", 
        categoria: "Streaming", 
        status: "disponivel",
        variações: [
            { nome: "1 Mês", preco: 39.90, pagamento: ["pix", "cartao"], descricao: "Assinatura mensal Netflix." },
            { nome: "3 Meses", preco: 99.90, pagamento: ["pix", "cartao"], descricao: "3 meses de Netflix." }
        ]
    },
    { nome: "Amazon Prime Video 1 Mês", preco: 14.90, emoji: "🎬", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_wbic4xwbic4xwbic.png?auto=format&fit=crop&w=400&q=80", descricao: "Acesso a Amazon Prime Video.", categoria: "Streaming", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "HBO Max 1 Mês", preco: 44.90, emoji: "📺", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_rek1lvrek1lvrek1.png?auto=format&fit=crop&w=400&q=80", descricao: "Acesso a HBO Max.", categoria: "Streaming", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { 
        nome: "YouTube Premium", 
        emoji: "▶️", 
        emojiUrl: "", 
        imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_7xwe217xwe217xwe.png?auto=format&fit=crop&w=400&q=80", 
        categoria: "Streaming", 
        status: "disponivel",
        variações: [
            { nome: "1 Mês", preco: 16.90, pagamento: ["pix"], descricao: "YouTube sem anúncios." },
            { nome: "6 Meses", preco: 84.90, pagamento: ["pix", "cartao"], descricao: "6 meses de YouTube Premium." }
        ]
    },
    { 
        nome: "Spotify Premium", 
        emoji: "🎵", 
        emojiUrl: "", 
        imagem: "https://6970316076634d918b8775d4.imgix.net/Sportify?auto=format&fit=crop&w=400&q=80", 
        categoria: "Streaming", 
        status: "disponivel",
        variações: [
            { nome: "1 Mês", preco: 12.90, pagamento: ["pix"], descricao: "Spotify sem limite de anúncios." },
            { nome: "3 Meses", preco: 34.90, pagamento: ["pix", "cartao"], descricao: "3 meses de Spotify Premium." },
            { nome: "1 Ano", preco: 119.90, etiqueta: "Melhor preço", pagamento: ["pix", "cartao"], descricao: "1 ano de Spotify completo." }
        ]
    },
    { nome: "Twitch Prime 1 Mês", preco: 9.90, emoji: "🎮", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_rmbuo6rmbuo6rmbu.png?auto=format&fit=crop&w=400&q=80", descricao: "Twitch Prime mensal.", categoria: "Streaming", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Crunchyroll 1 Mês", preco: 19.90, emoji: "🎬", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_gw748agw748agw74.png?auto=format&fit=crop&w=400&q=80", descricao: "Animes sem limite.", categoria: "Streaming", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { 
        nome: "Disney+", 
        emoji: "🏰", 
        emojiUrl: "", 
        imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_q2rvevq2rvevq2rv.png?auto=format&fit=crop&w=400&q=80", 
        categoria: "Streaming", 
        status: "disponivel",
        variações: [
            { nome: "1 Mês", preco: 34.90, pagamento: ["pix", "cartao"], descricao: "Streaming Disney+." },
            { nome: "Disney Bundle (Disney+, Hulu, ESPN+)", preco: 79.90, pagamento: ["pix", "cartao"], descricao: "Trio de streaming Disney." }
        ]
    },

    // SOFTWARE
    { nome: "Adobe Photoshop 1 Mês", preco: 54.90, emoji: "🎨", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_e5iveqe5iveqe5iv.png?auto=format&fit=crop&w=400&q=80", descricao: "Editor de imagens profissional.", categoria: "Software", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Adobe Creative Cloud 1 Mês", preco: 79.90, emoji: "🎨", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_q8e4l0q8e4l0q8e4.png?auto=format&fit=crop&w=400&q=80", descricao: "Suite completa Adobe.", categoria: "Software", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Microsoft Office 365 1 Ano", preco: 199.90, emoji: "📄", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_hjlyachjlyachjly.png?auto=format&fit=crop&w=400&q=80", descricao: "Office completo por 1 ano.", categoria: "Software", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "AutoCAD 1 Mês", preco: 149.90, emoji: "🏗️", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_6abzr16abzr16abz.png?auto=format&fit=crop&w=400&q=80", descricao: "Software de design profissional.", categoria: "Software", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Corel Draw 2024", preco: 399.90, emoji: "🎨", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_7ltzip7ltzip7ltz.png?auto=format&fit=crop&w=400&q=80", descricao: "Suite de design gráfico.", categoria: "Software", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Final Cut Pro", preco: 299.90, emoji: "🎬", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_c6ph00c6ph00c6ph.png?auto=format&fit=crop&w=400&q=80", descricao: "Edição de vídeo profissional.", categoria: "Software", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },

    // E-BOOKS
    { nome: "E-book: Programação em Python", preco: 39.90, emoji: "📖", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_5pprhl5pprhl5ppr.png?auto=format&fit=crop&w=400&q=80", descricao: "Guia completo de Python.", categoria: "E-Books", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "E-book: Web Design Moderno", preco: 49.90, emoji: "🎨", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_xeyrwgxeyrwgxeyr.png?auto=format&fit=crop&w=400&q=80", descricao: "Design responsivo e atual.", categoria: "E-Books", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "E-book: Marketing Digital", preco: 59.90, emoji: "📱", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_rxzce1rxzce1rxzc.png?auto=format&fit=crop&w=400&q=80", descricao: "Estratégias de marketing online.", categoria: "E-Books", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "E-book: SEO Avançado", preco: 44.90, emoji: "🔍", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_d9bhfpd9bhfpd9bh.png?auto=format&fit=crop&w=400&q=80", descricao: "Otimização para buscas.", categoria: "E-Books", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "E-book: JavaScript Completo", preco: 54.90, emoji: "💻", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_i3on6ii3on6ii3on.png?auto=format&fit=crop&w=400&q=80", descricao: "Da introdução ao avançado.", categoria: "E-Books", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "E-book: React.js Prático", preco: 64.90, emoji: "⚛️", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_is37wlis37wlis37.png?auto=format&fit=crop&w=400&q=80", descricao: "Desenvolvimento com React.", categoria: "E-Books", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "E-book: Empreendedorismo Digital", preco: 69.90, emoji: "💼", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_cg6dg1cg6dg1cg6d.png?auto=format&fit=crop&w=400&q=80", descricao: "Comece seu negócio online.", categoria: "E-Books", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "E-book: Gestão de Projetos Ágeis", preco: 74.90, emoji: "📊", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_r1yrdzr1yrdzr1yr.png?auto=format&fit=crop&w=400&q=80", descricao: "Metodologias Agile e Scrum.", categoria: "E-Books", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },

    // CURSOS
    { nome: "Curso: Desenvolvimento Web Completo", preco: 149.90, emoji: "💻", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_5u7g2h5u7g2h5u7g.png?auto=format&fit=crop&w=400&q=80", descricao: "HTML, CSS, JavaScript e mais.", categoria: "Cursos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Curso: Data Science com Python", preco: 199.90, emoji: "📊", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_lmwwvzlmwwvzlmww.png?auto=format&fit=crop&w=400&q=80", descricao: "Análise de dados profissional.", categoria: "Cursos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Curso: Machine Learning", preco: 249.90, emoji: "🤖", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_74tzxo74tzxo74tz.png?auto=format&fit=crop&w=400&q=80", descricao: "IA e algoritmos de ML.", categoria: "Cursos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Curso: Fotografia Profissional", preco: 179.90, emoji: "📸", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_qqfjxgqqfjxgqqfj.png?auto=format&fit=crop&w=400&q=80", descricao: "Do básico ao avançado.", categoria: "Cursos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Curso: Edição de Vídeo com After Effects", preco: 189.90, emoji: "🎬", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_73sm5b73sm5b73sm.png?auto=format&fit=crop&w=400&q=80", descricao: "Efeitos visuais profissionais.", categoria: "Cursos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Curso: Inglês Completo", preco: 159.90, emoji: "🌍", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_qcfwk6qcfwk6qcfw.png?auto=format&fit=crop&w=400&q=80", descricao: "Do iniciante ao avançado.", categoria: "Cursos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Curso: Espanhol para Negócios", preco: 139.90, emoji: "🌎", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_bxnf3jbxnf3jbxnf.png?auto=format&fit=crop&w=400&q=80", descricao: "Espanhol profissional.", categoria: "Cursos", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Curso: UI/UX Design", preco: 169.90, emoji: "🎨", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_wig59qwig59qwig5.png?auto=format&fit=crop&w=400&q=80", descricao: "Design de interfaces moderno.", categoria: "Cursos", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },

    // TEMPLATES
    { nome: "Template Website Profissional HTML", preco: 49.90, emoji: "🌐", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_qavkxqavkxqavkxq.png?auto=format&fit=crop&w=400&q=80", descricao: "Pronto para usar.", categoria: "Templates", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Template WordPress Empresarial", preco: 79.90, emoji: "📱", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_rte3nwrte3nwrte3.png?auto=format&fit=crop&w=400&q=80", descricao: "Tema WordPress premium.", categoria: "Templates", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Pack 100 Ícones SVG", preco: 24.90, emoji: "🎨", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_uym22buym22buym2.png?auto=format&fit=crop&w=400&q=80", descricao: "Ícones escaláveis.", categoria: "Templates", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Pack 500 Fotos Stock HD", preco: 69.90, emoji: "📸", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_1dwzit1dwzit1dwz.png?auto=format&fit=crop&w=400&q=80", descricao: "Imagens de alta qualidade.", categoria: "Templates", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Plugin WooCommerce Premium", preco: 89.90, emoji: "🛒", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_akoanmakoanmakoa.png?auto=format&fit=crop&w=400&q=80", descricao: "Loja online WordPress.", categoria: "Templates", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Figma Templates Pack", preco: 59.90, emoji: "🎨", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_9zq3zy9zq3zy9zq3.png?auto=format&fit=crop&w=400&q=80", descricao: "30 templates para Figma.", categoria: "Templates", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Biblioteca de Efeitos After Effects", preco: 119.90, emoji: "✨", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_xn39gjxn39gjxn39.png?auto=format&fit=crop&w=400&q=80", descricao: "500+ efeitos prontos.", categoria: "Templates", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },

    // ASSINATURAS
    { nome: "GitHub Copilot 1 Mês", preco: 10.00, emoji: "👨‍💻", emojiUrl: "", imagem: "https://696fe66876634d918b874757.imgix.net/Gemini_Generated_Image_rqx7r3rqx7r3rqx7.png?auto=format&fit=fill&w=384", descricao: "IA para programação.", categoria: "Assinaturas", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "OneDrive 100GB 1 Ano", preco: 59.90, emoji: "☁️", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_b38rbzb38rbzb38r.png?auto=format&fit=crop&w=400&q=80", descricao: "Armazenamento Microsoft.", categoria: "Assinaturas", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Canva Pro 1 Ano", preco: 179.90, emoji: "🎨", emojiUrl: "", imagem: "https://69711139c0356527951e180f.imgix.net/Canva?auto=format&fit=crop&w=400&q=80", descricao: "Design sem limites.", categoria: "Assinaturas", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Grammarly Premium 3 Meses", preco: 34.90, emoji: "✍️", emojiUrl: "", imagem: "https://69711139c0356527951e180f.imgix.net/Grammarly?auto=format&fit=crop&w=400&q=80", descricao: "Verificação de escrita avançada.", categoria: "Assinaturas", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Notion Plus 1 Ano", preco: 99.90, emoji: "📝", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_2z8ggz2z8ggz2z8g.png?auto=format&fit=crop&w=400&q=80", descricao: "Workspace produtivo.", categoria: "Assinaturas", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Slack Pro 1 Mês", preco: 9.99, emoji: "💬", emojiUrl: "", imagem: "https://69711139c0356527951e180f.imgix.net/Slack?auto=format&fit=crop&w=400&q=80", descricao: "Comunicação em equipe.", categoria: "Assinaturas", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Adobe Acrobat Pro 1 Ano", preco: 249.90, emoji: "📄", emojiUrl: "", imagem: "https://69711139c0356527951e180f.imgix.net/Adobe?auto=format&fit=crop&w=400&q=80", descricao: "Edição de PDF profissional.", categoria: "Assinaturas", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "JetBrains All Products 1 Ano", preco: 299.90, emoji: "💻", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_dtzvxddtzvxddtzv.png?auto=format&fit=crop&w=400&q=80", descricao: "Suite completa de IDEs.", categoria: "Assinaturas", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "InVision Studio 1 Ano", preco: 199.90, emoji: "🎨", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_d3zxsjd3zxsjd3zx.png?auto=format&fit=crop&w=400&q=80", descricao: "Prototipagem de design.", categoria: "Assinaturas", status: "disponivel", pagamento: ["pix", "cartao"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Adobe XD Premium 1 Ano", preco: 159.90, emoji: "🎨", emojiUrl: "", imagem: "https://6970316076634d918b8775d4.imgix.net/Gemini_Generated_Image_72doig72doig72do.png?auto=format&fit=crop&w=400&q=80", descricao: "UX/UI Design tool.", categoria: "Assinaturas", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } },
    { nome: "Duolingo Plus 3 Meses", preco: 44.90, emoji: "🌍", emojiUrl: "", imagem: "https://69711139c0356527951e180f.imgix.net/Duolingo?auto=format&fit=crop&w=400&q=80", descricao: "Aprendizado sem anúncios.", categoria: "Assinaturas", status: "disponivel", pagamento: ["pix"], checkout: { storeId: '$drip_duke', checkoutUrl: 'https://checkout.infinitepay.io/drip_duke/CGO5dGsV3' } }
];

function getIcon(tipo) {
    if (tipo === "pix") return '<span title="Pix" style="color:#8b5cf6;font-size:1.1em;vertical-align:middle;">\u2756</span>';
    if (tipo === "cartao") return '<span title="Cartão de Crédito" style="color:#8b5cf6;font-size:1.0em;vertical-align:middle;">[💳]</span>';
    return '';
}

function renderEmoji(produto) {
    if (produto.emojiUrl && produto.emojiUrl.trim() !== '') {
        return `<img src="${produto.emojiUrl}" alt="emoji" style="width:1.3em;height:1.3em;vertical-align:middle;margin-right:0.3em;">`;
    } else if (produto.emoji) {
        return produto.emoji + ' ';
    }
    return '';
}

function gerarIdUnico() {
    return 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function processarCheckoutInfinitePay(produto) {
    // Registrar venda localmente e sincronizar com servidor
    vendasTracker.registrarVendaComSync(produto.nome);
    
    const config = produto.checkout || window.infinitePayConfig;
    
    if (!config || !config.storeId || !config.checkoutUrl) {
        alert('⚠️ Configuração de pagamento não encontrada para este produto.');
        return;
    }

    const orderId = gerarIdUnico();
    const amount = (produto.preco * 100).toFixed(0);
    
    const params = new URLSearchParams({
        order_id: orderId,
        amount: amount,
        currency: 'BRL',
        description: produto.nome,
        customer_name: 'Cliente TOP COMPRAS',
        customer_email: 'cliente@topcompras.com',
        return_url: window.location.origin + '/sucesso.html?order_id=' + orderId + '&amount=' + amount,
        metadata_product: produto.nome,
        metadata_category: produto.categoria
    });

    const checkoutUrl = config.checkoutUrl + '?' + params.toString();
    window.location.href = checkoutUrl;
}

let categoriaSelecionada = 'Todos';
let variacaoSelecionada = {};

function filtrarPorCategoria(categoria) {
    categoriaSelecionada = categoria;
    
    document.querySelectorAll('.categoria-btn').forEach(btn => {
        btn.classList.remove('ativo');
    });
    event.target.classList.add('ativo');
    
    carregarProdutos();
}

function carregarProdutos() {
    const lista = document.getElementById('produtos-lista');
    lista.innerHTML = '';
    
    const produtosFiltrados = categoriaSelecionada === 'Todos' 
        ? produtos 
        : produtos.filter(p => p.categoria === categoriaSelecionada);
    
    // Carregar dados públicos (vendas e feedbacks)
    carregarDadosPublicos();

    produtosFiltrados.forEach((produto, index) => {
        const div = document.createElement('div');
        div.className = 'produto';
        div.style.animationDelay = `${index * 0.02}s`;
        div.style.cursor = 'pointer';
        
        let etiqueta = '';
        if (produto.etiqueta) {
            etiqueta = `<div class="etiqueta">${produto.etiqueta}</div>`;
        }
        
        // Se tem variações, pega o preço mínimo
        let precoMin, precoAntigoMin, descontoMin, pagamento;
        if (produto.variações && produto.variações.length > 0) {
            const variacaoMaisBarata = produto.variações.reduce((prev, curr) => {
                // Obter preço customizado ou original para comparar
                const precoA = precosManager.obterPreco(produto.nome, curr.nome);
                const priceA = precoA !== undefined ? precoA : curr.preco;
                
                const precoB = precosManager.obterPreco(produto.nome, prev.nome);
                const priceB = precoB !== undefined ? precoB : prev.preco;
                
                return priceA < priceB ? curr : prev;
            });
            
            // Obter preço customizado se existir
            const precoCustomizado = precosManager.obterPreco(produto.nome, variacaoMaisBarata.nome);
            precoMin = precoCustomizado !== undefined ? precoCustomizado : variacaoMaisBarata.preco;
            precoAntigoMin = variacaoMaisBarata.precoAntigo;
            
            // Obter desconto customizado se existir
            const descontoCustomizado = precosManager.obterDesconto(produto.nome, variacaoMaisBarata.nome);
            descontoMin = descontoCustomizado > 0 ? descontoCustomizado : variacaoMaisBarata.desconto;
            
            pagamento = variacaoMaisBarata.pagamento || [];
        } else {
            // Obter preço customizado se existir
            const precoCustomizado = precosManager.obterPreco(produto.nome);
            precoMin = precoCustomizado !== undefined ? precoCustomizado : produto.preco;
            precoAntigoMin = produto.precoAntigo;
            
            // Obter desconto customizado se existir
            const descontoCustomizado = precosManager.obterDesconto(produto.nome);
            descontoMin = descontoCustomizado > 0 ? descontoCustomizado : produto.desconto;
            
            pagamento = produto.pagamento || [];
        }
        
        let precoAntigo = '';
        if (precoAntigoMin) {
            precoAntigo = `<span class="preco-antigo">R$ ${precoAntigoMin.toFixed(2)}</span>`;
        }
        
        // Calcular preço com desconto se houver
        let precoExibido = precoMin;
        if (descontoMin && descontoMin > 0) {
            precoExibido = precoMin * (1 - descontoMin / 100);
        }
        
        let desconto = '';
        if (descontoMin) {
            desconto = `<span style="color:#10b981;font-weight:700;font-size:0.95em;margin-left:0.5rem;">${descontoMin}% OFF</span>`;
        }
        
        let status = '';
        if (produto.status === 'esgotado') {
            status = `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(15,15,30,0.95);color:#fff;padding:1rem 1.5rem;border-radius:12px;font-weight:bold;font-size:1.1em;backdrop-filter:blur(10px);border:1px solid rgba(139,92,246,0.3);">Esgotado</div>`;
        }
        
        let pagamentoHtml = '';
        if (pagamento && pagamento.length > 0) {
            pagamentoHtml = pagamento.map(getIcon).join(' ');
        }

        const vendas = vendasTracker.obterVendas(produto.nome);
        let vendidosInfo = '';
        if (produto.variações && produto.variações.length > 0) {
            const totalVendas = produto.variações.reduce((sum, v) => {
                return sum + vendasTracker.obterVendas(`${produto.nome} - ${v.nome}`);
            }, 0);
            if (totalVendas > 0) {
                vendidosInfo = `<div style="color:#10b981;font-size:0.85em;margin-top:0.5rem;">✓ ${totalVendas} vendido${totalVendas > 1 ? 's' : ''}</div>`;
            }
        } else if (vendas > 0) {
            vendidosInfo = `<div style="color:#10b981;font-size:0.85em;margin-top:0.5rem;">✓ ${vendas} vendido${vendas > 1 ? 's' : ''}</div>`;
        }
        
        let variações = '';
        if (produto.variações && produto.variações.length > 0) {
            variações = `<div style="font-size:0.8em;color:#a1a1aa;margin-top:0.3rem;">${produto.variações.length} variações</div>`;
        }
        
        // Verificar se há desconto customizado
        let badgeDesconto = '';
        if (produto.variações && produto.variações.length > 0) {
            // Para produtos com variações, verificar se alguma tem desconto
            for (const v of produto.variações) {
                const descCustom = precosManager.obterDesconto(produto.nome, v.nome);
                if (descCustom > 0) {
                    badgeDesconto = `<div style="position:absolute;top:0.75rem;right:0.75rem;background:linear-gradient(135deg, #10b981 0%, #059669 100%);color:#fff;padding:0.5rem 0.75rem;border-radius:8px;font-size:0.75em;font-weight:700;box-shadow:0 4px 15px rgba(16,185,129,0.4);">🎉 COM DESCONTO</div>`;
                    break;
                }
            }
        } else {
            // Para produtos sem variação
            const descCustom = precosManager.obterDesconto(produto.nome);
            if (descCustom > 0) {
                badgeDesconto = `<div style="position:absolute;top:0.75rem;right:0.75rem;background:linear-gradient(135deg, #10b981 0%, #059669 100%);color:#fff;padding:0.5rem 0.75rem;border-radius:8px;font-size:0.75em;font-weight:700;box-shadow:0 4px 15px rgba(16,185,129,0.4);">🎉 COM DESCONTO</div>`;
            }
        }
        
        div.innerHTML = `
            ${etiqueta}
            ${badgeDesconto}
            <img src="${produto.imagem}" alt="${produto.nome}">
            <h3>${renderEmoji(produto)}${produto.nome}</h3>
            <p>${produto.variações && produto.variações.length > 0 ? produto.variações[0].descricao : produto.descricao}</p>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;">
                ${precoAntigo}
                <span class="preco">R$ ${precoExibido.toFixed(2)}</span>
                ${desconto}
            </div>
            ${vendidosInfo}
            ${variações}
            <div style="margin-bottom:1rem;color:#a1a1aa;font-size:0.9em;font-weight:500;">À vista no Pix e Cartão ${pagamentoHtml}</div>
            ${status}
        `;
        
        div.addEventListener('click', () => {
            abrirModalProduto(produto);
        });
        
        lista.appendChild(div);
    });
}

function abrirModalProduto(produto) {
    // Sincronizar preços antes de abrir o modal
    precosManager.sincronizar().then(() => {
        const modal = document.getElementById('modalProduto');
        
        // Preencher dados básicos
        document.getElementById('modalNome').textContent = produto.nome;
        document.getElementById('modalImg').src = produto.imagem;
        
        // Se tem variações, criar dropdown
        let variacaoHtml = '';
        if (produto.variações && produto.variações.length > 0) {
            variacaoSelecionada[produto.nome] = 0;
            variacaoHtml = `
                <div style="margin-bottom:1.5rem;">
                    <label style="color:#a1a1aa;font-size:0.9em;margin-bottom:0.5rem;display:block;">Selecione uma variação:</label>
                    <select id="selectorVariacao" style="width:100%;padding:0.75rem;background:#1a1a2e;border:1px solid rgba(139,92,246,0.3);border-radius:8px;color:#fff;font-size:1em;cursor:pointer;" onchange="atualizarVariacao(event, '${produto.nome}')">
                        ${produto.variações.map((v, i) => {
                            const precoCustomizado = precosManager.obterPreco(produto.nome, v.nome);
                            const precoExibir = precoCustomizado !== undefined ? precoCustomizado : v.preco;
                            return `<option value="${i}">${v.nome} - R$ ${precoExibir.toFixed(2)}</option>`;
                        }).join('')}
                    </select>
                </div>
            `;
            document.getElementById('modalVariacoes').innerHTML = variacaoHtml;
            
            // Atualizar com primeira variação
            const primeiraVariacao = produto.variações[0];
            document.getElementById('modalDescricao').textContent = primeiraVariacao.descricao;
            atualizarPrecosVariacao(produto, 0);
            document.getElementById('quantidadeProduto').value = '1';
        } else {
            document.getElementById('modalVariacoes').innerHTML = '';
            document.getElementById('modalDescricao').textContent = produto.descricao;
            document.getElementById('quantidadeProduto').value = '1';
        }
        
        // Guardar referência do produto
        produtoSelecionado = produto;
        document.getElementById('quantidadeProduto').addEventListener('input', atualizarPrecoTotal);
        
        // Atualizar preço total com desconto e quantidade
        if (!produto.variações || produto.variações.length === 0) {
            // Para produtos sem variação
            const precoCustomizado = precosManager.obterPreco(produto.nome);
            const descontoCustomizado = precosManager.obterDesconto(produto.nome);
            const preco = precoCustomizado !== undefined ? precoCustomizado : produto.preco;
            const desconto = descontoCustomizado > 0 ? descontoCustomizado : produto.desconto;
            
            document.getElementById('modalPreco').textContent = `R$ ${preco.toFixed(2)}`;
            
            const precoAntigoEl = document.getElementById('modalPrecoAntigo');
            if (produto.precoAntigo) {
                precoAntigoEl.textContent = `R$ ${produto.precoAntigo.toFixed(2)}`;
                precoAntigoEl.style.display = 'inline';
            } else {
                precoAntigoEl.style.display = 'none';
            }
            
            const descontoEl = document.getElementById('modalDesconto');
            if (desconto) {
                descontoEl.textContent = `${desconto}% OFF`;
                descontoEl.style.display = 'inline-block';
            } else {
                descontoEl.style.display = 'none';
            }
            
            // Chamar atualizarPrecoTotal AGORA, após produtoSelecionado estar setado
            atualizarPrecoTotal();
        } else {
            // Para produtos com variação, chamar para aplicar desconto
            atualizarPrecoTotal();
        }
        
        // Vendidos
        let totalVendas = 0;
        if (produto.variações && produto.variações.length > 0) {
            totalVendas = produto.variações.reduce((sum, v) => {
                return sum + vendasTracker.obterVendas(`${produto.nome} - ${v.nome}`);
            }, 0);
        } else {
            totalVendas = vendasTracker.obterVendas(produto.nome);
        }
        
        const vendidosEl = document.getElementById('modalVendidos');
        if (totalVendas > 0) {
            vendidosEl.innerHTML = `✓ ${totalVendas} vendido${totalVendas > 1 ? 's' : ''}`;
            vendidosEl.style.display = 'block';
        } else {
            vendidosEl.style.display = 'none';
        }
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });
}

function atualizarVariacao(event, nomeProduto) {
    const indexVariacao = event.target.value;
    const produto = produtos.find(p => p.nome === nomeProduto);
    
    if (produto && produto.variações) {
        variacaoSelecionada[nomeProduto] = indexVariacao;
        atualizarPrecosVariacao(produto, indexVariacao);
    }
}

function atualizarPrecosVariacao(produto, indexVariacao) {
    const variacao = produto.variações[indexVariacao];
    
    // Verificar se há preço customizado
    const precoCustomizado = precosManager.obterPreco(produto.nome, variacao.nome);
    const descontoCustomizado = precosManager.obterDesconto(produto.nome, variacao.nome);
    
    const preco = precoCustomizado !== undefined ? precoCustomizado : variacao.preco;
    const desconto = descontoCustomizado > 0 ? descontoCustomizado : variacao.desconto;
    
    // Mostrar preço sem desconto (será aplicado no total com quantidade)
    document.getElementById('modalPreco').textContent = `R$ ${preco.toFixed(2)}`;
    document.getElementById('modalDescricao').textContent = variacao.descricao;
    
    const precoAntigoEl = document.getElementById('modalPrecoAntigo');
    if (variacao.precoAntigo) {
        precoAntigoEl.textContent = `R$ ${variacao.precoAntigo.toFixed(2)}`;
        precoAntigoEl.style.display = 'inline';
    } else {
        precoAntigoEl.style.display = 'none';
    }
    
    const descontoEl = document.getElementById('modalDesconto');
    if (desconto) {
        descontoEl.textContent = `${desconto}% OFF`;
        descontoEl.style.display = 'inline-block';
    } else {
        descontoEl.style.display = 'none';
    }
    
    // Atualizar preço total com desconto
    atualizarPrecoTotal();
}

function fecharModalProduto() {
    document.getElementById('modalProduto').style.display = 'none';
    document.body.style.overflow = 'auto';
    produtoSelecionado = null;
}

function aumentarQuantidade() {
    const input = document.getElementById('quantidadeProduto');
    input.value = parseInt(input.value) + 1;
    atualizarPrecoTotal();
}

function diminuirQuantidade() {
    const input = document.getElementById('quantidadeProduto');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
    atualizarPrecoTotal();
}

function atualizarPrecoTotal() {
    if (!produtoSelecionado) return;
    
    const quantidade = parseInt(document.getElementById('quantidadeProduto').value);
    let precoBase;
    let desconto = 0;
    let variacaoNome = null;
    
    if (produtoSelecionado.variações && produtoSelecionado.variações.length > 0) {
        const indexVariacao = variacaoSelecionada[produtoSelecionado.nome] || 0;
        const variacao = produtoSelecionado.variações[indexVariacao];
        variacaoNome = variacao.nome;
        
        // Verificar preço customizado
        const precoCustomizado = precosManager.obterPreco(produtoSelecionado.nome, variacaoNome);
        precoBase = precoCustomizado !== undefined ? precoCustomizado : variacao.preco;
        
        // Verificar desconto customizado
        const descontoCustomizado = precosManager.obterDesconto(produtoSelecionado.nome, variacaoNome);
        desconto = descontoCustomizado > 0 ? descontoCustomizado : (variacao.desconto || 0);
    } else {
        // Verificar preço customizado
        const precoCustomizado = precosManager.obterPreco(produtoSelecionado.nome);
        precoBase = precoCustomizado !== undefined ? precoCustomizado : produtoSelecionado.preco;
        
        // Verificar desconto customizado
        const descontoCustomizado = precosManager.obterDesconto(produtoSelecionado.nome);
        desconto = descontoCustomizado > 0 ? descontoCustomizado : (produtoSelecionado.desconto || 0);
    }
    
    // Aplicar desconto
    const precoComDesconto = precoBase * (1 - desconto / 100);
    const precoTotal = precoComDesconto * quantidade;
    document.getElementById('modalPreco').textContent = `R$ ${precoTotal.toFixed(2)}`;
}

function comprarComQuantidade() {
    if (!produtoSelecionado) return;
    
    const quantidade = parseInt(document.getElementById('quantidadeProduto').value);
    let variacao = '';
    let precoBase;
    let desconto = 0;
    let variacaoNome = null;
    
    if (produtoSelecionado.variações && produtoSelecionado.variações.length > 0) {
        const indexVariacao = variacaoSelecionada[produtoSelecionado.nome] || 0;
        const variacaoObj = produtoSelecionado.variações[indexVariacao];
        variacaoNome = variacaoObj.nome;
        variacao = ` - ${variacaoObj.nome}`;
        
        // Verificar preço customizado
        const precoCustomizado = precosManager.obterPreco(produtoSelecionado.nome, variacaoNome);
        precoBase = precoCustomizado !== undefined ? precoCustomizado : variacaoObj.preco;
        
        // Verificar desconto customizado
        const descontoCustomizado = precosManager.obterDesconto(produtoSelecionado.nome, variacaoNome);
        desconto = descontoCustomizado > 0 ? descontoCustomizado : (variacaoObj.desconto || 0);
    } else {
        // Verificar preço customizado
        const precoCustomizado = precosManager.obterPreco(produtoSelecionado.nome);
        precoBase = precoCustomizado !== undefined ? precoCustomizado : produtoSelecionado.preco;
        
        // Verificar desconto customizado
        const descontoCustomizado = precosManager.obterDesconto(produtoSelecionado.nome);
        desconto = descontoCustomizado > 0 ? descontoCustomizado : (produtoSelecionado.desconto || 0);
    }
    
    // Aplicar desconto
    const precoComDesconto = precoBase * (1 - desconto / 100);
    const precoTotal = precoComDesconto * quantidade;
    
    processarCheckoutInfinitePay({
        preco: precoTotal,
        nome: `${produtoSelecionado.nome}${variacao} (x${quantidade})`,
        categoria: produtoSelecionado.categoria,
        checkout: produtoSelecionado.checkout || (produtoSelecionado.variações && produtoSelecionado.variações[variacaoSelecionada[produtoSelecionado.nome] || 0].checkout)
    });
}

function abrirDashboardVendas() {
    const total = vendasTracker.obterTotalVendas();
    const ranking = vendasTracker.obterRanking(10);
    
    // Calcular conversão (se tivessemos visitantes, mas aqui é só para mostrar)
    const maiorVenda = ranking.length > 0 ? ranking[0].quantidade : 0;

    let html = `
        <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10000;overflow-y:auto;padding:2rem 0;">
            <div style="background:linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%);border:1px solid rgba(139,92,246,0.5);border-radius:20px;padding:2.5rem;max-width:900px;width:90%;color:#e4e4e7;box-shadow:0 0 40px rgba(139,92,246,0.2);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;">
                    <h2 style="color:#fff;margin:0;font-size:1.8em;">📊 Dashboard Dinâmico</h2>
                    <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;">&times;</button>
                </div>

                <!-- Métricas em destaque -->
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:2rem;">
                    <div style="background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);border-radius:12px;padding:1.5rem;text-align:center;">
                        <p style="color:#a1a1aa;margin:0 0 0.5rem 0;font-size:0.9em;">Total de Vendas</p>
                        <p style="font-size:2rem;font-weight:bold;color:#8b5cf6;margin:0;">${total}</p>
                    </div>
                    <div style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);border-radius:12px;padding:1.5rem;text-align:center;">
                        <p style="color:#a1a1aa;margin:0 0 0.5rem 0;font-size:0.9em;">Mais Vendido</p>
                        <p style="font-size:1.3rem;font-weight:bold;color:#10b981;margin:0;">${maiorVenda} vendas</p>
                    </div>
                    <div style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.4);border-radius:12px;padding:1.5rem;text-align:center;">
                        <p style="color:#a1a1aa;margin:0 0 0.5rem 0;font-size:0.9em;">Produtos Cadastrados</p>
                        <p style="font-size:1.3rem;font-weight:bold;color:#3b82f6;margin:0;">${produtos.length}</p>
                    </div>
                </div>

                <!-- Top 10 Produtos -->
                <div style="margin-bottom:2rem;">
                    <h3 style="color:#8b5cf6;margin-bottom:1rem;margin-top:0;border-bottom:2px solid rgba(139,92,246,0.3);padding-bottom:0.5rem;">🏆 Top Produtos</h3>
                    <div style="background:rgba(26,26,46,0.6);border-radius:10px;padding:1rem;max-height:300px;overflow-y:auto;">
                        ${ranking.length > 0 ? ranking.map((item, i) => {
                            const percentage = (item.quantidade / maiorVenda * 100).toFixed(0);
                            return `
                                <div style="margin-bottom:1rem;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.3rem;">
                                        <span style="font-size:0.9em;color:#e4e4e7;">${i + 1}. ${item.nome.substring(0, 35)}</span>
                                        <strong style="color:#8b5cf6;">${item.quantidade}</strong>
                                    </div>
                                    <div style="background:rgba(139,92,246,0.2);border-radius:4px;height:6px;overflow:hidden;">
                                        <div style="background:linear-gradient(90deg, #8b5cf6, #d946ef);height:100%;width:${percentage}%;transition:width 0.3s ease;"></div>
                                    </div>
                                </div>
                            `;
                        }).join('') : '<p style="color:#71717a;">Nenhuma venda ainda</p>'}
                    </div>
                </div>

                <button onclick="this.closest('[style*=fixed]').remove()" style="background:linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;width:100%;font-weight:600;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">Fechar Dashboard</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function abrirPainelAdmin() {
    if (adminAutenticado) {
        mostrarTelaAdmin();
    } else {
        mostrarTelaLogin();
    }
}

function mostrarTelaLogin() {
    let html = `
        <div id="adminLoginOverlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10001;">
            <div style="background:linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%);border:2px solid rgba(139,92,246,0.5);border-radius:16px;padding:2.5rem;max-width:400px;width:90%;box-shadow:0 0 40px rgba(139,92,246,0.3);">
                <h2 style="color:#fff;text-align:center;margin-bottom:2rem;font-size:1.5em;">🔐 Acesso Admin</h2>
                
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;color:#a1a1aa;margin-bottom:0.5rem;font-weight:600;">Senha de Admin:</label>
                    <input type="password" id="adminPassword" style="width:100%;padding:0.75rem;background:#1a1a2e;border:1px solid rgba(139,92,246,0.3);border-radius:8px;color:#fff;font-size:1em;box-sizing:border-box;" placeholder="Digite a senha">
                </div>
                
                <div style="display:flex;gap:1rem;">
                    <button onclick="verificarSenhaAdmin(document.getElementById('adminPassword').value)" style="flex:1;background:linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%);color:#fff;border:none;padding:0.75rem;border-radius:8px;cursor:pointer;font-weight:600;">Entrar</button>
                    <button onclick="document.getElementById('adminLoginOverlay').remove()" style="flex:1;background:rgba(139,92,246,0.2);color:#a1a1aa;border:1px solid rgba(139,92,246,0.3);padding:0.75rem;border-radius:8px;cursor:pointer;font-weight:600;">Cancelar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('adminPassword').focus();
    document.getElementById('adminPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            verificarSenhaAdmin(document.getElementById('adminPassword').value);
        }
    });
}

function verificarSenhaAdmin(senha) {
    if (senha === ADMIN_PASSWORD) {
        adminAutenticado = true;
        document.getElementById('adminLoginOverlay').remove();
        mostrarTelaAdmin();
    } else {
        alert('❌ Senha incorreta!');
    }
}

function mostrarTelaAdmin() {
    const todosProdutos = vendasTracker.obterTodosProdutos().sort((a, b) => b.quantidade - a.quantidade);
    const todosFeedbacks = feedbackManager.obterTodosFeedbacks();
    
    let html = `
        <div id="adminPanel" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10001;overflow-y:auto;padding:2rem 0;">
            <div style="background:linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%);border:2px solid rgba(251,191,36,0.5);border-radius:16px;padding:2.5rem;max-width:900px;width:95%;box-shadow:0 0 40px rgba(251,191,36,0.2);max-height:90vh;overflow-y:auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;">
                    <h2 style="color:#fbbf24;margin:0;font-size:1.5em;">⚙️ Painel de Admin</h2>
                    <button onclick="sairAdmin()" style="background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;">&times;</button>
                </div>

                <!-- SEÇÃO DE PREÇOS -->
                <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:1.5rem;margin-bottom:2rem;">
                    <h3 style="color:#10b981;margin-top:0;">💰 Editar Preços e Descontos</h3>
                    <p style="color:#a1a1aa;font-size:0.9em;">Clique em um produto/variação para editar preço e desconto</p>
                </div>

                <div style="background:rgba(26,26,46,0.6);border-radius:10px;padding:1rem;max-height:250px;overflow-y:auto;margin-bottom:2rem;">
                    ${produtos.length > 0 ? produtos.map(produto => {
                        const precosHtml = [];
                        if (produto.variações && produto.variações.length > 0) {
                            produto.variações.forEach(v => {
                                const precoAtual = precosManager.obterPreco(produto.nome, v.nome) || v.preco;
                                const descontoAtual = precosManager.obterDesconto(produto.nome, v.nome) || v.desconto || 0;
                                precosHtml.push(`
                                    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem;background:rgba(16,185,129,0.05);border-radius:6px;margin-bottom:0.3rem;border-left:3px solid #10b981;">
                                        <div style="flex:1;min-width:0;">
                                            <p style="color:#e4e4e7;margin:0;font-weight:500;font-size:0.9em;word-break:break-word;">${produto.nome} - ${v.nome}</p>
                                            <p style="color:#a1a1aa;margin:0.2rem 0 0 0;font-size:0.8em;">R$ <strong style="color:#10b981;">${precoAtual.toFixed(2)}</strong> ${descontoAtual > 0 ? '<span style="color:#fbbf24;"> | ' + descontoAtual + '% OFF</span>' : ''}</p>
                                        </div>
                                        <button onclick="editarPrecoProduto('${produto.nome.replace(/'/g, "\\'")}', '${v.nome.replace(/'/g, "\\'")}', ${precoAtual})" style="background:#10b981;color:#fff;border:none;padding:0.4rem 0.8rem;border-radius:4px;cursor:pointer;font-size:0.8em;font-weight:600;white-space:nowrap;margin-left:0.5rem;">Editar</button>
                                    </div>
                                `);
                            });
                        } else {
                            const precoAtual = precosManager.obterPreco(produto.nome) || produto.preco;
                            const descontoAtual = precosManager.obterDesconto(produto.nome) || produto.desconto || 0;
                            precosHtml.push(`
                                <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem;background:rgba(16,185,129,0.05);border-radius:6px;margin-bottom:0.3rem;border-left:3px solid #10b981;">
                                    <div style="flex:1;">
                                        <p style="color:#e4e4e7;margin:0;font-weight:500;font-size:0.9em;">${produto.nome}</p>
                                        <p style="color:#a1a1aa;margin:0.2rem 0 0 0;font-size:0.8em;">R$ <strong style="color:#10b981;">${precoAtual.toFixed(2)}</strong> ${descontoAtual > 0 ? '<span style="color:#fbbf24;"> | ' + descontoAtual + '% OFF</span>' : ''}</p>
                                    </div>
                                    <button onclick="editarPrecoProduto('${produto.nome.replace(/'/g, "\\'")}', null, ${precoAtual})" style="background:#10b981;color:#fff;border:none;padding:0.4rem 0.8rem;border-radius:4px;cursor:pointer;font-size:0.8em;font-weight:600;white-space:nowrap;margin-left:0.5rem;">Editar</button>
                                </div>
                            `);
                        }
                        return precosHtml.join('');
                    }).join('') : '<p style="color:#71717a;text-align:center;">Nenhum produto</p>'}
                </div>

                <!-- SEÇÃO DE VENDAS -->
                <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:1.5rem;margin-bottom:2rem;">
                    <h3 style="color:#fbbf24;margin-top:0;">📝 Editar Vendas de Produtos</h3>
                    <p style="color:#a1a1aa;font-size:0.9em;">Clique em um produto para editar a quantidade de vendas</p>
                </div>

                <div style="background:rgba(26,26,46,0.6);border-radius:10px;padding:1rem;max-height:250px;overflow-y:auto;margin-bottom:2rem;">
                    ${todosProdutos.length > 0 ? todosProdutos.map(item => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:1rem;background:rgba(139,92,246,0.1);border-radius:8px;margin-bottom:0.5rem;border-left:4px solid #8b5cf6;">
                            <div style="flex:1;">
                                <p style="color:#e4e4e7;margin:0;font-weight:500;font-size:0.95em;">${item.nome}</p>
                                <p style="color:#a1a1aa;margin:0.3rem 0 0 0;font-size:0.85em;">Vendas: <strong style="color:#8b5cf6;">${item.quantidade}</strong></p>
                            </div>
                            <div style="display:flex;gap:0.5rem;">
                                <button onclick="editarVendasProduto('${item.nome.replace(/'/g, "\\'")}', ${item.quantidade})" style="background:#8b5cf6;color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-size:0.85em;font-weight:600;">Editar</button>
                            </div>
                        </div>
                    `).join('') : '<p style="color:#71717a;text-align:center;">Nenhum produto com vendas ainda</p>'}
                </div>

                <!-- SEÇÃO DE FEEDBACKS -->
                <div style="background:rgba(217,70,239,0.1);border:1px solid rgba(217,70,239,0.3);border-radius:12px;padding:1.5rem;margin-bottom:2rem;">
                    <h3 style="color:#d946ef;margin-top:0;">💬 Gerenciar Feedbacks</h3>
                    <p style="color:#a1a1aa;font-size:0.9em;">Clique em deletar para remover um feedback</p>
                </div>

                <div style="background:rgba(26,26,46,0.6);border-radius:10px;padding:1rem;max-height:250px;overflow-y:auto;margin-bottom:2rem;">
                    ${todosFeedbacks.length > 0 ? todosFeedbacks.map(fb => `
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:1rem;background:rgba(217,70,239,0.1);border-radius:8px;margin-bottom:0.5rem;border-left:4px solid #d946ef;">
                            <div style="flex:1;">
                                <p style="color:#e4e4e7;margin:0;font-weight:500;font-size:0.95em;">${fb.nome}</p>
                                <p style="color:#a1a1aa;margin:0.3rem 0 0 0;font-size:0.85em;">${fb.texto.substring(0, 60)}...</p>
                                <p style="color:#71717a;margin:0.3rem 0 0 0;font-size:0.75em;">${fb.data} ${fb.hora} • ❤️ ${fb.likes || 0}</p>
                            </div>
                            <div style="display:flex;gap:0.5rem;">
                                <button onclick="deletarFeedbackAdmin(${fb.id})" style="background:#ef4444;color:#fff;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-size:0.85em;font-weight:600;white-space:nowrap;">Deletar</button>
                            </div>
                        </div>
                    `).join('') : '<p style="color:#71717a;text-align:center;">Nenhum feedback ainda</p>'}
                </div>

                <button onclick="sairAdmin()" style="background:linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;margin-top:1.5rem;cursor:pointer;width:100%;font-weight:600;">Fechar Painel</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function editarVendasProduto(nomeProduto, vendidosAtual) {
    const novaQuantidade = prompt(
        `Editar vendas: ${nomeProduto}\n\nVendas atuais: ${vendidosAtual}\n\nDigite a nova quantidade:`,
        vendidosAtual
    );
    
    if (novaQuantidade !== null && novaQuantidade !== '') {
        const qtd = parseInt(novaQuantidade);
        if (!isNaN(qtd) && qtd >= 0) {
            vendasTracker.definirVendas(nomeProduto, qtd);
            
            // Sincronizar com servidor
            fetch('/api/vendas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    produtoNome: nomeProduto, 
                    quantidade: qtd,
                    acao: 'set'
                })
            }).then(r => r.json()).catch(e => console.warn('Erro ao sincronizar:', e));
            
            alert(`✅ Vendas de "${nomeProduto}" atualizadas para ${qtd}`);
            // Recarregar painel
            document.getElementById('adminPanel').remove();
            mostrarTelaAdmin();
        } else {
            alert('❌ Digite um número válido!');
        }
    }
}

function sairAdmin() {
    adminAutenticado = false;
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) adminPanel.remove();
}

function deletarFeedbackAdmin(feedbackId) {
    if (confirm('⚠️ Tem certeza que deseja deletar este feedback?')) {
        feedbackManager.deletarFeedbackComSync(feedbackId);
        alert('✅ Feedback deletado com sucesso!');
        // Recarregar painel
        document.getElementById('adminPanel').remove();
        mostrarTelaAdmin();
    }
}

function editarPrecoProduto(nomeProduto, variacaoNome, precoAtual) {
    const descontoAtual = variacaoNome 
        ? precosManager.obterDesconto(nomeProduto, variacaoNome) 
        : precosManager.obterDesconto(nomeProduto);
    
    const titulo = variacaoNome ? `${nomeProduto} - ${variacaoNome}` : nomeProduto;
    
    let html = `
        <div id="modalEditarPreco" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10002;padding:1rem;">
            <div style="background:linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%);border:2px solid rgba(16,185,129,0.5);border-radius:16px;padding:2.5rem;max-width:450px;width:100%;box-shadow:0 0 40px rgba(16,185,129,0.2);">
                <h2 style="color:#10b981;margin-top:0;font-size:1.3em;">💰 Editar Preço e Desconto</h2>
                <p style="color:#a1a1aa;font-size:0.95em;margin-bottom:2rem;">${titulo}</p>
                
                <!-- Campo Preço -->
                <div style="margin-bottom:1.5rem;">
                    <label style="color:#10b981;font-size:0.9em;font-weight:600;display:block;margin-bottom:0.5rem;">Preço (R$)</label>
                    <input type="number" id="inputPreco" value="${precoAtual.toFixed(2)}" min="0" step="0.01" style="width:100%;padding:0.75rem;background:#1a1a2e;border:1px solid rgba(16,185,129,0.3);border-radius:8px;color:#10b981;font-size:1em;font-weight:600;" placeholder="0.00">
                </div>
                
                <!-- Campo Desconto -->
                <div style="margin-bottom:1.5rem;">
                    <label style="color:#10b981;font-size:0.9em;font-weight:600;display:block;margin-bottom:0.5rem;">Desconto (%)</label>
                    <div style="display:flex;gap:1rem;">
                        <input type="number" id="inputDesconto" value="${descontoAtual}" min="0" max="100" step="1" style="flex:1;padding:0.75rem;background:#1a1a2e;border:1px solid rgba(16,185,129,0.3);border-radius:8px;color:#10b981;font-size:1em;font-weight:600;" placeholder="0">
                        <span style="color:#a1a1aa;padding:0.75rem;align-self:center;font-weight:600;">%</span>
                    </div>
                </div>
                
                <!-- Preview -->
                <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:1rem;margin-bottom:1.5rem;">
                    <p style="color:#a1a1aa;font-size:0.85em;margin:0 0 0.5rem 0;">Preview:</p>
                    <p style="color:#10b981;font-size:0.95em;margin:0;"><strong id="previewPreco">R$ ${precoAtual.toFixed(2)}</strong> <span id="previewDesconto" style="color:#fbbf24;${descontoAtual > 0 ? '' : 'display:none;'}">${descontoAtual}% OFF</span></p>
                </div>
                
                <!-- Botões -->
                <div style="display:flex;gap:1rem;">
                    <button onclick="salvarEdicaoPreco('${nomeProduto}', ${variacaoNome ? `'${variacaoNome}'` : 'null'})" style="flex:1;background:linear-gradient(135deg, #10b981 0%, #059669 100%);color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:1em;">Salvar</button>
                    <button onclick="fecharModalEditarPreco()" style="flex:1;background:rgba(239,68,68,0.2);color:#ef4444;border:1px solid rgba(239,68,68,0.3);padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:1em;">Cancelar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    // Atualizar preview em tempo real
    document.getElementById('inputPreco').addEventListener('input', (e) => {
        const preco = parseFloat(e.target.value) || 0;
        document.getElementById('previewPreco').textContent = `R$ ${preco.toFixed(2)}`;
    });
    
    document.getElementById('inputDesconto').addEventListener('input', (e) => {
        const desconto = parseInt(e.target.value) || 0;
        const previewDesconto = document.getElementById('previewDesconto');
        if (desconto > 0) {
            previewDesconto.textContent = `${desconto}% OFF`;
            previewDesconto.style.display = 'inline';
        } else {
            previewDesconto.style.display = 'none';
        }
    });
}

function salvarEdicaoPreco(nomeProduto, variacaoNome) {
    const preco = parseFloat(document.getElementById('inputPreco').value);
    const desconto = parseInt(document.getElementById('inputDesconto').value) || 0;
    
    if (isNaN(preco) || preco < 0) {
        alert('❌ Digite um preço válido!');
        return;
    }
    
    precosManager.editarPrecoComSync(nomeProduto, variacaoNome, preco, desconto).then(success => {
        if (success) {
            alert(`✅ Preço e desconto atualizados!\n\nR$ ${preco.toFixed(2)} ${desconto > 0 ? '(' + desconto + '% OFF)' : ''}`);
        } else {
            alert('⚠️ Salvo localmente, mas erro ao sincronizar com servidor.');
        }
        fecharModalEditarPreco();
        
        // Recarregar painel e página com dados já salvos localmente
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.remove();
            mostrarTelaAdmin();
        }
        
        // Recarregar produtos com preços atualizados (já estão em localStorage)
        carregarProdutos();
        // Se há modal de produto aberto, recarrega o modal também
        const modal = document.getElementById('produtoModal');
        if (modal && modal.style.display !== 'none') {
            const produtoNomeModal = document.getElementById('produtoNome')?.textContent;
            if (produtoNomeModal) {
                abrirModalProduto(produtoNomeModal);
            }
        }
    });
}

function fecharModalEditarPreco() {
    const modal = document.getElementById('modalEditarPreco');
    if (modal) modal.remove();
}

let produtoSelecionado = null;

// Função para carregar e exibir dados públicos (vendas e feedbacks)
function carregarDadosPublicos() {
    // Sincronizar feedbacks e vendas antes de exibir
    Promise.all([
        feedbackManager.sincronizar(),
        vendasTracker.sincronizar()
    ]).then(() => {
        // Atualizar total de vendas público
        const totalVendas = vendasTracker.obterTotalVendas();
        const totalVendasEl = document.getElementById('totalVendasPublico');
        if (totalVendasEl) {
            totalVendasEl.textContent = totalVendas;
        }

        // Atualizar total de produtos
        const produtosEl = document.getElementById('produtosPublico');
        if (produtosEl) {
            produtosEl.textContent = produtos.length;
        }

        // Exibir feedbacks públicos
        const feedbacksContainer = document.getElementById('feedbacksPublico');
        
        if (feedbacksContainer) {
            const feedbacks = feedbackManager.obterFeedbacks(10);
            const usuarioId = obterIdUsuario();
            
            if (feedbacks && feedbacks.length > 0) {
                feedbacksContainer.innerHTML = feedbacks.map((feedback) => {
                    const jaLiked = feedback.likedBy && feedback.likedBy.includes(usuarioId);
                    const likeClass = jaLiked ? 'liked' : '';
                    const likeText = jaLiked ? '❤️' : '👍';
                    const likes = feedback.likes || 0;
                    
                    return `
                    <div class="feedback-card">
                        <p class="feedback-texto">"${feedback.texto}"</p>
                        <div class="feedback-info">
                            <strong>${feedback.nome}</strong> • ${feedback.data} às ${feedback.hora}
                        </div>
                        <div class="feedback-actions">
                            <button class="btn-like ${likeClass}" 
                                    data-feedback-id="${feedback.id}" 
                                    data-action="like"
                                    onclick="toggleLike(${feedback.id})">
                                ${likeText} ${likes}
                            </button>
                        </div>
                    </div>
                `; }).join('');
            } else {
                feedbacksContainer.innerHTML = '<p style="color:#a1a1aa;text-align:center;padding:2rem;">Sem feedbacks registrados ainda. Seja o primeiro a avaliar!</p>';
            }
        }
    });
}

// Chamar função a cada 3 segundos para atualizar em tempo real
setInterval(carregarDadosPublicos, 3000);

// Sincronizar preços a cada 5 segundos
setInterval(() => {
    precosManager.sincronizar();
}, 5000);

function abrirFormularioFeedback() {
    const html = `
        <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem;">
            <div style="background:linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%);border:1px solid rgba(139,92,246,0.5);border-radius:20px;padding:2.5rem;max-width:500px;width:100%;color:#e4e4e7;box-shadow:0 0 40px rgba(139,92,246,0.2);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                    <h2 style="color:#fff;margin:0;font-size:1.5em;">💬 Deixe seu Feedback</h2>
                    <button onclick="this.closest('[style*=fixed]').remove()" style="background:none;border:none;color:#fff;font-size:1.8rem;cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">&times;</button>
                </div>
                
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;color:#e4e4e7;font-weight:600;margin-bottom:0.5rem;">Seu Nome:</label>
                    <input type="text" id="feedbackNome" placeholder="Digite seu nome (ou deixe anônimo)" style="width:100%;padding:0.75rem;background:rgba(26,26,46,0.6);border:1px solid rgba(139,92,246,0.3);border-radius:8px;color:#e4e4e7;font-family:'Poppins',sans-serif;font-size:1rem;box-sizing:border-box;">
                </div>

                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;color:#e4e4e7;font-weight:600;margin-bottom:0.5rem;">Seu Email (opcional):</label>
                    <input type="email" id="feedbackEmail" placeholder="seu@email.com" style="width:100%;padding:0.75rem;background:rgba(26,26,46,0.6);border:1px solid rgba(139,92,246,0.3);border-radius:8px;color:#e4e4e7;font-family:'Poppins',sans-serif;font-size:1rem;box-sizing:border-box;">
                </div>

                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;color:#e4e4e7;font-weight:600;margin-bottom:0.5rem;">Seu Feedback:</label>
                    <textarea id="feedbackTexto" placeholder="Conte sua experiência com nossos produtos..." style="width:100%;height:120px;padding:0.75rem;background:rgba(26,26,46,0.6);border:1px solid rgba(139,92,246,0.3);border-radius:8px;color:#e4e4e7;font-family:'Poppins',sans-serif;font-size:1rem;box-sizing:border-box;resize:vertical;"></textarea>
                </div>

                <button onclick="publicarFeedback()" style="background:linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%);color:#fff;border:none;padding:0.875rem 1.5rem;border-radius:8px;width:100%;cursor:pointer;font-weight:600;font-size:1rem;font-family:'Poppins',sans-serif;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                    ✅ Publicar Feedback
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('feedbackTexto').focus();
}

function publicarFeedback() {
    const nome = document.getElementById('feedbackNome')?.value || '';
    const email = document.getElementById('feedbackEmail')?.value || '';
    const texto = document.getElementById('feedbackTexto')?.value || '';

    if (!texto.trim()) {
        alert('❌ Por favor, escreva um feedback!');
        return;
    }

    if (feedbackManager.adicionarFeedback(nome, texto, email)) {
        const novoFeedback = feedbackManager.feedbacks[0]; // Último adicionado
        
        // Atualizar data.json
        fetch('data.json')
            .then(r => r.json())
            .then(data => {
                data.feedbacks.unshift(novoFeedback);
                // Salvar como arquivo via blob
                const dataStr = JSON.stringify(data, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                // Aqui seria feito push para GitHub, mas como alternativa salvamos em localStorage
                localStorage.setItem('topcompras_feedbacks_sync', dataStr);
                console.log('Feedback sincronizado');
            })
            .catch(() => {
                // Se não conseguir ler data.json, apenas usa localStorage
                const novoData = {
                    feedbacks: feedbackManager.feedbacks
                };
                localStorage.setItem('topcompras_feedbacks_sync', JSON.stringify(novoData));
            });
        
        alert('✅ Feedback publicado com sucesso! Obrigado por avaliar nossas produtos!');
        document.querySelector('[style*="position:fixed"]')?.remove();
        setTimeout(() => carregarDadosPublicos(), 500);
    } else {
        alert('❌ Erro ao publicar feedback. Tente novamente!');
    }
}

// Obter ou criar ID único do usuário
function obterIdUsuario() {
    let usuarioId = localStorage.getItem('topcompras_usuario_id');
    if (!usuarioId) {
        usuarioId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('topcompras_usuario_id', usuarioId);
    }
    return usuarioId;
}

// Curtir feedback
async function curtirFeedback(feedbackId) {
    const usuarioId = obterIdUsuario();
    const btnLike = document.querySelector(`[data-feedback-id="${feedbackId}"][data-action="like"]`);
    
    if (!btnLike) return;
    
    try {
        console.log(`❤️ Curtindo feedback ${feedbackId}...`);
        
        const response = await fetch('/api/feedbacks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                feedbackId: feedbackId,
                usuarioId: usuarioId,
                acao: 'like'
            })
        });

        const result = await response.json();
        
        if (response.ok) {
            console.log('✓ Like adicionado!', result);
            btnLike.classList.add('liked');
            btnLike.textContent = `❤️ ${result.feedback.likes}`;
            // Sincronizar após like
            setTimeout(() => carregarDadosPublicos(), 300);
        } else {
            console.log('⚠️', result.error);
        }
    } catch (e) {
        console.error('Erro ao curtir:', e);
    }
}

// Descurtir feedback
async function descurtirFeedback(feedbackId) {
    const usuarioId = obterIdUsuario();
    const btnLike = document.querySelector(`[data-feedback-id="${feedbackId}"][data-action="like"]`);
    
    if (!btnLike) return;
    
    try {
        console.log(`💔 Descurtindo feedback ${feedbackId}...`);
        
        const response = await fetch('/api/feedbacks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                feedbackId: feedbackId,
                usuarioId: usuarioId,
                acao: 'unlike'
            })
        });

        const result = await response.json();
        
        if (response.ok) {
            console.log('✓ Like removido!', result);
            btnLike.classList.remove('liked');
            btnLike.textContent = `👍 ${result.feedback.likes}`;
            // Sincronizar após unlike
            setTimeout(() => carregarDadosPublicos(), 300);
        } else {
            console.log('⚠️', result.error);
        }
    } catch (e) {
        console.error('Erro ao descurtir:', e);
    }
}

// Toggle like
function toggleLike(feedbackId) {
    const btnLike = document.querySelector(`[data-feedback-id="${feedbackId}"][data-action="like"]`);
    
    if (btnLike && btnLike.classList.contains('liked')) {
        descurtirFeedback(feedbackId);
    } else {
        curtirFeedback(feedbackId);
    }
}


document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        fecharModalProduto();
    }
    // Atalho para painel admin: Ctrl+Shift+A
    if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        abrirPainelAdmin();
    }
});

// Função descontinuada - uso apenas para compatibilidade
function salvarFeedback() {
    alert('✓ Use o botão "Deixar Feedback" na seção de feedbacks para publicar seu feedback!');
}

// Função para limpar cache (para testes)
function limparCache() {
    if (confirm('⚠️ Deseja limpar TODO o cache?\n\nIsto vai remover:\n- Feedbacks\n- Vendas\n- Dados locais')) {
        localStorage.removeItem('topcompras_feedbacks');
        localStorage.removeItem('topcompras_vendas');
        localStorage.removeItem('topcompras_feedback');
        localStorage.removeItem('topcompras_feedbacks_cloud');
        localStorage.removeItem('topcompras_feedbacks_sync');
        
        // Recarregar página
        window.location.reload();
    }
}

// Disponível no console: type limparCache() para limpar tudo
window.limparCache = limparCache;

document.addEventListener('DOMContentLoaded', carregarProdutos);
