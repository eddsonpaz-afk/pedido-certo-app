# Pedido Certo

Protótipo navegável do aplicativo de pedidos da CBS Parafusos e Waves Plus.

## O que já funciona

- consulta local de 562 produtos por código ou descrição;
- seleção da tabela comercial;
- inclusão, edição e exclusão de itens;
- cálculo de subtotal, desconto e total;
- salvamento de rascunhos no navegador;
- painel de pedidos recentes;
- layout responsivo para desktop e celular.

## Fontes de dados

- campos do pedido: `MODELO PARA PEDIDOS DE VENDA-3.xlsm`;
- produtos e preços: `TABELA JUNHO ATUALIZADA.xlsx`;
- chave de integração: código do produto.

## Próxima integração

O envio definitivo ao Google Sheets exige autenticação de escrita. Até essa etapa, os rascunhos ficam no `localStorage` do navegador. A planilha de produtos já foi normalizada para uso como catálogo do app.

## Rodar localmente

```bash
npm install
npm run dev
```

## Publicar

O projeto está preparado para implantação estática na Vercel.
