# 📚 GUIA DE USO - TOP COMPRAS

## 🚀 Como Iniciar

### Opção 1: Abrir Localmente
1. Navegue até a pasta `d:\Arquivo 2\site`
2. Abra `index.html` em seu navegador
3. O site carregará com todos os 87 produtos

### Opção 2: Usar Servidor Local (Recomendado)
```bash
cd d:\Arquivo 2\site
python -m http.server 8000
```
Então acesse: `http://localhost:8000`

---

## 🛍️ Navegando na Loja

### 1. Header (Topo)
- **Logo**: Clique para voltar ao topo
- **Menu**: Início, Produtos, Contato
- **Dashboard**: Botão roxo com 📊 para ver estatísticas de vendas

### 2. Seção Hero
- Bem-vindo à TOP COMPRAS
- Botão "Explorar Produtos" para rolar até a lista

### 3. Lista de Produtos
- **Grid Responsivo**: 4 colunas no desktop, 2 no tablet, 1 no mobile
- **Animações**: Efeito cascata ao carregar
- **Scroll Infinito**: Mais produtos abaixo

---

## 🏷️ Informações do Produto

Cada card de produto mostra:

```
┌─────────────────────────┐
│    [Etiqueta Opcional]  │  ← "Novo", "Promoção", "Mais vendido"
├─────────────────────────┤
│      [Imagem Grande]    │
├─────────────────────────┤
│ 🎮 Nome do Produto      │  ← Com emoji/ícone
├─────────────────────────┤
│ Descrição breve...      │
├─────────────────────────┤
│ R$ 100,00    30% OFF    │  ← Preço com desconto
│ R$ 150,00 (antiga)      │  ← Preço anterior
├─────────────────────────┤
│ ✓ 5 vendidos            │  ← Apenas se houver vendas
├─────────────────────────┤
│ À vista: 💜 Pix 💳 Cartão│  ← Métodos de pagamento
├─────────────────────────┤
│    🛒 Comprar           │  ← Botão para checkout
└─────────────────────────┘
```

---

## 💳 Realizando uma Compra

### Passo 1: Selecione um Produto
- Escolha qualquer produto que interesse
- Clique no botão "🛒 Comprar"

### Passo 2: Revise o Checkout
- Será redirecionado para o Infinite Pay
- Verifique dados do pedido
- Escolha método de pagamento (Pix ou Cartão)

### Passo 3: Complete o Pagamento
- Pix: Escaneie QR code ou copie chave
- Cartão: Preencha dados do cartão

### Passo 4: Confirmação
- Será redirecionado para `sucesso.html`
- Verá: ID do pedido e valor pago
- A venda é registrada automaticamente

---

## 📊 Acessando o Dashboard

### Abrir Dashboard
1. Clique no botão **"📊 Dashboard"** no header (canto direito)
2. Um modal aparecerá com estatísticas

### Informações Disponíveis

#### Total de Vendas
- Número total de produtos vendidos
- Atualiza em tempo real

#### Top 10 Produtos
- Ranking dos mais vendidos
- Mostra quantidade de vendas
- Ajuda a identificar best-sellers

#### Vendas por Categoria
- Distribuição por tipo de produto
- Exemplo:
  - Jogos: 45 vendas
  - Streaming: 12 vendas
  - Software: 8 vendas
  - etc.

### Fechar Dashboard
- Clique no botão **"Fechar"** na base do modal
- Ou clique no **"X"** no topo

---

## 📱 Responsividade

### Desktop (1200px+)
- 4 produtos por linha
- Menu completo no header
- Otimizado para monitores grandes

### Tablet (768px - 1199px)
- 2 produtos por linha
- Menu responsivo
- Botões adaptados

### Mobile (até 767px)
- 1 produto por linha
- Stack vertical
- Toque otimizado

---

## 🎯 Categorias de Produtos

### 🎮 Jogos (25 produtos)
- Créditos para jogos populares
- Passes e assinaturas
- Valores: R$ 4,90 - R$ 100,00

### 📺 Streaming (15 produtos)
- Netflix, Spotify, YouTube Premium
- Planos mensais e anuais
- Valores: R$ 9,90 - R$ 119,90

### 💻 Software (15 produtos)
- Softwares profissionais
- Antivírus e VPNs
- Valores: R$ 29,90 - R$ 399,90

### 📖 E-Books (10 produtos)
- Livros digitais educacionais
- Programação, marketing, negócios
- Valores: R$ 39,90 - R$ 74,90

### 🎓 Cursos (10 produtos)
- Cursos online completos
- Desenvolvimento, design, idiomas
- Valores: R$ 139,90 - R$ 249,90

### 🎨 Templates (8 produtos)
- Recursos para designers
- Plugins WordPress, fontes, efeitos
- Valores: R$ 24,90 - R$ 119,90

---

## 🔧 Dicas de Uso

### Para Clientes
✅ Veja o Dashboard regularmente para acompanhar vendas
✅ Use o método de pagamento que preferir (Pix ou Cartão)
✅ Guarde o ID do seu pedido para referência
✅ Produtos com etiqueta "Mais vendido" ⭐ são confiáveis

### Para Administradores
✅ Dashboard mostra os produtos que mais vendem
✅ Use essas informações para planejar promoções
✅ Dados são persistidos no localStorage do navegador
✅ Para limpar dados: `localStorage.removeItem('topcompras_vendas')`

---

## 🔐 Segurança

- ✅ Pagamentos via Infinite Pay (PCI compliant)
- ✅ Dados de vendas no localStorage (local apenas)
- ✅ Nenhuma senha armazenada no site
- ✅ SSL/HTTPS recomendado em produção

---

## ⚡ Performance

- 📦 87 produtos carregados instantaneamente
- ⚡ Animações otimizadas com CSS
- 📱 Mobile-first design
- 🔄 Sem reload necessário para atualizar

---

## ❓ Perguntas Frequentes

### P: Como vejo minhas vendas anteriores?
R: Clique em "📊 Dashboard" para ver estatísticas em tempo real

### P: Posso devolver um produto?
R: Veja a política de devoluções no rodapé ou contate suporte

### P: Quanto tempo demora a entrega?
R: Produtos digitais são entregues instantaneamente. Físicos: 3-5 dias úteis

### P: Qual é o email de suporte?
R: suporte@topcompras.com (confira o rodapé)

### P: Os dados de vendas são salvos?
R: Sim! No localStorage do seu navegador. Se limpar cache, serão perdidos.

### P: Posso filtrar por categoria?
R: Atualmente não, mas todos os produtos são exibidos. Próxima versão terá filtros.

---

## 🎨 Personalizações Possíveis

Se quiser customizar, você pode:

1. **Mudar cores**: Editar `style.css` (`--color-primary`, `--color-secondary`)
2. **Adicionar produtos**: Editar array `produtos` em `script.js`
3. **Mudar emojis**: Adicionar `emojiUrl` com link de imagem
4. **Alterar checkout**: Modificar `storeId` e `checkoutUrl`

---

## 📞 Suporte

**Email**: suporte@topcompras.com
**Horário**: 24/7
**Redes Sociais**: [Adicione links]

---

## 📝 Changelog

### v2.0 (Atual)
- ✅ 87 produtos em 6 categorias
- ✅ Sistema de rastreamento de vendas
- ✅ Dashboard com estatísticas
- ✅ Indicadores de vendas nos produtos
- ✅ Design moderno e responsivo

### v1.0
- ✅ 8 produtos iniciais
- ✅ Categorias básicas
- ✅ Checkout Infinite Pay
- ✅ Design dark mode

---

**Última atualização**: 2025
**Versão**: 2.0
**Status**: ✅ Pronto para uso
