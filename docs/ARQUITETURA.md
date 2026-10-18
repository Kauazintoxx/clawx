# Arquitetura

## Hoje: protótipo funcional, sem build

HTML, CSS e JavaScript puros, sem dependências de build. Abra direto no navegador ou sirva a pasta.

```
index.html      landing da marca Offbeat
app.html        painel do fotógrafo (SPA com rotas #/...)
gallery.html    galeria/portal do cliente (#id da galeria)
site.html       portfólio público gerado pelo construtor
pay.html        página de pagamento Pix (#id da cobrança)
assets/js/store.js    camada de dados: estado + fotos (IndexedDB) + sincronização entre abas
assets/js/pix.js      BR Code Pix (EMV + CRC16) e QR em SVG
assets/js/protect.js  canvas protegido, marca d'água forense, bloqueios
assets/js/motion.js   reveal sincopado, cursor-visor, magnetismo, contadores
assets/js/app-work.js     projetos e prazos, tarefas, propostas acompanhadas
assets/js/app-finance.js  fluxo de caixa, contas a receber/pagar, vencimentos, relatórios, projeção
assets/js/app-site.js     construtor do site: aparência, páginas/landing (blocos), blog, depoimentos, SEO
assets/js/app-ar.js       realidade aumentada (painel)
assets/js/insights.js     inteligência: prioridade de clientes, oportunidades de receita, fila de edição,
                          lucro por serviço, pós-venda, jornada do cliente, preparação, cores do arquivo
assets/js/app-growth.js   início em cards, oportunidades, fila, lucro, pós-venda, arquivo, preparação
assets/js/blocks.js       renderização dos blocos das páginas públicas + SEO (meta, Open Graph, schema.org)
assets/js/zip.js          ZIP no navegador (download da galeria, exportação para gráfica)
assets/vendor/qrcode.js   qrcode-generator (MIT, Kazuhiko Arase)
assets/vendor/mindar/     MindAR 1.2.5 (MIT) — rastreamento de imagem para a realidade aumentada
assets/vendor/three/      three.js r160 (MIT)
```

### Arquivos no IndexedDB
| Chave | Conteúdo |
|---|---|
| `<id da foto>` | prévia otimizada (máx. 2000px) mostrada ao cliente, com proteção |
| `orig:<id>` | arquivo original em alta, usado só na entrega e na exportação para gráfica |
| `vid:<id>` | vídeo da galeria (a capa fica em `<id>`) |
| `artgt:<id>` / `arvid:<id>` / `armind:<id>` | realidade aumentada: foto-alvo, vídeo e alvo já compilado (cache) |

**Limitação honesta:** os dados ficam no navegador (localStorage e IndexedDB). O link da galeria funciona entre abas e janelas do **mesmo navegador**, o que basta para demonstração. Para o cliente abrir no celular dele, é preciso o back-end abaixo.

## Próximo passo: back-end (Supabase sugerido)

Toda leitura e escrita passa por `store.js` (`get`, `update`, `putBlob`, `getBlob`, `onChange`). A migração troca a implementação desse arquivo, e as telas continuam iguais.

### Tabelas
- `studios` (dono, marca, chave Pix)
- `galleries` (studio_id, tipo, limite, preços, senha com hash, expira_em, status)
- `photos` (gallery_id, storage_path_original, storage_path_preview, w, h, nome)
- `selections` (gallery_id, photo_id, ordem, comentário)
- `leads`, `contracts` (assinatura, ip, user_agent, hash do documento), `payments`, `orders`, `events`, `albums`

### Proteção de verdade (lado servidor)
1. O original vai para um bucket **privado**. O cliente nunca recebe a URL dele.
2. Uma Edge Function gera o **preview** (máx. 1400px) com a marca d'água forense queimada no servidor (e-mail do cliente + data + id da galeria).
3. Previews são servidos por **URL assinada de curta duração** (ex.: 10 min).
4. O download do original só é assinado quando `gallery.delivered = true` ou existe `order.status = 'pago'`.
5. Row Level Security: o cliente só lê a própria galeria. A senha da galeria é verificada no servidor.

### Pix
- O "copia e cola" estático já é válido. Para **confirmação automática**, use uma API Pix do banco ou PSP (cobrança dinâmica com `txid` + webhook) e marque `payments.status = 'pago'` no webhook.

### Integrações que dependem de servidor ou contrato
- **Cartão e boleto, confirmação automática do Pix**: gateway (Mercado Pago, Asaas, Pagar.me) com webhook que marca `payments.status = 'pago'` e libera a entrega.
- **Domínio próprio**: hospedagem estática (Vercel, Netlify, Cloudflare Pages) + DNS. Com servidor, as páginas públicas devem ser pré-renderizadas para o SEO.
- **Google Calendar**: OAuth do Google + API Calendar para sincronizar a agenda nos dois sentidos.
- **E-mails e notificações automáticas**: serviço de e-mail transacional (Resend, Postmark) disparado pelo servidor.
- **Equipe e permissões**: login real (Supabase Auth) com papéis (dono, assistente, editor).
- **Textos com IA**: chamada a um modelo de linguagem pelo servidor, com a chave guardada lá.
- **Plugin do Lightroom Classic**: plugin em Lua instalado no Lightroom, lendo a seleção pela API do servidor.

### Tempo real
- Use Supabase Realtime nas tabelas `selections`, `payments` e `activity` no lugar do `BroadcastChannel`.
