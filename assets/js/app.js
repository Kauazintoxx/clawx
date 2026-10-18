/* ==========================================================================
   OFFBEAT — painel do fotógrafo
   Roteamento por hash · cada view é uma função que devolve HTML e liga eventos.
   ========================================================================== */
(function () {
  const O = Offbeat;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const S = () => O.get();
  const esc = O.esc, money = O.money;
  const main = $("#main"), app = $("#app");

  const STAGES = [
    ["lead", "Novo contato"], ["orcamento", "Orçamento enviado"], ["negociacao", "Negociação"],
    ["contrato", "Contrato"], ["fechado", "Fechado"], ["perdido", "Perdido"],
  ];
  const GSTATUS = { enviada: ["Enviada", ""], "em-selecao": ["Em seleção", "warn"], finalizada: ["Finalizada", "ok"], entregue: ["Entregue", "blue"], publicada: ["À venda", "red"] };
  const KINDS = { ensaio: "Ensaio", reuniao: "Reunião", evento: "Evento", entrega: "Entrega" };

  /* ---------- helpers de imagem (no painel o fotógrafo vê sem marca) ---------- */
  const urlCache = new Map();
  function thumb(p, w = 480) {
    if (p.src) return Promise.resolve(p.src.replace(/\/(\d+)\/(\d+)$/, (m, W, H) => `/${w}/${Math.round((w * H) / W)}`));
    if (urlCache.has(p.id)) return Promise.resolve(urlCache.get(p.id));
    return O.getBlob(p.id).then((b) => { if (!b) return ""; const u = URL.createObjectURL(b); urlCache.set(p.id, u); return u; });
  }
  function hydrate(root = main) {
    $$("img[data-pid]", root).forEach((img) => {
      const g = S().galleries.find((x) => x.id === img.dataset.gid);
      const p = g?.photos.find((x) => x.id === img.dataset.pid);
      if (p) thumb(p, +img.dataset.w || 480).then((u) => { if (u) img.src = u; });
    });
  }
  const imgTag = (g, pid, w = 480, extra = "") => pid ? `<img data-gid="${g.id}" data-pid="${pid}" data-w="${w}" alt="" loading="lazy" ${extra}>` : "";

  /* ---------- roteador ---------- */
  const routes = {
    "": overview, galerias: galleries, g: galleryDetail, crm, agenda,
    albuns: albums, album: albumEditor, ajustes: settings,
  };
  let cleanup = [], viewHook = null;
  function route() {
    const [, name = "", arg] = location.hash.replace(/^#\/?/, "#").split(/[#/]/);
    const fn = routes[name] || overview;
    cleanup.forEach((f) => f()); cleanup = []; viewHook = null;
    app.classList.remove("nav-open");
    const navKey = { "": "overview", g: "galerias", album: "albuns", projeto: "projetos", pagina: "site", post: "site" }[name] ?? name;
    $$("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.r === navKey));
    main.innerHTML = '<div class="view"></div>';
    const v = main.firstChild;
    fn(v, arg);
    hydrate(v);
    badges();
    main.focus({ preventScroll: true });
    scrollTo(0, 0);
  }
  addEventListener("hashchange", route);
  const go = (h) => { if (location.hash === h) route(); else location.hash = h; };

  function badges() {
    const sel = S().galleries.filter((g) => g.status === "finalizada" && !g.delivered).length;
    const pay = S().payments.filter((p) => p.status === "informado").length;
    $("#navSel").hidden = !sel; $("#navSel").textContent = sel;
    $("#navPay").hidden = !pay; $("#navPay").textContent = pay;
    const late = S().tasks.filter((k) => !k.done && k.due < Date.now()).length;
    $("#navTask").hidden = !late; $("#navTask").textContent = late;
  }

  // mudanças vindas da galeria do cliente (outra aba) → atualiza a view sem perder o lugar
  let lastAct = S().activity[0]?.t || 0;
  O.onChange((_, { remote } = {}) => {
    const a = S().activity[0];
    if (a && a.t > lastAct) {
      lastAct = a.t;
      if (remote && !document.hidden) O.toast(a.msg, a.kind === "pay" ? "ok" : "");
    }
    if (viewHook) { badges(); return viewHook(); }
    if (!$("#ov").hidden || !$("#drawer").hidden) { badges(); return; }
    const y = scrollY; route(); scrollTo(0, y);
  });

  /* ---------- modal / drawer ---------- */
  function dialog(html, { wide } = {}) {
    const ov = $("#ov"), d = $("#dlg");
    d.className = "dlg" + (wide ? " wide" : "");
    d.innerHTML = `<button class="x" data-x aria-label="Fechar">×</button>` + html;
    ov.hidden = false;
    $$("[data-x]", d).forEach((b) => b.addEventListener("click", closeDialog));
    setTimeout(() => (d.querySelector("input, select, textarea") || d.querySelector("button:not(.x)"))?.focus(), 50);
    hydrate(d);
    return d;
  }
  function closeDialog() { $("#ov").hidden = true; }
  $("#ov").addEventListener("click", (e) => { if (e.target.id === "ov") closeDialog(); });
  function drawer(html) {
    const d = $("#drawer"); d.innerHTML = `<button class="x" data-x aria-label="Fechar">×</button>` + html; d.hidden = false;
    $$("[data-x]", d).forEach((b) => b.addEventListener("click", closeDrawer));
    hydrate(d);
    return d;
  }
  function closeDrawer() { $("#drawer").hidden = true; }
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (!$("#cmdk").hidden) return closeCmd(); if (!$("#ov").hidden) return closeDialog(); if (!$("#drawer").hidden) return closeDrawer(); }
  });
  const formData = (f) => Object.fromEntries(new FormData(f).entries());

  /* ======================================================================
     01 · VISÃO GERAL
     ====================================================================== */
  function overview(v) {
    const s = S(), t = Date.now();
    const hour = new Date().getHours();
    const hi = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
    const monthKey = (d) => { const x = new Date(d); return x.getFullYear() * 12 + x.getMonth(); };
    const nowK = monthKey(t);
    const months = Array.from({ length: 6 }, (_, i) => nowK - 5 + i);
    const rev = months.map((k) => s.payments.filter((p) => p.status === "pago" && monthKey(p.createdAt) === k).reduce((a, p) => a + p.amount, 0));
    const maxRev = Math.max(...rev, 1);
    const cur = rev[5], prev = rev[4] || 1, delta = Math.round(((cur - prev) / prev) * 100);
    const pending = s.payments.filter((p) => p.status !== "pago").reduce((a, p) => a + p.amount, 0);
    const inSel = s.galleries.filter((g) => g.status === "em-selecao").length;
    const pipe = s.leads.filter((l) => !["fechado", "perdido"].includes(l.stage)).reduce((a, l) => a + l.value, 0);
    const upcoming = s.events.filter((e) => e.date > t - O.DAY).sort((a, b) => a.date - b.date).slice(0, 5);
    const attention = [];
    s.galleries.forEach((g) => {
      const days = Math.ceil((g.expiresAt - t) / O.DAY);
      if (g.status === "finalizada" && !g.delivered) attention.push({ g, msg: `Seleção pronta — ${g.selection.length} fotos para editar`, cta: "Ver seleção", href: `#/g/${g.id}/selecao` });
      else if (g.type === "selecao" && g.status !== "finalizada" && days <= 14) attention.push({ g, msg: `Expira em ${days} dia${days > 1 ? "s" : ""} · ${g.selection.length}/${g.limit} escolhidas`, cta: "Lembrar cliente", wa: true });
    });
    const mon = (k) => new Date(Math.floor(k / 12), k % 12, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");

    v.innerHTML = `
      <header class="vh">
        <div><p class="mono">${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        <h1>${hi}, ${esc(s.studio.name)}. <em>Em ritmo.</em></h1></div>
        <div class="acts"><button class="btn btn--ghost" data-act="lead">+ Cliente</button><button class="btn btn--red" data-act="gallery">+ Nova galeria</button></div>
      </header>
      <section class="grid g4" style="margin-bottom:16px">
        <div class="card kpi"><span class="mono">Recebido no mês</span><b>${money(cur)}</b><small><span class="${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}%</span> vs. mês anterior</small>${spark(rev)}</div>
        <div class="card kpi"><span class="mono">A receber</span><b>${money(pending)}</b><small>${s.payments.filter((p) => p.status !== "pago").length} cobranças abertas</small></div>
        <div class="card kpi"><span class="mono">Galerias em seleção</span><b data-count="${inSel}">${inSel}</b><small>${s.galleries.reduce((a, g) => a + (g.views || 0), 0)} visualizações no total</small></div>
        <div class="card kpi"><span class="mono">Funil em aberto</span><b>${money(pipe)}</b><small>${s.leads.filter((l) => !["fechado", "perdido"].includes(l.stage)).length} negociações</small></div>
      </section>
      <section class="grid g21" style="margin-bottom:16px">
        <div class="card card--chart"><h2>Receita · últimos 6 meses <span class="mono">Pix recebido</span></h2>
          <div class="bars">${rev.map((r, i) => `<div class="bar ${i === 5 ? "cur" : ""}"><i style="height:${Math.max(3, (r / maxRev) * 100)}%;--d:${i * 0.07}s" data-v="${money(r)}"></i><span>${mon(months[i])}</span></div>`).join("")}</div>
        </div>
        <div class="card"><h2>Atividade <span class="live">AO VIVO</span></h2>
          <ul class="feed" id="feed">${s.activity.slice(0, 7).map((a, i) => `<li data-k="${a.kind}" class="${i === 0 && t - a.t < 8000 ? "new" : ""}"><span>${esc(a.msg)}</span><time>${O.ago(a.t)}</time></li>`).join("")}</ul>
        </div>
      </section>
      <section class="grid g2">
        <div class="card"><h2>Pede atenção <span class="mono">${attention.length}</span></h2>
          <div class="list">${attention.length ? attention.map((a) => `<div>${imgTag(a.g, a.g.cover, 120, 'style="width:52px;height:40px;object-fit:cover;border-radius:6px"')}<div class="grow"><strong>${esc(a.g.title)}</strong><small>${esc(a.msg)}</small></div>${a.wa ? `<a class="btn btn--sm btn--ghost" target="_blank" rel="noopener" href="${waLink(a.g.clientPhone, `Oi ${a.g.client.split(" ")[0]}! Passando para lembrar da sua galeria “${a.g.title}”: ${O.galleryLink(a.g)} — ela expira em breve 📸`)}">${a.cta}</a>` : `<a class="btn btn--sm" href="${a.href}">${a.cta}</a>`}</div>`).join("") : '<p class="mono">Tudo em dia.</p>'}</div>
        </div>
        <div class="card"><h2>Próximos compromissos <a class="mono" href="#/agenda">Agenda →</a></h2>
          <div class="list">${upcoming.map((e) => { const d = new Date(e.date); return `<div><span class="date">${d.getDate()}<small>${d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</small></span><div class="grow"><strong>${esc(e.title)}</strong><small>${KINDS[e.kind] || "Evento"} · ${d.toLocaleDateString("pt-BR", { weekday: "long" })}</small></div><span class="chip">${O.ago(e.date).replace("há", "em").replace("agora", "hoje")}</span></div>`; }).join("") || '<p class="mono">Nada marcado.</p>'}</div>
        </div>
      </section>`;
    const day0 = new Date(); day0.setHours(23, 59, 59, 999);
    const tasks = s.tasks.filter((k) => !k.done && k.due <= day0.getTime()).sort((a, b) => a.due - b.due).slice(0, 6);
    const dues = s.projects.flatMap((pj) => pj.stages.filter((st) => !st.done).slice(0, 1).map((st) => ({ pj, st }))).sort((a, b) => a.st.due - b.st.due).slice(0, 5);
    const bills = s.expenses.filter((e) => e.status !== "pago" && e.dueDate < t + 7 * O.DAY).sort((a, b) => a.dueDate - b.dueDate).slice(0, 5);
    v.insertAdjacentHTML("beforeend", `<section class="grid g3" style="margin-top:16px">
      <div class="card"><h2>Tarefas de hoje <a class="mono" href="#/tarefas">Tarefas →</a></h2><div class="list">${tasks.map((k) => `<div><input type="checkbox" data-done="${k.id}" aria-label="Concluir"><div class="grow"><strong>${esc(k.title)}</strong><small>${k.due < t - O.DAY ? '<span style="color:var(--safelight)">atrasada</span> · ' : ""}${O.date(k.due)}</small></div><span class="chip ${k.priority === "alta" ? "red" : ""}">${k.priority}</span></div>`).join("") || '<p class="mono">Nada para hoje.</p>'}</div></div>
      <div class="card"><h2>Prazos de entrega <a class="mono" href="#/projetos">Projetos →</a></h2><div class="list">${dues.map(({ pj, st }) => `<div><div class="grow"><a href="#/projeto/${pj.id}"><strong>${esc(pj.title)}</strong></a><small>${esc(st.name)} · ${O.date(st.due)}</small></div><span class="chip ${st.due < t ? "red" : st.due < t + 3 * O.DAY ? "warn" : ""}">${st.due < t ? "atrasado" : O.ago(st.due).replace("há", "em")}</span></div>`).join("") || '<p class="mono">Sem prazos.</p>'}</div></div>
      <div class="card"><h2>Contas a vencer <a class="mono" href="#/financeiro/pagar">Pagar →</a></h2><div class="list">${bills.map((e) => `<div><div class="grow"><strong>${esc(e.desc)}</strong><small>${e.dueDate < t ? '<span style="color:var(--safelight)">vencida</span> · ' : ""}${O.date(e.dueDate)}</small></div><b class="mono">${money(e.amount)}</b></div>`).join("") || '<p class="mono">Nada vencendo.</p>'}</div></div>
    </section>`);
    $$("[data-done]", v).forEach((c) => (c.onchange = () => O.update((s2) => { const k = s2.tasks.find((x) => x.id === c.dataset.done); k.done = true; k.doneAt = Date.now(); O.log(`Tarefa concluída: ${k.title}`, "info"); })));
    v.querySelector("[data-act=gallery]").onclick = () => newGallery();
    v.querySelector("[data-act=lead]").onclick = () => newLead();
    Motion.counters(v);
  }
  function spark(vals) {
    const max = Math.max(...vals, 1), pts = vals.map((x, i) => `${(i / (vals.length - 1)) * 80},${30 - (x / max) * 26}`).join(" ");
    return `<svg class="spark" viewBox="0 0 80 32" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--safelight)" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }
  const waLink = (phone, text) => `https://wa.me/${String(phone || "").replace(/\D/g, "").replace(/^(?!55)/, "55")}?text=${encodeURIComponent(text)}`;

  /* ======================================================================
     02 · GALERIAS
     ====================================================================== */
  let gq = "", gf = "todas";
  function galleries(v) {
    const s = S();
    const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const FILTERS = [["todas", "Todas"], ["selecao", "Seleção"], ["venda", "Venda"], ["em-selecao", "Em seleção"], ["finalizada", "Finalizadas"], ["entregue", "Entregues"], ["expirando", "Expirando"]];
    const match = (g) => {
      if (gq && !norm(`${g.title} ${g.subtitle} ${g.client} ${(g.clients || []).map((c) => c.name).join(" ")}`).includes(norm(gq))) return false;
      if (gf === "todas") return true;
      if (gf === "selecao" || gf === "venda") return g.type === gf;
      if (gf === "entregue") return g.delivered;
      if (gf === "expirando") return g.expiresAt - Date.now() < 7 * O.DAY && g.expiresAt > Date.now();
      return g.status === gf && !g.delivered;
    };
    const list = s.galleries.filter(match);
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${list.length} de ${s.galleries.length} galerias</p><h1>Galerias <em>&</em> provas</h1></div>
        <div class="acts"><button class="btn btn--red" id="ng">+ Nova galeria</button></div></header>
      <div class="filters"><label class="search-in"><span aria-hidden="true">⌕</span><input id="gq" type="search" placeholder="Buscar por título ou cliente" value="${esc(gq)}"></label>
        <div class="chips">${FILTERS.map(([k, n]) => `<button data-gf="${k}" class="${gf === k ? "on" : ""}">${n}</button>`).join("")}</div></div>
      <div class="gcards">
        ${list.map((g) => {
          const [lbl, cls] = GSTATUS[g.delivered ? "entregue" : g.status] || ["—", ""];
          const pct = g.type === "venda" ? Math.min(100, ((g.orders || []).length / 20) * 100) : g.limit ? Math.min(100, (g.selection.length / g.limit) * 100) : (g.status === "finalizada" ? 100 : 40);
          return `<a class="gcard" href="#/g/${g.id}">
            <div class="gcard__img">${imgTag(g, g.cover || g.photos[0]?.id, 600)}<span class="chip ${cls}">${lbl}</span></div>
            <div class="gcard__body"><strong>${esc(g.title)}</strong><small>${esc(g.subtitle || "")}</small>
              <small class="mono" style="margin-top:6px">${g.photos.length} itens · ${g.type === "venda" ? `${(g.orders || []).length} pedidos` : g.limit ? `${g.selection.length}/${g.limit} escolhidas` : `${g.selection.length} escolhidas · livre`}${g.multi ? ` · ${g.clients.length} clientes` : ""} · ${g.views || 0} visitas</small>
              <div class="prog"><i style="width:${pct}%"></i></div></div></a>`;
        }).join("")}
        <a class="gnew" href="javascript:void 0" id="ng2"><div><span>+</span>Nova galeria</div></a>
      </div>`;
    $("#ng", v).onclick = $("#ng2", v).onclick = () => newGallery();
    const q = $("#gq", v);
    q.oninput = () => { gq = q.value; const pos = q.selectionStart; route(); const n = $("#gq"); n.focus(); n.setSelectionRange(pos, pos); };
    $$("[data-gf]", v).forEach((b) => (b.onclick = () => { gf = b.dataset.gf; route(); }));
  }

  function newGallery(pre = {}) {
    const leads = S().leads;
    const d = dialog(`<p class="mono">Nova galeria</p><h2>Montar uma prova</h2>
      <form class="form" id="fg">
        <div class="field"><span>Tipo</span><select name="type"><option value="selecao">Seleção do cliente (pacote + extras)</option><option value="venda">Venda de fotos (evento / público)</option></select></div>
        <div class="field"><span>Título</span><input name="title" required placeholder="Marina & Teo" value="${esc(pre.title || "")}"></div>
        <div class="field"><span>Subtítulo</span><input name="subtitle" placeholder="Casamento · Fazenda Vila Rica" value="${esc(pre.subtitle || "")}"></div>
        <div class="field"><span>Vincular a cliente do CRM</span><select name="leadId"><option value="">— nenhum —</option>${leads.map((l) => `<option value="${l.id}" ${pre.leadId === l.id ? "selected" : ""}>${esc(l.name)} · ${esc(l.type)}</option>`).join("")}</select></div>
        <div class="field sel-only"><span>Modo de seleção</span><select name="mode"><option value="pacote">Quantidade definida (pacote + extras pagos)</option><option value="livre">Seleção livre (sem limite, sem extras)</option></select></div>
        <div class="row2 sel-only pack-only"><div class="field"><span>Fotos no pacote</span><input name="limit" type="number" min="1" value="30"></div><div class="field"><span>Preço da foto extra (R$)</span><input name="extraPrice" type="number" min="0" step="0.01" value="25"></div></div>
        <label class="switch sel-only">Galeria compartilhada entre vários clientes<small>Cada pessoa entra com o próprio nome e faz a própria seleção (ex.: noivos e pais, formandos, família)</small><input type="checkbox" name="multi"></label>
        <div class="field multi-only" hidden><span>Clientes (um por linha: nome, e-mail)</span><textarea name="clients" rows="3" placeholder="Marina Duarte, marina@email.com&#10;Mãe da noiva, mae@email.com"></textarea></div>
        <div class="row2 sale-only" hidden><div class="field"><span>Preço da foto (R$)</span><input name="unitPrice" type="number" min="0" step="0.01" value="19.90"></div><div class="field"><span>Pacote 5 fotos (R$)</span><input name="pack5" type="number" min="0" step="0.01" value="79.90"></div></div>
        <div class="row2"><div class="field"><span>Senha (opcional)</span><input name="password" placeholder="ex: 2026"></div><div class="field"><span>Expira em (dias)</span><input name="days" type="number" min="1" value="15"></div></div>
        <div class="acts"><button class="btn btn--red" type="submit">Criar e enviar fotos →</button></div>
      </form>`);
    const f = $("#fg", d);
    const sync = () => {
      const sale = f.type.value === "venda";
      $$(".sel-only", f).forEach((el) => (el.hidden = sale)); $(".sale-only", f).hidden = !sale;
      $(".pack-only", f).hidden = sale || f.mode.value === "livre"; $(".multi-only", f).hidden = sale || !f.multi.checked;
    };
    f.type.onchange = f.mode.onchange = f.multi.onchange = sync;
    f.leadId.onchange = () => { const l = leads.find((x) => x.id === f.leadId.value); if (l && !f.title.value) f.title.value = l.name; if (l && !f.subtitle.value) f.subtitle.value = l.type; };
    f.onsubmit = (e) => {
      e.preventDefault();
      const x = formData(f), l = leads.find((y) => y.id === x.leadId), id = O.uid("g_");
      const free = x.type === "selecao" && x.mode === "livre";
      const clients = x.type === "selecao" && x.multi ? (x.clients || "").split("\n").map((ln) => ln.split(",").map((t) => t.trim())).filter(([n]) => n).map(([name, email]) => ({ id: O.uid("c_"), name, email: email || "" })) : [];
      O.update((s) => {
        s.galleries.unshift({
          id, type: x.type, title: x.title, subtitle: x.subtitle, client: l?.name || (x.type === "venda" ? "Público do evento" : x.title),
          clientEmail: l?.email || "", clientPhone: l?.phone || "", createdAt: Date.now(), expiresAt: Date.now() + (+x.days || 15) * O.DAY,
          password: x.password, limit: free ? 0 : +x.limit || 0, extraPrice: free ? 0 : +x.extraPrice || 0, unitPrice: +x.unitPrice || 0,
          free, multi: clients.length > 0, clients, selections: {}, clientState: {},
          packages: x.type === "venda" && +x.pack5 ? [{ qty: 5, price: +x.pack5 }] : [], watermark: `${s.studio.brand} · ${s.studio.name}`.toUpperCase(),
          allowDownload: false, status: x.type === "venda" ? "publicada" : "enviada", photos: [], cover: null, selection: [], comments: {}, views: 0, orders: [], leadId: x.leadId || null,
        });
        O.log(`Galeria “${x.title}” criada`, "info");
      });
      closeDialog(); go(`#/g/${id}`);
    };
  }

  /* ---------- detalhe da galeria ---------- */
  function galleryDetail(v, gid) {
    const sub = location.hash.split("/")[3] || "fotos";
    const g = S().galleries.find((x) => x.id === gid);
    if (!g) { v.innerHTML = `<a class="back" href="#/galerias">← Galerias</a><h1>Galeria não encontrada</h1>`; return; }
    const link = O.galleryLink(g);
    const sale = g.type === "venda";
    const [lbl, cls] = GSTATUS[g.delivered ? "entregue" : g.status] || ["—", ""];
    const tabs = [["fotos", "Fotos", g.photos.length], sale ? ["pedidos", "Pedidos", (g.orders || []).length] : ["selecao", "Seleção", g.selection.length], ["config", "Configurações", ""]];
    v.innerHTML = `
      <a class="back" href="#/galerias">← Galerias</a>
      <header class="vh"><div><p class="mono">${esc(g.subtitle || "")} · <span class="chip ${cls}">${lbl}</span></p><h1>${esc(g.title)}</h1></div>
        <div class="acts"><a class="btn btn--ghost" href="${link}" target="_blank" rel="noopener">Ver como cliente ↗</a></div></header>
      <div class="share"><span class="mono" style="color:rgba(239,234,224,.5)">Link</span><code>${esc(link)}</code>
        <button class="btn btn--sm" id="cp">Copiar</button>
        <button class="btn btn--sm" id="qr">QR</button>
        ${g.clientPhone ? `<a class="btn btn--sm btn--red" target="_blank" rel="noopener" href="${waLink(g.clientPhone, `Oi ${g.client.split(" ")[0]}! Suas fotos chegaram 📸 Escolha as suas aqui: ${link}${g.password ? ` (senha: ${g.password})` : ""}`)}">Enviar no WhatsApp</a>` : ""}
      </div>
      <nav class="subtabs">${tabs.map(([k, n, c]) => `<button data-t="${k}" class="${k === sub ? "on" : ""}">${n}${c !== "" ? `<i>${c}</i>` : ""}</button>`).join("")}</nav>
      <div id="gsub"></div>`;
    $("#cp", v).onclick = () => O.copy(link, "Link da galeria copiado.");
    $("#qr", v).onclick = () => dialog(`<p class="mono">QR da galeria</p><h2>${esc(g.title)}</h2><div style="width:240px;padding:12px;background:#fff;border-radius:12px;color:#0f0e0c">${Pix.qrSVG(link, { fg: "#0f0e0c" })}</div><p class="mono" style="margin-top:12px;text-transform:none">Imprima no convite ou no cartão de agradecimento.</p>`);
    $$(".subtabs button", v).forEach((b) => (b.onclick = () => { history.replaceState(null, "", `#/g/${g.id}/${b.dataset.t}`); $$(".subtabs button", v).forEach((x) => x.classList.toggle("on", x === b)); renderSub(b.dataset.t); }));
    const box = $("#gsub", v);
    function renderSub(t) {
      const gg = S().galleries.find((x) => x.id === gid);
      ({ fotos: subPhotos, selecao: subSelection, pedidos: subOrders, config: subConfig }[t] || subPhotos)(box, gg);
      hydrate(box);
    }
    renderSub(sub);
  }

  function subPhotos(box, g) {
    const sel = g.selection;
    box.innerHTML = `
      <label class="drop" id="drop"><input type="file" id="files" accept="image/*,video/*" multiple hidden>
        <span style="font:400 2rem/1 var(--f-display)">↥</span><strong>Arraste fotos e vídeos aqui ou clique para enviar</strong>
        <span class="mono">O original em alta fica guardado para a entrega · o cliente vê uma prévia protegida · ${g.photos.length} itens</span></label>
      <div class="upbar" id="upbar" hidden><i></i></div>
      <div class="pgrid">${g.photos.map((p, i) => {
        const k = sel.indexOf(p.id);
        return `<div class="pthumb ${k >= 0 ? "sel" : ""}">${imgTag(g, p.id, 300)}<span class="n">${p.video ? "▶ vídeo · " : ""}${String(i + 1).padStart(3, "0")}</span>
          ${k >= 0 ? `<span class="tag ${k >= g.limit && g.type !== "venda" ? "ex" : ""}">${k >= g.limit && g.type !== "venda" ? "extra" : "♥"}</span>` : ""}
          ${g.cover === p.id ? '<span class="tag cv">capa</span>' : ""}${g.comments[p.id] ? '<span class="com" title="' + esc(g.comments[p.id]) + '">💬</span>' : ""}
          <div class="ops"><button data-cover="${p.id}" title="Usar como capa">★</button><button data-del="${p.id}" title="Remover">×</button></div></div>`;
      }).join("")}</div>`;
    const input = $("#files", box), drop = $("#drop", box);
    input.onchange = () => upload(g, [...input.files]);
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (e) => upload(g, [...e.dataTransfer.files].filter((f) => /^(image|video)\//.test(f.type))));
    $$("[data-cover]", box).forEach((b) => (b.onclick = () => { O.update((s) => (s.galleries.find((x) => x.id === g.id).cover = b.dataset.cover)); O.toast("Capa atualizada.", "ok"); }));
    $$("[data-del]", box).forEach((b) => (b.onclick = () => {
      if (!confirm("Remover esta foto da galeria?")) return;
      const pid = b.dataset.del;
      O.update((s) => { const x = s.galleries.find((y) => y.id === g.id); x.photos = x.photos.filter((p) => p.id !== pid); x.selection = x.selection.filter((p) => p !== pid); if (x.cover === pid) x.cover = x.photos[0]?.id || null; });
      O.delBlob(pid); O.delBlob("orig:" + pid); O.delBlob("vid:" + pid);
    }));
  }

  async function upload(g, files) {
    if (!files.length) return;
    const bar = $("#upbar"); bar.hidden = false;
    let done = 0;
    const added = [];
    for (const f of files) {
      try {
        const id = O.uid("p_");
        if (f.type.startsWith("video/")) {
          const { blob, w, h } = await videoPoster(f);
          await O.putBlob(id, blob); await O.putBlob("vid:" + id, f);
          added.push({ id, w, h, name: f.name, video: true, size: f.size });
        } else {
          const { blob, w, h } = await O.downscale(f);
          await O.putBlob(id, blob); await O.putBlob("orig:" + id, f); // original intacto para a entrega em alta
          added.push({ id, w, h, name: f.name, size: f.size });
        }
      } catch (e) { O.toast(`Falhou: ${f.name}`); }
      done++; bar.firstElementChild.style.width = (done / files.length) * 100 + "%";
    }
    O.update((s) => { const x = s.galleries.find((y) => y.id === g.id); x.photos.push(...added); if (!x.cover && added[0]) x.cover = added[0].id; O.log(`${added.length} fotos enviadas para “${x.title}”`, "info"); });
    O.toast(`${added.length} foto${added.length > 1 ? "s" : ""} adicionada${added.length > 1 ? "s" : ""}.`, "ok");
  }

  /** Capa do vídeo: quadro de 1s, para a grade e a proteção funcionarem igual às fotos. */
  function videoPoster(file) {
    return new Promise((res, rej) => {
      const v = document.createElement("video"), url = URL.createObjectURL(file);
      v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
      const fail = () => { URL.revokeObjectURL(url); rej(new Error("vídeo inválido")); };
      v.onerror = fail;
      v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); };
      v.onseeked = () => {
        const k = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight)), w = Math.round(v.videoWidth * k) || 1600, h = Math.round(v.videoHeight * k) || 900;
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const x = c.getContext("2d"); x.drawImage(v, 0, 0, w, h);
        x.fillStyle = "rgba(0,0,0,.35)"; x.beginPath(); x.arc(w / 2, h / 2, h / 8, 0, 7); x.fill();
        x.fillStyle = "#fff"; x.beginPath(); x.moveTo(w / 2 - h / 24, h / 2 - h / 16); x.lineTo(w / 2 + h / 16, h / 2); x.lineTo(w / 2 - h / 24, h / 2 + h / 16); x.fill();
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? res({ blob: b, w, h }) : rej(new Error("capa"))), "image/jpeg", 0.85);
      };
      setTimeout(fail, 15000);
    });
  }

  function subSelection(box, g) {
    const sel = g.selection.map((pid) => ({ p: g.photos.find((x) => x.id === pid), i: g.photos.findIndex((x) => x.id === pid) })).filter((x) => x.p);
    const ex = g.limit ? Math.max(0, sel.length - g.limit) : 0;
    const names = sel.map((x) => x.p.name.replace(/\.[^.]+$/, ""));
    const multiHTML = g.multi ? `<div class="card" style="margin-bottom:16px"><h3>Seleção por cliente <span class="mono">${g.clients.length} pessoas</span></h3><div class="list">${g.clients.map((c) => {
      const cs = g.clientState[c.id] || {}, n = (g.selections[c.id] || []).length;
      return `<div><span class="av-s">${esc(c.name[0] || "?")}</span><div class="grow"><strong>${esc(c.name)}</strong><small>${esc(c.email || "sem e-mail")} · ${n} escolhidas</small></div><span class="chip ${cs.status === "finalizada" ? "ok" : n ? "warn" : ""}">${cs.status === "finalizada" ? "finalizou" : n ? "escolhendo" : "não abriu"}</span></div>`;
    }).join("")}</div><p class="mono" style="text-transform:none;margin-top:10px">A exportação abaixo junta as escolhas de todos, sem repetir.</p></div>` : "";
    const lr = names.join(" OR ");
    box.innerHTML = `
      <section class="grid g4" style="margin-bottom:16px">
        <div class="card kpi"><span class="mono">Escolhidas</span><b>${sel.length}</b><small>${g.limit ? `pacote de ${g.limit}` : "seleção livre"}</small></div>
        <div class="card kpi"><span class="mono">Extras</span><b>${ex}</b><small>${money(ex * g.extraPrice)}</small></div>
        <div class="card kpi"><span class="mono">Comentários</span><b>${Object.keys(g.comments).length}</b><small>pedidos de ajuste</small></div>
        <div class="card kpi"><span class="mono">Status</span><b style="font-size:1.6rem">${g.status === "finalizada" ? "Finalizada" : "Em aberto"}</b><small>${g.finalizedAt ? O.date(g.finalizedAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "cliente ainda escolhendo"}</small></div>
      </section>
      ${multiHTML}
      <div class="card" style="margin-bottom:16px"><h3>Exportar para edição</h3>
        <div class="field"><span>Filtro para o Lightroom (busca por nome de arquivo)</span><textarea readonly rows="2" id="lr">${esc(lr)}</textarea></div>
        <div class="acts" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="btn btn--sm" id="cpLr" ${sel.length ? "" : "disabled"}>Copiar filtro do Lightroom</button>
          <button class="btn btn--sm btn--ghost" id="csv" ${sel.length ? "" : "disabled"}>Baixar CSV</button>
          ${g.status === "finalizada" ? `<button class="btn btn--sm btn--ghost" id="reopen">Reabrir seleção</button>` : ""}
          <button class="btn btn--sm ${g.delivered ? "btn--ghost" : "btn--red"}" id="deliver" ${sel.length ? "" : "disabled"}>${g.delivered ? "Revogar download" : "Liberar download das escolhidas"}</button>
        </div></div>
      ${Object.keys(g.comments).length ? `<div class="card" style="margin-bottom:16px"><h3>Comentários do cliente</h3><div class="list">${Object.entries(g.comments).map(([pid, c]) => { const i = g.photos.findIndex((p) => p.id === pid); return i < 0 ? "" : `<div>${imgTag(g, pid, 120, 'style="width:56px;height:42px;object-fit:cover;border-radius:6px"')}<div class="grow"><strong>Foto ${String(i + 1).padStart(3, "0")}</strong><small>${esc(c)}</small></div></div>`; }).join("")}</div></div>` : ""}
      <div class="pgrid">${sel.map((x, k) => `<div class="pthumb">${imgTag(g, x.p.id, 300)}<span class="n">${String(x.i + 1).padStart(3, "0")} · ${esc(x.p.name)}</span>${g.limit && k >= g.limit ? '<span class="tag ex">extra</span>' : ""}</div>`).join("") || '<p class="mono">Nenhuma foto escolhida ainda.</p>'}</div>`;
    $("#cpLr", box).onclick = () => O.copy(lr, "Filtro copiado — cole na busca de texto do Lightroom.");
    $("#csv", box).onclick = () => {
      const who = (pid) => g.multi ? g.clients.filter((c) => (g.selections[c.id] || []).includes(pid)).map((c) => c.name).join(" + ") : g.client;
      const rows = [["ordem", "arquivo", "extra", "escolhida_por", "comentario"], ...sel.map((x, k) => [k + 1, x.p.name, g.limit && k >= g.limit ? "sim" : "nao", who(x.p.id), g.comments[x.p.id] || ""])];
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = `selecao-${g.id}.csv`; a.click();
    };
    $("#reopen", box)?.addEventListener("click", () => O.update((s) => { const x = s.galleries.find((y) => y.id === g.id); x.status = "em-selecao"; x.finalizedAt = null; Object.values(x.clientState || {}).forEach((c) => { c.status = "em-selecao"; c.finalizedAt = null; }); O.log(`Seleção de “${x.title}” reaberta`, "info"); }));
    $("#deliver", box).onclick = () => O.update((s) => { const x = s.galleries.find((y) => y.id === g.id); x.delivered = !x.delivered; O.log(x.delivered ? `Download liberado em “${x.title}”` : `Download revogado em “${x.title}”`, "info"); });
  }

  function subOrders(box, g) {
    const orders = g.orders || [];
    const total = orders.filter((o) => o.status === "pago").reduce((a, o) => a + o.total, 0);
    box.innerHTML = `
      <section class="grid g3" style="margin-bottom:16px">
        <div class="card kpi"><span class="mono">Pedidos</span><b>${orders.length}</b></div>
        <div class="card kpi"><span class="mono">Vendido (pago)</span><b>${money(total)}</b></div>
        <div class="card kpi"><span class="mono">Ticket médio</span><b>${money(orders.length ? orders.reduce((a, o) => a + o.total, 0) / orders.length : 0)}</b></div>
      </section>
      <div class="card table-wrap"><table class="table"><thead><tr><th>Comprador</th><th>Fotos</th><th>Data</th><th>Status</th><th class="r">Total</th><th></th></tr></thead><tbody>
      ${orders.map((o) => `<tr><td>${esc(o.email)}</td><td>${o.items.length}</td><td>${O.date(o.createdAt)}</td><td><span class="chip ${o.status === "pago" ? "ok" : "warn"}">${o.status}</span></td><td class="r">${money(o.total)}</td><td class="r">${o.status !== "pago" ? `<button class="btn btn--sm" data-ok="${o.id}">Confirmar Pix</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="6" class="mono">Nenhum pedido ainda — compartilhe o link com o público do evento.</td></tr>'}
      </tbody></table></div>`;
    $$("[data-ok]", box).forEach((b) => (b.onclick = () => O.update((s) => {
      const x = s.galleries.find((y) => y.id === g.id), o = x.orders.find((y) => y.id === b.dataset.ok); o.status = "pago";
      const p = s.payments.find((y) => y.orderId === o.id); if (p) p.status = "pago";
      O.log(`Pix confirmado — pedido de ${o.email} (${money(o.total)})`, "pay");
    })));
  }

  function subConfig(box, g) {
    const sale = g.type === "venda";
    box.innerHTML = `<div class="grid g2"><form class="card form" id="cfg">
      <div class="field"><span>Título</span><input name="title" value="${esc(g.title)}"></div>
      <div class="field"><span>Subtítulo</span><input name="subtitle" value="${esc(g.subtitle || "")}"></div>
      <div class="row2"><div class="field"><span>Cliente</span><input name="client" value="${esc(g.client)}"></div><div class="field"><span>E-mail (vai na marca d'água)</span><input name="clientEmail" type="email" value="${esc(g.clientEmail || "")}"></div></div>
      <div class="field"><span>WhatsApp do cliente</span><input name="clientPhone" value="${esc(g.clientPhone || "")}"></div>
      ${sale ? `<div class="field"><span>Preço por foto (R$)</span><input name="unitPrice" type="number" step="0.01" value="${g.unitPrice}"></div>`
        : `<div class="row2"><div class="field"><span>Fotos no pacote</span><input name="limit" type="number" value="${g.limit}"></div><div class="field"><span>Foto extra (R$)</span><input name="extraPrice" type="number" step="0.01" value="${g.extraPrice}"></div></div>`}
      <div class="row2"><div class="field"><span>Senha</span><input name="password" value="${esc(g.password || "")}" placeholder="sem senha"></div><div class="field"><span>Expira em</span><input name="expires" type="date" value="${new Date(g.expiresAt).toISOString().slice(0, 10)}"></div></div>
      <div class="field"><span>Marca d'água</span><input name="watermark" value="${esc(g.watermark)}"><small>Além do texto, cada cópia leva o e-mail do cliente e a data.</small></div>
      <div class="acts"><button class="btn btn--red">Salvar</button></div></form>
      <div class="card"><h3>Proteção ativa</h3>
        <div class="list">
          <div><span>🖼️</span><div class="grow"><strong>Fotos só em canvas</strong><small>O arquivo nunca aparece como imagem na página, então “salvar imagem como” não funciona.</small></div></div>
          <div><span>🔎</span><div class="grow"><strong>Resolução de tela</strong><small>O cliente vê no máximo 1400px. O original fica com você.</small></div></div>
          <div><span>🧬</span><div class="grow"><strong>Marca d'água forense</strong><small>Leva e-mail do cliente e a data. Se a foto vazar, você sabe de onde veio.</small></div></div>
          <div><span>⌨️</span><div class="grow"><strong>Atalhos bloqueados</strong><small>Botão direito, arrastar, Ctrl+S/P/U e F12. A tela escurece em print ou ferramenta de recorte.</small></div></div>
        </div>
        <p class="mono" style="text-transform:none;margin-top:12px">Nenhum site impede 100% uma foto do celular apontada para a tela. O que funciona é tornar a cópia trabalhosa e rastreável.</p>
        <hr style="border:0;border-top:1px solid var(--bd);margin:18px 0">
        <button class="btn btn--ghost btn--sm" id="delG" style="--fg:var(--safelight)">Excluir galeria</button>
      </div></div>`;
    $("#cfg", box).onsubmit = (e) => {
      e.preventDefault(); const x = formData(e.target);
      O.update((s) => { const y = s.galleries.find((z) => z.id === g.id);
        Object.assign(y, { title: x.title, subtitle: x.subtitle, client: x.client, clientEmail: x.clientEmail, clientPhone: x.clientPhone, password: x.password, watermark: x.watermark, expiresAt: new Date(x.expires + "T23:59").getTime() });
        if (sale) y.unitPrice = +x.unitPrice; else { y.limit = +x.limit; y.extraPrice = +x.extraPrice; } });
      O.toast("Galeria salva.", "ok");
    };
    $("#delG", box).onclick = () => {
      if (!confirm(`Excluir “${g.title}” e todas as fotos? Não dá para desfazer.`)) return;
      g.photos.forEach((p) => !p.src && O.delBlob(p.id));
      O.update((s) => { s.galleries = s.galleries.filter((y) => y.id !== g.id); O.log(`Galeria “${g.title}” excluída`, "info"); });
      go("#/galerias");
    };
  }

  /* ======================================================================
     03 · CRM
     ====================================================================== */
  function crm(v) {
    const s = S();
    const won = s.leads.filter((l) => l.stage === "fechado"), lost = s.leads.filter((l) => l.stage === "perdido");
    const conv = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
    const byType = {};
    won.forEach((l) => (byType[l.type] = (byType[l.type] || 0) + l.value));
    const types = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const maxT = types[0]?.[1] || 1;
    const bySrc = {};
    s.leads.forEach((l) => (bySrc[l.source] = (bySrc[l.source] || 0) + 1));
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${s.leads.length} contatos · conversão ${conv}%</p><h1>Clientes <em>no compasso</em></h1></div>
        <div class="acts"><button class="btn btn--red" id="nl">+ Novo cliente</button></div></header>
      <div class="kanban" id="kb">${STAGES.map(([k, n]) => {
        const ls = s.leads.filter((l) => l.stage === k);
        return `<section class="col" data-stage="${k}"><header><b>${n}</b><small>${ls.length} · ${money(ls.reduce((a, l) => a + l.value, 0))}</small></header>
          ${ls.map((l) => `<article class="lead" draggable="true" data-id="${l.id}" tabindex="0"><strong>${esc(l.name)}</strong>
            <small><span>${esc(l.type)}</span><span>${money(l.value)}</span></small>
            <div class="tags"><span class="chip">${esc(l.source)}</span>${l.contract ? `<span class="chip ${l.contract.signedAt ? "ok" : "warn"}">${l.contract.signedAt ? "assinado" : "contrato"}</span>` : ""}${s.galleries.some((g) => g.leadId === l.id) ? '<span class="chip blue">galeria</span>' : ""}</div></article>`).join("")}
        </section>`;
      }).join("")}</div>
      <section class="grid g2" style="margin-top:16px">
        <div class="card"><h3>Receita fechada por tipo de trabalho</h3><div class="hbars">${types.map(([t, val]) => `<div><span>${esc(t)}</span><em><i style="width:${(val / maxT) * 100}%"></i></em><b class="mono">${money(val)}</b></div>`).join("") || '<p class="mono">Feche negócios para ver a análise.</p>'}</div></div>
        <div class="card"><h3>De onde vêm os contatos</h3><div class="hbars">${Object.entries(bySrc).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<div><span>${esc(t)}</span><em><i style="width:${(n / s.leads.length) * 100}%"></i></em><b class="mono">${n}</b></div>`).join("")}</div></div>
      </section>`;
    $("#nl", v).onclick = () => newLead();
    // arrastar e soltar entre etapas
    let dragId = null;
    $$(".lead", v).forEach((el) => {
      el.addEventListener("dragstart", (e) => { dragId = el.dataset.id; el.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; });
      el.addEventListener("dragend", () => el.classList.remove("dragging"));
      el.addEventListener("click", () => leadDrawer(el.dataset.id));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") leadDrawer(el.dataset.id); });
    });
    $$(".col", v).forEach((col) => {
      col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
      col.addEventListener("dragleave", () => col.classList.remove("over"));
      col.addEventListener("drop", (e) => {
        e.preventDefault(); col.classList.remove("over");
        if (!dragId) return;
        const stage = col.dataset.stage;
        moveLead(dragId, stage);
        requestAnimationFrame(() => $(`.lead[data-id="${dragId}"]`)?.classList.add("drop-in"));
      });
    });
  }
  function moveLead(id, stage) {
    O.update((s) => { const l = s.leads.find((x) => x.id === id); if (l.stage === stage) return; l.stage = stage; O.log(`${l.name} → ${STAGES.find((x) => x[0] === stage)[1]}`, stage === "fechado" ? "pay" : "info"); });
    if (stage === "fechado") O.toast("Negócio fechado! 🎉 Crie a galeria e a cobrança pelo card.", "ok");
  }

  function newLead() {
    const d = dialog(`<p class="mono">Novo cliente</p><h2>Quem chegou?</h2><form class="form" id="fl">
      <div class="field"><span>Nome</span><input name="name" required></div>
      <div class="row2"><div class="field"><span>WhatsApp</span><input name="phone" inputmode="tel" placeholder="11 99999-0000"></div><div class="field"><span>E-mail</span><input name="email" type="email"></div></div>
      <div class="row2"><div class="field"><span>Tipo de trabalho</span><select name="type">${["Casamento", "Ensaio", "Gestante", "Newborn", "15 anos", "Corporativo", "Evento"].map((t) => `<option>${t}</option>`).join("")}</select></div><div class="field"><span>Valor estimado (R$)</span><input name="value" type="number" min="0" value="2500"></div></div>
      <div class="row2"><div class="field"><span>Data do trabalho</span><input name="eventDate" type="date"></div><div class="field"><span>Origem</span><select name="source">${["Instagram", "Indicação", "Google", "Site", "WhatsApp"].map((t) => `<option>${t}</option>`).join("")}</select></div></div>
      <div class="field"><span>Notas</span><textarea name="notes" rows="2"></textarea></div>
      <div class="acts"><button class="btn btn--red">Adicionar ao funil</button></div></form>`);
    $("#fl", d).onsubmit = (e) => {
      e.preventDefault(); const x = formData(e.target), id = O.uid("l_");
      O.update((s) => { s.leads.unshift({ id, name: x.name, phone: x.phone, email: x.email, type: x.type, value: +x.value || 0, eventDate: x.eventDate ? new Date(x.eventDate + "T12:00").getTime() : Date.now() + 30 * O.DAY, source: x.source, notes: x.notes, stage: "lead", createdAt: Date.now(), contract: null }); O.log(`Novo contato: ${x.name} (${x.type})`, "info"); });
      closeDialog(); if (!location.hash.startsWith("#/crm")) go("#/crm"); setTimeout(() => leadDrawer(id), 50);
    };
  }

  function leadDrawer(id) {
    const s = S(), l = s.leads.find((x) => x.id === id); if (!l) return;
    const gals = s.galleries.filter((g) => g.leadId === id), pays = s.payments.filter((p) => p.leadId === id), evs = s.events.filter((e) => e.leadId === id);
    const d = drawer(`
      <p class="mono">${esc(l.type)} · desde ${O.date(l.createdAt)}</p><h2>${esc(l.name)}</h2>
      <p style="color:var(--muted);margin:0">${money(l.value)} · ${new Date(l.eventDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
      <div class="qa">
        <a target="_blank" rel="noopener" href="${waLink(l.phone, `Oi ${l.name.split(" ")[0]}! Aqui é ${s.studio.name}, da ${s.studio.brand}.`)}"><i>💬</i>WhatsApp</a>
        <button data-a="proposal"><i>📄</i>Nova proposta</button>
        <button data-a="contract"><i>✍️</i>${l.contract ? "Ver contrato" : "Gerar contrato"}</button>
        <button data-a="charge"><i>⚡</i>Cobrança Pix</button>
        <button data-a="gallery"><i>🖼️</i>${gals.length ? "Nova galeria" : "Criar galeria"}</button>
        <button data-a="event"><i>📅</i>Agendar</button>
        <button data-a="project"><i>🎞️</i>Criar projeto</button>
        <button data-a="task"><i>✓</i>Nova tarefa</button>
      </div>
      <form class="form" id="fe">
        <div class="field"><span>Etapa</span><select name="stage">${STAGES.map(([k, n]) => `<option value="${k}" ${k === l.stage ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        <div class="row2"><div class="field"><span>Valor (R$)</span><input name="value" type="number" value="${l.value}"></div><div class="field"><span>Data</span><input name="eventDate" type="date" value="${new Date(l.eventDate).toISOString().slice(0, 10)}"></div></div>
        <div class="row2"><div class="field"><span>WhatsApp</span><input name="phone" value="${esc(l.phone)}"></div><div class="field"><span>E-mail</span><input name="email" value="${esc(l.email)}"></div></div>
        <div class="field"><span>Notas</span><textarea name="notes" rows="3">${esc(l.notes || "")}</textarea></div>
        <div class="acts" style="display:flex;gap:8px"><button class="btn btn--sm">Salvar</button><button type="button" class="btn btn--sm btn--ghost" id="delL" style="--fg:var(--safelight)">Excluir</button></div>
      </form>
      <h3 style="margin:28px 0 8px;font-size:.95rem">Histórico</h3>
      <div class="list">
        ${l.contract ? `<div><span>✍️</span><div class="grow"><strong>${esc(l.contract.title)}</strong><small>${l.contract.signedAt ? `Assinado em ${O.date(l.contract.signedAt)}` : "Aguardando assinatura no portal do cliente"}</small></div></div>` : ""}
        ${gals.map((g) => `<div><span>🖼️</span><div class="grow"><a href="#/g/${g.id}"><strong>${esc(g.title)}</strong></a><small>${(GSTATUS[g.status] || [""])[0]} · ${g.selection.length} escolhidas</small></div></div>`).join("")}
        ${pays.map((p) => `<div><span>⚡</span><div class="grow"><strong>${esc(p.desc)}</strong><small>${money(p.amount)} · ${p.status}</small></div></div>`).join("")}
        ${s.proposals.filter((p) => p.leadId === id).map((p) => `<div><span>📄</span><div class="grow"><strong>${esc(p.title)}</strong><small>Proposta · ${p.status}${p.viewedAt ? ` · vista ${O.ago(p.viewedAt)}` : ""}</small></div></div>`).join("")}
        ${s.projects.filter((p) => p.leadId === id).map((p) => `<div><span>🎞️</span><div class="grow"><a href="#/projeto/${p.id}"><strong>${esc(p.title)}</strong></a><small>Projeto · ${p.stages.filter((x) => x.done).length}/${p.stages.length} etapas</small></div></div>`).join("")}
        ${s.tasks.filter((k) => k.leadId === id && !k.done).map((k) => `<div><span>✓</span><div class="grow"><strong>${esc(k.title)}</strong><small>Tarefa · ${O.date(k.due)}</small></div></div>`).join("")}
        ${evs.map((e) => `<div><span>📅</span><div class="grow"><strong>${esc(e.title)}</strong><small>${O.date(e.date, { day: "2-digit", month: "long" })}</small></div></div>`).join("")}
        ${!l.contract && !gals.length && !pays.length && !evs.length ? '<p class="mono">Sem histórico ainda.</p>' : ""}
      </div>`);
    $("#fe", d).onsubmit = (e) => {
      e.preventDefault(); const x = formData(e.target);
      O.update((s2) => { const L = s2.leads.find((y) => y.id === id); Object.assign(L, { stage: x.stage, value: +x.value, phone: x.phone, email: x.email, notes: x.notes, eventDate: new Date(x.eventDate + "T12:00").getTime() }); });
      O.toast("Cliente salvo.", "ok"); closeDrawer();
    };
    $("#delL", d).onclick = () => { if (confirm(`Excluir ${l.name}?`)) { O.update((s2) => (s2.leads = s2.leads.filter((y) => y.id !== id))); closeDrawer(); } };
    $$("[data-a]", d).forEach((b) => (b.onclick = () => {
      const a = b.dataset.a;
      if (a === "proposal") { closeDrawer(); window.OBActions.proposal(l.id); }
      if (a === "project") { closeDrawer(); window.OBActions.project(l.id); }
      if (a === "task") { closeDrawer(); window.OBActions.task({ leadId: l.id }); }
      if (a === "contract") contractDialog(l.id);
      if (a === "charge") { closeDrawer(); newCharge({ leadId: l.id, desc: `Sinal 30% — ${l.type} ${l.name}`, amount: Math.round(l.value * 0.3) }); }
      if (a === "gallery") { closeDrawer(); newGallery({ leadId: l.id, title: l.name, subtitle: l.type }); }
      if (a === "event") { closeDrawer(); newEvent(new Date(l.eventDate), l.id, `${l.type} — ${l.name}`); }
    }));
  }

  function contractDialog(id) {
    let l = S().leads.find((x) => x.id === id);
    if (!l.contract) {
      O.update((s) => { const L = s.leads.find((x) => x.id === id); L.contract = O.contractTemplate(L, s.studio); if (["lead", "orcamento", "negociacao"].includes(L.stage)) L.stage = "contrato"; O.log(`Contrato gerado para ${L.name}`, "contract"); });
      l = S().leads.find((x) => x.id === id);
    }
    const c = l.contract, g = S().galleries.find((x) => x.leadId === id);
    const d = dialog(`<p class="mono">${c.signedAt ? "Assinado" : "Aguardando assinatura"}</p><h2>Contrato</h2>
      <form class="form" id="fc"><div class="field"><span>Título</span><input name="title" value="${esc(c.title)}"></div>
      ${c.clauses.map((k, i) => `<div class="field"><span>${i + 1}. ${esc(k.h)}</span><textarea name="c${i}" rows="2" ${c.signedAt ? "readonly" : ""}>${esc(k.p)}</textarea></div>`).join("")}
      <div class="acts">${c.signedAt ? "" : '<button class="btn btn--sm">Salvar alterações</button>'}
        <button type="button" class="btn btn--sm btn--ghost" id="pc">Imprimir / PDF</button>
        ${g ? `<button type="button" class="btn btn--sm btn--red" id="sc">Copiar link do portal</button>` : '<span class="mono" style="align-self:center;text-transform:none">Crie uma galeria para o cliente assinar pelo portal.</span>'}
      </div></form>`, { wide: true });
    $("#fc", d).onsubmit = (e) => { e.preventDefault(); const x = formData(e.target); O.update((s) => { const L = s.leads.find((y) => y.id === id); L.contract.title = x.title; L.contract.clauses.forEach((k, i) => (k.p = x["c" + i])); }); O.toast("Contrato salvo.", "ok"); };
    $("#pc", d).onclick = () => printContract(S().leads.find((x) => x.id === id));
    $("#sc", d)?.addEventListener("click", () => O.copy(O.galleryLink(g), "Link do portal copiado — o cliente assina na aba “Contrato”."));
  }

  /* ---------- impressão ---------- */
  function printHTML(html) {
    const p = $("#print"); p.innerHTML = `<div class="pdoc">${html}</div>`;
    document.body.classList.add("printing");
    const done = () => { document.body.classList.remove("printing"); removeEventListener("afterprint", done); };
    addEventListener("afterprint", done);
    setTimeout(() => print(), 60);
  }
  function docHead(title, kicker) {
    const st = S().studio;
    return `<div class="hero"><div><p class="mono">${esc(kicker)}</p><h1>${esc(title)}</h1></div><div class="brand">${esc(st.brand)}<i>.</i><br><span class="mono">${esc(st.name)} · ${esc(st.email)}</span></div></div>`;
  }
  function printProposal(l) {
    const st = S().studio, entry = Math.round(l.value * 0.3);
    printHTML(`${docHead(`Proposta para ${l.name}`, `Proposta · ${new Date().toLocaleDateString("pt-BR")} · válida por 10 dias`)}
      <p>Oi, ${esc(l.name.split(" ")[0])}! Obrigado por pensar na ${esc(st.brand)} para o seu ${esc(l.type.toLowerCase())}. Abaixo está o que preparei para a data de <strong>${new Date(l.eventDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</strong>.</p>
      <table><tr><td>Cobertura fotográfica — ${esc(l.type)}</td><td style="text-align:right">${money(l.value)}</td></tr>
      <tr><td>Galeria online protegida para seleção, com portal do cliente</td><td style="text-align:right">incluso</td></tr>
      <tr><td>Tratamento das fotos selecionadas · entrega em até 30 dias</td><td style="text-align:right">incluso</td></tr>
      <tr class="tot"><td>Total</td><td style="text-align:right">${money(l.value)}</td></tr></table>
      <h3>Pagamento</h3><p>Sinal de 30% (${money(entry)}) para reservar a data, via Pix. O saldo pode ser parcelado até 7 dias antes do trabalho.</p>
      <h3>Próximos passos</h3><p>1. Você aprova esta proposta · 2. Eu envio o contrato para assinatura digital · 3. O sinal via Pix garante a sua data.</p>
      <div class="sig"><div>${esc(st.name)} — ${esc(st.brand)}</div><div>${esc(l.name)}</div></div>`);
    O.update((s) => { const L = s.leads.find((x) => x.id === l.id); if (L.stage === "lead") L.stage = "orcamento"; O.log(`Proposta gerada para ${L.name}`, "info"); });
  }
  function printContract(l) {
    const c = l.contract, st = S().studio;
    printHTML(`${docHead(c.title, `Contrato · ${O.date(c.createdAt, { day: "2-digit", month: "long", year: "numeric" })}`)}
      <p><strong>Contratante:</strong> ${esc(l.name)} · ${esc(l.email)} · <strong>Contratado:</strong> ${esc(st.name)} (${esc(st.brand)})</p>
      ${c.clauses.map((k, i) => `<h3>${i + 1}. ${esc(k.h)}</h3><p>${esc(k.p)}</p>`).join("")}
      <div class="sig"><div>${esc(st.name)} — Contratado</div><div>${c.signature ? `<img src="${c.signature}" alt="">` : ""}${esc(c.signerName || l.name)} — Contratante${c.signedAt ? ` · assinado em ${new Date(c.signedAt).toLocaleString("pt-BR")}` : ""}</div></div>`);
  }

  /* ======================================================================
     04 · AGENDA
     ====================================================================== */
  let calRef = new Date();
  function agenda(v) {
    const s = S(), y = calRef.getFullYear(), m = calRef.getMonth();
    const first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay());
    const today = new Date().toDateString();
    const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    const evOn = (d) => s.events.filter((e) => new Date(e.date).toDateString() === d.toDateString());
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${s.events.length} compromissos</p><h1>${first.toLocaleDateString("pt-BR", { month: "long" })} <em>${y}</em></h1></div>
        <div class="acts"><button class="btn btn--ghost btn--sm" id="pm">←</button><button class="btn btn--ghost btn--sm" id="tm">Hoje</button><button class="btn btn--ghost btn--sm" id="nm">→</button><button class="btn btn--red" id="ne">+ Compromisso</button></div></header>
      <div class="card"><div class="cal">${["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => `<div class="dow">${d}</div>`).join("")}
        ${days.map((d) => `<div class="day ${d.getMonth() !== m ? "out" : ""} ${d.toDateString() === today ? "today" : ""}" data-d="${d.getTime()}"><span>${d.getDate()}</span>${evOn(d).map((e) => `<span class="ev ${e.kind}" title="${esc(e.title)}" data-e="${e.id}">${esc(e.title)}</span>`).join("")}</div>`).join("")}
      </div></div>`;
    $("#pm", v).onclick = () => { calRef = new Date(y, m - 1, 1); route(); };
    $("#nm", v).onclick = () => { calRef = new Date(y, m + 1, 1); route(); };
    $("#tm", v).onclick = () => { calRef = new Date(); route(); };
    $("#ne", v).onclick = () => newEvent(new Date());
    $$(".day", v).forEach((el) => (el.onclick = (e) => {
      const evId = e.target.dataset.e;
      if (evId) return eventDialog(evId);
      newEvent(new Date(+el.dataset.d));
    }));
  }
  function newEvent(date, leadId = "", title = "") {
    const d = dialog(`<p class="mono">Agenda</p><h2>Novo compromisso</h2><form class="form" id="fev">
      <div class="field"><span>Título</span><input name="title" required value="${esc(title)}"></div>
      <div class="row2"><div class="field"><span>Data</span><input name="date" type="date" value="${new Date(date.getTime() - date.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)}"></div><div class="field"><span>Hora</span><input name="time" type="time" value="10:00"></div></div>
      <div class="row2"><div class="field"><span>Tipo</span><select name="kind">${Object.entries(KINDS).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></div>
      <div class="field"><span>Cliente</span><select name="leadId"><option value="">—</option>${S().leads.map((l) => `<option value="${l.id}" ${l.id === leadId ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div></div>
      <div class="acts"><button class="btn btn--red">Agendar</button></div></form>`);
    $("#fev", d).onsubmit = (e) => {
      e.preventDefault(); const x = formData(e.target);
      O.update((s) => { s.events.push({ id: O.uid("e_"), title: x.title, date: new Date(`${x.date}T${x.time || "10:00"}`).getTime(), kind: x.kind, leadId: x.leadId || null }); O.log(`Agendado: ${x.title}`, "info"); });
      closeDialog(); O.toast("Compromisso agendado.", "ok");
    };
  }
  function eventDialog(id) {
    const e = S().events.find((x) => x.id === id), l = S().leads.find((x) => x.id === e.leadId);
    const start = new Date(e.date), end = new Date(e.date + 2 * 3600e3);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${fmt(start)}/${fmt(end)}`;
    const d = dialog(`<p class="mono">${KINDS[e.kind] || "Evento"}</p><h2>${esc(e.title)}</h2>
      <p>${start.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}${l ? ` · ${esc(l.name)}` : ""}</p>
      <div class="acts"><a class="btn btn--sm" target="_blank" rel="noopener" href="${gcal}">Adicionar ao Google Agenda</a>${l ? `<a class="btn btn--sm btn--ghost" target="_blank" rel="noopener" href="${waLink(l.phone, `Oi ${l.name.split(" ")[0]}! Confirmando: ${e.title}, ${start.toLocaleString("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}.`)}">Confirmar por WhatsApp</a>` : ""}<button class="btn btn--sm btn--ghost" id="de" style="--fg:var(--safelight)">Excluir</button></div>`);
    $("#de", d).onclick = () => { O.update((s) => (s.events = s.events.filter((x) => x.id !== id))); closeDialog(); };
  }

  /* ======================================================================
     05 · FINANCEIRO
     ====================================================================== */
  function newCharge(pre = {}) {
    const d = dialog(`<p class="mono">Cobrança</p><h2>Gerar link de pagamento</h2><form class="form" id="fch">
      <div class="field"><span>Descrição</span><input name="desc" required value="${esc(pre.desc || "")}" placeholder="Sinal 30% — Casamento"></div>
      <div class="row2"><div class="field"><span>Valor (R$)</span><input name="amount" type="number" step="0.01" min="0.01" required value="${pre.amount || ""}"></div>
      <div class="field"><span>Vencimento</span><input name="due" type="date" value="${new Date(Date.now() + 3 * O.DAY).toISOString().slice(0, 10)}"></div></div>
      <div class="row2"><div class="field"><span>Categoria</span><select name="category"><option>Serviço</option><option>Sinal</option><option>Saldo</option><option>Fotos extras</option><option>Álbum</option><option>Outros</option></select></div>
      <div class="field"><span>Cliente</span><select name="leadId"><option value="">—</option>${S().leads.map((l) => `<option value="${l.id}" ${l.id === pre.leadId ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div></div>
      <div class="acts"><button class="btn btn--red">Gerar Pix</button></div></form>`);
    $("#fch", d).onsubmit = (e) => {
      e.preventDefault(); const x = formData(e.target);
      const p = { id: O.uid("pay_"), desc: x.desc, amount: +x.amount, status: "pendente", method: "pix", createdAt: Date.now(), dueDate: new Date((x.due || new Date().toISOString().slice(0, 10)) + "T18:00").getTime(), category: x.category, leadId: x.leadId || null };
      O.update((s) => { s.payments.unshift(p); O.log(`Cobrança criada: ${x.desc} · ${money(p.amount)}`, "info"); });
      pixDialog(p);
    };
  }
  function pixDialog(p) {
    const st = S().studio, l = S().leads.find((x) => x.id === p.leadId);
    const code = Pix.payload({ key: st.pixKey, name: st.pixName, city: st.city, amount: p.amount, txid: p.id.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) });
    const link = O.payLink(p);
    const d = dialog(`<p class="mono">${esc(p.desc)}</p><h2>${money(p.amount)}</h2>
      <div class="pixgrid"><div class="qr">${Pix.qrSVG(code, { fg: "#0f0e0c" })}</div>
      <div class="field"><span>Pix copia e cola</span><textarea readonly>${code}</textarea></div></div>
      <div class="field" style="margin-top:14px"><span>Página de pagamento</span><input readonly value="${esc(link)}"></div>
      <div class="acts"><button class="btn btn--sm" id="c1">Copiar Pix</button><button class="btn btn--sm btn--ghost" id="c2">Copiar link</button>
      ${l ? `<a class="btn btn--sm btn--red" target="_blank" rel="noopener" href="${waLink(l.phone, `Oi ${l.name.split(" ")[0]}! Segue o link para pagamento (${p.desc}, ${money(p.amount)}): ${link}`)}">Enviar no WhatsApp</a>` : ""}</div>`);
    $("#c1", d).onclick = () => O.copy(code, "Pix copiado.");
    $("#c2", d).onclick = () => O.copy(link, "Link de pagamento copiado.");
  }

  /* ======================================================================
     06 · ÁLBUNS
     ====================================================================== */
  function albums(v) {
    const s = S();
    v.innerHTML = `<header class="vh"><div><p class="mono">${s.albums.length} projetos</p><h1>Álbuns <em>& lâminas</em></h1></div>
      <div class="acts"><button class="btn btn--red" id="na">+ Novo álbum</button></div></header>
      <div class="gcards">${s.albums.map((a) => { const g = s.galleries.find((x) => x.id === a.galleryId); const first = a.spreads.flatMap((sp) => sp.slots).find(Boolean);
        const AST = { rascunho: ["rascunho", ""], enviado: ["com o cliente", "warn"], ajustes: ["pediu ajustes", "red"], aprovado: ["aprovado", "ok"] }[a.status] || ["rascunho", ""];
        return `<a class="gcard" href="#/album/${a.id}"><div class="gcard__img">${g ? imgTag(g, first || g.cover, 600) : ""}<span class="chip ${AST[1]}">${AST[0]} · ${a.spreads.length} lâminas</span></div><div class="gcard__body"><strong>${esc(a.title)}</strong><small>${esc(g?.title || "")} · ${a.size}</small></div></a>`; }).join("")}
      <a class="gnew" href="javascript:void 0" id="na2"><div><span>+</span>Novo álbum</div></a></div>`;
    $("#na", v).onclick = $("#na2", v).onclick = () => {
      const opts = s.galleries.filter((g) => g.type === "selecao");
      const d = dialog(`<p class="mono">Diagramação</p><h2>Novo álbum</h2><form class="form" id="fa">
        <div class="field"><span>Título</span><input name="title" required placeholder="Álbum Marina & Teo"></div>
        <div class="row2"><div class="field"><span>Galeria de origem</span><select name="galleryId">${opts.map((g) => `<option value="${g.id}">${esc(g.title)} (${g.selection.length} escolhidas)</option>`).join("")}</select></div>
        <div class="field"><span>Formato</span><select name="size"><option>30x30</option><option>30x40</option><option>25x25</option><option>20x30</option></select></div></div>
        <div class="field"><span>Montagem inicial</span><select name="auto"><option value="1">Diagramar automaticamente com a seleção do cliente</option><option value="">Começar em branco</option></select></div>
        <div class="acts"><button class="btn btn--red">Criar</button></div></form>`);
      $("#fa", d).onsubmit = (e) => {
        e.preventDefault(); const x = formData(e.target), id = O.uid("a_");
        const g = s.galleries.find((y) => y.id === x.galleryId);
        const spreads = [];
        if (x.auto && g) {
          const pool = [...g.selection]; const pattern = ["1", "2", "3", "2", "4", "1"]; let k = 0;
          while (pool.length) { const L = pattern[k++ % pattern.length]; spreads.push({ layout: L, slots: Array.from({ length: +L }, () => pool.shift() || null) }); }
        }
        if (!spreads.length) spreads.push({ layout: "2", slots: [null, null] });
        O.update((s2) => { s2.albums.unshift({ id, title: x.title, galleryId: x.galleryId, size: x.size, status: "rascunho", spreads }); O.log(`Álbum “${x.title}” criado (${spreads.length} lâminas)`, "info"); });
        closeDialog(); go(`#/album/${id}`);
      };
    };
  }

  let spreadIdx = 0;
  function albumEditor(v, aid) {
    const s = S(), a = s.albums.find((x) => x.id === aid);
    if (!a) { v.innerHTML = '<a class="back" href="#/albuns">← Álbuns</a><h1>Álbum não encontrado</h1>'; return; }
    const g = s.galleries.find((x) => x.id === a.galleryId);
    spreadIdx = Math.min(spreadIdx, a.spreads.length - 1);
    const sp = a.spreads[spreadIdx];
    const used = new Set(a.spreads.flatMap((x) => x.slots).filter(Boolean));
    const pool = g ? (g.selection.length ? g.selection : g.photos.map((p) => p.id)) : [];
    const layoutIcon = (L) => { const cols = { 1: "1fr", 2: "1fr 1fr", 3: "2fr 1fr 1fr", 4: "1fr 1fr 1fr 1fr" }[L]; return `<button data-l="${L}" class="${sp.layout === L ? "on" : ""}" style="grid-template-columns:${cols}" title="${L} foto(s)">${"<i></i>".repeat(+L)}</button>`; };
    v.innerHTML = `<a class="back" href="#/albuns">← Álbuns</a>
      <header class="vh"><div><p class="mono">${esc(g?.title || "")} · ${a.size} · ${a.spreads.length} lâminas</p><h1>${esc(a.title)}</h1></div>
        <div class="acts"><button class="btn btn--ghost" id="prev">▶ Folhear</button><a class="btn btn--ghost" href="${O.albumLink(a)}?modo=3d" target="_blank" rel="noopener">Ver em 3D ↗</a><button class="btn btn--ghost" id="exportA">Exportar p/ gráfica</button><button class="btn btn--red" id="sendA">${a.status === "rascunho" ? "Enviar para aprovação" : "Link de aprovação"}</button><button class="btn btn--ghost" id="addS">+ Lâmina</button></div></header>
      ${a.status !== "rascunho" ? `<div class="card" style="margin-bottom:16px"><h3>Aprovação do cliente <span class="chip ${a.status === "aprovado" ? "ok" : a.status === "ajustes" ? "red" : "warn"}">${a.status === "aprovado" ? "aprovado" : a.status === "ajustes" ? "pediu ajustes" : "aguardando"}</span></h3>
        ${a.approval ? `<p style="margin:0 0 8px">${a.status === "aprovado" ? "Aprovado" : "Ajustes pedidos"} por <strong>${esc(a.approval.name)}</strong> em ${O.date(a.approval.at, { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}${a.approval.note ? ` — “${esc(a.approval.note)}”` : ""}</p>` : ""}
        <div class="list">${Object.entries(a.comments || {}).filter(([, c]) => c).map(([i, c]) => `<div><span class="date">${+i + 1}<small>lâmina</small></span><div class="grow"><small>${esc(c)}</small></div></div>`).join("") || '<p class="mono">Sem comentários nas lâminas.</p>'}</div></div>` : ""}
      <div class="ab"><div class="ab__spreads">${a.spreads.map((x, i) => `<button data-s="${i}" class="${i === spreadIdx ? "on" : ""}">${x.slots.slice(0, 2).map((pid) => (pid && g ? imgTag(g, pid, 160) : "<i></i>")).join("")}<span>${String(i + 1).padStart(2, "0")}</span></button>`).join("")}</div>
        <div><div class="ab__stage"><div class="spread L${sp.layout}" id="spread">${sp.slots.map((pid, i) => `<div class="slot ${pid ? "" : "empty"}" data-i="${i}">${pid && g ? imgTag(g, pid, 900) + `<button data-rm="${i}" aria-label="Tirar foto">×</button>` : ""}</div>`).join("")}</div></div>
          <div class="ab__tools"><div class="layouts">${["1", "2", "3", "4"].map(layoutIcon).join("")}</div>
            <div style="display:flex;gap:8px"><span class="mono" style="align-self:center">Lâmina ${spreadIdx + 1}/${a.spreads.length}</span><button class="btn btn--sm btn--ghost" id="delS" ${a.spreads.length < 2 ? "disabled" : ""}>Excluir lâmina</button></div></div>
          <p class="mono" style="margin:0 0 8px">Arraste uma foto para o espaço · no celular, toque na foto e depois no espaço</p>
          <div class="strip" id="strip">${pool.map((pid) => (g ? imgTag(g, pid, 200, `draggable="true" data-drag="${pid}" class="${used.has(pid) ? "used" : ""}"`) : "")).join("")}</div>
        </div></div>`;
    const save = (fn) => O.update((s2) => fn(s2.albums.find((x) => x.id === aid)));
    $$("[data-s]", v).forEach((b) => (b.onclick = () => { spreadIdx = +b.dataset.s; route(); setTimeout(() => $("#spread")?.classList.add("flip"), 0); }));
    $$("[data-l]", v).forEach((b) => (b.onclick = () => save((A) => { const S2 = A.spreads[spreadIdx]; const n = +b.dataset.l; S2.layout = b.dataset.l; S2.slots = Array.from({ length: n }, (_, i) => S2.slots[i] || null); })));
    $("#addS", v).onclick = () => { save((A) => A.spreads.push({ layout: "2", slots: [null, null] })); spreadIdx = S().albums.find((x) => x.id === aid).spreads.length - 1; route(); };
    $("#delS", v).onclick = () => { save((A) => A.spreads.splice(spreadIdx, 1)); spreadIdx = Math.max(0, spreadIdx - 1); route(); };
    $$("[data-rm]", v).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); save((A) => (A.spreads[spreadIdx].slots[+b.dataset.rm] = null)); }));
    let picked = null;
    $$("[data-drag]", v).forEach((img) => {
      img.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", img.dataset.drag));
      img.addEventListener("click", () => { picked = img.dataset.drag; $$("[data-drag]", v).forEach((x) => x.classList.toggle("picked", x === img)); });
    });
    $$(".slot", v).forEach((slot) => {
      const put = (pid) => save((A) => (A.spreads[spreadIdx].slots[+slot.dataset.i] = pid));
      slot.addEventListener("dragover", (e) => { e.preventDefault(); slot.classList.add("over"); });
      slot.addEventListener("dragleave", () => slot.classList.remove("over"));
      slot.addEventListener("drop", (e) => { e.preventDefault(); slot.classList.remove("over"); const pid = e.dataTransfer.getData("text/plain"); if (pid) put(pid); });
      slot.addEventListener("click", () => { if (picked) { put(picked); picked = null; } });
    });
    $("#prev", v).onclick = () => flipbook(a, g);
    $("#sendA", v).onclick = () => {
      if (a.status === "rascunho" || a.status === "ajustes") save((A) => { A.status = "enviado"; A.sentAt = Date.now(); O.log(`Álbum “${A.title}” enviado para aprovação`, "info"); });
      const link = O.albumLink(a), phone = g?.clientPhone;
      dialog(`<p class="mono">Aprovação online</p><h2>Link do álbum</h2><div class="field"><span>O cliente folheia em 3D, comenta cada lâmina e aprova</span><input readonly value="${esc(link)}"></div>
        <div class="acts"><button class="btn btn--sm" id="cpA">Copiar link</button>${phone ? `<a class="btn btn--sm btn--red" target="_blank" rel="noopener" href="${waLink(phone, `Oi ${g.client.split(" ")[0]}! O seu álbum ficou pronto para revisão 📖 Folheie, comente e aprove aqui: ${link}`)}">Enviar no WhatsApp</a>` : ""}</div>`);
      $("#cpA").onclick = () => O.copy(link, "Link do álbum copiado.");
    };
    $("#exportA", v).onclick = () => exportAlbum(a, g);
  }
  /** Exporta as lâminas em JPEG 300 dpi com sangria, prontas para a gráfica, num ZIP. */
  async function exportAlbum(a, g) {
    const [wcm, hcm] = a.size.split("x").map(Number), DPI = 300, BLEED = 0.3; // 3 mm de sangria
    const px = (cm) => Math.round((cm / 2.54) * DPI);
    const W = px(wcm * 2 + BLEED * 2), H = px(hcm + BLEED * 2);
    const d = dialog(`<p class="mono">Exportação para gráfica</p><h2>Preparando lâminas…</h2><p>${a.spreads.length} lâminas · ${wcm * 2}×${hcm} cm abertas · 300 dpi · sangria de 3 mm · ${W}×${H} px</p><div class="upbar"><i id="exBar"></i></div>`);
    const files = [];
    try {
      for (let i = 0; i < a.spreads.length; i++) {
        const sp = a.spreads[i], c = document.createElement("canvas"); c.width = W; c.height = H;
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
        const pad = Math.round(W * 0.03), gap = Math.round(W * 0.008), n = sp.slots.length;
        const cols = { 1: [1], 2: [1, 1], 3: [2, 1, 1], 4: [1, 1, 1, 1] }[sp.layout] || [1];
        const total = cols.reduce((p, q) => p + q, 0), inner = W - pad * 2 - gap * (n - 1);
        let cx = pad;
        for (let k = 0; k < n; k++) {
          const cw = Math.round((inner * cols[k]) / total), pid = sp.slots[k];
          if (pid) {
            const ph = g.photos.find((p) => p.id === pid);
            const orig = await O.getBlob("orig:" + pid);
            const im = orig ? await new Promise((r, j) => { const m = new Image(); m.onload = () => r(m); m.onerror = j; m.src = URL.createObjectURL(orig); }) : await O.loadImage(ph);
            const ch = H - pad * 2, s2 = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
            const sw = cw / s2, sh = ch / s2, sx = (im.naturalWidth - sw) / 2, sy = (im.naturalHeight - sh) / 2;
            x.drawImage(im, sx, sy, sw, sh, cx, pad, cw, ch);
          }
          cx += cw + gap;
        }
        const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.95));
        files.push({ name: `lamina-${String(i + 1).padStart(2, "0")}.jpg`, data: blob });
        $("#exBar").style.width = ((i + 1) / a.spreads.length) * 100 + "%";
      }
      files.push({ name: "LEIA-ME.txt", data: `Álbum: ${a.title}\nFormato: ${a.size} cm (lâmina aberta ${wcm * 2}x${hcm} cm)\nResolução: 300 dpi · ${W}x${H} px\nSangria: 3 mm em cada lado · cor sRGB · JPEG qualidade 95\nLâminas: ${a.spreads.length}\nGerado pelo Estúdio Offbeat em ${new Date().toLocaleString("pt-BR")}\n` });
      Zip.save(await Zip.zip(files), `album-${a.id}-grafica.zip`);
      closeDialog(); O.toast("ZIP para a gráfica gerado.", "ok");
    } catch (e) { d.querySelector("h2").textContent = "Não foi possível exportar"; d.insertAdjacentHTML("beforeend", `<p class="mono" style="text-transform:none">Alguma foto não pôde ser lida (${esc(e.message || "erro")}).</p>`); }
  }

  function flipbook(a, g) {
    let i = 0;
    const d = dialog(`<p class="mono" id="fbN"></p><div class="ab__stage" style="padding:16px"><div id="fb"></div></div><div class="acts"><button class="btn btn--sm btn--ghost" id="fbP">←</button><button class="btn btn--sm" id="fbN2">→</button></div>`, { wide: true });
    const show = () => {
      const sp = a.spreads[i];
      $("#fb", d).innerHTML = `<div class="spread L${sp.layout} flip">${sp.slots.map((pid) => `<div class="slot ${pid ? "" : "empty"}">${pid ? imgTag(g, pid, 900) : ""}</div>`).join("")}</div>`;
      $("#fbN", d).textContent = `Lâmina ${i + 1} de ${a.spreads.length}`;
      hydrate(d);
    };
    $("#fbP", d).onclick = () => { i = (i - 1 + a.spreads.length) % a.spreads.length; show(); };
    $("#fbN2", d).onclick = () => { i = (i + 1) % a.spreads.length; show(); };
    show();
  }

  /* ======================================================================
     AJUSTES
     ====================================================================== */
  function settings(v) {
    const st = S().studio;
    v.innerHTML = `<header class="vh"><div><p class="mono">Estúdio</p><h1>Ajustes</h1></div></header>
      <div class="grid g2"><form class="card form" id="fst">
        <h3>Identidade</h3>
        <div class="row2"><div class="field"><span>Seu nome</span><input name="name" value="${esc(st.name)}"></div><div class="field"><span>Marca</span><input name="brand" value="${esc(st.brand)}"></div></div>
        <div class="row2"><div class="field"><span>E-mail</span><input name="email" value="${esc(st.email)}"></div><div class="field"><span>WhatsApp (com DDI)</span><input name="whatsapp" value="${esc(st.whatsapp)}"></div></div>
        <div class="field"><span>Instagram</span><input name="instagram" value="${esc(st.instagram)}"></div>
        <h3 style="margin-top:12px">Recebimento Pix</h3>
        <div class="field"><span>Chave Pix</span><input name="pixKey" value="${esc(st.pixKey)}"><small>CPF/CNPJ só números, e-mail, celular com +55 ou chave aleatória.</small></div>
        <div class="row2"><div class="field"><span>Nome do recebedor</span><input name="pixName" maxlength="25" value="${esc(st.pixName)}"></div><div class="field"><span>Cidade</span><input name="city" maxlength="15" value="${esc(st.city)}"></div></div>
        <div class="acts"><button class="btn btn--red">Salvar</button></div></form>
        <div class="card"><h3>Acesso ao estúdio</h3>
          <p style="color:var(--fg-2)">A senha que abre o painel. As galerias dos clientes continuam com as senhas próprias de cada uma.</p>
          <div class="acts" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px"><button class="btn btn--sm btn--ghost" id="chpw">Trocar senha de acesso</button></div>
          <h3>Dados de demonstração</h3>
          <p style="color:var(--fg-2)">Todos os dados ficam neste navegador (localStorage + IndexedDB). Para usar com clientes em outros aparelhos, ligue o back-end descrito em <code>docs/ARQUITETURA.md</code>.</p>
          <div class="acts" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn--sm btn--ghost" id="exp">Exportar backup (JSON)</button><button class="btn btn--sm btn--ghost" id="rst" style="--fg:var(--safelight)">Restaurar demonstração</button></div>
        </div></div>`;
    $("#fst", v).onsubmit = (e) => { e.preventDefault(); const x = formData(e.target); O.update((s) => Object.assign(s.studio, x)); O.toast("Ajustes salvos.", "ok"); $("#meName").textContent = x.name; };
    $("#chpw", v).onclick = () => { if (confirm("Trocar a senha? Você vai criar uma nova agora.")) { localStorage.removeItem("offbeat:pw"); sessionStorage.removeItem("offbeat:session"); location.reload(); } };
    $("#rst", v).onclick = () => { if (confirm("Apagar tudo e voltar aos dados de demonstração?")) { O.reset(); O.toast("Demonstração restaurada.", "ok"); } };
    $("#exp", v).onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(S(), null, 2)], { type: "application/json" })); a.download = "offbeat-backup.json"; a.click(); };
  }

  /* ======================================================================
     PALETA DE COMANDOS (Ctrl/⌘ + K)
     ====================================================================== */
  let cmdItems = [], cmdSel = 0;
  function commands() {
    const s = S();
    return [
      ["+ Nova galeria", "criar", () => newGallery()], ["+ Novo cliente", "criar", () => newLead()], ["+ Nova cobrança Pix", "criar", () => newCharge()], ["+ Novo compromisso", "criar", () => newEvent(new Date())],
      ["+ Nova tarefa", "criar", () => window.OBActions.task({})], ["+ Novo projeto", "criar", () => window.OBActions.project("")], ["+ Nova despesa", "criar", () => window.OBActions.expense()],
      ["Visão geral", "ir", () => go("#/")], ["Projetos", "ir", () => go("#/projetos")], ["Tarefas", "ir", () => go("#/tarefas")], ["Propostas", "ir", () => go("#/propostas")], ["Realidade aumentada", "ir", () => go("#/ar")], ["Galerias", "ir", () => go("#/galerias")], ["CRM", "ir", () => go("#/crm")], ["Agenda", "ir", () => go("#/agenda")], ["Financeiro", "ir", () => go("#/financeiro")], ["Álbuns", "ir", () => go("#/albuns")], ["Meu site", "ir", () => go("#/site")], ["Ajustes", "ir", () => go("#/ajustes")],
      ...s.galleries.map((g) => [g.title, "galeria", () => go(`#/g/${g.id}`)]),
      ...s.leads.map((l) => [l.name, "cliente", () => { go("#/crm"); setTimeout(() => leadDrawer(l.id), 80); }]),
      ["Alternar tema claro/escuro", "ação", toggleTheme],
    ];
  }
  function openCmd() { $("#cmdk").hidden = false; $("#cmdIn").value = ""; renderCmd(); $("#cmdIn").focus(); }
  function closeCmd() { $("#cmdk").hidden = true; }
  function renderCmd() {
    const q = $("#cmdIn").value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    cmdItems = commands().filter(([n, k]) => (n + " " + k).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q)).slice(0, 12);
    cmdSel = 0; paintCmd();
  }
  function paintCmd() {
    $("#cmdList").innerHTML = cmdItems.map(([n, k], i) => `<li role="option" class="${i === cmdSel ? "on" : ""}" data-i="${i}">${esc(n)}<small>${k}</small></li>`).join("") || '<li class="mono">Nada encontrado</li>';
    $$("#cmdList li[data-i]").forEach((li) => (li.onclick = () => runCmd(+li.dataset.i)));
  }
  function runCmd(i) { const c = cmdItems[i]; if (!c) return; closeCmd(); c[2](); }
  $("#cmdIn").addEventListener("input", renderCmd);
  $("#cmdIn").addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { cmdSel = Math.min(cmdItems.length - 1, cmdSel + 1); paintCmd(); e.preventDefault(); }
    if (e.key === "ArrowUp") { cmdSel = Math.max(0, cmdSel - 1); paintCmd(); e.preventDefault(); }
    if (e.key === "Enter") runCmd(cmdSel);
  });
  $("#cmdk").addEventListener("click", (e) => { if (e.target.id === "cmdk") closeCmd(); });
  addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#cmdk").hidden ? openCmd() : closeCmd(); } });
  $("#cmdBtn").onclick = openCmd; $("#cmdBtnM").onclick = openCmd;
  $("#menuBtn").onclick = () => app.classList.toggle("nav-open");

  /* ---------- tema ---------- */
  function toggleTheme() {
    const t = app.dataset.theme === "dark" ? "light" : "dark";
    app.dataset.theme = t; try { localStorage.setItem("ob-theme", t); } catch (e) {}
  }
  try { app.dataset.theme = localStorage.getItem("ob-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); } catch (e) {}
  $("#themeBtn").onclick = toggleTheme;
  $("#meName").textContent = S().studio.name;

  /* ---------- módulos (assets/js/app-*.js) recebem os utilitários do painel ---------- */
  const ctx = { O, $, $$, S, esc, money, main, dialog, closeDialog, drawer, closeDrawer, go, route, hydrate, imgTag, thumb, formData, waLink, newCharge, pixDialog, printHTML, docHead, KINDS, STAGES,
    setViewHook: (fn) => { viewHook = fn; } };
  Object.entries(window.OBViews || {}).forEach(([k, fn]) => (routes[k] = (v, a) => fn(v, a, ctx)));
  window.OBActions = window.OBActions || {};
  Object.entries(window.OBActionFactories || {}).forEach(([k, mk]) => (window.OBActions[k] = (...a) => mk(ctx)(...a)));

  /* ======================================================================
     ENTRADA — senha do dono do estúdio
     Guardada como hash (SHA-256) neste navegador. Com o back-end, troque
     por login real (ver docs/ARQUITETURA.md).
     ====================================================================== */
  const PW_KEY = "offbeat:pw", SESSION = "offbeat:session";
  async function hash(t) {
    const data = new TextEncoder().encode("offbeat·" + t);
    if (crypto.subtle) return [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))].map((b) => b.toString(16).padStart(2, "0")).join("");
    let h = 2166136261; for (const b of data) { h ^= b; h = Math.imul(h, 16777619); } return "f" + (h >>> 0).toString(16); // contexto sem HTTPS
  }
  function unlock() {
    const lock = $("#lock");
    sessionStorage.setItem(SESSION, "1");
    lock.classList.add("opening");
    setTimeout(() => (lock.hidden = true, lock.classList.remove("opening")), Motion.reduce ? 0 : 1200);
    route();
  }
  function gate() {
    if (sessionStorage.getItem(SESSION) === "1") return route();
    const lock = $("#lock"), g = $("#lockBlades"), stored = localStorage.getItem(PW_KEY);
    if (!g.childElementCount) for (let i = 0; i < 8; i++) {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", "M-6,-4 L110,-70 L118,40 L14,34 Z"); p.style.setProperty("--r", i * 45 + "deg"); p.style.setProperty("--tx", "70px"); g.appendChild(p);
    }
    $("#lockTitle").textContent = `Olá, ${S().studio.name}.`;
    const first = !stored;
    $("#lockConfirmWrap").hidden = !first;
    $("#lockPw2").required = first;
    $("#lockSub").textContent = first ? "Primeiro acesso: crie a senha que vai abrir o estúdio." : "Digite sua senha para entrar no estúdio.";
    $("#lockBtn").firstChild.textContent = first ? "Criar senha e entrar " : "Entrar ";
    lock.hidden = false;
    setTimeout(() => $("#lockPw").focus(), 100);
    $("#lockForm").onsubmit = async (e) => {
      e.preventDefault();
      const pw = $("#lockPw").value, err = $("#lockErr");
      if (first) {
        if (pw.length < 4) return (err.textContent = "Use pelo menos 4 caracteres.");
        if (pw !== $("#lockPw2").value) return (err.textContent = "As senhas não conferem.");
        localStorage.setItem(PW_KEY, await hash(pw));
        return unlock();
      }
      if ((await hash(pw)) === stored) return unlock();
      err.textContent = "Senha incorreta.";
      lock.classList.remove("shake"); void lock.offsetWidth; lock.classList.add("shake");
      $("#lockPw").select();
    };
  }
  $("#logoutBtn").onclick = () => { sessionStorage.removeItem(SESSION); $("#lockPw").value = ""; $("#lockPw2").value = ""; $("#lockErr").textContent = ""; gate(); };

  gate();
})();
