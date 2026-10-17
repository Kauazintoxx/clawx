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
| `app.html` | Painel do fotógrafo, protegido por senha (no primeiro acesso você cria a sua): visão geral, galerias, clientes, agenda, financeiro, álbuns, site, ajustes |
| `gallery.html#g_marina` | Galeria de seleção (pacote + extras), com contrato e pagamento no portal |
| `gallery.html#g_julia` | Galeria com senha (`1234`) |
| `gallery.html#g_corrida` | Venda de fotos de evento: busca por nº de peito, carrinho e Pix |
| `site.html` | Portfólio público gerado pelo construtor |

**Dica:** abra o painel e a galeria em abas lado a lado. Escolha fotos na galeria e veja o painel atualizar ao vivo.

## Documentação
- [`docs/ANALISE.md`](docs/ANALISE.md): análise da referência, dores dos usuários, diferenciais, direção de arte e motion
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md): estrutura atual e caminho para o back-end real (proteção no servidor, Pix automático, tempo real)

Os dados de demonstração ficam no navegador. Para restaurá-los, use **Ajustes → Restaurar demonstração**.
