// Documentação Técnica do Sistema de Vendas

/**
 * CLASSE: VendasTracker
 * 
 * Responsável por gerenciar todo o rastreamento de vendas
 * Usa localStorage do navegador para persistência de dados
 * 
 * MÉTODOS:
 * 
 * constructor()
 *   - Inicializa o tracker carregando vendas do localStorage
 * 
 * carregarVendas()
 *   - Carrega dados de vendas salvos anteriormente
 *   - Retorna: Object {produtoNome: quantidade}
 * 
 * salvarVendas()
 *   - Salva o estado atual no localStorage
 *   - Chave: 'topcompras_vendas'
 * 
 * registrarVenda(produtoNome)
 *   - Incrementa contador de vendas do produto
 *   - Salva automaticamente no localStorage
 * 
 * obterVendas(produtoNome)
 *   - Retorna quantidade de vendas de um produto
 *   - Retorna 0 se produto não foi vendido
 * 
 * obterTotalVendas()
 *   - Retorna soma total de todas as vendas
 *   - Calcula: sum(Object.values(vendas))
 * 
 * obterRanking(limite = 10)
 *   - Retorna array dos produtos mais vendidos
 *   - Estrutura: [{nome: string, quantidade: number}]
 *   - Ordenado por quantidade decrescente
 * 
 * obterVendasPorCategoria()
 *   - Retorna objeto com vendas agrupadas por categoria
 *   - Estrutura: {categoria: totalVendas}
 *   - Requer array 'produtos' global
 */

/**
 * OBJETO GLOBAL: vendasTracker
 * 
 * Instância única do VendasTracker
 * Acessível em todo o script.js
 * 
 * EXEMPLO DE USO:
 * 
 * // Registrar uma venda
 * vendasTracker.registrarVenda("Minecraft Java Edition");
 * 
 * // Obter vendas de um produto
 * const vendas = vendasTracker.obterVendas("Minecraft Java Edition");
 * 
 * // Obter total
 * const total = vendasTracker.obterTotalVendas();
 * 
 * // Obter ranking
 * const ranking = vendasTracker.obterRanking(10);
 * 
 * // Obter por categoria
 * const porCategoria = vendasTracker.obterVendasPorCategoria();
 */

/**
 * ESTRUTURA DO PRODUTO
 * 
 * {
 *   nome: string,              // Nome único do produto
 *   preco: number,             // Preço em reais (decimal)
 *   precoAntigo?: number,      // Preço anterior (opcional)
 *   desconto?: number,         // Percentual de desconto (opcional)
 *   emoji: string,             // Emoji representativo
 *   emojiUrl: string,          // URL para emoji/ícone customizado
 *   imagem: string,            // URL da imagem do produto
 *   descricao: string,         // Descrição breve
 *   etiqueta?: string,         // Badge (Novo, Promoção, etc)
 *   categoria: string,         // Categoria do produto
 *   status: "disponivel" | "esgotado",
 *   destaque?: boolean,        // Se aparece em destaque
 *   pagamento: string[],       // ["pix"] ou ["pix", "cartao"]
 *   checkout: {
 *     storeId: string,         // ID da loja no Infinite Pay
 *     checkoutUrl: string      // URL do checkout hosted
 *   }
 * }
 */

/**
 * FLUXO DE COMPRA
 * 
 * 1. Usuário clica em "Comprar" em um produto
 * 2. Função processarCheckoutInfinitePay(produto) é chamada
 * 3. vendasTracker.registrarVenda(produto.nome) registra a venda
 * 4. Parâmetros são preparados (order_id, amount, description, etc)
 * 5. URL do Infinite Pay é construída com URLSearchParams
 * 6. Usuário é redirecionado para o checkout
 * 7. Após pagamento, retorna para sucesso.html
 * 8. A venda permanece registrada no localStorage
 */

/**
 * ESTRUTURA DO localStorage
 * 
 * Chave: 'topcompras_vendas'
 * Valor: JSON string
 * 
 * EXEMPLO:
 * {
 *   "Minecraft Bedrock e Java - PERMANENTE": 5,
 *   "Xbox Game Pass 1 Mês": 12,
 *   "Netflix 1 Mês": 3,
 *   "Spotify Premium 1 Ano": 8
 * }
 */

/**
 * FUNÇÃO: abrirDashboardVendas()
 * 
 * Cria um modal com dashboard de vendas
 * Exibe:
 *   - Total de vendas
 *   - Top 10 produtos
 *   - Vendas por categoria
 * 
 * Layout:
 *   - Modal centralizado com fundo semi-transparente
 *   - Gradiente de background (roxo/magenta)
 *   - Botão de fechar (X) no topo direito
 *   - Botão "Fechar" no rodapé
 * 
 * Segurança:
 *   - Cria elemento novo a cada abertura
 *   - Remove ao fechar (sem conflitos)
 *   - Clique fora não fecha (design intencional)
 */

/**
 * FUNÇÃO: carregarProdutos()
 * 
 * Renderiza todos os produtos da array global 'produtos'
 * Cada produto é um <div> com classe 'produto'
 * 
 * LÓGICA:
 * 1. Limpa o container #produtos-lista
 * 2. Itera sobre todos os produtos
 * 3. Para cada produto:
 *    a. Cria um div com classe 'produto'
 *    b. Define animationDelay baseado no índice
 *    c. Constrói HTML com:
 *       - Etiqueta (se existe)
 *       - Imagem
 *       - Nome com emoji
 *       - Descrição
 *       - Preço (com desconto se aplicável)
 *       - Indicador de vendas (se houver)
 *       - Métodos de pagamento
 *       - Botão "Comprar"
 *       - Status "Esgotado" (se aplicável)
 *    d. Adiciona ao DOM
 * 
 * INDICADOR DE VENDAS:
 * - Carrega quantidade do vendasTracker
 * - Exibe "✓ X vendido(s)" em verde
 * - Apenas mostra se houver vendas
 * 
 * ANIMAÇÃO:
 * - Delay incremental: index * 0.02s
 * - Cria efeito cascata ao carregar
 */

/**
 * FUNÇÃO: processarCheckoutInfinitePay(produto)
 * 
 * PARÂMETRO:
 *   produto: {preco: number, nome: string, categoria: string}
 * 
 * EXECUÇÃO:
 * 1. Registra venda no tracker
 * 2. Obtém configuração do produto
 * 3. Valida se config existe
 * 4. Gera order ID único
 * 5. Converte preço para centavos (preco * 100)
 * 6. Monta URLSearchParams com:
 *    - order_id: ID único do pedido
 *    - amount: valor em centavos
 *    - currency: "BRL"
 *    - description: nome do produto
 *    - customer_name: "Cliente TOP COMPRAS"
 *    - customer_email: "cliente@topcompras.com"
 *    - return_url: sucesso.html com order_id e amount
 *    - metadata_product: nome do produto
 *    - metadata_category: categoria
 * 7. Constrói URL final: checkout_url + params
 * 8. Redireciona window.location.href
 */

/**
 * FUNÇÃO: gerarIdUnico()
 * 
 * Gera um ID único para cada pedido
 * 
 * FORMATO:
 * "ORD_" + timestamp + "_" + random_string
 * 
 * EXEMPLO:
 * "ORD_1704067200000_a1b2c3d4e5"
 * 
 * UTILIDADE:
 * - Rastreamento de pedidos
 * - Evita duplicatas
 * - Timestamp fornece sequência temporal
 */

/**
 * FUNÇÃO: renderEmoji(produto)
 * 
 * Prioridade:
 * 1. Se emojiUrl existe e não é vazio → <img src="{url}">
 * 2. Senão, se emoji existe → emoji + espaço
 * 3. Senão → string vazia
 * 
 * RETORNO:
 *   HTML string ou texto
 */

/**
 * FUNÇÃO: getIcon(tipo)
 * 
 * PARÂMETRO:
 *   tipo: "pix" ou "cartao"
 * 
 * RETORNO:
 *   HTML span com emoji e cor
 *   
 * PIX:
 *   - Emoji: 💜
 *   - Cor: roxo (#8b5cf6)
 * 
 * CARTÃO:
 *   - Emoji: 💳
 *   - Cor: azul (#0ea5e9)
 */

/**
 * INICIALIZAÇÃO
 * 
 * document.addEventListener('DOMContentLoaded', carregarProdutos)
 * 
 * Quando o DOM está pronto:
 * - Todos os produtos são renderizados
 * - Dados de vendas são carregados do localStorage
 * - Dashboard está funcional
 */

/**
 * INTEGRAÇÃO COM HTML
 * 
 * <button onclick="abrirDashboardVendas()">📊 Dashboard</button>
 *   - Localizado no header
 *   - Abre o modal de vendas
 * 
 * <div id="produtos-lista"></div>
 *   - Container dos produtos
 *   - Preenchido por carregarProdutos()
 * 
 * <button onclick="processarCheckoutInfinitePay({...})">🛒 Comprar</button>
 *   - Em cada produto
 *   - Passa dados do produto
 *   - Inicia checkout
 */

/**
 * TESTE DO SISTEMA
 * 
 * No console do navegador:
 * 
 * // Ver todas as vendas
 * console.log(vendasTracker.vendas);
 * 
 * // Ver total
 * console.log(vendasTracker.obterTotalVendas());
 * 
 * // Ver ranking
 * console.log(vendasTracker.obterRanking());
 * 
 * // Ver por categoria
 * console.log(vendasTracker.obterVendasPorCategoria());
 * 
 * // Registrar venda manual (para teste)
 * vendasTracker.registrarVenda("Minecraft Java Edition");
 * carregarProdutos(); // Atualiza a visualização
 */

/**
 * DADOS PERSISTIDOS
 * 
 * localStorage key: 'topcompras_vendas'
 * 
 * Para limpar tudo:
 * localStorage.removeItem('topcompras_vendas');
 * 
 * Para salvar backup:
 * const backup = localStorage.getItem('topcompras_vendas');
 * console.log(backup);
 */
