# Diagnóstico técnico da integração

A análise local dos dois repositórios identificou três causas principais para a integração não funcionar de forma confiável.

## 1. Endpoint incorreto no site do cliente

O arquivo `marmitas-express/client/src/lib/api.ts` envia pedidos para `https://panelavelha-bbdz2awd.manus.space/api/orders`. Entretanto, o painel administrativo expõe a API pública em `server/_core/index.ts` com o prefixo `/api/integration`, e o arquivo `server/integration-api.ts` documenta o endpoint correto como `POST /api/integration/orders`.

## 2. Payload incompatível entre cliente e painel

O site do cliente envia um objeto simplificado com campos como `client`, `phone`, `address`, `items` como string e `total`. Já o painel administrativo espera `customerName`, `customerPhone` e `items` como array contendo `menuItemId` e `quantity`. Por isso, mesmo quando a requisição chega ao servidor, a validação e/ou a persistência podem falhar.

## 3. Fotos dos pratos não aparecem no admin

O banco e o backend do painel já têm suporte a `imageUrl` em `menu_items`, mas a tela `panela-velha-admin/client/src/pages/Cardapio.tsx` não exibe imagem na lista de pratos nem possui campo de URL da imagem no modal de cadastro/edição. Além disso, o site cliente usa um cardápio local em `Menu.tsx`, com imagens hardcoded, em vez de consumir o endpoint público `GET /api/integration/menu` do painel.

## Estratégia de correção

A correção será feita em duas frentes. No painel, a API pública será tornada mais tolerante, aceitando tanto o contrato canônico com `menuItemId` quanto o formato vindo do site por nome/preço; também serão adicionados cabeçalhos CORS e a tela de `Pratos` passará a cadastrar e exibir `imageUrl`. No site cliente, a API passará a usar `/api/integration/orders`, o cardápio tentará carregar os pratos do painel por `/api/integration/menu`, preservando `menuItemId` e `imageUrl`, com fallback para o cardápio estático atual.
