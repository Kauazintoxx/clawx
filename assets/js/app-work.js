/* ==========================================================================
   OFFBEAT — painel · Projetos, prazos, tarefas e propostas
   Registra views em window.OBViews e ações em window.OBActionFactories
   (o app.js liga tudo e entrega os utilitários em `ctx`).
   ========================================================================== */
(function () {
  const V = (window.OBViews = window.OBViews || {});
  const A = (window.OBActionFactories = window.OBActionFactories || {});
  const PRIO = { alta: "red", media: "warn", baixa: "" };
  const PST = { rascunho: ["rascunho", ""], enviada: ["enviada", "warn"], vista: ["vista", "blue"], aceita: ["aceita", "ok"], recusada: ["recusada", "red"] };
  const total = (p) => Math.max(0, p.items.reduce((a, it) => a + it.qty * it.price, 0) - (p.discount || 0));

  /* ======================= PROJETOS ======================= */
  V.projetos = (v, _, c) => {
    const { O, $$, S, esc } = c, s = S(), t = Date.now();
    const rows = s.projects.map((pj) => {
      const done = pj.stages.filter((x) => x.done).length, next = pj.stages.find((x) => !x.done);
      const late = next && next.due < t;
      return { pj, done, next, late, lead: s.leads.find((l) => l.id === pj.leadId) };
    }).sort((a, b) => (a.next?.due ?? Infinity) - (b.next?.due ?? Infinity));
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${rows.filter((r) => r.next).length} em andamento · ${rows.filter((r) => r.late).length} com prazo vencido</p><h1>Projetos <em>& prazos</em></h1></div>
        <div class="acts"><button class="btn btn--red" id="np">+ Novo projeto</button></div></header>
      <div class="pj-list">${rows.map(({ pj, done, next, late, lead }) => `
        <a class="pj card" href="#/projeto/${pj.id}">
          <div class="pj__head"><div><strong>${esc(pj.title)}</strong><small>${esc(lead?.name || "—")} · ${esc(pj.type || "")} · ${O.date(pj.date, { day: "2-digit", month: "short", year: "numeric" })}</small></div>
            <span class="chip ${!next ? "ok" : late ? "red" : next.due < t + 3 * O.DAY ? "warn" : ""}">${!next ? "concluído" : late ? "atrasado" : "em dia"}</span></div>
          <div class="pj__track">${pj.stages.map((st) => `<i class="${st.done ? "done" : st === next ? (late ? "late" : "now") : ""}" title="${esc(st.name)} · ${O.date(st.due)}"></i>`).join("")}</div>
          <small class="mono">${next ? `Agora: ${esc(next.name)} · até ${O.date(next.due)}` : "Todas as etapas entregues"} · ${done}/${pj.stages.length}</small>
        </a>`).join("") || '<p class="mono">Nenhum projeto ainda.</p>'}</div>`;
    $$("#np", v).forEach((b) => (b.onclick = () => A.project(c)("")));
  };

  V.projeto = (v, id, c) => {
    const { O, $, $$, S, esc, money, imgTag } = c, s = S(), t = Date.now();
    const pj = s.projects.find((x) => x.id === id);
    if (!pj) { v.innerHTML = '<a class="back" href="#/projetos">← Projetos</a><h1>Projeto não encontrado</h1>'; return; }
    const lead = s.leads.find((l) => l.id === pj.leadId), g = s.galleries.find((x) => x.id === pj.galleryId);
    const album = g && s.albums.find((a) => a.galleryId === g.id);
    const tasks = s.tasks.filter((k) => k.projectId === pj.id || (k.leadId && k.leadId === pj.leadId));
    const pays = s.payments.filter((p) => p.leadId === pj.leadId);
    const save = (fn) => O.update((s2) => fn(s2.projects.find((x) => x.id === id), s2));
    v.innerHTML = `<a class="back" href="#/projetos">← Projetos</a>
      <header class="vh"><div><p class="mono">${esc(lead?.name || "")} · ${esc(pj.type || "")} · ${O.date(pj.date, { day: "2-digit", month: "long", year: "numeric" })}</p><h1>${esc(pj.title)}</h1></div>
        <div class="acts"><button class="btn btn--ghost" id="pt">+ Tarefa</button><button class="btn btn--ghost" id="pdel" style="--fg:var(--safelight)">Excluir</button></div></header>
      <section class="grid g21">
        <div class="card"><h3>Etapas e prazos <span class="mono">clique para concluir · ajuste as datas</span></h3>
          <ol class="stages">${pj.stages.map((st, i) => `<li class="${st.done ? "done" : st.due < t ? "late" : ""}">
            <label class="stages__chk"><input type="checkbox" data-st="${i}" ${st.done ? "checked" : ""}><span></span></label>
            <div class="grow"><strong>${esc(st.name)}</strong><small>${st.done ? `entregue ${O.date(st.doneAt || st.due)}` : st.due < t ? `atrasada desde ${O.date(st.due)}` : `prazo ${O.date(st.due, { weekday: "short", day: "2-digit", month: "short" })}`}</small></div>
            <input type="date" data-due="${i}" value="${new Date(st.due - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)}" aria-label="Prazo de ${esc(st.name)}"></li>`).join("")}</ol>
          <div class="field" style="margin-top:16px"><span>Notas do projeto</span><textarea id="pnotes" rows="3" placeholder="Locação, horários, pedidos especiais…">${esc(pj.notes || "")}</textarea></div>
        </div>
        <div class="grid" style="align-content:start">
          <div class="card"><h3>Ligações</h3><div class="list">
            <div><span>👤</span><div class="grow"><strong>${esc(lead?.name || "Sem cliente")}</strong><small>${esc(lead?.phone || "")}</small></div></div>
            <div><span>🖼️</span><div class="grow">${g ? `<a href="#/g/${g.id}"><strong>${esc(g.title)}</strong></a><small>${g.selection.length} escolhidas · ${g.status}</small>` : `<strong>Sem galeria</strong><small><a href="javascript:void 0" id="mkG">Criar galeria para este projeto</a></small>`}</div></div>
            <div><span>📖</span><div class="grow">${album ? `<a href="#/album/${album.id}"><strong>${esc(album.title)}</strong></a><small>${album.status}</small>` : "<strong>Sem álbum</strong><small>crie em Álbuns quando a seleção chegar</small>"}</div></div>
            ${pays.map((p) => `<div><span>⚡</span><div class="grow"><strong>${esc(p.desc)}</strong><small>${money(p.amount)} · ${p.status}</small></div></div>`).join("")}
          </div>
          ${g ? `<div class="field" style="margin-top:10px"><span>Galeria vinculada</span><select id="pg"><option value="">—</option>${s.galleries.map((x) => `<option value="${x.id}" ${x.id === pj.galleryId ? "selected" : ""}>${esc(x.title)}</option>`).join("")}</select></div>` : ""}</div>
          <div class="card"><h3>Tarefas <span class="mono">${tasks.filter((k) => !k.done).length} abertas</span></h3><div class="list">${tasks.map((k) => `<div><input type="checkbox" data-tk="${k.id}" ${k.done ? "checked" : ""}><div class="grow"><strong style="${k.done ? "text-decoration:line-through;opacity:.5" : ""}">${esc(k.title)}</strong><small>${O.date(k.due)}</small></div><span class="chip ${PRIO[k.priority]}">${k.priority}</span></div>`).join("") || '<p class="mono">Sem tarefas.</p>'}</div></div>
        </div>
      </section>`;
    $$("[data-st]", v).forEach((cb) => (cb.onchange = () => save((P) => { const st = P.stages[+cb.dataset.st]; st.done = cb.checked; st.doneAt = cb.checked ? Date.now() : null; if (cb.checked) O.log(`${P.title}: “${st.name}” concluída`, "info"); })));
    $$("[data-due]", v).forEach((inp) => (inp.onchange = () => save((P) => (P.stages[+inp.dataset.due].due = new Date(inp.value + "T18:00").getTime()))));
    $$("[data-tk]", v).forEach((cb) => (cb.onchange = () => O.update((s2) => { const k = s2.tasks.find((x) => x.id === cb.dataset.tk); k.done = cb.checked; k.doneAt = cb.checked ? Date.now() : null; })));
    let nt; $("#pnotes", v).oninput = (e) => { clearTimeout(nt); nt = setTimeout(() => { c.setViewHook(() => {}); save((P) => (P.notes = e.target.value)); c.setViewHook(null); }, 400); };
    $("#pg", v)?.addEventListener("change", (e) => save((P) => (P.galleryId = e.target.value || null)));
    $("#mkG", v)?.addEventListener("click", () => O.toast("Crie a galeria e depois vincule aqui.") || c.go("#/galerias"));
    $("#pt", v).onclick = () => A.task(c)({ projectId: pj.id, leadId: pj.leadId });
    $("#pdel", v).onclick = () => { if (confirm("Excluir este projeto? (galeria, cliente e pagamentos continuam)")) { O.update((s2) => (s2.projects = s2.projects.filter((x) => x.id !== id))); c.go("#/projetos"); } };
  };

  A.project = (c) => (leadId) => {
    const { O, $, S, esc, dialog, closeDialog, formData, go } = c, s = S();
    const l = s.leads.find((x) => x.id === leadId);
    const d = dialog(`<p class="mono">Projeto fotográfico</p><h2>Novo projeto</h2><form class="form" id="fpj">
      <div class="field"><span>Cliente</span><select name="leadId" required><option value="">—</option>${s.leads.map((x) => `<option value="${x.id}" ${x.id === leadId ? "selected" : ""}>${esc(x.name)} · ${esc(x.type)}</option>`).join("")}</select></div>
      <div class="field"><span>Título</span><input name="title" required value="${esc(l ? `${l.type} ${l.name}` : "")}"></div>
      <div class="row2"><div class="field"><span>Data da sessão / evento</span><input name="date" type="date" required value="${l ? new Date(l.eventDate).toISOString().slice(0, 10) : ""}"></div>
      <div class="field"><span>Galeria (opcional)</span><select name="galleryId"><option value="">—</option>${s.galleries.map((g) => `<option value="${g.id}" ${g.leadId === leadId ? "selected" : ""}>${esc(g.title)}</option>`).join("")}</select></div></div>
      <p class="mono" style="text-transform:none">As etapas e prazos padrão são criados a partir da data: pré-produção (−7 dias), sessão, backup (+1), seleção (+10), edição (+25), entrega (+30) e álbum (+60). Dá para ajustar depois.</p>
      <div class="acts"><button class="btn btn--red">Criar projeto</button></div></form>`);
    const f = $("#fpj", d);
    f.leadId.onchange = () => { const x = s.leads.find((y) => y.id === f.leadId.value); if (x) { f.title.value = `${x.type} ${x.name}`; f.date.value = new Date(x.eventDate).toISOString().slice(0, 10); } };
    f.onsubmit = (e) => {
      e.preventDefault(); const x = formData(f), id = O.uid("pj_"), date = new Date(x.date + "T12:00").getTime();
      O.update((s2) => { const L = s2.leads.find((y) => y.id === x.leadId); s2.projects.unshift({ id, title: x.title, leadId: x.leadId, galleryId: x.galleryId || null, type: L?.type || "", date, stages: O.projectStages(date), notes: "", createdAt: Date.now() }); O.log(`Projeto criado: ${x.title}`, "info"); });
      closeDialog(); go(`#/projeto/${id}`);
    };
  };

  /* ======================= TAREFAS ======================= */
  let tf = "abertas";
  V.tarefas = (v, _, c) => {
    const { O, $, $$, S, esc } = c, s = S(), t = Date.now();
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const F = { abertas: (k) => !k.done, hoje: (k) => !k.done && k.due <= end.getTime(), atrasadas: (k) => !k.done && k.due < t - 864e5 / 2, proximas: (k) => !k.done && k.due > end.getTime(), concluidas: (k) => k.done };
    const list = s.tasks.filter(F[tf]).sort((a, b) => (a.done ? b.doneAt - a.doneAt : a.due - b.due));
    const ref = (k) => { const l = s.leads.find((x) => x.id === k.leadId), p = s.projects.find((x) => x.id === k.projectId); return [p && `<a href="#/projeto/${p.id}">${esc(p.title)}</a>`, l && esc(l.name)].filter(Boolean).join(" · "); };
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${s.tasks.filter(F.abertas).length} abertas · ${s.tasks.filter(F.atrasadas).length} atrasadas</p><h1>Tarefas</h1></div>
        <div class="acts"><button class="btn btn--red" id="nt">+ Nova tarefa</button></div></header>
      <form class="quick card" id="qt"><input name="title" placeholder="Adicionar tarefa rápida e apertar Enter…" required><input name="due" type="date" value="${new Date(t - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)}"><select name="priority"><option value="media">média</option><option value="alta">alta</option><option value="baixa">baixa</option></select><button class="btn btn--sm">Adicionar</button></form>
      <div class="filters"><div class="chips">${[["abertas", "Abertas"], ["hoje", "Hoje"], ["atrasadas", "Atrasadas"], ["proximas", "Próximas"], ["concluidas", "Concluídas"]].map(([k, n]) => `<button data-tf="${k}" class="${tf === k ? "on" : ""}">${n} <i>${s.tasks.filter(F[k]).length}</i></button>`).join("")}</div></div>
      <div class="card"><div class="list tasks">${list.map((k) => `<div class="${k.done ? "is-done" : ""}">
        <label class="stages__chk"><input type="checkbox" data-tk="${k.id}" ${k.done ? "checked" : ""}><span></span></label>
        <div class="grow"><strong>${esc(k.title)}</strong><small>${!k.done && k.due < t - 864e5 / 2 ? '<span style="color:var(--safelight)">atrasada · </span>' : ""}${O.date(k.due, { weekday: "short", day: "2-digit", month: "short" })}${ref(k) ? " · " + ref(k) : ""}</small></div>
        <span class="chip ${PRIO[k.priority]}">${k.priority}</span><button class="icon-btn" data-ed="${k.id}" aria-label="Editar">✎</button><button class="icon-btn" data-rm="${k.id}" aria-label="Excluir">×</button></div>`).join("") || '<p class="mono">Nada aqui. 🎉</p>'}</div></div>`;
    $("#nt", v).onclick = () => A.task(c)({});
    $$("[data-tf]", v).forEach((b) => (b.onclick = () => { tf = b.dataset.tf; c.route(); }));
    $("#qt", v).onsubmit = (e) => { e.preventDefault(); const x = c.formData(e.target); O.update((s2) => s2.tasks.unshift({ id: O.uid("tk_"), title: x.title, due: new Date(x.due + "T18:00").getTime(), priority: x.priority, leadId: null, projectId: null, done: false, doneAt: null, createdAt: Date.now() })); };
    $$("[data-tk]", v).forEach((cb) => (cb.onchange = () => O.update((s2) => { const k = s2.tasks.find((x) => x.id === cb.dataset.tk); k.done = cb.checked; k.doneAt = cb.checked ? Date.now() : null; if (k.done) O.log(`Tarefa concluída: ${k.title}`, "info"); })));
    $$("[data-rm]", v).forEach((b) => (b.onclick = () => O.update((s2) => (s2.tasks = s2.tasks.filter((x) => x.id !== b.dataset.rm)))));
    $$("[data-ed]", v).forEach((b) => (b.onclick = () => A.task(c)(s.tasks.find((x) => x.id === b.dataset.ed))));
  };

  A.task = (c) => (pre = {}) => {
    const { O, $, S, esc, dialog, closeDialog, formData } = c, s = S(), editing = !!pre.id;
    const due = pre.due || Date.now();
    const d = dialog(`<p class="mono">Tarefa</p><h2>${editing ? "Editar tarefa" : "Nova tarefa"}</h2><form class="form" id="ftk">
      <div class="field"><span>O que precisa ser feito</span><input name="title" required value="${esc(pre.title || "")}"></div>
      <div class="row2"><div class="field"><span>Prazo</span><input name="due" type="date" value="${new Date(due - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)}"></div>
      <div class="field"><span>Prioridade</span><select name="priority">${["alta", "media", "baixa"].map((p) => `<option value="${p}" ${(pre.priority || "media") === p ? "selected" : ""}>${p === "media" ? "média" : p}</option>`).join("")}</select></div></div>
      <div class="row2"><div class="field"><span>Cliente</span><select name="leadId"><option value="">—</option>${s.leads.map((l) => `<option value="${l.id}" ${l.id === pre.leadId ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select></div>
      <div class="field"><span>Projeto</span><select name="projectId"><option value="">—</option>${s.projects.map((p) => `<option value="${p.id}" ${p.id === pre.projectId ? "selected" : ""}>${esc(p.title)}</option>`).join("")}</select></div></div>
      <div class="acts"><button class="btn btn--red">${editing ? "Salvar" : "Criar tarefa"}</button></div></form>`);
    $("#ftk", d).onsubmit = (e) => {
      e.preventDefault(); const x = formData(e.target);
      const data = { title: x.title, due: new Date(x.due + "T18:00").getTime(), priority: x.priority, leadId: x.leadId || null, projectId: x.projectId || null };
      O.update((s2) => { if (editing) Object.assign(s2.tasks.find((k) => k.id === pre.id), data); else s2.tasks.unshift({ id: O.uid("tk_"), ...data, done: false, doneAt: null, createdAt: Date.now() }); });
      closeDialog(); O.toast(editing ? "Tarefa salva." : "Tarefa criada.", "ok");
    };
  };

  /* ======================= PROPOSTAS ======================= */
  V.propostas = (v, _, c) => {
    const { O, $$, S, esc, money } = c, s = S();
    const list = [...s.proposals].sort((a, b) => b.createdAt - a.createdAt);
    const sum = (st) => list.filter((p) => st.includes(p.status)).reduce((a, p) => a + total(p), 0);
    const sent = list.filter((p) => p.status !== "rascunho").length, acc = list.filter((p) => p.status === "aceita").length;
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${list.length} propostas · ${sent ? Math.round((acc / sent) * 100) : 0}% aceitas</p><h1>Propostas</h1></div>
        <div class="acts"><button class="btn btn--red" id="npr">+ Nova proposta</button></div></header>
      <section class="grid g4" style="margin-bottom:16px">
        <div class="card kpi"><span class="mono">Aguardando resposta</span><b>${money(sum(["enviada", "vista"]))}</b><small>${list.filter((p) => ["enviada", "vista"].includes(p.status)).length} propostas</small></div>
        <div class="card kpi"><span class="mono">Vistas, sem resposta</span><b>${list.filter((p) => p.status === "vista").length}</b><small>hora de um follow-up</small></div>
        <div class="card kpi"><span class="mono">Aceitas</span><b>${money(sum(["aceita"]))}</b><small>${acc} propostas</small></div>
        <div class="card kpi"><span class="mono">Recusadas</span><b>${list.filter((p) => p.status === "recusada").length}</b><small>aprenda com elas</small></div>
      </section>
      <div class="card table-wrap"><table class="table"><thead><tr><th>Proposta</th><th>Cliente</th><th>Enviada</th><th>Acompanhamento</th><th class="r">Valor</th><th></th></tr></thead><tbody>
      ${list.map((p) => { const l = s.leads.find((x) => x.id === p.leadId), [lb, cl] = PST[p.status];
        return `<tr><td><strong>${esc(p.title)}</strong></td><td>${esc(l?.name || "—")}</td><td>${p.sentAt ? O.date(p.sentAt) : "—"}</td>
        <td><span class="chip ${cl}">${lb}</span> <small class="mono" style="text-transform:none">${p.viewedAt ? `vista ${O.ago(p.viewedAt)} · ${p.views || 1}×` : p.sentAt ? "ainda não aberta" : ""}${p.validUntil < Date.now() && !["aceita", "recusada"].includes(p.status) ? " · vencida" : ""}</small></td>
        <td class="r">${money(total(p))}</td><td class="r" style="white-space:nowrap"><button class="btn btn--sm btn--ghost" data-op="${p.id}">Abrir</button>${p.status === "vista" && l ? ` <a class="btn btn--sm" target="_blank" rel="noopener" href="${c.waLink(l.phone, `Oi ${l.name.split(" ")[0]}! Vi que você abriu a proposta “${p.title}”. Ficou alguma dúvida? Posso ajustar o que precisar.`)}">Follow-up</a>` : ""}</td></tr>`; }).join("") || '<tr><td colspan="6" class="mono">Nenhuma proposta.</td></tr>'}
      </tbody></table></div>`;
    $$("#npr", v).forEach((b) => (b.onclick = () => A.proposal(c)("")));
    $$("[data-op]", v).forEach((b) => (b.onclick = () => A.proposal(c)(null, b.dataset.op)));
  };

  A.proposal = (c) => (leadId, editId) => {
    const { O, $, $$, S, esc, money, dialog, closeDialog } = c, s = S();
    const ex = editId && s.proposals.find((p) => p.id === editId);
    const l0 = s.leads.find((x) => x.id === (ex?.leadId || leadId));
    let items = ex ? ex.items.map((x) => ({ ...x })) : [{ desc: `Cobertura fotográfica — ${l0?.type || "sessão"}`, qty: 1, price: l0?.value || 0 }];
    const d = dialog(`<p class="mono">${ex ? PST[ex.status][0] : "nova"}</p><h2>${ex ? "Proposta" : "Nova proposta"}</h2><form class="form" id="fpr">
      <div class="row2"><div class="field"><span>Cliente</span><select name="leadId" required><option value="">—</option>${s.leads.map((x) => `<option value="${x.id}" ${x.id === l0?.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
      <div class="field"><span>Válida até</span><input name="valid" type="date" value="${new Date(ex?.validUntil || Date.now() + 10 * O.DAY).toISOString().slice(0, 10)}"></div></div>
      <div class="field"><span>Título</span><input name="title" required value="${esc(ex?.title || (l0 ? `${l0.type} — ${l0.name}` : ""))}"></div>
      <div class="field"><span>Mensagem</span><textarea name="message" rows="2">${esc(ex?.message || "Foi muito bom conversar com você. Preparei esta proposta pensando no seu dia.")}</textarea></div>
      <div class="field"><span>Itens</span><div id="items"></div><button type="button" class="btn btn--sm btn--ghost" id="addIt" style="justify-self:start">+ Item</button></div>
      <div class="row2"><div class="field"><span>Desconto (R$)</span><input name="discount" type="number" min="0" step="0.01" value="${ex?.discount || 0}"></div><div class="field"><span>Total</span><input id="tot" readonly></div></div>
      <div class="acts"><button class="btn btn--red" name="send" value="1">${ex && ex.status !== "rascunho" ? "Salvar e copiar link" : "Salvar e enviar"}</button><button class="btn btn--ghost" name="draft" value="1">Salvar rascunho</button>${ex ? '<button type="button" class="btn btn--ghost" id="prp">PDF</button><button type="button" class="btn btn--ghost" id="dlp" style="--fg:var(--safelight)">Excluir</button>' : ""}</div></form>`, { wide: true });
    const f = $("#fpr", d), box = $("#items", d);
    const paint = () => {
      box.innerHTML = items.map((it, i) => `<div class="itrow"><input data-i="${i}" data-k="desc" value="${esc(it.desc)}" placeholder="Descrição"><input data-i="${i}" data-k="qty" type="number" min="1" value="${it.qty}"><input data-i="${i}" data-k="price" type="number" step="0.01" min="0" value="${it.price}"><button type="button" class="icon-btn" data-x="${i}">×</button></div>`).join("");
      $$("[data-k]", box).forEach((inp) => (inp.oninput = () => { const it = items[+inp.dataset.i]; it[inp.dataset.k] = inp.dataset.k === "desc" ? inp.value : +inp.value; calc(); }));
      $$("[data-x]", box).forEach((b) => (b.onclick = () => { items.splice(+b.dataset.x, 1); paint(); }));
      calc();
    };
    const calc = () => { $("#tot", d).value = money(Math.max(0, items.reduce((a, it) => a + it.qty * it.price, 0) - (+f.discount.value || 0))); };
    f.discount.oninput = calc;
    $("#addIt", d).onclick = () => { items.push({ desc: "", qty: 1, price: 0 }); paint(); };
    paint();
    let mode = "send";
    f.send.onclick = () => (mode = "send"); f.draft.onclick = () => (mode = "draft");
    f.onsubmit = (e) => {
      e.preventDefault();
      const id = ex?.id || O.uid("pr_");
      const data = { leadId: f.leadId.value, title: f.title.value, message: f.message.value, items: items.filter((it) => it.desc), discount: +f.discount.value || 0, validUntil: new Date(f.valid.value + "T23:59").getTime() };
      O.update((s2) => {
        let p = s2.proposals.find((x) => x.id === id);
        if (!p) { p = { id, status: "rascunho", createdAt: Date.now(), sentAt: null, viewedAt: null, respondedAt: null, views: 0 }; s2.proposals.unshift(p); }
        Object.assign(p, data);
        if (mode === "send" && p.status === "rascunho") { p.status = "enviada"; p.sentAt = Date.now(); const L = s2.leads.find((x) => x.id === p.leadId); if (L && L.stage === "lead") L.stage = "orcamento"; O.log(`Proposta enviada: ${p.title}`, "info"); }
      });
      const p = S().proposals.find((x) => x.id === id), L = S().leads.find((x) => x.id === p.leadId);
      if (mode === "draft") { closeDialog(); return O.toast("Rascunho salvo.", "ok"); }
      const link = O.proposalLink(p);
      dialog(`<p class="mono">Proposta enviada</p><h2>${esc(p.title)}</h2><p>Você vai ver aqui quando o cliente abrir, aceitar ou recusar.</p>
        <div class="field"><span>Link da proposta</span><input readonly value="${esc(link)}"></div>
        <div class="acts"><button class="btn btn--sm" id="cpp">Copiar link</button>${L ? `<a class="btn btn--sm btn--red" target="_blank" rel="noopener" href="${c.waLink(L.phone, `Oi ${L.name.split(" ")[0]}! Segue a proposta “${p.title}”: ${link}`)}">Enviar no WhatsApp</a>` : ""}<a class="btn btn--sm btn--ghost" target="_blank" rel="noopener" href="${link}">Ver como cliente ↗</a></div>`);
      $("#cpp").onclick = () => O.copy(link, "Link da proposta copiado.");
    };
    $("#prp", d)?.addEventListener("click", () => printProposal(c, S().proposals.find((x) => x.id === ex.id)));
    $("#dlp", d)?.addEventListener("click", () => { if (confirm("Excluir esta proposta?")) { O.update((s2) => (s2.proposals = s2.proposals.filter((x) => x.id !== ex.id))); closeDialog(); } });
  };

  function printProposal(c, p) {
    const { O, S, esc, money, printHTML, docHead } = c, l = S().leads.find((x) => x.id === p.leadId);
    printHTML(`${docHead(p.title, `Proposta · ${new Date(p.createdAt).toLocaleDateString("pt-BR")} · válida até ${new Date(p.validUntil).toLocaleDateString("pt-BR")}`)}
      <p>${esc(l ? `Oi, ${l.name.split(" ")[0]}! ` : "")}${esc(p.message)}</p>
      <table>${p.items.map((it) => `<tr><td>${esc(it.desc)}${it.qty > 1 ? ` × ${it.qty}` : ""}</td><td style="text-align:right">${money(it.qty * it.price)}</td></tr>`).join("")}
      ${p.discount ? `<tr><td>Desconto</td><td style="text-align:right">− ${money(p.discount)}</td></tr>` : ""}<tr class="tot"><td>Total</td><td style="text-align:right">${money(total(p))}</td></tr></table>
      <p>Aceite online: ${esc(O.proposalLink(p))}</p><div class="sig"><div>${esc(S().studio.name)}</div><div>${esc(l?.name || "")}</div></div>`);
  }

  window.OBProposalTotal = total;
})();
