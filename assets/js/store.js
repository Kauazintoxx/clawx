/* ==========================================================================
   OFFBEAT — camada de dados
   Estado em localStorage + arquivos de foto em IndexedDB.
   Toda leitura/escrita passa por aqui: trocar por Supabase/API no futuro
   é trocar só este arquivo (ver docs/ARQUITETURA.md).
   ========================================================================== */
(function () {
  const KEY = "offbeat:v1";
  const DB_NAME = "offbeat-photos";
  const bus = "BroadcastChannel" in window ? new BroadcastChannel("offbeat") : null;
  const listeners = new Set();

  const uid = (p = "") => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const now = () => Date.now();
  const DAY = 864e5;

  /* ---------------- seed ---------------- */
  function pic(seed, i, portrait) {
    const w = 1600, h = portrait ? 2200 : 1067;
    return { id: uid("p_"), src: `https://picsum.photos/seed/${seed}-${i}/${w}/${h}`, w, h, name: `IMG_${String(4810 + i).padStart(4, "0")}.jpg` };
  }
  function pics(seed, n, tagFn) {
    return Array.from({ length: n }, (_, i) => {
      const p = pic(seed, i, i % 3 === 1 || i % 7 === 0);
      if (tagFn) p.tags = tagFn(i);
      return p;
    });
  }

  function seed() {
    const t = now();
    const wedding = pics("ob-wed", 36);
    const preg = pics("ob-ges", 24);
    const run = pics("ob-run", 30, (i) => [String(100 + ((i * 37) % 60)), String(100 + ((i * 53 + 11) % 60))]);
    const g1 = {
      id: "g_marina", type: "selecao", title: "Marina & Teo", subtitle: "Casamento · Fazenda Vila Rica",
      client: "Marina Duarte", clientEmail: "marina@email.com", clientPhone: "11999990001",
      createdAt: t - 3 * DAY, expiresAt: t + 12 * DAY, password: "", limit: 40, extraPrice: 25,
      watermark: "OFFBEAT · LÁZARO", allowDownload: false, status: "em-selecao",
      photos: wedding, cover: wedding[4].id, selection: [wedding[1].id, wedding[4].id, wedding[9].id, wedding[12].id],
      comments: { [wedding[4].id]: "Essa vai pro quadro da sala!" }, views: 18, finalizedAt: null, delivered: false, paid: false, leadId: "l_marina",
    };
    const g2 = {
      id: "g_julia", type: "selecao", title: "Júlia", subtitle: "Ensaio gestante · Estúdio",
      client: "Júlia Martins", clientEmail: "julia@email.com", clientPhone: "11999990002",
      createdAt: t - 15 * DAY, expiresAt: t + 2 * DAY, password: "1234", limit: 15, extraPrice: 30,
      watermark: "OFFBEAT · LÁZARO", allowDownload: true, status: "finalizada",
      photos: preg, cover: preg[2].id, selection: preg.filter((_, i) => i % 3 !== 1).map((p) => p.id).slice(0, 17),
      comments: { [preg[0].id]: "Pode clarear um pouco?", [preg[6].id]: "Amei!!" }, views: 42, finalizedAt: t - 2 * DAY, delivered: false, paid: true, leadId: "l_julia",
    };
    const g3 = {
      id: "g_corrida", type: "venda", title: "Corrida Noturna SP", subtitle: "Evento · 10K · Av. Paulista",
      client: "Público do evento", clientEmail: "", clientPhone: "",
      createdAt: t - 6 * DAY, expiresAt: t + 40 * DAY, password: "", limit: 0, extraPrice: 0, unitPrice: 19.9,
      packages: [{ qty: 3, price: 49.9 }, { qty: 10, price: 119.9 }],
      watermark: "OFFBEAT · PROVA", allowDownload: false, status: "publicada",
      photos: run, cover: run[3].id, selection: [], comments: {}, views: 311, orders: [], leadId: null,
    };

    const leads = [
      ["l_marina", "Marina Duarte", "Casamento", 8900, "fechado", 40],
      ["l_julia", "Júlia Martins", "Gestante", 1200, "fechado", 30],
      ["l_ana", "Ana Paula Reis", "Casamento", 11200, "contrato", 8],
      ["l_caio", "Caio Fontes", "Corporativo", 3400, "negociacao", 5],
      ["l_bia", "Beatriz Lemos", "15 anos", 5600, "orcamento", 3],
      ["l_rafa", "Rafael & Davi", "Casamento", 9800, "orcamento", 2],
      ["l_lu", "Luiza Prado", "Ensaio", 900, "lead", 1],
      ["l_enzo", "Enzo Viana", "Newborn", 1500, "lead", 0],
      ["l_ped", "Pedro Alencar", "Corporativo", 2200, "perdido", 20],
    ].map(([id, name, type, value, stage, ago], i) => ({
      id, name, type, value, stage, email: name.split(" ")[0].toLowerCase() + "@email.com",
      phone: "1199999" + String(1000 + i), source: ["Instagram", "Indicação", "Google", "Site"][i % 4],
      eventDate: t + (20 + i * 17) * DAY, createdAt: t - ago * DAY, notes: "", contract: null,
    }));

    leads[0].contract = contractTemplate(leads[0], { name: "Lázaro", brand: "Offbeat" });
    leads[2].contract = contractTemplate(leads[2], { name: "Lázaro", brand: "Offbeat" });

    const months = [3200, 5400, 4100, 7900, 6200, 9800];
    const payments = [];
    months.forEach((v, m) => {
      payments.push({ id: uid("pay_"), desc: "Sinal / parcelas — mês " + (m + 1), amount: v, status: "pago", method: "pix", createdAt: t - (5 - m) * 30 * DAY - 3 * DAY, leadId: null });
    });
    payments.push({ id: "pay_ana", desc: "Sinal 30% — Casamento Ana Paula", amount: 3360, status: "pendente", method: "pix", createdAt: t - 1 * DAY, leadId: "l_ana" });
    payments.push({ id: "pay_marina", desc: "Saldo final — Casamento Marina & Teo", amount: 2670, status: "pendente", method: "pix", createdAt: t - 2 * DAY, leadId: "l_marina" });
    payments.push({ id: "pay_caio", desc: "Cobertura evento Fontes & Co.", amount: 3400, status: "pendente", method: "pix", createdAt: t - 4 * DAY, leadId: "l_caio" });

    const events = [
      { id: uid("e_"), title: "Ensaio pré-wedding — Ana Paula", date: t + 2 * DAY, kind: "ensaio", leadId: "l_ana" },
      { id: uid("e_"), title: "Reunião — Rafael & Davi", date: t + 1 * DAY, kind: "reuniao", leadId: "l_rafa" },
      { id: uid("e_"), title: "Evento corporativo Fontes", date: t + 9 * DAY, kind: "evento", leadId: "l_caio" },
      { id: uid("e_"), title: "Entrega álbum Júlia", date: t + 5 * DAY, kind: "entrega", leadId: "l_julia" },
      { id: uid("e_"), title: "15 anos Beatriz", date: t + 26 * DAY, kind: "evento", leadId: "l_bia" },
    ];

    const albums = [{
      id: "a_julia", title: "Álbum Júlia — 30×30", galleryId: "g_julia", size: "30x30", status: "rascunho",
      spreads: [
        { layout: "1", slots: [g2.selection[0]] },
        { layout: "2", slots: [g2.selection[1], g2.selection[2]] },
        { layout: "3", slots: [g2.selection[3], g2.selection[4], g2.selection[5]] },
        { layout: "4", slots: [null, null, null, null] },
      ],
    }];

    return {
      v: 1,
      studio: {
        name: "Lázaro", brand: "Offbeat", tagline: "Fotografia fora do compasso.",
        email: "contato@offbeat.foto", whatsapp: "5511999999999", city: "SAO PAULO",
        pixKey: "contato@offbeat.foto", pixName: "LAZARO OFFBEAT", instagram: "@offbeat.lazaro",
      },
      site: {
        theme: "noir", accent: "#e3412b", headline: "Fotografia fora do compasso.",
        about: "Sou Lázaro. Fotografo o que acontece entre uma pose e outra — o riso antes da hora, o olhar que ninguém pediu.",
        sections: { portfolio: true, about: true, testimonials: true, contact: true }, published: true, galleryIds: ["g_marina", "g_julia"],
      },
      galleries: [g1, g2, g3],
      leads, payments, events, albums,
      activity: [
        { t: t - 2 * 3600e3, msg: "Marina abriu a galeria pela 18ª vez", kind: "view" },
        { t: t - 26 * 3600e3, msg: "Júlia finalizou a seleção (17 fotos, 2 extras)", kind: "select" },
        { t: t - 30 * 3600e3, msg: "Pagamento Pix recebido — R$ 9.800,00", kind: "pay" },
      ],
    };
  }

  /** Contrato padrão de prestação de serviço fotográfico (editável no painel). */
  function contractTemplate(lead, studio) {
    const BRL = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const when = new Date(lead.eventDate || Date.now()).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    return {
      title: `Prestação de serviços fotográficos — ${lead.type}`,
      createdAt: Date.now(), signedAt: null, signature: null, signerName: null,
      clauses: [
        { h: "Objeto", p: `Cobertura fotográfica de ${lead.type.toLowerCase()} de ${lead.name}, prevista para ${when}, realizada por ${studio.name} (${studio.brand}).` },
        { h: "Valor e pagamento", p: `O valor total é de ${BRL(lead.value)}, sendo 30% de sinal na assinatura e o saldo até 7 dias antes da data, via Pix ou link de pagamento.` },
        { h: "Entrega", p: "As fotos serão disponibilizadas em galeria online protegida para seleção. Após a seleção, as fotos tratadas são entregues em até 30 dias." },
        { h: "Fotos extras", p: "Fotos escolhidas além do pacote contratado são cobradas pelo valor unitário informado na galeria." },
        { h: "Direitos de imagem", p: "O contratado poderá usar até 10 imagens em portfólio e redes sociais, salvo manifestação contrária por escrito do contratante." },
        { h: "Cancelamento", p: "Em caso de cancelamento com menos de 30 dias da data, o sinal não será devolvido. Remarcações estão sujeitas à disponibilidade de agenda." },
      ],
    };
  }

  /* ---------------- estado ---------------- */
  let state;
  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
    if (!state || state.v !== 1) { state = seed(); persist(false); }
    return state;
  }
  function persist(broadcast = true) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn("Offbeat: storage cheio", e); }
    if (broadcast && bus) bus.postMessage({ type: "change" });
    listeners.forEach((fn) => fn(state, { remote: false }));
  }
  function get() { return state || load(); }
  function update(fn) { fn(get()); persist(); }
  function reset() { localStorage.removeItem(KEY); state = null; load(); persist(); }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function log(msg, kind = "info") {
    const s = get(); s.activity.unshift({ t: now(), msg, kind }); s.activity = s.activity.slice(0, 60);
  }

  // outras abas (dashboard aberto enquanto o cliente seleciona) recebem em tempo real
  if (bus) bus.onmessage = (e) => { if (e.data?.type === "change") { state = null; load(); listeners.forEach((fn) => fn(state, { remote: true })); } };
  window.addEventListener("storage", (e) => { if (e.key === KEY && !bus) { state = null; load(); listeners.forEach((fn) => fn(state, { remote: true })); } });

  /* ---------------- fotos (IndexedDB) ---------------- */
  let dbp;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("photos");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function putBlob(id, blob) {
    const d = await db();
    return new Promise((res, rej) => { const tx = d.transaction("photos", "readwrite"); tx.objectStore("photos").put(blob, id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }
  async function getBlob(id) {
    const d = await db();
    return new Promise((res) => { const r = d.transaction("photos").objectStore("photos").get(id); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
  }
  async function delBlob(id) {
    const d = await db();
    return new Promise((res) => { const tx = d.transaction("photos", "readwrite"); tx.objectStore("photos").delete(id); tx.oncomplete = res; tx.onerror = res; });
  }

  /** Reduz o arquivo enviado para no máx. `max`px (JPEG) — guarda leve e rápido. */
  function downscale(file, max = 2000, q = 0.86) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? res({ blob: b, w, h }) : rej(new Error("falha ao converter"))), "image/jpeg", q);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("imagem inválida")); };
      img.src = url;
    });
  }

  /** Carrega a foto como HTMLImageElement que NUNCA vai para o DOM. */
  function loadImage(photo) {
    return new Promise(async (res, rej) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      let revoke = null;
      if (photo.src) img.src = photo.src;
      else {
        const b = await getBlob(photo.id);
        if (!b) return rej(new Error("foto não encontrada"));
        revoke = URL.createObjectURL(b); img.src = revoke;
      }
      img.onload = () => { res(img); if (revoke) setTimeout(() => URL.revokeObjectURL(revoke), 1000); };
      img.onerror = rej;
    });
  }

  /* ---------------- formatos ---------------- */
  const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const money = (v) => BRL.format(v || 0);
  const date = (t, o = { day: "2-digit", month: "short" }) => new Date(t).toLocaleDateString("pt-BR", o);
  const ago = (t) => {
    const s = Math.round((now() - t) / 1000);
    if (s < 60) return "agora";
    if (s < 3600) return `há ${Math.round(s / 60)} min`;
    if (s < 86400) return `há ${Math.round(s / 3600)} h`;
    return `há ${Math.round(s / 86400)} d`;
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const base = () => location.href.replace(/[^/]*([?#].*)?$/, "");
  const galleryLink = (g) => `${base()}gallery.html#${g.id}`;
  const payLink = (p) => `${base()}pay.html#${p.id}`;

  function toast(msg, kind = "") {
    let box = document.querySelector(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("role", "status"); document.body.appendChild(box); }
    const el = document.createElement("div"); el.className = "toast " + kind; el.textContent = msg; box.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 400); }, 3200);
  }
  async function copy(text, msg = "Copiado!") {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
    toast(msg, "ok");
  }

  window.Offbeat = {
    uid, now, DAY, contractTemplate, get, update, reset, onChange, log, persist,
    putBlob, getBlob, delBlob, downscale, loadImage,
    money, date, ago, esc, galleryLink, payLink, toast, copy,
  };
})();
