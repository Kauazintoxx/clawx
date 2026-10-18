/* ==========================================================================
   OFFBEAT — painel · Financeiro
   Fluxo de caixa, contas a receber e a pagar, vencimentos, despesas,
   relatórios e projeção. Rotas: #/financeiro[/receber|/pagar|/relatorios]
   ========================================================================== */
(function () {
  const V = (window.OBViews = window.OBViews || {});
  const A = (window.OBActionFactories = window.OBActionFactories || {});
  const CATS = ["Estúdio", "Equipamento", "Software", "Marketing", "Transporte", "Impostos", "Equipe", "Laboratório", "Outros"];
  const DAY = 864e5;
  const mk = (d) => { const x = new Date(d); return x.getFullYear() * 12 + x.getMonth(); };
  const monName = (k) => new Date(Math.floor(k / 12), k % 12, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");

  /** Entradas/saídas por mês: realizado (pago) até hoje e previsto (pendente) adiante. */
  function flow(s, from, to) {
    const rows = [];
    for (let k = from; k <= to; k++) {
      const inPaid = s.payments.filter((p) => p.status === "pago" && mk(p.paidAt || p.createdAt) === k).reduce((a, p) => a + p.amount, 0);
      const inDue = s.payments.filter((p) => p.status !== "pago" && mk(Math.max(p.dueDate, Date.now())) === k).reduce((a, p) => a + p.amount, 0);
      const outPaid = s.expenses.filter((e) => e.status === "pago" && mk(e.paidAt || e.dueDate) === k).reduce((a, e) => a + e.amount, 0);
      const outDue = s.expenses.filter((e) => e.status !== "pago" && mk(Math.max(e.dueDate, Date.now())) === k).reduce((a, e) => a + e.amount, 0);
      rows.push({ k, inPaid, inDue, outPaid, outDue });
    }
    return rows;
  }

  /** Projeção: recebíveis e contas já lançados + despesas recorrentes + média de receita dos últimos 3 meses. */
  function projection(s, months = 3) {
    const nowK = mk(Date.now()), hist = flow(s, nowK - 3, nowK - 1);
    const avgIn = hist.reduce((a, r) => a + r.inPaid, 0) / 3;
    const recurring = s.expenses.filter((e) => e.recurring && mk(e.dueDate) === nowK - 1);
    const out = [];
    for (let i = 1; i <= months; i++) {
      const k = nowK + i;
      const booked = flow(s, k, k)[0];
      const rec = recurring.filter((e) => !s.expenses.some((x) => x.recurring && x.desc === e.desc && mk(x.dueDate) === k)).reduce((a, e) => a + e.amount, 0);
      const expIn = Math.max(booked.inDue, avgIn * 0.85);
      out.push({ k, in: expIn, out: booked.outDue + rec, booked: booked.inDue });
    }
    return { avgIn, rows: out };
  }

  V.financeiro = (v, tab = "visao", c) => {
    const { O, $, $$, S, esc, money } = c, s = S(), t = Date.now();
    tab = tab || "visao";
    const TABS = [["visao", "Fluxo de caixa"], ["receber", "A receber"], ["pagar", "A pagar"], ["relatorios", "Relatórios"]];
    const overdueIn = s.payments.filter((p) => p.status !== "pago" && p.dueDate < t);
    const overdueOut = s.expenses.filter((e) => e.status !== "pago" && e.dueDate < t);
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${overdueIn.length} recebimentos vencidos · ${overdueOut.length} contas vencidas</p><h1>Financeiro</h1></div>
        <div class="acts"><button class="btn btn--ghost" id="nx">+ Despesa</button><button class="btn btn--red" id="nc">+ Cobrança</button></div></header>
      <nav class="subtabs">${TABS.map(([k, n]) => `<a href="#/financeiro/${k}" class="${k === tab ? "on" : ""}" style="text-decoration:none"><button tabindex="-1" class="${k === tab ? "on" : ""}">${n}</button></a>`).join("")}</nav>
      <div id="fin"></div>`;
    $("#nc", v).onclick = () => c.newCharge();
    $("#nx", v).onclick = () => A.expense(c)();
    const box = $("#fin", v);
    ({ visao, receber, pagar, relatorios }[tab] || visao)(box, c, s, t);
  };

  /* ---------- fluxo de caixa ---------- */
  function visao(box, c, s, t) {
    const { money, esc, O } = c, nowK = mk(t);
    const rows = flow(s, nowK - 5, nowK + 2);
    const max = Math.max(1, ...rows.map((r) => Math.max(r.inPaid + r.inDue, r.outPaid + r.outDue)));
    const cur = rows[5];
    const balance = (r) => r.inPaid + r.inDue - r.outPaid - r.outDue;
    let acc = 0;
    const cumul = rows.map((r) => (acc += r.k <= nowK ? r.inPaid - r.outPaid : 0));
    const pr = projection(s);
    const receivable = s.payments.filter((p) => p.status !== "pago").reduce((a, p) => a + p.amount, 0);
    const payable = s.expenses.filter((e) => e.status !== "pago").reduce((a, e) => a + e.amount, 0);
    box.innerHTML = `
      <section class="grid g4" style="margin-bottom:16px">
        <div class="card kpi"><span class="mono">Entrou no mês</span><b>${money(cur.inPaid)}</b><small>+ ${money(cur.inDue)} previsto</small></div>
        <div class="card kpi"><span class="mono">Saiu no mês</span><b>${money(cur.outPaid)}</b><small>+ ${money(cur.outDue)} a pagar</small></div>
        <div class="card kpi"><span class="mono">Resultado do mês</span><b style="color:${balance(cur) >= 0 ? "var(--ok)" : "var(--safelight)"}">${money(balance(cur))}</b><small>realizado + previsto</small></div>
        <div class="card kpi"><span class="mono">Saldo a receber − a pagar</span><b>${money(receivable - payable)}</b><small>${money(receivable)} − ${money(payable)}</small></div>
      </section>
      <div class="card" style="margin-bottom:16px"><h3>Fluxo de caixa mensal <span class="legend"><i class="lg-in"></i>entradas <i class="lg-out"></i>saídas <i class="lg-due"></i>previsto</span></h3>
        <div class="flow">${rows.map((r, i) => `<div class="flow__m ${r.k === nowK ? "cur" : ""} ${r.k > nowK ? "fut" : ""}">
          <div class="flow__bars">
            <div class="flow__col"><i class="in" style="height:${(r.inPaid / max) * 100}%" title="Entradas ${money(r.inPaid)}"></i><i class="due" style="height:${(r.inDue / max) * 100}%" title="A receber ${money(r.inDue)}"></i></div>
            <div class="flow__col"><i class="out" style="height:${(r.outPaid / max) * 100}%" title="Saídas ${money(r.outPaid)}"></i><i class="due" style="height:${(r.outDue / max) * 100}%" title="A pagar ${money(r.outDue)}"></i></div>
          </div><span>${monName(r.k)}</span><b class="mono" style="color:${balance(r) >= 0 ? "var(--ok)" : "var(--safelight)"}">${balance(r) >= 0 ? "+" : ""}${Math.round(balance(r)).toLocaleString("pt-BR")}</b></div>`).join("")}</div>
      </div>
      <section class="grid g2">
        <div class="card"><h3>Projeção · próximos 3 meses <span class="mono">média recente ${money(pr.avgIn)}/mês</span></h3>
          <div class="table-wrap"><table class="table"><thead><tr><th>Mês</th><th class="r">Entradas previstas</th><th class="r">Saídas previstas</th><th class="r">Resultado</th></tr></thead><tbody>
          ${pr.rows.map((r) => `<tr><td>${monName(r.k)}</td><td class="r">${money(r.in)}${r.booked ? `<br><small class="mono" style="text-transform:none">${money(r.booked)} já lançado</small>` : ""}</td><td class="r">${money(r.out)}</td><td class="r" style="color:${r.in - r.out >= 0 ? "var(--ok)" : "var(--safelight)"}">${money(r.in - r.out)}</td></tr>`).join("")}
          </tbody></table></div>
          <p class="mono" style="text-transform:none;margin-top:10px">Considera cobranças e contas já lançadas, despesas recorrentes e 85% da média de entradas dos últimos 3 meses.</p></div>
        <div class="card"><h3>Vencimentos · próximos 14 dias</h3><div class="list">${[
          ...s.payments.filter((p) => p.status !== "pago" && p.dueDate < t + 14 * DAY).map((p) => ({ d: p.dueDate, txt: p.desc, v: p.amount, kind: "in" })),
          ...s.expenses.filter((e) => e.status !== "pago" && e.dueDate < t + 14 * DAY).map((e) => ({ d: e.dueDate, txt: e.desc, v: e.amount, kind: "out" })),
        ].sort((a, b) => a.d - b.d).map((x) => `<div><span class="date">${new Date(x.d).getDate()}<small>${new Date(x.d).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</small></span><div class="grow"><strong>${esc(x.txt)}</strong><small>${x.kind === "in" ? "a receber" : "a pagar"}${x.d < t ? ' · <span style="color:var(--safelight)">vencido</span>' : ""}</small></div><b class="mono" style="color:${x.kind === "in" ? "var(--ok)" : "var(--safelight)"}">${x.kind === "in" ? "+" : "−"} ${money(x.v)}</b></div>`).join("") || '<p class="mono">Nada vencendo.</p>'}</div></div>
      </section>`;
  }

  /* ---------- a receber ---------- */
  let rf = "abertos";
  function receber(box, c, s, t) {
    const { O, $$, esc, money } = c;
    const F = { abertos: (p) => p.status !== "pago", vencidos: (p) => p.status !== "pago" && p.dueDate < t, informados: (p) => p.status === "informado", pagos: (p) => p.status === "pago", todos: () => true };
    const list = s.payments.filter(F[rf]).sort((a, b) => (rf === "pagos" ? (b.paidAt || b.createdAt) - (a.paidAt || a.createdAt) : a.dueDate - b.dueDate));
    box.innerHTML = `<div class="filters"><div class="chips">${Object.keys(F).map((k) => `<button data-rf="${k}" class="${rf === k ? "on" : ""}">${k[0].toUpperCase() + k.slice(1)} <i>${s.payments.filter(F[k]).length}</i></button>`).join("")}</div></div>
      <div class="card table-wrap"><table class="table"><thead><tr><th>Descrição</th><th>Cliente</th><th>Vencimento</th><th>Status</th><th class="r">Valor</th><th></th></tr></thead><tbody>
      ${list.map((p) => { const l = s.leads.find((x) => x.id === p.leadId), late = p.status !== "pago" && p.dueDate < t;
        return `<tr><td>${esc(p.desc)}</td><td>${esc(l?.name || "—")}</td><td style="${late ? "color:var(--safelight)" : ""}">${O.date(p.dueDate)}${late ? " · vencido" : ""}</td>
        <td><span class="chip ${p.status === "pago" ? "ok" : p.status === "informado" ? "blue" : late ? "red" : "warn"}">${p.status === "informado" ? "cliente avisou" : p.status}</span></td><td class="r">${money(p.amount)}</td>
        <td class="r" style="white-space:nowrap">${p.status !== "pago" ? `<button class="btn btn--sm btn--ghost" data-pix="${p.id}">Pix</button> ${late && l ? `<a class="btn btn--sm btn--ghost" target="_blank" rel="noopener" href="${c.waLink(l.phone, `Oi ${l.name.split(" ")[0]}! Passando para lembrar do pagamento “${p.desc}” (${money(p.amount)}), que venceu em ${O.date(p.dueDate)}. Segue o link: ${O.payLink(p)}`)}">Cobrar</a> ` : ""}<button class="btn btn--sm" data-paid="${p.id}">Recebido</button>` : `<small class="mono">${p.paidAt ? O.date(p.paidAt) : ""}</small>`}</td></tr>`; }).join("") || '<tr><td colspan="6" class="mono">Nada aqui.</td></tr>'}
      </tbody></table></div>`;
    $$("[data-rf]", box).forEach((b) => (b.onclick = () => { rf = b.dataset.rf; c.route(); }));
    $$("[data-pix]", box).forEach((b) => (b.onclick = () => c.pixDialog(s.payments.find((p) => p.id === b.dataset.pix))));
    $$("[data-paid]", box).forEach((b) => (b.onclick = () => O.update((s2) => {
      const p = s2.payments.find((x) => x.id === b.dataset.paid); p.status = "pago"; p.paidAt = Date.now();
      if (p.galleryId) { const g = s2.galleries.find((x) => x.id === p.galleryId); if (g && !p.orderId) g.paid = true; if (g && p.orderId) { const o = (g.orders || []).find((x) => x.id === p.orderId); if (o) o.status = "pago"; } }
      O.log(`Pagamento recebido — ${p.desc} · ${money(p.amount)}`, "pay");
    })));
  }

  /* ---------- a pagar ---------- */
  let pf = "abertas";
  function pagar(box, c, s, t) {
    const { O, $$, esc, money } = c;
    const F = { abertas: (e) => e.status !== "pago", vencidas: (e) => e.status !== "pago" && e.dueDate < t, recorrentes: (e) => e.recurring && e.status !== "pago", pagas: (e) => e.status === "pago" };
    const list = s.expenses.filter(F[pf]).sort((a, b) => (pf === "pagas" ? (b.paidAt || 0) - (a.paidAt || 0) : a.dueDate - b.dueDate));
    box.innerHTML = `<div class="filters"><div class="chips">${Object.keys(F).map((k) => `<button data-pf="${k}" class="${pf === k ? "on" : ""}">${k[0].toUpperCase() + k.slice(1)} <i>${s.expenses.filter(F[k]).length}</i></button>`).join("")}</div></div>
      <div class="card table-wrap"><table class="table"><thead><tr><th>Conta</th><th>Categoria</th><th>Vencimento</th><th>Status</th><th class="r">Valor</th><th></th></tr></thead><tbody>
      ${list.map((e) => { const late = e.status !== "pago" && e.dueDate < t;
        return `<tr><td>${esc(e.desc)}${e.recurring ? ' <span class="chip">mensal</span>' : ""}</td><td>${esc(e.category)}</td><td style="${late ? "color:var(--safelight)" : ""}">${O.date(e.dueDate)}${late ? " · vencida" : ""}</td>
        <td><span class="chip ${e.status === "pago" ? "ok" : late ? "red" : "warn"}">${e.status === "pago" ? "paga" : late ? "vencida" : "a pagar"}</span></td><td class="r">${money(e.amount)}</td>
        <td class="r" style="white-space:nowrap">${e.status !== "pago" ? `<button class="btn btn--sm" data-pay="${e.id}">Paguei</button> ` : ""}<button class="icon-btn" data-ed="${e.id}" aria-label="Editar">✎</button><button class="icon-btn" data-rm="${e.id}" aria-label="Excluir">×</button></td></tr>`; }).join("") || '<tr><td colspan="6" class="mono">Nada aqui.</td></tr>'}
      </tbody></table></div>`;
    $$("[data-pf]", box).forEach((b) => (b.onclick = () => { pf = b.dataset.pf; c.route(); }));
    $$("[data-pay]", box).forEach((b) => (b.onclick = () => O.update((s2) => {
      const e = s2.expenses.find((x) => x.id === b.dataset.pay); e.status = "pago"; e.paidAt = Date.now();
      // recorrente: já lança a do próximo mês
      if (e.recurring) { const d = new Date(e.dueDate); d.setMonth(d.getMonth() + 1); s2.expenses.push({ ...e, id: O.uid("ex_"), dueDate: d.getTime(), status: "pendente", paidAt: null, createdAt: Date.now() }); }
      O.log(`Conta paga — ${e.desc} · ${money(e.amount)}`, "info");
    })));
    $$("[data-ed]", box).forEach((b) => (b.onclick = () => A.expense(c)(s.expenses.find((x) => x.id === b.dataset.ed))));
    $$("[data-rm]", box).forEach((b) => (b.onclick = () => { if (confirm("Excluir esta conta?")) O.update((s2) => (s2.expenses = s2.expenses.filter((x) => x.id !== b.dataset.rm))); }));
  }

  A.expense = (c) => (pre = {}) => {
    const { O, $, esc, dialog, closeDialog, formData } = c, editing = !!pre.id;
    const d = dialog(`<p class="mono">Contas a pagar</p><h2>${editing ? "Editar despesa" : "Nova despesa"}</h2><form class="form" id="fx">
      <div class="field"><span>Descrição</span><input name="desc" required value="${esc(pre.desc || "")}" placeholder="Ex.: Aluguel do estúdio"></div>
      <div class="row2"><div class="field"><span>Valor (R$)</span><input name="amount" type="number" step="0.01" min="0.01" required value="${pre.amount || ""}"></div>
      <div class="field"><span>Vencimento</span><input name="due" type="date" required value="${new Date(pre.dueDate || Date.now()).toISOString().slice(0, 10)}"></div></div>
      <div class="row2"><div class="field"><span>Categoria</span><select name="category">${CATS.map((k) => `<option ${pre.category === k ? "selected" : ""}>${k}</option>`).join("")}</select></div>
      <div class="field"><span>Status</span><select name="status"><option value="pendente">A pagar</option><option value="pago" ${pre.status === "pago" ? "selected" : ""}>Já paga</option></select></div></div>
      <label class="switch">Repete todo mês<small>Ao marcar como paga, a do mês seguinte é lançada sozinha</small><input type="checkbox" name="recurring" ${pre.recurring ? "checked" : ""}></label>
      <div class="acts"><button class="btn btn--red">${editing ? "Salvar" : "Lançar despesa"}</button></div></form>`);
    $("#fx", d).onsubmit = (e) => {
      e.preventDefault(); const x = formData(e.target);
      const data = { desc: x.desc, amount: +x.amount, dueDate: new Date(x.due + "T12:00").getTime(), category: x.category, status: x.status, recurring: !!x.recurring, paidAt: x.status === "pago" ? (pre.paidAt || Date.now()) : null };
      O.update((s2) => { if (editing) Object.assign(s2.expenses.find((y) => y.id === pre.id), data); else s2.expenses.push({ id: O.uid("ex_"), ...data, createdAt: Date.now() }); O.log(`Despesa ${editing ? "editada" : "lançada"}: ${x.desc}`, "info"); });
      closeDialog(); O.toast("Despesa salva.", "ok");
    };
  };

  /* ---------- relatórios ---------- */
  let period = 6;
  function relatorios(box, c, s, t) {
    const { $, $$, esc, money } = c, nowK = mk(t), from = nowK - period + 1;
    const inRange = (d) => mk(d) >= from && mk(d) <= nowK;
    const paidIn = s.payments.filter((p) => p.status === "pago" && inRange(p.paidAt || p.createdAt));
    const paidOut = s.expenses.filter((e) => e.status === "pago" && inRange(e.paidAt || e.dueDate));
    const tin = paidIn.reduce((a, p) => a + p.amount, 0), tout = paidOut.reduce((a, e) => a + e.amount, 0);
    const byCat = {}; paidOut.forEach((e) => (byCat[e.category] = (byCat[e.category] || 0) + e.amount));
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const byType = {}; s.leads.filter((l) => l.stage === "fechado").forEach((l) => (byType[l.type] = (byType[l.type] || 0) + l.value));
    const types = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const rows = flow(s, from, nowK);
    const maxC = cats[0]?.[1] || 1, maxT = types[0]?.[1] || 1;
    box.innerHTML = `
      <div class="filters"><div class="chips">${[[3, "3 meses"], [6, "6 meses"], [12, "12 meses"]].map(([k, n]) => `<button data-pe="${k}" class="${period === k ? "on" : ""}">${n}</button>`).join("")}</div><button class="btn btn--sm btn--ghost" id="csvF" style="margin-left:auto">Exportar CSV</button><button class="btn btn--sm btn--ghost" id="prF">Imprimir / PDF</button></div>
      <section class="grid g4" style="margin-bottom:16px">
        <div class="card kpi"><span class="mono">Receitas</span><b>${money(tin)}</b><small>${paidIn.length} recebimentos</small></div>
        <div class="card kpi"><span class="mono">Despesas</span><b>${money(tout)}</b><small>${paidOut.length} pagamentos</small></div>
        <div class="card kpi"><span class="mono">Lucro</span><b style="color:${tin - tout >= 0 ? "var(--ok)" : "var(--safelight)"}">${money(tin - tout)}</b><small>margem ${tin ? Math.round(((tin - tout) / tin) * 100) : 0}%</small></div>
        <div class="card kpi"><span class="mono">Média mensal</span><b>${money((tin - tout) / period)}</b><small>de lucro</small></div>
      </section>
      <section class="grid g2" style="margin-bottom:16px">
        <div class="card"><h3>Despesas por categoria</h3><div class="hbars">${cats.map(([k, val]) => `<div><span>${esc(k)}</span><em><i style="width:${(val / maxC) * 100}%"></i></em><b class="mono">${money(val)}</b></div>`).join("") || '<p class="mono">Sem despesas no período.</p>'}</div></div>
        <div class="card"><h3>Receita fechada por tipo de trabalho</h3><div class="hbars">${types.map(([k, val]) => `<div><span>${esc(k)}</span><em><i style="width:${(val / maxT) * 100}%"></i></em><b class="mono">${money(val)}</b></div>`).join("") || '<p class="mono">Sem negócios fechados.</p>'}</div></div>
      </section>
      <div class="card table-wrap"><h3>Demonstrativo mensal</h3><table class="table"><thead><tr><th>Mês</th><th class="r">Receitas</th><th class="r">Despesas</th><th class="r">Resultado</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${monName(r.k)} ${Math.floor(r.k / 12)}</td><td class="r">${money(r.inPaid)}</td><td class="r">${money(r.outPaid)}</td><td class="r" style="color:${r.inPaid - r.outPaid >= 0 ? "var(--ok)" : "var(--safelight)"}">${money(r.inPaid - r.outPaid)}</td></tr>`).join("")}
        <tr><td><strong>Total</strong></td><td class="r"><strong>${money(tin)}</strong></td><td class="r"><strong>${money(tout)}</strong></td><td class="r"><strong>${money(tin - tout)}</strong></td></tr></tbody></table></div>`;
    $$("[data-pe]", box).forEach((b) => (b.onclick = () => { period = +b.dataset.pe; c.route(); }));
    $("#csvF", box).onclick = () => {
      const lines = [["tipo", "data", "descricao", "categoria", "valor"], ...paidIn.map((p) => ["receita", new Date(p.paidAt || p.createdAt).toLocaleDateString("pt-BR"), p.desc, p.category || "Serviço", p.amount.toFixed(2).replace(".", ",")]),
        ...paidOut.map((e) => ["despesa", new Date(e.paidAt || e.dueDate).toLocaleDateString("pt-BR"), e.desc, e.category, (-e.amount).toFixed(2).replace(".", ",")])];
      const csv = lines.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";")).join("\n");
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = `financeiro-${period}m.csv`; a.click();
    };
    $("#prF", box).onclick = () => c.printHTML(`${c.docHead("Relatório financeiro", `Últimos ${period} meses · ${new Date().toLocaleDateString("pt-BR")}`)}
      <table><tr><td>Receitas</td><td style="text-align:right">${money(tin)}</td></tr><tr><td>Despesas</td><td style="text-align:right">${money(tout)}</td></tr><tr class="tot"><td>Resultado</td><td style="text-align:right">${money(tin - tout)}</td></tr></table>
      <h3>Despesas por categoria</h3><table>${cats.map(([k, val]) => `<tr><td>${esc(k)}</td><td style="text-align:right">${money(val)}</td></tr>`).join("")}</table>
      <h3>Mês a mês</h3><table>${rows.map((r) => `<tr><td>${monName(r.k)}</td><td style="text-align:right">${money(r.inPaid)} − ${money(r.outPaid)} = ${money(r.inPaid - r.outPaid)}</td></tr>`).join("")}</table>`);
  }
})();
