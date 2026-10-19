# Offbeat · estúdio digital de Lázaro

> *Fotografia fora do compasso.*

Sistema próprio do estúdio Offbeat, de Lázaro: galeria de seleção protegida, venda de fotos de eventos, clientes (CRM), contratos, Pix, diagramação de álbuns e site. Não é uma plataforma à venda nem tem planos ou mensalidade: é a ferramenta de trabalho do próprio estúdio, com direção de arte e motion próprios.

## Como abrir

```bash
python3 -m http.server 8080
# abra http://localhost:8080
```

| Página | O que é |
|---|---|
| `index.html` | Início: apresenta o sistema, os módulos e o caminho de um trabalho. Daqui se entra no estúdio |
| `app.html` | Painel do fotógrafo (abre direto, sem senha): visão geral, galerias, clientes, agenda, financeiro, álbuns, site, ajustes |
| `gallery.html#g_marina` | Galeria de seleção (pacote + extras), com contrato e pagamento no portal |
| `gallery.html#g_julia` | Galeria com senha (`1234`) |
| `gallery.html#g_corrida` | Venda de fotos de evento: busca por nº de peito, carrinho e Pix |
| `site.html` | Site público: portfólio, depoimentos, blog e formulário de orçamento |
| `page.html#casamentos-2027` | Landing pages, páginas personalizadas e posts do blog (`page.html#blog`) |
| `proposal.html#<id>` | Proposta para o cliente: abre, aceita ou recusa online (o painel acompanha) |
| `album.html#a_julia` | Álbum para aprovação: folhear com virada de página, ver em 3D, comentar e aprovar |
| `ar.html#<id>` | Realidade aumentada: aponte a câmera para a foto impressa e o vídeo toca nela |
| `pay.html#<id>` | Página de pagamento Pix |
| `prep.html#<id do projeto>` | Preparação do cliente: contagem regressiva, dicas, checklist e questionário |

### Navegação do painel
O painel abre numa página de **cards**, agrupados pelo caminho do trabalho: **Vender** (oportunidades, clientes, propostas, agenda, site), **Produzir** (projetos, preparação, fila de edição, tarefas), **Entregar** (galerias, álbuns, realidade aumentada, arquivo) e **Crescer** (financeiro, lucro por serviço, pós-venda). No topo ficam o **Painel de oportunidades**, a separação entre dinheiro **recebido**, **vendido** e **a receber**, e a **jornada dos clientes** (interessado → reserva → ensaio → edição → entrega → pagamento → recompra).

**Dica:** abra o painel e a galeria em abas lado a lado. Escolha fotos na galeria e veja o painel atualizar ao vivo.

## Documentação
- [`docs/ANALISE.md`](docs/ANALISE.md): análise da referência, dores dos usuários, diferenciais, direção de arte e motion
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md): estrutura atual e caminho para o back-end real (proteção no servidor, Pix automático, tempo real)

Os dados de demonstração ficam no navegador. Para restaurá-los, use **Ajustes → Restaurar demonstração**.
