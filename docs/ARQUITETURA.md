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
assets/vendor/qrcode.js  qrcode-generator (MIT, Kazuhiko Arase)
```

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

### Tempo real
- Use Supabase Realtime nas tabelas `selections`, `payments` e `activity` no lugar do `BroadcastChannel`.
