# Panela Velha Admin — TODO

## Identidade Visual & Configuração
- [x] Configurar paleta de cores quentes (vermelho, laranja, marrom) no index.css
- [x] Importar fonte rústica (Playfair Display + Inter) via Google Fonts
- [x] Fazer upload da logo do Panela Velha e configurar via webdev
- [x] Configurar tema escuro/claro com variáveis CSS

## Schema do Banco de Dados
- [x] Tabela `orders` (pedidos com status, itens, total, cliente)
- [x] Tabela `order_items` (itens de cada pedido)
- [x] Tabela `stock_items` (produtos/ingredientes do estoque)
- [x] Tabela `stock_movements` (histórico de movimentações)
- [x] Tabela `cash_transactions` (entradas e saídas financeiras)

## Tela de Login
- [x] Página de login com identidade visual do Panela Velha
- [x] Botão de autenticação OAuth (Manus)
- [x] Redirecionamento automático após login para o dashboard
- [x] Proteção de rotas — acesso somente ao admin

## Dashboard Principal
- [x] Card: total de pedidos do dia
- [x] Card: receita do dia
- [x] Card: itens com estoque baixo
- [x] Card: pedidos em andamento
- [x] Atalhos rápidos para todos os módulos
- [x] Gráfico resumo de vendas recentes

## Módulo de Gestão de Pedidos
- [x] Listagem de pedidos com filtro por status
- [x] Status: novo, em preparo, pronto, entregue, cancelado
- [x] Atualização de status com confirmação
- [x] Modal de detalhes do pedido
- [x] Procedimentos tRPC: list, getById, updateStatus, create

## Módulo de Controle de Estoque
- [x] Listagem de produtos/ingredientes
- [x] Cadastro e edição de item de estoque
- [x] Alerta visual de estoque mínimo
- [x] Histórico de movimentações (entrada/saída)
- [x] Notificação automática ao dono quando estoque mínimo é atingido
- [x] Procedimentos tRPC: list, create, update, delete, addMovement

## Módulo de Fluxo de Caixa
- [x] Registro de entradas e saídas financeiras
- [x] Categorização de transações
- [x] Exibição do saldo atual
- [x] Histórico financeiro completo com filtros
- [x] Procedimentos tRPC: list, create, getSummary

## Dashboards de Relatórios
- [x] Gráfico de vendas semanal (Recharts)
- [x] Gráfico de vendas mensal (Recharts)
- [x] Gráfico de vendas anual (Recharts)
- [x] Gráfico de receita por período
- [x] Gráfico de pedidos por status
- [x] Seletor de período (semanal/mensal/anual)

## Layout & Navegação
- [x] DashboardLayout com sidebar personalizada (cores Panela Velha)
- [x] Menu lateral com todos os módulos
- [x] Header com logo e info do usuário logado
- [x] Rotas protegidas (somente admin)
- [x] Responsividade mobile

## Testes
- [x] Testes unitários para procedimentos tRPC principais
- [x] Teste de autenticação e proteção de rotas

## Módulo de Cardápio
- [x] Tabela `menu_items` (pratos com nome, descrição, preço, categoria, disponibilidade)
- [x] Tabela `menu_categories` (categorias de pratos)
- [x] Página de gestão de cardápio com CRUD de pratos
- [x] Formulário de cadastro/edição de prato
- [x] Toggle de disponibilidade por dia
- [x] Upload de imagem do prato
- [x] Listagem de pratos com filtro por categoria
- [x] Procedimentos tRPC: list, create, update, delete, toggleAvailability

## Integração com Site dos Clientes
- [x] API endpoint público para listar cardápio (sem autenticação)
- [x] API endpoint público para criar pedido a partir do site
- [x] Campo `source` em pedidos (admin ou website)
- [x] Sincronização automática de pedidos do site para o painel
- [x] Webhook de notificação quando pedido é criado no site
- [x] Documentação da API de integração
- [x] Teste de integração entre os dois sites
