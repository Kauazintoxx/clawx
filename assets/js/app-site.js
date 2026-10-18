/* ==========================================================================
   OFFBEAT — painel · Meu site
   Aparência, páginas/landing pages (editor de blocos), blog, depoimentos e SEO.
   Rotas: #/site[/aparencia|/paginas|/blog|/depoimentos|/seo] · #/pagina/<id> · #/post/<id>
   ========================================================================== */
(function () {
  const V = (window.OBViews = window.OBViews || {});
  const slugify = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "pagina";
  const uniqueSlug = (s, base, selfId) => { let x = base, i = 2; while ([...s.pages, ...s.posts].some((p) => p.slug === x && p.id !== selfId)) x = `${base}-${i++}`; return x; };

  /** Escreve sem redesenhar a tela (a prévia no iframe se atualiza sozinha). */
  const quiet = (c, fn) => { c.setViewHook(() => {}); c.O.update(fn); };

  V.site = (v, tab = "aparencia", c) => {
    const { O, $, S } = c, s = S();
    tab = tab || "aparencia";
    const TABS = [["aparencia", "Aparência"], ["paginas", `Páginas <i>${s.pages.length}</i>`], ["blog", `Blog <i>${s.posts.length}</i>`], ["depoimentos", `Depoimentos <i>${s.site.testimonials.length}</i>`], ["seo", "SEO"]];
    v.innerHTML = `<header class="vh"><div><p class="mono">${s.site.published ? "● publicado" : "rascunho"} · ${s.pages.filter((p) => p.published).length} páginas · ${s.posts.filter((p) => p.published).length} posts</p><h1>Meu site</h1></div>
      <div class="acts"><a class="btn btn--ghost" href="site.html" target="_blank" rel="noopener">Abrir site ↗</a><button class="btn btn--red" id="pub">${s.site.published ? "Atualizar site" : "Publicar"}</button></div></header>
      <nav class="subtabs">${TABS.map(([k, n]) => `<a href="#/site/${k}" style="text-decoration:none"><button tabindex="-1" class="${k === tab ? "on" : ""}">${n}</button></a>`).join("")}</nav><div id="sb"></div>`;
    $("#pub", v).onclick = () => { O.update((s2) => { s2.site.published = true; O.log("Site publicado", "info"); }); O.toast("Site publicado!", "ok"); };
    ({ aparencia, paginas, blog, depoimentos, seo }[tab] || aparencia)($("#sb", v), c, s);
  };

  /* ---------- aparência ---------- */
  function aparencia(box, c, s) {
    const { O, $, $$, esc } = c, st = s.site;
    const themes = [["noir", "Noir", "linear-gradient(135deg,#0f0e0c 60%,#e3412b)"], ["papel", "Papel", "linear-gradient(135deg,#efeae0 60%,#0f0e0c)"], ["galeria", "Galeria", "linear-gradient(135deg,#fff 50%,#d6cdbd)"]];
    box.innerHTML = `<div class="sb"><form class="card form" id="fs">
        <div class="field"><span>Tema</span><div class="themes">${themes.map(([k, n, bg]) => `<button type="button" data-th="${k}" class="${st.theme === k ? "on" : ""}"><i style="background:${bg}"></i>${n}</button>`).join("")}</div></div>
        <div class="field"><span>Frase principal</span><input name="headline" value="${esc(st.headline)}"></div>
        <div class="field"><span>Sobre você</span><textarea name="about" rows="4">${esc(st.about)}</textarea></div>
        <div class="field"><span>Cor de destaque</span><input name="accent" type="color" value="${st.accent}" style="height:44px;padding:4px"></div>
        <div class="field"><span>Galerias no portfólio</span>${s.galleries.map((g) => `<label class="switch">${esc(g.title)}<input type="checkbox" name="gal" value="${g.id}" ${st.galleryIds.includes(g.id) ? "checked" : ""}></label>`).join("")}</div>
        <div class="field"><span>Seções</span>${[["about", "Sobre"], ["testimonials", "Depoimentos"], ["contact", "Contato + WhatsApp"]].map(([k, n]) => `<label class="switch">${n}<input type="checkbox" name="sec_${k}" ${st.sections[k] ? "checked" : ""}></label>`).join("")}
          <label class="switch">Blog (Diário)<input type="checkbox" name="blog" ${st.blog ? "checked" : ""}></label></div>
      </form>${preview(s, "site.html?preview=1")}</div>`;
    const f = $("#fs", box);
    let tm;
    f.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(() => { const x = new FormData(f); quiet(c, (s2) => Object.assign(s2.site, {
      headline: x.get("headline"), about: x.get("about"), accent: x.get("accent"), galleryIds: x.getAll("gal"), blog: !!x.get("blog"),
      sections: { portfolio: true, about: !!x.get("sec_about"), testimonials: !!x.get("sec_testimonials"), contact: !!x.get("sec_contact") } })); }, 250); });
    $$("[data-th]", box).forEach((b) => (b.onclick = () => { $$("[data-th]", box).forEach((x) => x.classList.toggle("on", x === b)); quiet(c, (s2) => (s2.site.theme = b.dataset.th)); }));
    devices(box);
  }
  function preview(s, src) {
    return `<div class="preview"><div class="preview__bar"><i></i><i></i><i></i><code>${c_slug(s)}.offbeat.foto</code>
      <div class="preview__dev"><button class="on" data-w="100%">Desktop</button><button data-w="390px">Celular</button></div></div><iframe id="pv" src="${src}" title="Prévia"></iframe></div>`;
  }
  const c_slug = (s) => s.studio.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\W+/g, "");
  function devices(box) {
    box.querySelectorAll(".preview__dev button").forEach((b) => (b.onclick = () => { box.querySelectorAll(".preview__dev button").forEach((x) => x.classList.toggle("on", x === b)); box.querySelector("#pv").style.width = b.dataset.w; }));
  }

  /* ---------- páginas e landing pages ---------- */
  function paginas(box, c, s) {
    const { O, $, $$, esc } = c;
    box.innerHTML = `<div class="acts" style="display:flex;gap:8px;margin-bottom:16px"><button class="btn btn--red" id="nl">+ Landing page</button><button class="btn btn--ghost" id="np">+ Página</button></div>
      <div class="card table-wrap"><table class="table"><thead><tr><th>Página</th><th>Tipo</th><th>Endereço</th><th>Status</th><th></th></tr></thead><tbody>
      ${s.pages.map((p) => `<tr><td><strong>${esc(p.title)}</strong><br><small class="mono" style="text-transform:none">${p.blocks.length} blocos</small></td><td>${p.kind === "landing" ? "Landing page" : "Página"}</td><td><code class="mono" style="text-transform:none">/${esc(p.slug)}</code></td>
        <td><span class="chip ${p.published ? "ok" : ""}">${p.published ? "publicada" : "rascunho"}</span></td>
        <td class="r" style="white-space:nowrap"><a class="btn btn--sm" href="#/pagina/${p.id}">Editar</a> <a class="btn btn--sm btn--ghost" href="${esc(O.pageLink(p))}${p.published ? "" : "?preview=1"}" target="_blank" rel="noopener">Ver ↗</a></td></tr>`).join("") || '<tr><td colspan="5" class="mono">Nenhuma página.</td></tr>'}
      </tbody></table></div>
      <p class="mono" style="text-transform:none;margin-top:12px">Landing pages já nascem com capa, texto, fotos, depoimento, perguntas e formulário. Todo formulário vira contato no CRM, com a origem marcada.</p>`;
    const create = (kind) => {
      const id = O.uid("pg_"), title = kind === "landing" ? "Nova landing page" : "Nova página";
      const blocks = kind === "landing" ? ["hero", "text", "gallery", "quote", "faq", "form"].map((t) => Blocks.TYPES[t].make()) : ["text"].map((t) => Blocks.TYPES[t].make());
      const gid = s.galleries[0]?.id || "";
      blocks.forEach((b) => { if ("gid" in b) b.gid = gid; });
      O.update((s2) => s2.pages.unshift({ id, slug: uniqueSlug(s2, slugify(title), id), title, kind, published: false, createdAt: Date.now(), seo: { title: "", description: "" }, blocks }));
      c.go(`#/pagina/${id}`);
    };
    $("#nl", box).onclick = () => create("landing");
    $("#np", box).onclick = () => create("pagina");
  }

  V.pagina = (v, id, c) => {
    const { O, $, $$, S, esc } = c;
    const pg = S().pages.find((x) => x.id === id);
    if (!pg) { v.innerHTML = '<a class="back" href="#/site/paginas">← Páginas</a><h1>Página não encontrada</h1>'; return; }
    v.innerHTML = `<a class="back" href="#/site/paginas">← Páginas</a>
      <header class="vh"><div><p class="mono">${pg.kind === "landing" ? "Landing page" : "Página"} · /${esc(pg.slug)}</p><h1>${esc(pg.title)}</h1></div>
        <div class="acts"><button class="btn btn--ghost" id="cpl">Copiar link</button><button class="btn btn--ghost" id="dlp" style="--fg:var(--safelight)">Excluir</button><button class="btn btn--red" id="pubp">${pg.published ? "Despublicar" : "Publicar"}</button></div></header>
      <div class="sb"><div><div class="card form" style="margin-bottom:12px">
          <div class="row2"><div class="field"><span>Título</span><input id="pt" value="${esc(pg.title)}"></div><div class="field"><span>Endereço</span><input id="ps" value="${esc(pg.slug)}"></div></div>
          <details class="seo-box"><summary>SEO desta página</summary><div class="field"><span>Título no Google</span><input id="pst" value="${esc(pg.seo?.title || "")}" placeholder="${esc(pg.title)}"></div>
          <div class="field"><span>Descrição no Google</span><textarea id="psd" rows="2" maxlength="170">${esc(pg.seo?.description || "")}</textarea></div><div class="serp" id="serp"></div></details>
        </div>
        <div id="blocks"></div>
        <div class="addbk card"><span class="mono">Adicionar bloco</span><div>${Object.entries(Blocks.TYPES).map(([k, t]) => `<button data-add="${k}"><b>${t.icon}</b>${t.name}</button>`).join("")}</div></div>
      </div>${preview(S(), `page.html?preview=1#${encodeURIComponent(pg.slug)}`)}</div>`;
    devices(v);
    const mut = (fn) => quiet(c, (s2) => fn(s2.pages.find((x) => x.id === id), s2));
    const cur = () => S().pages.find((x) => x.id === id);
    const pv = $("#pv", v);
    const serp = () => { const p = cur(); $("#serp", v).innerHTML = `<small>${esc(location.host)}/${esc(p.slug)}</small><b>${esc(p.seo?.title || p.title)}</b><p>${esc(p.seo?.description || "Escreva uma descrição de até 160 caracteres para aparecer no Google.")}</p>`; };
    serp();
    $("#pt", v).oninput = (e) => { mut((p) => (p.title = e.target.value)); };
    $("#ps", v).onchange = (e) => { mut((p, s2) => (p.slug = uniqueSlug(s2, slugify(e.target.value), p.id))); e.target.value = cur().slug; pv.src = `page.html?preview=1#${encodeURIComponent(cur().slug)}`; serp(); };
    $("#pst", v).oninput = (e) => { mut((p) => (p.seo.title = e.target.value)); serp(); };
    $("#psd", v).oninput = (e) => { mut((p) => (p.seo.description = e.target.value)); serp(); };
    $("#cpl", v).onclick = () => O.copy(O.pageLink(cur()), "Link da página copiado.");
    $("#pubp", v).onclick = () => { c.setViewHook(null); O.update((s2) => { const p = s2.pages.find((x) => x.id === id); p.published = !p.published; O.log(`Página “${p.title}” ${p.published ? "publicada" : "despublicada"}`, "info"); }); };
    $("#dlp", v).onclick = () => { if (confirm("Excluir esta página?")) { O.update((s2) => (s2.pages = s2.pages.filter((x) => x.id !== id))); c.go("#/site/paginas"); } };
    $$("[data-add]", v).forEach((b) => (b.onclick = () => { const nb = Blocks.TYPES[b.dataset.add].make(); if ("gid" in nb) nb.gid = S().galleries[0]?.id || ""; mut((p) => p.blocks.push(nb)); paint(); }));
    function paint() { renderBlocks($("#blocks", v), cur().blocks, c, mut, paint); }
    paint();
  };

  /** Editor de blocos: campos por tipo, mover, excluir. */
  function renderBlocks(box, blocks, c, mut, repaint) {
    const { $$, S, esc } = c, gals = S().galleries;
    const galSel = (i, val) => `<select data-f="gid" data-i="${i}"><option value="">— galeria —</option>${gals.map((g) => `<option value="${g.id}" ${g.id === val ? "selected" : ""}>${esc(g.title)}</option>`).join("")}</select>`;
    box.innerHTML = blocks.map((b, i) => {
      const T = Blocks.TYPES[b.type] || { name: b.type, icon: "·" };
      let f = "";
      if (b.type === "hero") f = `<input data-f="title" data-i="${i}" value="${esc(b.title)}" placeholder="Título"><textarea data-f="subtitle" data-i="${i}" rows="2" placeholder="Subtítulo">${esc(b.subtitle)}</textarea><div class="row2">${galSel(i, b.gid)}<select data-f="button" data-i="${i}"><option value="form" ${b.button === "form" ? "selected" : ""}>Botão: pedir orçamento</option><option value="whatsapp" ${b.button === "whatsapp" ? "selected" : ""}>Botão: WhatsApp</option><option value="" ${!b.button ? "selected" : ""}>Sem botão</option></select></div>`;
      if (b.type === "text") f = `<input data-f="title" data-i="${i}" value="${esc(b.title)}" placeholder="Título (opcional)"><textarea data-f="body" data-i="${i}" rows="5" placeholder="Texto. Use ## para subtítulos, **negrito**, - para listas.">${esc(b.body)}</textarea>`;
      if (b.type === "gallery") f = `<div class="row2">${galSel(i, b.gid)}<input data-f="count" data-i="${i}" type="number" min="1" max="24" value="${b.count}"></div>`;
      if (b.type === "quote") f = `<textarea data-f="text" data-i="${i}" rows="2">${esc(b.text)}</textarea><input data-f="author" data-i="${i}" value="${esc(b.author)}" placeholder="Autor">`;
      if (b.type === "cta") f = `<input data-f="title" data-i="${i}" value="${esc(b.title)}"><input data-f="text" data-i="${i}" value="${esc(b.text)}"><select data-f="button" data-i="${i}"><option value="whatsapp" ${b.button === "whatsapp" ? "selected" : ""}>WhatsApp</option><option value="form" ${b.button === "form" ? "selected" : ""}>Formulário</option></select>`;
      if (b.type === "form") f = `<input data-f="title" data-i="${i}" value="${esc(b.title)}"><small class="mono" style="text-transform:none">Os pedidos chegam em Clientes, com a origem desta página.</small>`;
      if (b.type === "faq") f = (b.items || []).map((it, j) => `<div class="faqrow"><input data-q="${j}" data-i="${i}" value="${esc(it.q)}" placeholder="Pergunta"><textarea data-a="${j}" data-i="${i}" rows="2" placeholder="Resposta">${esc(it.a)}</textarea><button type="button" class="icon-btn" data-rmq="${j}" data-i="${i}">×</button></div>`).join("") + `<button type="button" class="btn btn--sm btn--ghost" data-addq="${i}">+ Pergunta</button>`;
      return `<div class="bked card"><header><b>${T.icon}</b><strong>${T.name}</strong><span class="grow"></span>
        <button class="icon-btn" data-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="Subir">↑</button><button class="icon-btn" data-dn="${i}" ${i === blocks.length - 1 ? "disabled" : ""} aria-label="Descer">↓</button><button class="icon-btn" data-rm="${i}" aria-label="Excluir">×</button></header>
        <div class="form">${f}</div></div>`;
    }).join("") || '<p class="mono">Sem blocos. Adicione abaixo.</p>';
    let tm;
    $$("[data-f]", box).forEach((el) => (el[el.tagName === "SELECT" ? "onchange" : "oninput"] = () => { clearTimeout(tm); tm = setTimeout(() => mut((p) => { p.blocks[+el.dataset.i][el.dataset.f] = el.type === "number" ? +el.value : el.value; }), 200); }));
    $$("[data-q],[data-a]", box).forEach((el) => (el.oninput = () => mut((p) => { const it = p.blocks[+el.dataset.i].items[+(el.dataset.q ?? el.dataset.a)]; it[el.dataset.q !== undefined ? "q" : "a"] = el.value; })));
    $$("[data-addq]", box).forEach((b) => (b.onclick = () => { mut((p) => p.blocks[+b.dataset.addq].items.push({ q: "", a: "" })); repaint(); }));
    $$("[data-rmq]", box).forEach((b) => (b.onclick = () => { mut((p) => p.blocks[+b.dataset.i].items.splice(+b.dataset.rmq, 1)); repaint(); }));
    const move = (i, d) => { mut((p) => { const [x] = p.blocks.splice(i, 1); p.blocks.splice(i + d, 0, x); }); repaint(); };
    $$("[data-up]", box).forEach((b) => (b.onclick = () => move(+b.dataset.up, -1)));
    $$("[data-dn]", box).forEach((b) => (b.onclick = () => move(+b.dataset.dn, 1)));
    $$("[data-rm]", box).forEach((b) => (b.onclick = () => { mut((p) => p.blocks.splice(+b.dataset.rm, 1)); repaint(); }));
  }

  /* ---------- blog ---------- */
  function blog(box, c, s) {
    const { O, $, esc } = c;
    box.innerHTML = `<div class="acts" style="display:flex;gap:8px;margin-bottom:16px"><button class="btn btn--red" id="npo">+ Novo post</button><a class="btn btn--ghost" href="page.html#blog" target="_blank" rel="noopener">Ver blog ↗</a></div>
      <div class="card table-wrap"><table class="table"><thead><tr><th>Post</th><th>Data</th><th>Status</th><th></th></tr></thead><tbody>
      ${[...s.posts].sort((a, b) => b.date - a.date).map((p) => `<tr><td><strong>${esc(p.title)}</strong><br><small class="mono" style="text-transform:none">${esc(p.excerpt).slice(0, 90)}</small></td><td>${O.date(p.date)}</td><td><span class="chip ${p.published ? "ok" : ""}">${p.published ? "publicado" : "rascunho"}</span></td>
        <td class="r" style="white-space:nowrap"><a class="btn btn--sm" href="#/post/${p.id}">Editar</a> <a class="btn btn--sm btn--ghost" href="${esc(O.postLink(p))}" target="_blank" rel="noopener">Ver ↗</a></td></tr>`).join("") || '<tr><td colspan="4" class="mono">Nenhum post.</td></tr>'}
      </tbody></table></div>`;
    $("#npo", box).onclick = () => {
      const id = O.uid("po_");
      O.update((s2) => s2.posts.unshift({ id, slug: uniqueSlug(s2, "novo-post", id), title: "Novo post", cover: { gid: s2.galleries[0]?.id || "", pid: null }, date: Date.now(), published: false, excerpt: "", body: "", seo: { title: "", description: "" } }));
      c.go(`#/post/${id}`);
    };
  }

  V.post = (v, id, c) => {
    const { O, $, S, esc } = c;
    const p = S().posts.find((x) => x.id === id);
    if (!p) { v.innerHTML = '<a class="back" href="#/site/blog">← Blog</a><h1>Post não encontrado</h1>'; return; }
    const gals = S().galleries;
    v.innerHTML = `<a class="back" href="#/site/blog">← Blog</a>
      <header class="vh"><div><p class="mono">Post · /blog/${esc(p.slug)}</p><h1>${esc(p.title)}</h1></div>
        <div class="acts"><button class="btn btn--ghost" id="dlpo" style="--fg:var(--safelight)">Excluir</button><button class="btn btn--red" id="pubpo">${p.published ? "Despublicar" : "Publicar"}</button></div></header>
      <div class="sb"><form class="card form" id="fpo">
        <div class="field"><span>Título</span><input name="title" value="${esc(p.title)}"></div>
        <div class="row2"><div class="field"><span>Data</span><input name="date" type="date" value="${new Date(p.date).toISOString().slice(0, 10)}"></div><div class="field"><span>Endereço</span><input name="slug" value="${esc(p.slug)}"></div></div>
        <div class="field"><span>Capa (galeria)</span><select name="cover">${gals.map((g) => `<option value="${g.id}" ${g.id === p.cover?.gid ? "selected" : ""}>${esc(g.title)}</option>`).join("")}</select></div>
        <div class="field"><span>Resumo</span><textarea name="excerpt" rows="2">${esc(p.excerpt)}</textarea></div>
        <div class="field"><span>Texto</span><textarea name="body" rows="14" placeholder="## Subtítulo&#10;Texto com **negrito** e *itálico*.&#10;&#10;- itens de lista">${esc(p.body)}</textarea><small>## subtítulo · **negrito** · *itálico* · - lista · [texto](https://link)</small></div>
        <details class="seo-box"><summary>SEO deste post</summary><div class="field"><span>Título no Google</span><input name="seoTitle" value="${esc(p.seo?.title || "")}" placeholder="${esc(p.title)}"></div><div class="field"><span>Descrição</span><textarea name="seoDesc" rows="2" maxlength="170">${esc(p.seo?.description || "")}</textarea></div></details>
      </form>${preview(S(), `page.html?preview=1#blog/${encodeURIComponent(p.slug)}`)}</div>`;
    devices(v);
    const f = $("#fpo", v);
    let tm;
    f.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(() => { const x = new FormData(f); quiet(c, (s2) => { const P = s2.posts.find((y) => y.id === id);
      Object.assign(P, { title: x.get("title"), date: new Date(x.get("date") + "T12:00").getTime(), excerpt: x.get("excerpt"), body: x.get("body"), cover: { gid: x.get("cover"), pid: null }, seo: { title: x.get("seoTitle"), description: x.get("seoDesc") } }); }); }, 250); });
    f.slug.onchange = () => { quiet(c, (s2) => { const P = s2.posts.find((y) => y.id === id); P.slug = uniqueSlug(s2, slugify(f.slug.value), id); }); f.slug.value = S().posts.find((y) => y.id === id).slug; $("#pv", v).src = `page.html?preview=1#blog/${encodeURIComponent(f.slug.value)}`; };
    $("#pubpo", v).onclick = () => c.setViewHook(null) || O.update((s2) => { const P = s2.posts.find((y) => y.id === id); P.published = !P.published; O.log(`Post “${P.title}” ${P.published ? "publicado" : "despublicado"}`, "info"); });
    $("#dlpo", v).onclick = () => { if (confirm("Excluir este post?")) { O.update((s2) => (s2.posts = s2.posts.filter((y) => y.id !== id))); c.go("#/site/blog"); } };
  };

  /* ---------- depoimentos ---------- */
  function depoimentos(box, c, s) {
    const { O, $, $$, esc } = c;
    box.innerHTML = `<div class="card"><div class="list" id="tl">${s.site.testimonials.map((t, i) => `<div class="tst"><div class="grow form">
        <textarea data-t="text" data-i="${i}" rows="2">${esc(t.text)}</textarea><div class="row2"><input data-t="author" data-i="${i}" value="${esc(t.author)}" placeholder="Nome"><input data-t="role" data-i="${i}" value="${esc(t.role || "")}" placeholder="Trabalho (ex.: Casamento)"></div></div>
        <button class="icon-btn" data-rm="${i}" aria-label="Excluir">×</button></div>`).join("") || '<p class="mono">Nenhum depoimento.</p>'}</div>
      <div class="acts" style="display:flex;gap:8px;margin-top:14px"><button class="btn btn--sm" id="nt">+ Depoimento</button><span class="mono" style="align-self:center;text-transform:none">Dica: peça o depoimento logo depois da entrega, pelo WhatsApp.</span></div></div>`;
    let tm;
    $$("[data-t]", box).forEach((el) => (el.oninput = () => { clearTimeout(tm); tm = setTimeout(() => quiet(c, (s2) => (s2.site.testimonials[+el.dataset.i][el.dataset.t] = el.value)), 250); }));
    $$("[data-rm]", box).forEach((b) => (b.onclick = () => { c.setViewHook(null); O.update((s2) => s2.site.testimonials.splice(+b.dataset.rm, 1)); }));
    $("#nt", box).onclick = () => { c.setViewHook(null); O.update((s2) => s2.site.testimonials.push({ id: O.uid("t_"), text: "", author: "", role: "" })); };
  }

  /* ---------- SEO ---------- */
  function seo(box, c, s) {
    const { $, esc } = c, x = s.site.seo;
    const checks = () => {
      const q = S2().site.seo, pages = S2().pages, posts = S2().posts;
      const items = [
        [q.title.length >= 20 && q.title.length <= 65, `Título com ${q.title.length} caracteres (ideal: 20–65)`],
        [q.description.length >= 70 && q.description.length <= 160, `Descrição com ${q.description.length} caracteres (ideal: 70–160)`],
        [/s[aã]o paulo|sp\b|\bcidade\b/i.test(q.title + q.description), "Cidade citada no título ou descrição (ajuda na busca local)"],
        [pages.every((p) => p.seo?.description), `${pages.filter((p) => !p.seo?.description).length} página(s) sem descrição própria`],
        [posts.filter((p) => p.published).length >= 2, `${posts.filter((p) => p.published).length} posts publicados (conteúdo novo ajuda o Google)`],
        [true, "Dados estruturados (schema.org) gerados automaticamente para o estúdio e os posts"],
        [true, "Site responsivo, com títulos e descrições por página"],
      ];
      return items.map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${ok ? "✓" : "!"} ${esc(t)}</li>`).join("");
    };
    const S2 = c.S;
    box.innerHTML = `<div class="grid g2"><form class="card form" id="fseo">
        <div class="field"><span>Título do site no Google</span><input name="title" value="${esc(x.title)}" maxlength="80"></div>
        <div class="field"><span>Descrição</span><textarea name="description" rows="3" maxlength="200">${esc(x.description)}</textarea></div>
        <div class="field"><span>Palavras-chave</span><input name="keywords" value="${esc(x.keywords || "")}"><small>Separe por vírgula. Use o que seus clientes digitam: “fotógrafo de casamento em SP”.</small></div>
        <div class="field"><span>Imagem de compartilhamento (URL)</span><input name="image" value="${esc(x.image || "")}" placeholder="https://…"><small>Aparece quando o link é enviado no WhatsApp/Instagram.</small></div>
        <div class="serp" id="serp"></div>
      </form>
      <div class="card"><h3>Checklist</h3><ul class="seo-check" id="chk">${checks()}</ul>
        <p class="mono" style="text-transform:none;margin-top:12px">Com hospedagem e domínio próprio, vale gerar um sitemap e cadastrar o site no Google Search Console.</p></div></div>`;
    const f = $("#fseo", box);
    const serp = () => { const q = S2().site.seo; $("#serp", box).innerHTML = `<small>${esc(location.host)}</small><b>${esc(q.title)}</b><p>${esc(q.description)}</p>`; $("#chk", box).innerHTML = checks(); };
    serp();
    f.oninput = () => { const v2 = Object.fromEntries(new FormData(f)); quiet(c, (s2) => Object.assign(s2.site.seo, v2)); serp(); };
  }
})();
