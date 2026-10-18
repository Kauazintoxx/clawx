/* ==========================================================================
   OFFBEAT — painel · Início (cards), Oportunidades, Fila de edição,
   Lucro por serviço, Pós-venda, Arquivo inteligente e Preparação do cliente.
   ========================================================================== */
(function () {
  const V = (window.OBViews = window.OBViews || {});
  const I = () => window.Insights;
  const DAY = 864e5;

  /* ---------- ícones próprios (formas geométricas sobrepostas) ---------- */
  const C = { r: "#e3412b", b: "#4678c8", g: "#3f8f5a", y: "#e0a23b", p: "#e86a8c", k: "#2a2723", s: "#6fb7d8" };
  const ic = (body) => `<svg viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;
  const ICONS = {
    oportunidades: ic(`<circle cx="20" cy="26" r="14" fill="${C.y}"/><path d="M26 6l14 14-14 14z" fill="${C.r}" opacity=".85"/>`),
    hoje: ic(`<rect x="6" y="10" width="26" height="26" rx="4" fill="${C.b}"/><circle cx="32" cy="30" r="11" fill="${C.r}" opacity=".85"/>`),
    crm: ic(`<circle cx="18" cy="18" r="10" fill="${C.p}"/><rect x="16" y="22" width="26" height="18" rx="9" fill="${C.k}" opacity=".85"/>`),
    propostas: ic(`<rect x="8" y="6" width="24" height="32" rx="3" fill="${C.s}"/><rect x="18" y="14" width="22" height="28" rx="3" fill="${C.r}" opacity=".85"/>`),
    agenda: ic(`<rect x="6" y="8" width="36" height="32" rx="5" fill="${C.g}"/><rect x="6" y="8" width="36" height="10" rx="5" fill="${C.k}" opacity=".7"/><circle cx="30" cy="30" r="5" fill="#fff"/>`),
    site: ic(`<path d="M6 30L22 6l8 14z" fill="${C.b}"/><path d="M18 42l12-22 12 22z" fill="${C.r}" opacity=".85"/>`),
    projetos: ic(`<rect x="6" y="8" width="10" height="32" rx="3" fill="${C.k}"/><rect x="19" y="16" width="10" height="24" rx="3" fill="${C.r}"/><rect x="32" y="24" width="10" height="16" rx="3" fill="${C.y}"/>`),
    preparo: ic(`<rect x="8" y="8" width="32" height="32" rx="16" fill="${C.p}"/><path d="M16 24l6 6 12-13" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`),
    fila: ic(`<rect x="6" y="8" width="36" height="8" rx="4" fill="${C.r}"/><rect x="6" y="20" width="28" height="8" rx="4" fill="${C.y}"/><rect x="6" y="32" width="18" height="8" rx="4" fill="${C.g}"/>`),
    tarefas: ic(`<rect x="6" y="6" width="22" height="22" rx="4" fill="${C.g}"/><rect x="20" y="20" width="22" height="22" rx="4" fill="${C.k}" opacity=".85"/>`),
    galerias: ic(`<path d="M8 22l10-12 10 12z" fill="${C.s}"/><path d="M16 26l10 10 18-18" fill="none" stroke="${C.g}" stroke-width="7" stroke-linecap="round"/><rect x="18" y="26" width="8" height="8" fill="${C.k}" opacity=".7"/>`),
    albuns: ic(`<rect x="6" y="8" width="20" height="20" rx="2" fill="${C.r}"/><rect x="20" y="20" width="22" height="22" rx="2" fill="${C.s}" opacity=".9"/><rect x="20" y="20" width="6" height="8" fill="${C.k}" opacity=".6"/>`),
    ar: ic(`<circle cx="24" cy="24" r="17" fill="none" stroke="${C.b}" stroke-width="5"/><circle cx="24" cy="24" r="8" fill="${C.r}"/><path d="M24 2v8M24 38v8M2 24h8M38 24h8" stroke="${C.k}" stroke-width="3"/>`),
    arquivo: ic(`<circle cx="20" cy="20" r="13" fill="${C.y}"/><path d="M29 29l12 12" stroke="${C.k}" stroke-width="6" stroke-linecap="round"/><circle cx="20" cy="20" r="6" fill="#fff" opacity=".7"/>`),
    financeiro: ic(`<circle cx="18" cy="26" r="13" fill="${C.g}"/><circle cx="30" cy="22" r="13" fill="${C.y}" opacity=".85"/>`),
    lucro: ic(`<path d="M6 40l12-14 8 6 16-20" fill="none" stroke="${C.r}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="42" cy="12" r="5" fill="${C.k}"/>`),
    posvenda: ic(`<path d="M24 42S6 30 6 18a9 9 0 0118-2 9 9 0 0118 2c0 12-18 24-18 24z" fill="${C.p}"/><circle cx="34" cy="14" r="7" fill="${C.r}" opacity=".85"/>`),
    ajustes: ic(`<circle cx="24" cy="24" r="16" fill="${C.k}"/><circle cx="24" cy="24" r="6" fill="${C.y}"/>`),
  };

  /* ======================================================================
     INÍCIO — cards por etapa do trabalho
     ====================================================================== */
  V[""] = (v, _, c) => {
    const { O, $, $$, S, esc, money } = c, s = S(), t = Date.now(), X = I();
    const ops = X.opportunities(s), ms = X.moneyState(s), q = X.queue(s), ps = X.postSale(s), jr = X.journey(s);
    const pot = ops.reduce((a, o) => a + o.value, 0);
    const lateTasks = s.tasks.filter((k) => !k.done && k.due < t).length;
    const upcoming = s.projects.filter((p) => p.date > t - DAY && p.date < t + 45 * DAY);
    const prepPending = upcoming.filter((p) => !p.prep?.completedAt).length;
    const hour = new Date().getHours();
    const card = (k, href, title, desc, metric, warn) => `<a class="fn" href="${href}" data-focus="${esc(title).toUpperCase()}"><span class="fn__ic">${ICONS[k]}</span><span class="fn__t"><strong>${title}</strong><small>${desc}</small></span>${metric ? `<span class="fn__m ${warn ? "warn" : ""}">${metric}</span>` : ""}<span class="fn__go">→</span></a>`;
    v.innerHTML = `
      <header class="home-h"><div><p class="mono">${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        <h1>${hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"}, ${esc(s.studio.name)}. <em>O que fazemos hoje?</em></h1></div>
        <div class="acts"><button class="btn btn--ghost" data-q="lead">+ Cliente</button><button class="btn btn--ghost" data-q="task">+ Tarefa</button><button class="btn btn--red" data-q="gallery">+ Galeria</button></div></header>

      <section class="home-top">
        <a class="opbox" href="#/oportunidades">
          <div class="opbox__h"><span class="mono">Painel de oportunidades</span><span class="chip red">${ops.filter((o) => o.level === "alta").length} prioridade alta</span></div>
          <b class="opbox__v">${money(pot)}</b><small>em oportunidades abertas · potencial, não é dinheiro garantido</small>
          <ol>${ops.slice(0, 3).map((o) => `<li><i class="lv ${o.level}"></i><span>${esc(o.title)}</span><em>${o.value ? money(o.value) : ""}</em></li>`).join("") || "<li><span>Nenhuma oportunidade pendente.</span></li>"}</ol>
          <span class="opbox__go">Ver o que fazer primeiro →</span>
        </a>
        <div class="moneybox">
          <div><span class="mono">Recebido no mês</span><b>${money(ms.received)}</b><small>dinheiro que já entrou</small></div>
          <div><span class="mono">Vendido no mês</span><b>${money(ms.sold)}</b><small>propostas aceitas e pedidos</small></div>
          <div><span class="mono">A receber</span><b>${money(ms.toReceive)}</b><small>cobranças em aberto</small></div>
        </div>
      </section>

      <section class="journey card"><h3>Jornada dos clientes <span class="mono">do interesse à recompra — toque numa etapa</span></h3>
        <ol>${jr.map((st, i) => `<li><button data-j="${st.key}"><b>${st.leads.length}</b><span>${st.name}</span></button>${i < jr.length - 1 ? "<i></i>" : ""}</li>`).join("")}</ol></section>

      ${[
        ["Vender", "Atrair, responder e fechar", [
          ["oportunidades", "#/oportunidades", "Oportunidades", "Receita parada que dá para recuperar", `${ops.length} ações`, ops.some((o) => o.level === "alta")],
          ["crm", "#/crm", "Clientes", "Funil com prioridade e próximo passo", `${s.leads.filter((l) => !["fechado", "perdido"].includes(l.stage)).length} em negociação`],
          ["propostas", "#/propostas", "Propostas", "Envio, aceite online e acompanhamento", `${s.proposals.filter((p) => ["enviada", "vista"].includes(p.status)).length} aguardando`],
          ["agenda", "#/agenda", "Agenda", "Sessões, reuniões e entregas", `${X.freeSlots(s).length} fins de semana livres`],
          ["site", "#/site", "Meu site", "Portfólio, landing pages, blog e SEO", `${s.pages.length + s.posts.length} páginas`],
        ]],
        ["Produzir", "Preparar, fotografar e editar", [
          ["projetos", "#/projetos", "Projetos", "Etapas, prazos e risco de atraso", `${s.projects.filter((p) => p.stages.some((x) => !x.done)).length} em andamento`],
          ["preparo", "#/preparo", "Preparação do cliente", "Guia, checklist e questionário por link", prepPending ? `${prepPending} pendentes` : "em dia", prepPending > 0],
          ["fila", "#/fila", "Fila de edição", "Ordem inteligente e previsão de entrega", `${q.jobs.length} trabalhos · ${Math.round(q.totalHours)}h`, q.jobs.some((j) => j.late)],
          ["tarefas", "#/tarefas", "Tarefas", "O que fazer hoje e o que atrasou", lateTasks ? `${lateTasks} atrasadas` : "em dia", lateTasks > 0],
        ]],
        ["Entregar", "Seleção, venda e experiência", [
          ["galerias", "#/galerias", "Galerias", "Seleção, venda, proteção e desempenho", `${s.galleries.length} galerias`],
          ["albuns", "#/albuns", "Álbuns", "Diagramação, aprovação e 3D", `${s.albums.filter((a) => a.status !== "aprovado").length} em produção`],
          ["ar", "#/ar", "Realidade aumentada", "Foto impressa que vira vídeo", `${s.ar.length} experiências`],
          ["arquivo", "#/arquivo", "Arquivo", "Busca inteligente em todas as fotos", `${s.galleries.reduce((a, g) => a + g.photos.length, 0)} fotos`],
        ]],
        ["Crescer", "Dinheiro, lucro e recompra", [
          ["financeiro", "#/financeiro", "Financeiro", "Fluxo de caixa, contas e relatórios", `${money(ms.toReceive)} a receber`],
          ["lucro", "#/lucro", "Lucro por serviço", "Quanto cada trabalho rende por hora", ""],
          ["posvenda", "#/posvenda", "Pós-venda", "Depoimentos, indicações e recompra", `${ps.length} ações`],
          ["hoje", "#/hoje", "Painel do dia", "Atividade ao vivo e números do mês", ""],
          ["ajustes", "#/ajustes", "Ajustes", "Estúdio, Pix, senha e capacidade", ""],
        ]],
      ].map(([g, sub, items]) => `<section class="fgroup"><header><h2>${g}</h2><span class="mono">${sub}</span></header><div class="fgrid">${items.map((x) => card(...x)).join("")}</div></section>`).join("")}`;
    $$("[data-q]", v).forEach((b) => (b.onclick = () => ({ lead: () => window.OBActions.lead?.(), task: () => window.OBActions.task({}), gallery: () => window.OBActions.gallery?.() })[b.dataset.q]()));
    $$("[data-j]", v).forEach((b) => (b.onclick = () => {
      const st = jr.find((x) => x.key === b.dataset.j);
      c.dialog(`<p class="mono">Jornada · ${st.leads.length} clientes</p><h2>${st.name}</h2><div class="list">${st.leads.map((l) => { const ins = I().leadInsight(l, s); return `<div><span class="av-s">${esc(l.name[0])}</span><div class="grow"><strong>${esc(l.name)}</strong><small>${esc(l.type)} · próximo passo: ${esc(ins.next)}</small></div><a class="btn btn--sm btn--ghost" href="#/crm" data-lead="${l.id}">Abrir</a></div>`; }).join("") || '<p class="mono">Ninguém nesta etapa.</p>'}</div>`);
      $$("[data-lead]").forEach((a) => (a.onclick = () => { c.closeDialog(); setTimeout(() => window.OBActions.openLead?.(a.dataset.lead), 80); }));
    }));
    Motion.reveal?.(v);
  };

  /* ======================================================================
     OPORTUNIDADES — recuperação de receita perdida
     ====================================================================== */
  let ocat = "todas";
  V.oportunidades = (v, _, c) => {
    const { O, $, $$, S, esc, money } = c, s = S(), X = I();
    const all = X.opportunities(s), ms = X.moneyState(s);
    const cats = ["todas", ...new Set(all.map((o) => o.cat))];
    const list = ocat === "todas" ? all : all.filter((o) => o.cat === ocat);
    const sum = (arr) => arr.reduce((a, o) => a + o.value, 0);
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${all.length} oportunidades · ordenadas pelo que vale mais agir primeiro</p><h1>Oportunidades <em>de receita</em></h1></div></header>
      <section class="grid g4" style="margin-bottom:8px">
        <div class="card kpi kpi--pot"><span class="mono">Potencial em aberto</span><b>${money(sum(all))}</b><small>pode virar venda — ainda não é dinheiro</small></div>
        <div class="card kpi"><span class="mono">Vendido no mês</span><b>${money(ms.sold)}</b><small>propostas aceitas e pedidos</small></div>
        <div class="card kpi"><span class="mono">Recebido no mês</span><b>${money(ms.received)}</b><small>já está na conta</small></div>
        <div class="card kpi"><span class="mono">A receber</span><b>${money(ms.toReceive)}</b><small>vendido e ainda não pago</small></div>
      </section>
      <p class="note mono">Potencial é uma estimativa feita a partir dos seus dados (valor das propostas, preço médio dos serviços, carrinhos). Ele não entra no faturamento até virar venda.</p>
      <div class="filters"><div class="chips">${cats.map((k) => `<button data-c="${esc(k)}" class="${ocat === k ? "on" : ""}">${k === "todas" ? "Todas" : esc(k)} <i>${k === "todas" ? all.length : all.filter((o) => o.cat === k).length}</i></button>`).join("")}</div></div>
      <div class="ops">${list.map((o, i) => `<article class="op card" style="--d:${Math.min(i, 8) * 0.04}s">
          <div class="op__l"><span class="op__ic">${o.icon}</span></div>
          <div class="op__b"><div class="op__h"><span class="chip ${o.level === "alta" ? "red" : o.level === "media" ? "warn" : ""}">prioridade ${o.level === "media" ? "média" : o.level}</span><span class="mono">${esc(o.cat)}</span></div>
            <strong>${esc(o.title)}</strong><p><b>Por quê:</b> ${esc(o.why)}</p></div>
          <div class="op__r">${o.value ? `<span class="mono">valor potencial</span><b>${money(o.value)}</b>` : ""}
            <div class="op__a">${o.text || o.audience ? `<button class="btn btn--sm btn--red" data-msg="${o.key}">Preparar mensagem</button>` : ""}<a class="btn btn--sm btn--ghost" href="${o.href}">Abrir</a>
            <button class="icon-btn" data-done="${o.key}" title="Feito">✓</button><button class="icon-btn" data-skip="${o.key}" title="Ignorar">×</button></div></div>
        </article>`).join("") || '<div class="card"><p class="mono">Nenhuma oportunidade aqui. 👏</p></div>'}</div>`;
    $$("[data-c]", v).forEach((b) => (b.onclick = () => { ocat = b.dataset.c; c.route(); }));
    const dismiss = (key, done) => O.update((s2) => { s2.dismissed[key] = Date.now(); const o = all.find((x) => x.key === key); if (done) O.log(`Oportunidade tratada: ${o?.title}`, "info"); });
    $$("[data-done]", v).forEach((b) => (b.onclick = () => dismiss(b.dataset.done, true)));
    $$("[data-skip]", v).forEach((b) => (b.onclick = () => dismiss(b.dataset.skip, false)));
    $$("[data-msg]", v).forEach((b) => (b.onclick = () => message(c, all.find((o) => o.key === b.dataset.msg), dismiss)));
  };

  /** Mensagem editável + envio pelo WhatsApp (ou para cada cliente do público). */
  function message(c, o, dismiss) {
    const { O, $, $$, esc } = c;
    const aud = o.audience || [];
    const d = c.dialog(`<p class="mono">${esc(o.cat)}</p><h2>Mensagem pronta</h2>
      <div class="field"><span>Revise antes de enviar</span><textarea id="mtx" rows="5">${esc(o.text)}</textarea></div>
      ${aud.length ? `<div class="field"><span>Enviar para clientes compatíveis (${aud.length})</span><div class="list">${aud.map((l) => `<div><span class="av-s">${esc(l.name[0])}</span><div class="grow"><strong>${esc(l.name)}</strong><small>${esc(l.type)}</small></div><a class="btn btn--sm btn--ghost" data-wa="${esc(l.phone)}" target="_blank" rel="noopener">WhatsApp</a></div>`).join("")}</div></div>` : ""}
      <div class="acts">${o.phone ? `<a class="btn btn--sm btn--red" id="mwa" target="_blank" rel="noopener">Enviar no WhatsApp</a>` : ""}${o.email ? `<a class="btn btn--sm btn--red" id="mml">Enviar por e-mail</a>` : ""}<button class="btn btn--sm btn--ghost" id="mcp">Copiar</button><button class="btn btn--sm btn--ghost" id="mok">Marcar como feito</button></div>`);
    const txt = () => $("#mtx", d).value;
    const upd = () => {
      if ($("#mwa", d)) $("#mwa", d).href = c.waLink(o.phone, txt());
      if ($("#mml", d)) $("#mml", d).href = `mailto:${o.email}?subject=${encodeURIComponent("Suas fotos estão esperando")}&body=${encodeURIComponent(txt())}`;
      $$("[data-wa]", d).forEach((a) => (a.href = c.waLink(a.dataset.wa, txt())));
    };
    $("#mtx", d).oninput = upd; upd();
    $("#mcp", d).onclick = () => O.copy(txt(), "Mensagem copiada.");
    $("#mok", d).onclick = () => { c.closeDialog(); dismiss(o.key, true); };
    if (o.cartId) $("#mml", d)?.addEventListener("click", () => O.update((s2) => { const g = s2.galleries.find((x) => x.id === o.galleryId); const ct = g?.carts.find((x) => x.id === o.cartId); if (ct) ct.remindedAt = Date.now(); }));
  }

  /* ======================================================================
     FILA INTELIGENTE DE EDIÇÃO E ENTREGA
     ====================================================================== */
  V.fila = (v, _, c) => {
    const { O, $, $$, S, esc } = c, s = S(), X = I(), q = X.queue(s), cfg = s.settings;
    const atRisk = q.jobs.filter((j) => j.late > 0);
    const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${q.jobs.length} trabalhos · ${Math.round(q.totalHours)} horas de edição · livre em ${O.date(q.freeOn, { day: "2-digit", month: "short" })}</p><h1>Fila de <em>edição</em></h1></div></header>
      <section class="grid g21" style="margin-bottom:16px">
        <div class="card ${atRisk.length ? "card--alert" : ""}"><h3>${atRisk.length ? `⚠ ${atRisk.length} entrega${atRisk.length > 1 ? "s" : ""} vai${atRisk.length > 1 ? "o" : ""} atrasar` : "✓ Todas as entregas cabem no prazo"}</h3>
          <p style="margin:0;color:var(--fg-2)">${atRisk.length ? `Com a sua capacidade atual, ${atRisk.map((j) => `“${esc(j.title.replace(/^(Editar|Diagramar) /, ""))}” termina ${j.late} dia(s) depois do prometido`).join("; ")}. Reordene, aumente as horas de edição ou avise o cliente com antecedência.` : "A previsão usa as horas por dia, os dias de trabalho e o tempo médio por foto definidos ao lado."}</p></div>
        <form class="card form" id="cap"><h3>Sua capacidade</h3>
          <div class="row2"><div class="field"><span>Horas de edição por dia</span><input name="hoursPerDay" type="number" min="1" max="16" value="${cfg.hoursPerDay}"></div><div class="field"><span>Minutos por foto</span><input name="minPerPhoto" type="number" min="0.5" step="0.5" value="${cfg.minPerPhoto}"></div></div>
          <div class="field"><span>Dias de trabalho</span><div class="chips">${WD.map((d, i) => `<label class="daychk"><input type="checkbox" name="wd" value="${i}" ${cfg.workDays.includes(i) ? "checked" : ""}><span>${d}</span></label>`).join("")}</div></div></form>
      </section>
      <div class="card"><div class="qlist">${q.jobs.map((j, i) => `<div class="qj ${j.late ? "late" : ""} ${j.ready ? "" : "wait"}">
          <span class="qj__n">${i + 1}</span>
          <div class="grow"><strong>${esc(j.title)}</strong><small>${esc(j.sub)} · ${j.hours.toFixed(1)}h</small>
            <div class="qj__bar"><i style="width:${Math.min(100, (j.hours / Math.max(1, q.totalHours)) * 100 * 3)}%"></i></div></div>
          <div class="qj__d"><span class="mono">prazo</span><b>${O.date(j.due, { day: "2-digit", month: "short" })}</b></div>
          <div class="qj__d"><span class="mono">previsão</span><b>${O.date(j.finish, { day: "2-digit", month: "short" })}</b></div>
          <span class="chip ${j.late ? "red" : j.slack < 3 ? "warn" : "ok"}">${j.late ? `atrasa ${j.late}d` : `folga ${j.slack}d`}</span>
          <div class="qj__a"><button class="icon-btn" data-up="${i}" ${i ? "" : "disabled"} title="Subir">↑</button><button class="icon-btn" data-dn="${i}" ${i < q.jobs.length - 1 ? "" : "disabled"} title="Descer">↓</button>
            ${j.kind === "edicao" ? `<button class="btn btn--sm" data-fin="${j.id}" ${j.ready ? "" : "disabled title='Aguardando o cliente finalizar a seleção'"}>Concluir edição</button>` : `<a class="btn btn--sm" href="#/album/${j.albumId}">Abrir álbum</a>`}</div>
        </div>`).join("") || '<p class="mono">Nada na fila. Quando o cliente finalizar uma seleção, o trabalho entra aqui.</p>'}</div>
        <p class="mono" style="text-transform:none;margin-top:12px">Ordem automática: seleções prontas primeiro, depois o prazo mais próximo. Use ↑ ↓ para mudar a prioridade manualmente.</p></div>`;
    const f = $("#cap", v);
    f.onchange = () => { const x = new FormData(f); O.update((s2) => Object.assign(s2.settings, { hoursPerDay: +x.get("hoursPerDay") || 6, minPerPhoto: +x.get("minPerPhoto") || 2, workDays: x.getAll("wd").map(Number) })); };
    const move = (i, d) => O.update((s2) => { const ids = q.jobs.map((j) => j.id); const [x] = ids.splice(i, 1); ids.splice(i + d, 0, x); s2.queueOrder = ids; });
    $$("[data-up]", v).forEach((b) => (b.onclick = () => move(+b.dataset.up, -1)));
    $$("[data-dn]", v).forEach((b) => (b.onclick = () => move(+b.dataset.dn, 1)));
    $$("[data-fin]", v).forEach((b) => (b.onclick = () => {
      const j = q.jobs.find((x) => x.id === b.dataset.fin), g = s.galleries.find((x) => x.id === j.galleryId);
      O.update((s2) => { const pj = s2.projects.find((p) => p.id === j.projectId); const st = pj?.stages.find((x) => x.key === "edicao"); if (st) { st.done = true; st.doneAt = Date.now(); } O.log(`Edição concluída: ${g.title}`, "info"); });
      const d = c.dialog(`<p class="mono">Edição concluída</p><h2>Entregar agora?</h2><p>Liberar o download das ${g.selection.length} fotos escolhidas na galeria de ${esc(g.client)} e avisar pelo WhatsApp.</p>
        <div class="acts"><button class="btn btn--red" id="dlv">Liberar e avisar</button><button class="btn btn--ghost" data-x>Depois</button></div>`);
      $("#dlv", d).onclick = () => {
        O.update((s2) => { const G = s2.galleries.find((x) => x.id === g.id); G.delivered = true; const pj = s2.projects.find((p) => p.id === j.projectId); const st = pj?.stages.find((x) => x.key === "entrega"); if (st) { st.done = true; st.doneAt = Date.now(); } O.log(`Fotos entregues: ${g.title}`, "pay"); });
        if (g.clientPhone) open(c.waLink(g.clientPhone, `Oi ${g.client.split(" ")[0]}! Suas fotos editadas estão prontas 🎉 Baixe tudo aqui: ${O.galleryLink(g)}`), "_blank", "noopener");
        c.closeDialog();
      };
    }));
  };

  /* ======================================================================
     LUCRO REAL POR SERVIÇO
     ====================================================================== */
  V.lucro = (v, _, c) => {
    const { O, $, $$, S, esc, money } = c, s = S(), X = I(), target = s.settings.targetHour;
    const rows = s.services.map((sv) => ({ sv, p: X.serviceProfit(sv) })).sort((a, b) => b.p.perHour - a.p.perHour);
    const maxH = Math.max(target, ...rows.map((r) => r.p.perHour), 1);
    const HL = { reuniao: "Reuniões", sessao: "Sessão/evento", deslocamento: "Deslocamento", edicao: "Edição", entrega: "Entrega" };
    const CL = { equipe: "Equipe", transporte: "Transporte", album: "Álbum/lab.", outros: "Outros" };
    v.innerHTML = `
      <header class="vh"><div><p class="mono">quanto cada serviço rende de verdade, por hora de trabalho</p><h1>Lucro <em>por serviço</em></h1></div>
        <div class="acts"><label class="field" style="min-width:220px"><span>Meta de ganho por hora</span><input id="tgt" type="number" min="10" step="10" value="${target}"></label></div></header>
      <div class="card" style="margin-bottom:16px"><h3>Ranking: lucro por hora <span class="mono">linha vermelha = sua meta (${money(target)}/h)</span></h3>
        <div class="rank">${rows.map(({ sv, p }) => `<div><span>${esc(sv.type)}</span><em><i class="${p.perHour < target ? "low" : ""}" style="width:${Math.max(2, (p.perHour / maxH) * 100)}%"></i><u style="left:${(target / maxH) * 100}%"></u></em><b class="mono">${money(p.perHour)}/h</b></div>`).join("")}</div></div>
      <div class="svc">${rows.map(({ sv, p }) => `<form class="card svc__c" data-sv="${sv.id}">
          <header><strong>${esc(sv.type)}</strong><span class="chip ${p.perHour >= target ? "ok" : "red"}">${p.perHour >= target ? "acima da meta" : "abaixo da meta"}</span></header>
          <div class="field"><span>Preço cobrado (R$)</span><input name="price" type="number" min="0" step="50" value="${sv.price}"></div>
          <div class="svc__g"><span class="mono">Horas</span>${Object.entries(sv.hours).map(([k, h]) => `<label>${HL[k]}<input name="h_${k}" type="number" min="0" step="0.5" value="${h}"></label>`).join("")}</div>
          <div class="svc__g"><span class="mono">Custos diretos (R$)</span>${Object.entries(sv.costs).map(([k, x]) => `<label>${CL[k]}<input name="c_${k}" type="number" min="0" step="10" value="${x}"></label>`).join("")}<label>Impostos (%)<input name="taxPct" type="number" min="0" max="40" step="0.5" value="${sv.taxPct}"></label></div>
          <dl class="svc__r"><div><dt>Horas totais</dt><dd>${p.hours}h</dd></div><div><dt>Custos + impostos</dt><dd>${money(p.costs + p.tax)}</dd></div><div><dt>Lucro</dt><dd>${money(p.profit)}</dd></div><div><dt>Margem</dt><dd>${Math.round(p.margin * 100)}%</dd></div><div class="big"><dt>Por hora</dt><dd>${money(p.perHour)}</dd></div></dl>
          ${p.perHour < target ? `<p class="svc__tip">Para atingir ${money(target)}/h: cobrar <b>${money(Math.ceil(X.priceFor(sv, target) / 10) * 10)}</b> ou cortar ${Math.max(0, Math.ceil(p.hours - (sv.price * (1 - sv.taxPct / 100) - p.costs) / target))}h de trabalho.</p>` : ""}
        </form>`).join("")}</div>
      <p class="mono" style="text-transform:none;margin-top:12px">Inclua todas as horas que o trabalho realmente consome — reuniões, deslocamento e edição costumam ser as mais esquecidas.</p>`;
    $("#tgt", v).onchange = (e) => O.update((s2) => (s2.settings.targetHour = +e.target.value || 150));
    $$("[data-sv]", v).forEach((f) => (f.onchange = () => {
      const x = Object.fromEntries(new FormData(f));
      O.update((s2) => { const sv = s2.services.find((y) => y.id === f.dataset.sv); sv.price = +x.price || 0; sv.taxPct = +x.taxPct || 0;
        Object.keys(sv.hours).forEach((k) => (sv.hours[k] = +x["h_" + k] || 0)); Object.keys(sv.costs).forEach((k) => (sv.costs[k] = +x["c_" + k] || 0)); });
    }));
  };

  /* ======================================================================
     PÓS-VENDA QUE GERA NOVAS VENDAS
     ====================================================================== */
  V.posvenda = (v, _, c) => {
    const { O, $$, S, esc, money } = c, s = S(), acts = I().postSale(s);
    const kinds = ["Recompra", "Álbum", "Depoimento", "Indicação"];
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${acts.length} ações · ${money(acts.reduce((a, x) => a + x.value, 0))} em recompras possíveis</p><h1>Pós-<em>venda</em></h1></div></header>
      <p class="note mono">O sistema olha a data e o tipo de cada trabalho entregue e sugere o próximo passo no momento certo: depoimento logo após a entrega, álbum quando a seleção está pronta, newborn depois da gestante, bodas no primeiro aniversário de casamento.</p>
      ${kinds.map((k) => { const list = acts.filter((a) => a.kind === k); return list.length ? `<section class="fgroup"><header><h2>${k}</h2><span class="mono">${list.length}</span></header><div class="ops">${list.map((a) => `<article class="op card">
        <div class="op__l"><span class="op__ic">${{ Recompra: "↺", Álbum: "📖", Depoimento: "❝", Indicação: "🎁" }[k]}</span></div>
        <div class="op__b"><strong>${esc(a.title)}</strong><p>${esc(a.why)}</p></div>
        <div class="op__r">${a.value ? `<span class="mono">potencial</span><b>${money(a.value)}</b>` : ""}<div class="op__a"><button class="btn btn--sm btn--red" data-m="${esc(a.key)}">Preparar mensagem</button><button class="icon-btn" data-ok="${esc(a.key)}" title="Feito">✓</button><button class="icon-btn" data-no="${esc(a.key)}" title="Ignorar">×</button></div></div></article>`).join("")}</div></section>` : ""; }).join("") || '<div class="card"><p class="mono">Nenhuma ação de pós-venda agora.</p></div>'}`;
    const dismiss = (key, done) => O.update((s2) => { s2.dismissed[key] = Date.now(); if (done) O.log(`Pós-venda: ${acts.find((a) => a.key === key)?.title}`, "info"); });
    $$("[data-ok]", v).forEach((b) => (b.onclick = () => dismiss(b.dataset.ok, true)));
    $$("[data-no]", v).forEach((b) => (b.onclick = () => dismiss(b.dataset.no, false)));
    $$("[data-m]", v).forEach((b) => (b.onclick = () => { const a = acts.find((x) => x.key === b.dataset.m); message(c, { ...a, cat: a.kind, phone: a.lead.phone }, dismiss); }));
  };

  /* ======================================================================
     ARQUIVO — busca inteligente em todas as fotos
     ====================================================================== */
  let aq = "";
  const COLORS = ["vermelho", "laranja", "amarelo", "verde", "azul", "rosa", "neutro", "claro", "escuro"];
  const SWATCH = { vermelho: "#d6453a", laranja: "#e38b3a", amarelo: "#e6c84a", verde: "#4c9a5a", azul: "#4678c8", rosa: "#d66aa0", neutro: "#9a948a", claro: "#efeae0", escuro: "#2a2723" };
  function parse(q, s) {
    const X = I(), words = X.norm(q).split(/\s+/).filter(Boolean), f = { text: [], chips: [] };
    const types = [...new Set(s.leads.map((l) => l.type).concat(s.galleries.map((g) => g.subtitle?.split(" · ")[0] || "")))].filter(Boolean);
    words.forEach((w) => {
      const ty = types.find((t) => X.norm(t).startsWith(w) && w.length >= 4);
      if (/^(19|20)\d\d$/.test(w)) { f.year = +w; f.chips.push(w); }
      else if (/^(escolhid|favorit|selecionad)/.test(w)) { f.sel = true; f.chips.push("escolhidas pelo cliente"); }
      else if (/^comentad/.test(w)) { f.com = true; f.chips.push("com comentário"); }
      else if (/^(retrato|vertica)/.test(w)) { f.or = "v"; f.chips.push("vertical"); }
      else if (/^(paisage|horizonta)/.test(w)) { f.or = "h"; f.chips.push("horizontal"); }
      else if (/^video/.test(w)) { f.video = true; f.chips.push("vídeos"); }
      else if (COLORS.includes(w)) { f.color = w; f.chips.push("cor " + w); }
      else if (ty) { f.type = ty; f.chips.push(ty); }
      else f.text.push(w);
    });
    return f;
  }
  V.arquivo = (v, _, c) => {
    const { O, $, $$, S, esc } = c, s = S(), X = I();
    const all = s.galleries.flatMap((g) => g.photos.map((p, i) => ({ g, p, i })));
    const f = parse(aq, s);
    const res = all.filter(({ g, p }) => {
      const lead = s.leads.find((l) => l.id === g.leadId);
      const hay = X.norm([g.title, g.subtitle, g.client, p.name, (p.tags || []).join(" "), g.comments?.[p.id], lead?.name, lead?.type].join(" "));
      if (f.text.some((w) => !hay.includes(w))) return false;
      if (f.year && new Date(g.createdAt).getFullYear() !== f.year) return false;
      if (f.sel && !g.selection.includes(p.id)) return false;
      if (f.com && !g.comments?.[p.id]) return false;
      if (f.or === "v" && !(p.h > p.w)) return false;
      if (f.or === "h" && !(p.w >= p.h)) return false;
      if (f.video && !p.video) return false;
      if (f.color && p.color !== f.color) return false;
      if (f.type && !X.norm(`${lead?.type} ${g.subtitle}`).includes(X.norm(f.type))) return false;
      return true;
    });
    const pending = all.filter(({ p }) => !p.color && !p.video).length;
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${all.length} arquivos em ${s.galleries.length} galerias</p><h1>Arquivo <em>fotográfico</em></h1></div></header>
      <div class="asearch card"><span aria-hidden="true">⌕</span><input id="aq" type="search" value="${esc(aq)}" placeholder="Ex.: casamento azul escolhidas · gestante vertical · marina comentadas · corrida 127" autocomplete="off"></div>
      <div class="filters">${f.chips.length ? `<span class="mono">Entendi:</span><div class="chips">${f.chips.map((x) => `<button class="on" tabindex="-1">${esc(x)}</button>`).join("")}${f.text.map((x) => `<button tabindex="-1">“${esc(x)}”</button>`).join("")}</div>` : `<span class="mono">Atalhos:</span><div class="chips">${["escolhidas", "comentadas", "vertical", "horizontal", "vídeos"].map((x) => `<button data-add="${x}">${x}</button>`).join("")}</div>`}
        <div class="swatches">${COLORS.map((k) => `<button data-col="${k}" title="${k}" style="background:${SWATCH[k]}" class="${f.color === k ? "on" : ""}"></button>`).join("")}</div>
        ${pending ? `<span class="mono" id="anz">analisando cores… ${all.length - pending}/${all.filter(({ p }) => !p.video).length}</span>` : ""}</div>
      <p class="mono" style="margin:0 0 10px">${res.length} resultado${res.length === 1 ? "" : "s"}</p>
      <div class="agrid">${res.slice(0, 120).map(({ g, p, i }) => `<button class="aitem" data-g="${g.id}" data-p="${p.id}">${c.imgTag(g, p.id, 320)}
          <span>${esc(g.title)} · ${String(i + 1).padStart(3, "0")}</span>${g.selection.includes(p.id) ? "<i>♥</i>" : ""}${p.color ? `<u style="background:${SWATCH[p.color]}"></u>` : ""}</button>`).join("")}</div>
      ${res.length > 120 ? `<p class="mono">Mostrando 120 de ${res.length}. Refine a busca.</p>` : ""}`;
    const inp = $("#aq", v);
    let tm; inp.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { aq = inp.value; const pos = inp.selectionStart; c.route(); const n = $("#aq"); n.focus(); n.setSelectionRange(pos, pos); }, 220); };
    $$("[data-add]", v).forEach((b) => (b.onclick = () => { aq = (aq + " " + b.dataset.add).trim(); c.route(); }));
    $$("[data-col]", v).forEach((b) => (b.onclick = () => { aq = (f.color ? aq.replace(new RegExp(`\\b${f.color}\\b`, "i"), "") : aq).trim(); if (f.color !== b.dataset.col) aq = (aq + " " + b.dataset.col).trim(); c.route(); }));
    $$(".aitem", v).forEach((b) => (b.onclick = () => {
      const g = s.galleries.find((x) => x.id === b.dataset.g), p = g.photos.find((x) => x.id === b.dataset.p), lead = s.leads.find((l) => l.id === g.leadId);
      c.dialog(`<p class="mono">${esc(g.title)} · ${esc(p.name)}</p><div style="border-radius:12px;overflow:hidden;margin:6px 0 14px">${c.imgTag(g, p.id, 1000, 'style="width:100%"')}</div>
        <div class="list"><div><div class="grow"><strong>${esc(g.client)}</strong><small>${esc(lead?.type || g.subtitle || "")} · ${O.date(g.createdAt, { day: "2-digit", month: "short", year: "numeric" })}</small></div></div>
        <div><div class="grow"><small>${p.w}×${p.h} · ${p.w >= p.h ? "horizontal" : "vertical"}${p.color ? ` · cor predominante: ${p.color}` : ""}${g.selection.includes(p.id) ? " · ♥ escolhida pelo cliente" : ""}</small>${g.comments?.[p.id] ? `<small>💬 ${esc(g.comments[p.id])}</small>` : ""}</div></div></div>
        <div class="acts"><a class="btn btn--sm" href="#/g/${g.id}">Abrir galeria</a></div>`, { wide: true });
    }));
    if (pending) analyze(c, all.filter(({ p }) => !p.color && !p.video).slice(0, 400));
  };
  let analyzing = false;
  async function analyze(c, items) {
    if (analyzing) return; analyzing = true;
    const { O, S } = c, found = {};
    const cv = document.createElement("canvas"); cv.width = cv.height = 24; const x = cv.getContext("2d", { willReadFrequently: true });
    let n = 0;
    for (const { g, p } of items) {
      try {
        const url = await c.thumb(p, 64);
        const im = await new Promise((r, j) => { const m = new Image(); m.crossOrigin = "anonymous"; m.onload = () => r(m); m.onerror = j; m.src = url; });
        x.drawImage(im, 0, 0, 24, 24);
        const d = x.getImageData(0, 0, 24, 24).data; let r = 0, gg = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
        const k = d.length / 4;
        found[g.id + "|" + p.id] = I().colorName([r / k, gg / k, b / k]);
      } catch (e) { found[g.id + "|" + p.id] = "neutro"; }
      if (++n % 12 === 0) { const el = document.getElementById("anz"); if (el) el.textContent = `analisando cores… ${n}/${items.length}`; }
    }
    O.update((s2) => Object.entries(found).forEach(([key, col]) => { const [gid, pid] = key.split("|"); const ph = s2.galleries.find((y) => y.id === gid)?.photos.find((y) => y.id === pid); if (ph) ph.color = col; }));
    analyzing = false;
  }

  /* ======================================================================
     CENTRAL DE PREPARAÇÃO DO CLIENTE
     ====================================================================== */
  V.preparo = (v, _, c) => {
    const { O, $$, S, esc } = c, s = S(), X = I(), t = Date.now();
    const list = s.projects.filter((p) => p.date > t - DAY).sort((a, b) => a.date - b.date);
    const link = (pj) => `${O.galleryLink({ id: "" }).replace(/gallery\.html#$/, "")}prep.html#${pj.id}`;
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${list.length} sessões e eventos pela frente</p><h1>Preparação <em>do cliente</em></h1></div></header>
      <p class="note mono">Cada cliente recebe um link com contagem regressiva, dicas para o tipo de trabalho, checklist e um questionário (local, horários, pessoas importantes…). As respostas aparecem aqui e no projeto.</p>
      <div class="ops">${list.map((pj) => { const pr = X.prepProgress(pj, s), l = s.leads.find((x) => x.id === pj.leadId), d = Math.ceil((pj.date - t) / DAY);
        const st = pj.prep.completedAt ? ["respondido", "ok"] : pj.prep.openedAt ? ["cliente abriu", "blue"] : pj.prep.sentAt ? ["enviado", "warn"] : ["não enviado", d < 14 ? "red" : ""];
        return `<article class="op card"><div class="op__l"><span class="date">${new Date(pj.date).getDate()}<small>${new Date(pj.date).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</small></span></div>
          <div class="op__b"><div class="op__h"><span class="chip ${st[1]}">${st[0]}</span><span class="mono">faltam ${d} dias · ${esc(pj.type)}</span></div><strong>${esc(pj.title)}</strong>
            <div class="prep-bar"><i style="width:${pr.pct}%"></i></div><p>${pr.pct}% pronto · ${pr.checks.filter((x) => x.done).length}/${pr.checks.length} itens · ${pr.answered}/${pr.tpl.questions.length} respostas</p></div>
          <div class="op__r"><div class="op__a"><button class="btn btn--sm btn--red" data-send="${pj.id}">${pj.prep.sentAt ? "Reenviar" : "Enviar"}</button><button class="btn btn--sm btn--ghost" data-ans="${pj.id}">Respostas</button><a class="btn btn--sm btn--ghost" href="${esc(link(pj))}" target="_blank" rel="noopener">Ver ↗</a></div></div></article>`; }).join("") || '<div class="card"><p class="mono">Nenhum projeto futuro. Crie um projeto a partir do cliente.</p></div>'}</div>`;
    $$("[data-send]", v).forEach((b) => (b.onclick = () => {
      const pj = s.projects.find((x) => x.id === b.dataset.send), l = s.leads.find((x) => x.id === pj.leadId), url = link(pj);
      O.update((s2) => { s2.projects.find((x) => x.id === pj.id).prep.sentAt = Date.now(); O.log(`Preparação enviada: ${pj.title}`, "info"); });
      const d = c.dialog(`<p class="mono">Preparação do cliente</p><h2>${esc(pj.title)}</h2><div class="field"><span>Link</span><input readonly value="${esc(url)}"></div>
        <div class="acts"><button class="btn btn--sm" id="cpp">Copiar link</button>${l?.phone ? `<a class="btn btn--sm btn--red" target="_blank" rel="noopener" href="${c.waLink(l.phone, `Oi ${l.name.split(" ")[0]}! Faltam poucos dias 📸 Preparei um guia com dicas e algumas perguntas rápidas para o nosso ${pj.type.toLowerCase()}: ${url}`)}">Enviar no WhatsApp</a>` : ""}</div>`);
      d.querySelector("#cpp").onclick = () => O.copy(url, "Link copiado.");
    }));
    $$("[data-ans]", v).forEach((b) => (b.onclick = () => {
      const pj = s.projects.find((x) => x.id === b.dataset.ans), pr = X.prepProgress(pj, s);
      c.dialog(`<p class="mono">${pr.pct}% pronto</p><h2>${esc(pj.title)}</h2>
        <div class="list">${pr.checks.map((x) => `<div><span>${x.done ? "✅" : "⬜"}</span><div class="grow"><strong>${esc(x.c)}</strong>${x.auto ? "<small>automático</small>" : ""}</div></div>`).join("")}</div>
        <h3 style="margin:18px 0 6px;font-size:.95rem">Respostas do cliente</h3><div class="list">${pr.tpl.questions.map(([k, q]) => `<div><div class="grow"><small>${esc(q)}</small><strong>${esc(pj.prep.answers?.[k] || "—")}</strong></div></div>`).join("")}</div>`, { wide: true });
    }));
  };

  /* ---------- aba "Desempenho" da galeria (conversão, abandono, pacotes) ---------- */
  window.OBGallerySub = {
    desempenho(box, g, c) {
      const { O, $$, S, esc, money } = c, s = S(), st = I().galleryStats(g, s);
      const max = Math.max(1, ...st.funnel.map((f) => f[1]));
      box.innerHTML = `<section class="grid g21" style="margin-bottom:16px">
        <div class="card"><h3>Funil de conversão</h3><div class="funnel">${st.funnel.map(([n, val], i) => `<div><span>${n}</span><em><i style="width:${Math.max(2, (val / max) * 100)}%"></i></em><b class="mono">${val}${i ? ` · ${st.funnel[i - 1][1] ? Math.round((val / st.funnel[i - 1][1]) * 100) : 0}%` : ""}</b></div>`).join("")}</div></div>
        <div class="grid" style="align-content:start">${st.kind === "venda" ? `
          <div class="card kpi"><span class="mono">Abandono de carrinho</span><b>${Math.round(st.abandon * 100)}%</b><small>${st.carts.filter((x) => !x.recovered).length} carrinhos sem pedido</small></div>
          <div class="card kpi"><span class="mono">Ticket médio</span><b>${money(st.avg)}</b><small>${money(st.revenue)} pagos</small></div>` : `
          <div class="card kpi"><span class="mono">Uso do pacote</span><b>${st.rate === null ? "livre" : Math.round(st.rate * 100) + "%"}</b><small>${g.selection.length} de ${g.limit || "∞"} fotos</small></div>
          <div class="card kpi"><span class="mono">Fotos extras</span><b>${money(st.extrasValue)}</b><small>${st.extras} extras · ${money(st.extrasPaid)} pagos</small></div>`}</div></section>
        ${st.kind === "venda" ? `<section class="grid g2"><div class="card"><h3>Desempenho dos pacotes</h3><div class="list">${Object.entries(st.bySize).map(([k, x]) => `<div><div class="grow"><strong>${k} fotos</strong><small>${x.n} pedidos</small></div><b class="mono">${money(x.v)}</b></div>`).join("") || '<p class="mono">Sem pedidos ainda.</p>'}</div></div>
          <div class="card"><h3>Carrinhos abandonados</h3><div class="list">${st.carts.filter((x) => !x.recovered).map((ct) => `<div><div class="grow"><strong>${esc(ct.email || "visitante sem e-mail")}</strong><small>${ct.items.length} fotos · ${O.ago(ct.updatedAt)}${ct.remindedAt ? " · lembrado" : ""}</small></div><b class="mono">${money(ct.items.length * g.unitPrice)}</b>${ct.email ? `<a class="btn btn--sm btn--ghost" href="mailto:${esc(ct.email)}?subject=${encodeURIComponent("Suas fotos estão no carrinho")}&body=${encodeURIComponent(`Oi! Suas fotos da ${g.title} ainda estão no carrinho. Finalize aqui: ${O.galleryLink(g)}`)}" data-rem="${ct.id}">Lembrar</a>` : ""}</div>`).join("") || '<p class="mono">Nenhum carrinho abandonado.</p>'}</div></div></section>`
        : `<div class="card"><h3>Leitura rápida</h3><p style="margin:0;color:var(--fg-2)">${g.views ? `${g.views} visitas. ` : ""}${st.funnel[2][1] ? "Seleção finalizada — a edição entra na fila automaticamente." : st.funnel[1][1] ? "O cliente começou a escolher mas não finalizou. Se a galeria estiver perto de expirar, mande um lembrete." : "Ninguém começou a escolher ainda. Confirme se o link chegou."}${st.comments ? ` ${st.comments} comentários com pedidos de ajuste.` : ""}</p></div>`}`;
      $$("[data-rem]", box).forEach((a) => a.addEventListener("click", () => O.update((s2) => { const ct = s2.galleries.find((x) => x.id === g.id).carts.find((x) => x.id === a.dataset.rem); ct.remindedAt = Date.now(); })));
    },
  };
})();
