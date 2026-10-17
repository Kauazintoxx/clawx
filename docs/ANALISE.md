# Análise da referência e decisões do Offbeat

> Referência: a suíte da Alboom (alboompro.com), com Proof Gallery, Prosite, Designbox, Alboom Pay, Alboom CRM e Fotto.
> O site deles bloqueia acesso automatizado deste ambiente. Esta análise se baseia nas soluções que o Lázaro enviou (prints) e em avaliações públicas de fotógrafos que usam a plataforma (Capterra / B2B Stack). Nenhum texto, marca, logo ou layout da Alboom foi copiado: o Offbeat é uma marca e um design próprios.

## 1. O que a referência entrega (mapa funcional)

| Produto deles | Função | Equivalente Offbeat | Onde está |
|---|---|---|---|
| Proof Gallery | Seleção e venda de fotos por link | **Prova** | `gallery.html` (modo `selecao`) |
| Prosite | Site e landing pages | **Palco** | `app.html#/site` → `site.html` |
| Designbox | Diagramação de álbuns | **Lâmina** | `app.html#/albuns` |
| Alboom CRM | Fluxo de trabalho e gestão | **Pulso** | `app.html#/crm`, `#/agenda` |
| Alboom Pay | Pagamentos online por link | **Caixa** | `app.html#/financeiro` → `pay.html` |
| Fotto | Venda de fotos de eventos | **Pista** | `gallery.html` (modo `venda`) |
| Temas de sites | Modelos prontos | 3 temas (Noir, Papel, Galeria) | construtor de site |

## 2. Dores reais relatadas por usuários → resposta do Offbeat

| Dor (avaliações públicas) | Resposta no Offbeat |
|---|---|
| Clientes não encontram o botão de **finalizar a seleção** | Barra fixa com anel de progresso, contagem do pacote e o botão sempre visível. Quando o pacote completa, o botão faz um leve "chamado" |
| Cliente **sem portal** para ver seleção, contrato e pedidos | Portal no mesmo link: abas **Fotos · Contrato · Pagamento** |
| Integração **galeria ↔ CRM removida** | Galeria, cobrança, contrato e agenda nascem do card do cliente e aparecem no histórico dele |
| Sem **orçamento em PDF** | Proposta editorial e contrato gerados a partir do cliente, com impressão ou PDF prontos |
| Assinantes de contrato compartilham login | Assinatura na tela pelo próprio cliente, com nome, data/hora e navegador registrados |
| Sem **análise por nicho/produto** | Receita fechada por tipo de trabalho e origem dos contatos no CRM |
| Marca d'água boa, mas genérica | **Marca d'água forense** com e-mail do cliente e data queimados nos pixels |
| Cliente esquece de finalizar | O painel registra "saiu sem finalizar" e oferece lembrete pronto no WhatsApp |

## 3. Diferenciais que vão além da referência

- **Painel ao vivo**: a seleção do cliente aparece no painel em tempo real (BroadcastChannel; no back-end real, Realtime/WebSocket).
- **Exportação para edição**: filtro pronto para o Lightroom (`IMG_4811 OR IMG_4814 …`) e CSV com comentários.
- **Pix nativo e sem taxa**: BR Code EMV válido (CRC16) e QR gerados no navegador, com a chave do próprio fotógrafo.
- **Comparar fotos** lado a lado, atalhos de teclado (← → F Esc) e gesto de arrastar no celular.
- **Venda de eventos com melhor preço automático**: o carrinho escolhe sozinho a combinação mais barata entre foto avulsa e pacotes.
- **Diagramação automática**: o álbum já nasce montado com a seleção do cliente.
- **Paleta de comandos** (Ctrl/⌘ K) para ir a qualquer lugar ou criar qualquer coisa.
- **Formulário do site vira contato no CRM** automaticamente.

## 4. Direção de arte

**Conceito:** *fora do compasso.* A foto boa acontece no contratempo. A interface inteira se apoia nessa ideia.

- **Paleta:** laboratório escuro (`#0f0e0c`), papel fotográfico (`#efeae0`) e **luz de segurança vermelha** (`#e3412b`) como o único acento.
- **Tipografia:** Instrument Serif (editorial, itálico como voz), Inter Tight (interface) e JetBrains Mono (metadados com cara de EXIF: `FR 01 · ISO 400 · f/1.8`).
- **Padrão de conteúdo:** manifesto de fundador, transparência ("o que faltava" com as dores reais) e processo antes da compra (seis capítulos de produto).

## 5. Motion (o que cada movimento faz)

| Cena | Beats | Por que existe |
|---|---|---|
| Diafragma (preloader) | entrada → tensão → impacto | A primeira coisa que acontece é *abrir a lente* |
| Título do hero | entrada sincopada | As palavras entram fora do tempo (padrão `1 · e · — · 4`). É o conceito virando ritmo |
| Pilha de provas | resolução + paralaxe | Profundidade de mesa de luz e resposta ao cursor |
| Manifesto | leitura guiada pela rolagem | Cada palavra acende conforme você lê; "contratempo" acende em vermelho |
| Capítulos de produto | transição por máscara | Palco fixo, tela nova revelada de baixo, sem corte seco |
| Cursor-visor | assinatura | Colchetes de foco que **travam** no alvo (`AF·LOCK`, `FR 03`) |
| Galeria | entrada em cascata sincopada | Fotos chegam como provas sendo reveladas |
| Coração / carrinho | impacto (`back.out`) | Recompensa física ao escolher |

O modo `prefers-reduced-motion` desliga todo movimento, grão e cursor, e o conteúdo continua completo. Só `transform` e `opacity` são animados.
