/* ==========================================================================
   OFFBEAT — blocos das páginas públicas (landing, páginas, blog) + SEO
   Usado pelo site público, por page.html e pela prévia do editor.
   ========================================================================== */
(function () {
  const O = Offbeat;
  const esc = O.esc;

  const TYPES = {
    hero: { name: "Capa", icon: "▣", make: () => ({ type: "hero", title: "Um título forte", subtitle: "Uma frase que explica o que você oferece.", gid: "", pid: null, button: "form" }) },
    text: { name: "Texto", icon: "¶", make: () => ({ type: "text", title: "Título da seção", body: "Escreva aqui. Deixe uma linha em branco para começar outro parágrafo." }) },
    gallery: { name: "Fotos", icon: "▦", make: () => ({ type: "gallery", gid: "", count: 6 }) },
    quote: { name: "Depoimento", icon: "❝", make: () => ({ type: "quote", text: "O que o cliente disse.", author: "Nome do cliente" }) },
    faq: { name: "Perguntas", icon: "?", make: () => ({ type: "faq", items: [{ q: "Pergunta frequente?", a: "Resposta clara e curta." }] }) },
    cta: { name: "Chamada", icon: "→", make: () => ({ type: "cta", title: "Vamos conversar?", text: "Responda em até 24 horas.", button: "whatsapp" }) },
    form: { name: "Formulário", icon: "✉", make: () => ({ type: "form", title: "Peça um orçamento" }) },
  };

  /** Texto simples → HTML: parágrafos, "## títulos", **negrito**, *itálico*, links. */
  function md(src) {
    return esc(src || "").split(/\n{2,}/).map((blk) => {
      blk = blk.trim(); if (!blk) return "";
      const inline = (t) => t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\[(.+?)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\n/g, "<br>");
      if (blk.startsWith("## ")) { const [h, ...rest] = blk.split("\n"); return `<h3>${inline(h.slice(3))}</h3>${rest.length ? `<p>${inline(rest.join("\n"))}</p>` : ""}`; }
      if (/^- /.test(blk)) return `<ul>${blk.split("\n").map((l) => `<li>${inline(l.replace(/^- /, ""))}</li>`).join("")}</ul>`;
      return `<p>${inline(blk)}</p>`;
    }).join("");
  }

  function photoURL(p, w = 1200) {
    if (!p) return Promise.resolve("");
    if (p.src) return Promise.resolve(p.src.replace(/\/(\d+)\/(\d+)$/, (m, W, H) => `/${w}/${Math.round((w * H) / W)}`));
    return O.getBlob(p.id).then((b) => (b ? URL.createObjectURL(b) : ""));
  }
  const img = (gid, pid, w = 1200, cls = "") => `<img class="${cls}" data-bg="${esc(gid || "")}" data-bp="${esc(pid || "")}" data-bw="${w}" alt="" loading="lazy">`;
  /** Preenche as <img data-bg> com a foto certa (capa da galeria quando não há foto escolhida). */
  function hydrate(root) {
    const s = O.get();
    root.querySelectorAll("img[data-bg]").forEach((el) => {
      const g = s.galleries.find((x) => x.id === el.dataset.bg); if (!g) return;
      const p = g.photos.find((x) => x.id === el.dataset.bp) || g.photos.find((x) => x.id === g.cover) || g.photos.find((x) => !x.video);
      photoURL(p, +el.dataset.bw).then((u) => u && (el.src = u));
    });
  }

  function render(b, s = O.get()) {
    const me = s.studio;
    switch (b.type) {
      case "hero": return `<section class="bk bk-hero">${b.gid ? img(b.gid, b.pid, 1800, "bk-hero__img") : ""}<div class="bk-hero__in"><h1>${esc(b.title)}</h1><p>${esc(b.subtitle)}</p>${btn(b.button, me)}</div></section>`;
      case "text": return `<section class="bk bk-text">${b.title ? `<h2>${esc(b.title)}</h2>` : ""}<div class="bk-prose">${md(b.body)}</div></section>`;
      case "gallery": {
        const g = s.galleries.find((x) => x.id === b.gid);
        if (!g) return `<section class="bk bk-note">Escolha uma galeria para este bloco.</section>`;
        const ph = g.photos.filter((p) => !p.video).slice(0, +b.count || 6);
        return `<section class="bk bk-gallery">${ph.map((p) => `<figure>${img(g.id, p.id, 900)}</figure>`).join("")}</section>`;
      }
      case "quote": return `<section class="bk bk-quote"><blockquote>“${esc(b.text)}”</blockquote><cite>${esc(b.author)}</cite></section>`;
      case "faq": return `<section class="bk bk-faq"><h2>Perguntas frequentes</h2>${(b.items || []).map((it) => `<details><summary>${esc(it.q)}</summary><p>${esc(it.a)}</p></details>`).join("")}</section>`;
      case "cta": return `<section class="bk bk-cta"><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p>${btn(b.button, me)}</section>`;
      case "form": return `<section class="bk bk-form" id="orcamento"><h2>${esc(b.title)}</h2>${formHTML()}</section>`;
      default: return "";
    }
  }
  function btn(kind, me) {
    if (kind === "whatsapp") return `<a class="bk-btn" target="_blank" rel="noopener" href="https://wa.me/${esc(me.whatsapp)}?text=${encodeURIComponent("Oi " + me.name + "! Quero um orçamento.")}">Chamar no WhatsApp</a>`;
    if (kind === "form") return `<a class="bk-btn" href="#orcamento">Pedir orçamento</a>`;
    return "";
  }
  function formHTML() {
    return `<form class="bk-lead"><input name="name" placeholder="Seu nome" required><input name="email" type="email" placeholder="E-mail" required>
      <input name="phone" placeholder="WhatsApp"><select name="type"><option>Casamento</option><option>Ensaio</option><option>Gestante</option><option>15 anos</option><option>Corporativo</option><option>Evento</option></select>
      <input name="date" type="date" aria-label="Data"><textarea name="notes" rows="3" placeholder="Conte um pouco sobre o seu dia"></textarea><button class="bk-btn">Enviar pedido de orçamento</button></form>`;
  }
  /** Todo formulário de orçamento vira um contato no CRM. */
  function mountForms(root, source = "Site") {
    root.querySelectorAll("form.bk-lead").forEach((f) => f.addEventListener("submit", (e) => {
      e.preventDefault();
      const x = Object.fromEntries(new FormData(f));
      O.update((s) => {
        s.leads.unshift({ id: O.uid("l_"), name: x.name, email: x.email, phone: x.phone, type: x.type, value: 0, eventDate: x.date ? new Date(x.date + "T12:00").getTime() : Date.now() + 60 * O.DAY, source, notes: x.notes, stage: "lead", createdAt: Date.now(), contract: null });
        O.log(`Novo pedido de orçamento (${source}): ${x.name} — ${x.type}`, "select");
      });
      f.reset(); O.toast("Recebido! Respondo em até 24h.", "ok");
    }));
  }

  /** SEO: título, descrição, Open Graph, canonical e dados estruturados. */
  function seo({ title, description, image, type = "website", jsonld }) {
    if (title) document.title = title;
    const set = (attr, key, val) => {
      if (!val) return;
      let m = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!m) { m = document.createElement("meta"); m.setAttribute(attr, key); document.head.appendChild(m); }
      m.setAttribute("content", val);
    };
    set("name", "description", description);
    set("property", "og:title", title); set("property", "og:description", description); set("property", "og:type", type);
    set("property", "og:image", image); set("name", "twitter:card", "summary_large_image");
    let c = document.head.querySelector('link[rel="canonical"]');
    if (!c) { c = document.createElement("link"); c.rel = "canonical"; document.head.appendChild(c); }
    c.href = location.href.split("?")[0];
    document.getElementById("ldjson")?.remove();
    if (jsonld) { const sc = document.createElement("script"); sc.type = "application/ld+json"; sc.id = "ldjson"; sc.textContent = JSON.stringify(jsonld); document.head.appendChild(sc); }
  }
  function studioLD(s) {
    return { "@context": "https://schema.org", "@type": "ProfessionalService", name: `${s.studio.name} — ${s.studio.brand}`, description: s.site.seo.description, email: s.studio.email, telephone: "+" + s.studio.whatsapp, areaServed: "São Paulo", url: location.origin + location.pathname.replace(/[^/]*$/, "site.html") };
  }

  /** Estilos dos blocos (injetados uma vez, herdam as variáveis do tema). */
  const CSS = `
  .bk{padding:clamp(48px,9vh,110px) var(--gutter)}
  .bk h1{font:400 clamp(2.8rem,9vw,8rem)/.92 var(--f-display);letter-spacing:-.03em;margin:0 0 .2em;max-width:13ch}
  .bk h2{font:400 clamp(2rem,4.6vw,3.6rem)/1 var(--f-display);margin:0 0 24px;letter-spacing:-.01em}
  .bk-hero{position:relative;min-height:78vh;display:grid;align-items:end;overflow:hidden;padding-top:20vh}
  .bk-hero__img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
  .bk-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,var(--bg) 100%)}
  .bk-hero__in{position:relative;z-index:1}
  .bk-hero p{font-size:1.15rem;max-width:44ch;color:var(--sub);margin:0 0 24px}
  .bk-btn{display:inline-flex;padding:.9em 1.5em;border-radius:99px;background:var(--acc,#e3412b);color:#fff;text-decoration:none;font-weight:500;border:0;cursor:pointer;font-size:1rem;transition:transform .4s var(--e-out)}
  .bk-btn:hover{transform:translateY(-2px)}
  .bk-prose{max-width:66ch;font-size:1.08rem;line-height:1.75}
  .bk-prose h3{font:400 1.8rem/1.1 var(--f-display);margin:1.6em 0 .4em}
  .bk-prose a{color:var(--acc,#e3412b)}
  .bk-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .bk-gallery figure{margin:0;overflow:hidden;border-radius:2px;background:rgba(128,128,128,.12)}
  .bk-gallery figure:first-child{grid-column:span 2;grid-row:span 2}
  .bk-gallery img{width:100%;height:100%;object-fit:cover;aspect-ratio:3/2;transition:transform 1.2s var(--e-out)}
  .bk-gallery figure:hover img{transform:scale(1.04)}
  @media(max-width:700px){.bk-gallery{grid-template-columns:1fr 1fr}.bk-gallery figure:first-child{grid-column:span 2;grid-row:auto}}
  .bk-quote{text-align:center}
  .bk-quote blockquote{font:italic 400 clamp(1.6rem,4vw,3rem)/1.2 var(--f-display);margin:0 auto 16px;max-width:24ch}
  .bk-quote cite{font:normal 500 .72rem var(--f-mono);text-transform:uppercase;color:var(--sub);letter-spacing:.06em}
  .bk-faq details{border-top:1px solid var(--bd);padding:18px 0;max-width:760px}
  .bk-faq summary{cursor:pointer;font-size:1.15rem;list-style:none;display:flex;justify-content:space-between}
  .bk-faq summary::after{content:"+";color:var(--acc,#e3412b);transition:transform .3s}
  .bk-faq details[open] summary::after{transform:rotate(45deg)}
  .bk-faq p{color:var(--sub);margin:12px 0 0}
  .bk-cta{text-align:center;border-top:1px solid var(--bd)}
  .bk-cta p{color:var(--sub)}
  .bk-form form{display:grid;gap:12px;max-width:620px}
  .bk-form input,.bk-form select,.bk-form textarea{width:100%;padding:14px 0;border:0;border-bottom:1px solid var(--bd);background:transparent;color:var(--fg);font-size:1rem}
  .bk-form input:focus,.bk-form textarea:focus{outline:none;border-color:var(--acc,#e3412b)}
  .bk-form .bk-btn{justify-self:start;margin-top:10px}
  .bk-note{color:var(--sub);text-align:center;border:1px dashed var(--bd);margin:16px var(--gutter)}`;
  function css() { if (document.getElementById("bk-css")) return; const st = document.createElement("style"); st.id = "bk-css"; st.textContent = CSS; document.head.appendChild(st); }

  window.Blocks = { TYPES, render, md, hydrate, mountForms, seo, studioLD, css, photoURL };
})();
