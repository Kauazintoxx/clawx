/* ==========================================================================
   OFFBEAT — inteligência do estúdio
   Cálculos puros sobre o estado (sem tela): prioridade de clientes,
   oportunidades de receita, fila de edição, lucro por serviço, pós-venda,
   jornada do cliente e preparação. Usado pelo painel e pelas páginas públicas.
   ========================================================================== */
(function () {
  const DAY = 864e5;
  const money = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const first = (n) => String(n || "").split(" ")[0];
  const days = (ms) => Math.round(ms / DAY);
  const propTotal = (p) => Math.max(0, p.items.reduce((a, it) => a + it.qty * it.price, 0) - (p.discount || 0));

  /* ---------------- dados novos (migração) ---------------- */
  function ensure(s, O) {
    const t = Date.now(), uid = O.uid;
    s.settings ??= { hoursPerDay: 6, workDays: [1, 2, 3, 4, 5], minPerPhoto: 2, targetHour: 150, deliveryDays: 30, weeklySlots: 4 };
    s.dismissed ??= {};
    s.services ??= [
      ["Casamento", 8900, { reuniao: 3, sessao: 10, deslocamento: 3, edicao: 24, entrega: 3 }, { equipe: 450, transporte: 280, album: 890, outros: 120 }],
      ["Ensaio", 900, { reuniao: 1, sessao: 2, deslocamento: 1, edicao: 4, entrega: 1 }, { equipe: 0, transporte: 60, album: 0, outros: 20 }],
      ["Gestante", 1200, { reuniao: 1, sessao: 2, deslocamento: 1, edicao: 5, entrega: 1 }, { equipe: 0, transporte: 60, album: 0, outros: 40 }],
      ["Newborn", 1500, { reuniao: 1, sessao: 4, deslocamento: 1, edicao: 8, entrega: 1 }, { equipe: 0, transporte: 60, album: 0, outros: 90 }],
      ["15 anos", 5600, { reuniao: 2, sessao: 7, deslocamento: 2, edicao: 16, entrega: 2 }, { equipe: 450, transporte: 200, album: 700, outros: 80 }],
      ["Corporativo", 3400, { reuniao: 2, sessao: 6, deslocamento: 2, edicao: 6, entrega: 1 }, { equipe: 300, transporte: 150, album: 0, outros: 0 }],
      ["Evento", 2200, { reuniao: 1, sessao: 5, deslocamento: 2, edicao: 14, entrega: 2 }, { equipe: 250, transporte: 150, album: 0, outros: 0 }],
    ].map(([type, price, hours, costs]) => ({ id: uid("sv_"), type, price, hours, costs, taxPct: 6 }));
    if (!s._seed2) {
      s._seed2 = true;
      const add = (id, name, type, value, ago, phone) => { if (!s.leads.some((l) => l.id === id)) s.leads.push({ id, name, type, value, stage: "fechado", email: first(name).toLowerCase() + "@email.com", phone, source: "Indicação", eventDate: t - ago * DAY, createdAt: t - (ago + 30) * DAY, notes: "", contract: null }); };
      add("l_camila", "Camila Rocha", "Ensaio", 900, 380, "11999991101");
      add("l_souza", "Família Souza", "Newborn", 1500, 200, "11999991102");
      add("l_marcos", "Marcos & Lia", "Casamento", 9200, 352, "11999991103");
      const run = s.galleries.find((g) => g.id === "g_corrida");
      if (run && !run.carts) run.carts = [
        { id: uid("ct_"), items: run.photos.slice(2, 5).map((p) => p.id), email: "joao.corredor@email.com", updatedAt: t - DAY, checkout: true },
        { id: uid("ct_"), items: run.photos.slice(8, 9).map((p) => p.id), email: "", updatedAt: t - 2 * DAY, checkout: false },
      ];
    }
    s.galleries.forEach((g) => { if (g.type === "venda") g.carts ??= []; });
    s.projects.forEach((pj) => { pj.prep ??= { sentAt: null, openedAt: null, completedAt: null, answers: {}, checks: {} }; });
    return s;
  }

  /* ---------------- CRM: prioridade e próximo passo ---------------- */
  function leadInsight(l, s) {
    const t = Date.now();
    const props = s.proposals.filter((p) => p.leadId === l.id);
    const open = props.find((p) => ["enviada", "vista"].includes(p.status));
    const age = days(t - l.createdAt);
    const toEvent = days((l.eventDate || t) - t);
    let score = Math.min(40, (l.value || 0) / 300); // valor pesa até 40
    let next = "", why = "";
    if (l.stage === "lead") { score += age >= 1 ? 30 : 15; next = "Responder e enviar proposta"; why = age >= 1 ? `contato parado há ${age} dia${age > 1 ? "s" : ""}` : "contato novo"; }
    else if (l.stage === "orcamento" || l.stage === "negociacao") {
      if (open?.status === "vista") { const d = days(t - open.viewedAt); score += 35; next = "Follow-up: a proposta foi vista"; why = `viu ${open.views || 1}× e não respondeu (${d}d)`; }
      else if (open) { const d = days(t - open.sentAt); score += d >= 3 ? 25 : 10; next = d >= 3 ? "Confirmar se a proposta chegou" : "Aguardar resposta"; why = `proposta enviada há ${d}d`; }
      else { score += 20; next = "Enviar proposta"; why = "negociação sem proposta registrada"; }
    } else if (l.stage === "contrato") {
      const signed = l.contract?.signedAt;
      const paid = s.payments.some((p) => p.leadId === l.id && p.status === "pago");
      score += signed ? (paid ? 5 : 25) : 30;
      next = !l.contract ? "Gerar contrato" : !signed ? "Lembrar de assinar o contrato" : !paid ? "Cobrar o sinal" : "Criar projeto e preparação";
      why = !signed ? "reserva não garantida" : !paid ? "sinal pendente" : "reserva confirmada";
    } else if (l.stage === "fechado") { score = 0; next = toEvent > 0 ? "Enviar preparação do cliente" : "Pós-venda"; why = toEvent > 0 ? `faltam ${toEvent} dias` : "trabalho concluído"; }
    else { score = 0; next = "—"; why = "perdido"; }
    if (toEvent > 0 && toEvent < 45 && !["fechado", "perdido"].includes(l.stage)) { score += 15; why += ` · data em ${toEvent}d`; }
    const level = score >= 55 ? "alta" : score >= 30 ? "media" : "baixa";
    return { score: Math.round(score), level, next, why };
  }

  /* ---------------- jornada única do cliente ---------------- */
  const JOURNEY = [
    ["interessado", "Interessados"], ["reservado", "Reserva confirmada"], ["realizado", "Ensaio realizado"],
    ["editado", "Edição concluída"], ["entregue", "Fotos entregues"], ["pago", "Pagamento recebido"], ["recompra", "Recompra"],
  ];
  function journeyOf(l, s) {
    if (l.stage === "perdido") return null;
    if (["lead", "orcamento", "negociacao"].includes(l.stage)) return "interessado";
    const pj = s.projects.find((p) => p.leadId === l.id);
    const g = s.galleries.find((x) => x.leadId === l.id);
    const pays = s.payments.filter((p) => p.leadId === l.id);
    const allPaid = pays.length && pays.every((p) => p.status === "pago");
    const st = (k) => pj?.stages.find((x) => x.key === k)?.done;
    if (!pj && !g) return (l.eventDate || 0) < Date.now() - 60 * DAY ? "recompra" : "reservado";
    if (g?.delivered || st("entrega")) return allPaid ? ((l.eventDate || 0) < Date.now() - 90 * DAY ? "recompra" : "pago") : "entregue";
    if (st("edicao")) return "editado";
    if (st("sessao") || (pj && pj.date < Date.now())) return "realizado";
    return "reservado";
  }
  function journey(s) {
    const map = Object.fromEntries(JOURNEY.map(([k]) => [k, []]));
    s.leads.forEach((l) => { const k = journeyOf(l, s); if (k) map[k].push(l); });
    return JOURNEY.map(([k, name]) => ({ key: k, name, leads: map[k] }));
  }

  /* ---------------- lucro real por serviço ---------------- */
  function serviceProfit(sv) {
    const hours = Object.values(sv.hours).reduce((a, b) => a + (+b || 0), 0);
    const costs = Object.values(sv.costs).reduce((a, b) => a + (+b || 0), 0);
    const tax = (sv.price * (sv.taxPct || 0)) / 100;
    const profit = sv.price - costs - tax;
    return { hours, costs, tax, profit, perHour: hours ? profit / hours : 0, margin: sv.price ? profit / sv.price : 0 };
  }
  function priceFor(sv, targetHour) {
    const { hours, costs } = serviceProfit(sv);
    return (targetHour * hours + costs) / (1 - (sv.taxPct || 0) / 100);
  }

  /* ---------------- fila inteligente de edição e entrega ---------------- */
  function addWorkHours(start, hours, cfg) {
    let d = new Date(start), left = hours;
    d.setHours(9, 0, 0, 0);
    let guard = 0;
    while (left > 0 && guard++ < 400) {
      if (cfg.workDays.includes(d.getDay())) left -= cfg.hoursPerDay;
      if (left > 0) d.setDate(d.getDate() + 1);
    }
    d.setHours(18, 0, 0, 0);
    return d.getTime();
  }
  function queue(s) {
    const cfg = s.settings, t = Date.now(), jobs = [];
    s.galleries.filter((g) => g.type === "selecao" && g.selection.length && !g.delivered && (g.status === "finalizada" || g.status === "em-selecao")).forEach((g) => {
      const pj = s.projects.find((p) => p.galleryId === g.id || (g.leadId && p.leadId === g.leadId));
      const entrega = pj?.stages.find((x) => x.key === "entrega");
      const due = entrega && !entrega.done ? entrega.due : (g.finalizedAt || t) + cfg.deliveryDays * DAY;
      const hours = (g.selection.length * cfg.minPerPhoto) / 60 + 1; // +1h de exportação e revisão
      jobs.push({ id: "g:" + g.id, kind: "edicao", title: `Editar ${g.title}`, sub: `${g.selection.length} fotos · ${g.status === "finalizada" ? "seleção finalizada" : "cliente ainda escolhendo"}`, hours, due, ready: g.status === "finalizada", galleryId: g.id, projectId: pj?.id, leadId: g.leadId });
    });
    s.albums.filter((a) => a.status !== "aprovado").forEach((a) => {
      const g = s.galleries.find((x) => x.id === a.galleryId), pj = s.projects.find((p) => p.galleryId === a.galleryId);
      const st = pj?.stages.find((x) => x.key === "album");
      jobs.push({ id: "a:" + a.id, kind: "album", title: `Diagramar ${a.title}`, sub: `${a.spreads.length} lâminas · ${a.status}`, hours: Math.max(1, a.spreads.length * 0.3), due: st && !st.done ? st.due : t + 20 * DAY, ready: true, albumId: a.id, projectId: pj?.id, leadId: g?.leadId });
    });
    const order = s.queueOrder || [];
    jobs.sort((a, b) => {
      const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      if (ia >= 0 || ib >= 0) return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
      return (b.ready - a.ready) || a.due - b.due; // prontos primeiro, depois o prazo mais próximo
    });
    let cursor = t, acc = 0;
    jobs.forEach((j) => {
      acc += j.hours;
      j.finish = addWorkHours(t, acc, cfg);
      j.late = Math.max(0, days(j.finish - j.due));
      j.slack = days(j.due - j.finish);
    });
    const totalHours = jobs.reduce((a, j) => a + j.hours, 0);
    return { jobs, totalHours, freeOn: addWorkHours(t, totalHours, cfg) };
  }

  /* ---------------- pós-venda ---------------- */
  const UPSELL = {
    Gestante: { after: 45, label: "Ensaio newborn", text: (n) => `Oi ${n}! Como está o bebê? 💛 Os primeiros dias passam rápido — quer agendar o ensaio newborn? Tenho horários nas próximas semanas.` },
    Newborn: { after: 180, label: "Acompanhamento 6 meses / smash the cake", text: (n) => `Oi ${n}! O bebê já está quase com 6 meses? Que tal registrar essa fase — e já reservar o smash the cake do primeiro ano?` },
    Casamento: { after: 330, label: "Ensaio de 1 ano de casados", text: (n) => `Oi ${n}! O primeiro aniversário de casamento está chegando 🥂 Topam um ensaio de bodas de papel? Fica lindo ao lado do álbum.` },
    Ensaio: { after: 300, label: "Novo ensaio", text: (n) => `Oi ${n}! Faz quase um ano do nosso ensaio. Bora registrar este momento de novo? Tenho datas abertas.` },
    "15 anos": { after: 330, label: "Ensaio de aniversário", text: (n) => `Oi ${n}! Um ano da festa! Que tal um ensaio para comemorar os 16?` },
    Corporativo: { after: 300, label: "Cobertura anual", text: (n) => `Oi ${n}! Já estão planejando o evento deste ano? Posso reservar a data com a mesma equipe.` },
    Evento: { after: 300, label: "Próxima edição", text: (n) => `Oi ${n}! A próxima edição do evento já tem data? Quero garantir a cobertura.` },
  };
  function postSale(s) {
    const t = Date.now(), out = [];
    const ref = (l) => s.projects.find((p) => p.leadId === l.id)?.date || l.eventDate || l.createdAt;
    s.leads.filter((l) => l.stage === "fechado").forEach((l) => {
      const g = s.galleries.find((x) => x.leadId === l.id), since = days(t - ref(l));
      const name = first(l.name);
      if (g?.delivered || g?.status === "finalizada") {
        out.push({ key: `dep:${l.id}`, lead: l, kind: "Depoimento", title: `Pedir depoimento a ${l.name}`, why: "Fotos já com o cliente: é quando a lembrança está mais viva.", value: 0, text: `Oi ${name}! Espero que tenha amado as fotos 💛 Se puder, me conta em duas linhas como foi a experiência? Vou adorar colocar no site.` });
        if (!s.albums.some((a) => a.galleryId === g.id)) out.push({ key: `alb:${l.id}`, lead: l, kind: "Álbum", title: `Oferecer álbum a ${l.name}`, why: `Seleção pronta e nenhum álbum criado. ${g.selection.length} fotos escolhidas já cabem num álbum.`, value: 1100, text: `Oi ${name}! Separei uma proposta de álbum com as ${g.selection.length} fotos que você escolheu — fica pronto em 20 dias. Quer ver como ficaria?` });
      }
      const up = UPSELL[l.type];
      if (up && since >= up.after - 30 && since <= up.after + 120) out.push({ key: `up:${l.id}:${up.label}`, lead: l, kind: "Recompra", title: `${up.label} — ${l.name}`, why: `${since} dias desde o trabalho de ${l.type.toLowerCase()}: é o momento natural para a próxima sessão.`, value: (s.services.find((x) => x.type === (l.type === "Gestante" ? "Newborn" : l.type === "Casamento" ? "Ensaio" : l.type))?.price) || 900, text: up.text(name) });
      if (since > 20 && since < 400) out.push({ key: `ind:${l.id}`, lead: l, kind: "Indicação", title: `Pedir indicação a ${l.name}`, why: "Cliente satisfeito é a melhor fonte de novos contatos.", value: 0, text: `Oi ${name}! Se alguém próximo estiver procurando fotógrafo, pode me indicar? Quem chegar por você ganha um mimo no ensaio — e você também 🎁` });
    });
    return out.filter((a) => !s.dismissed[a.key]);
  }

  /* ---------------- oportunidades / receita perdida ---------------- */
  function freeSlots(s, horizonDays = 21) {
    const t = Date.now(), res = [];
    for (let i = 2; i <= horizonDays; i++) {
      const d = new Date(t + i * DAY); d.setHours(12, 0, 0, 0);
      const wd = d.getDay();
      if (wd !== 6 && wd !== 0) continue; // fins de semana: os mais procurados para ensaios
      const busy = s.events.some((e) => new Date(e.date).toDateString() === d.toDateString()) || s.projects.some((p) => new Date(p.date).toDateString() === d.toDateString());
      if (!busy) res.push(d.getTime());
    }
    return res;
  }
  function opportunities(s) {
    const t = Date.now(), list = [];
    const push = (o) => { if (!s.dismissed[o.key]) list.push(o); };
    // 1. propostas sem retorno
    s.proposals.filter((p) => ["enviada", "vista"].includes(p.status)).forEach((p) => {
      const l = s.leads.find((x) => x.id === p.leadId), d = days(t - (p.sentAt || p.createdAt)), v = propTotal(p);
      if (d < 2 && p.status === "enviada") return;
      const seen = p.status === "vista";
      push({ key: `prop:${p.id}`, cat: "Propostas sem retorno", icon: "📄", lead: l, value: v, score: v / 200 + d * 4 + (seen ? 25 : 0),
        title: `${seen ? "Proposta vista e sem resposta" : "Proposta sem retorno"}: ${p.title}`,
        why: seen ? `${first(l?.name)} abriu ${p.views || 1}× — há interesse. Enviada há ${d} dias.` : `Enviada há ${d} dias e ainda não foi aberta. Confirme se chegou.`,
        text: seen ? `Oi ${first(l?.name)}! Vi que você deu uma olhada na proposta “${p.title}”. Ficou alguma dúvida? Se quiser, ajusto itens ou forma de pagamento.` : `Oi ${first(l?.name)}! Te mandei a proposta “${p.title}” há alguns dias — chegou certinho? Qualquer dúvida estou por aqui.`,
        phone: l?.phone, href: "#/propostas" });
    });
    // 2. contatos parados
    s.leads.filter((l) => l.stage === "lead" && t - l.createdAt > DAY).forEach((l) => push({ key: `lead:${l.id}`, cat: "Propostas sem retorno", icon: "👤", lead: l, value: l.value || (s.services.find((x) => x.type === l.type)?.price || 0), score: 30 + days(t - l.createdAt) * 6,
      title: `Contato sem resposta: ${l.name}`, why: `Pediu orçamento de ${l.type.toLowerCase()} há ${days(t - l.createdAt)} dias. Quem responde primeiro costuma fechar.`,
      text: `Oi ${first(l.name)}! Aqui é ${s.studio.name}, da ${s.studio.brand}. Recebi seu pedido para ${l.type.toLowerCase()} — posso te mandar uma proposta hoje? Me conta a data e o local.`, phone: l.phone, href: "#/crm" }));
    // 3. agenda ociosa
    const slots = freeSlots(s), ensaio = s.services.find((x) => x.type === "Ensaio")?.price || 900;
    const audience = s.leads.filter((l) => l.stage === "fechado" && ["Ensaio", "Gestante", "Newborn", "Casamento"].includes(l.type));
    slots.slice(0, 2).forEach((d) => {
      const dt = new Date(d), label = dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
      push({ key: `slot:${dt.toDateString()}`, cat: "Agenda com horários ociosos", icon: "📅", value: ensaio * Math.min(3, s.settings.weeklySlots || 3), score: 28 + (21 - days(d - t)),
        title: `${label[0].toUpperCase() + label.slice(1)} está livre`, why: `Dá para encaixar até ${Math.min(3, s.settings.weeklySlots || 3)} mini-ensaios. ${audience.length} clientes antigos combinam com a oferta.`,
        text: `Oi! Abri uma agenda especial de mini-ensaios em ${label}: 40 minutos, 15 fotos editadas, entrega em 7 dias. São poucas vagas — quer reservar a sua?`, audience, href: "#/agenda" });
    });
    // 4. vendas incompletas
    s.galleries.filter((g) => g.type === "venda").forEach((g) => (g.carts || []).filter((c) => !c.recovered && c.items.length && t - c.updatedAt > 3 * 3600e3).forEach((c) => {
      const v = c.items.length * (g.unitPrice || 0);
      push({ key: `cart:${c.id}`, cat: "Vendas incompletas", icon: "🛒", value: v, score: 20 + v / 10 + (c.email ? 15 : -10),
        title: `Carrinho abandonado em ${g.title}`, why: `${c.items.length} foto${c.items.length > 1 ? "s" : ""} no carrinho${c.email ? ` de ${c.email}` : " (sem contato registrado)"} há ${Math.max(1, days(t - c.updatedAt))} dia(s).`,
        text: c.email ? `Oi! Suas fotos da ${g.title} ainda estão no carrinho 🏃 Finalize aqui com Pix: ${g.id ? location.href.replace(/[^/]*([?#].*)?$/, "") + "gallery.html#" + g.id : ""}` : "", email: c.email, cartId: c.id, galleryId: g.id, href: `#/g/${g.id}/desempenho` });
    }));
    s.payments.filter((p) => p.status !== "pago").forEach((p) => {
      const l = s.leads.find((x) => x.id === p.leadId), late = p.dueDate < t;
      if (!late && !p.galleryId) return;
      push({ key: `pay:${p.id}`, cat: "Vendas incompletas", icon: "⚡", lead: l, value: p.amount, score: 25 + p.amount / 100 + (late ? days(t - p.dueDate) * 3 : 0),
        title: `${p.galleryId ? "Extras escolhidos e não pagos" : "Pagamento vencido"}: ${p.desc}`, why: late ? `Venceu há ${days(t - p.dueDate)} dia(s).` : "O cliente escolheu além do pacote e ainda não pagou.",
        text: `Oi ${first(l?.name)}! Passando para lembrar do pagamento “${p.desc}” (${money(p.amount)}). Segue o link com Pix: ${location.href.replace(/[^/]*([?#].*)?$/, "")}pay.html#${p.id}`, phone: l?.phone, href: "#/financeiro/receber" });
    });
    // 5. clientes sem retorno
    s.leads.filter((l) => l.stage === "fechado").forEach((l) => {
      const last = Math.max(l.eventDate || 0, ...s.payments.filter((p) => p.leadId === l.id).map((p) => p.createdAt), ...s.projects.filter((p) => p.leadId === l.id).map((p) => p.date));
      const since = days(t - last);
      if (since < 150) return;
      push({ key: `old:${l.id}`, cat: "Clientes sem retorno", icon: "↺", lead: l, value: ensaio, score: 18 + since / 20,
        title: `${l.name} não volta há ${Math.round(since / 30)} meses`, why: `Último trabalho: ${l.type.toLowerCase()}. Clientes antigos fecham mais rápido que contatos novos.`,
        text: (UPSELL[l.type]?.text || UPSELL.Ensaio.text)(first(l.name)), phone: l.phone, href: "#/posvenda" });
    });
    // 6. serviços pouco rentáveis
    const target = s.settings.targetHour;
    s.services.map((sv) => ({ sv, p: serviceProfit(sv) })).filter((x) => x.p.perHour < target).forEach(({ sv, p }) => {
      const sugg = priceFor(sv, target), jobs = s.leads.filter((l) => l.type === sv.type && l.stage === "fechado").length || 1;
      push({ key: `svc:${sv.type}:${sv.price}`, cat: "Serviços pouco rentáveis", icon: "⏱", value: Math.max(0, (sugg - sv.price) * jobs), score: 15 + (target - p.perHour) / 3,
        title: `${sv.type} rende ${money(p.perHour)}/h`, why: `${p.hours}h de trabalho por ${money(sv.price)}. Para chegar a ${money(target)}/h, o preço seria ${money(Math.ceil(sugg / 10) * 10)} — ou reduzir horas de edição.`,
        text: "", href: "#/lucro" });
    });
    list.forEach((o) => (o.level = o.score >= 55 ? "alta" : o.score >= 32 ? "media" : "baixa"));
    return list.sort((a, b) => b.score - a.score);
  }

  /** O que já é dinheiro × o que é só potencial. */
  function moneyState(s) {
    const t = new Date(), m = t.getFullYear() * 12 + t.getMonth(), mk = (d) => { const x = new Date(d); return x.getFullYear() * 12 + x.getMonth(); };
    const received = s.payments.filter((p) => p.status === "pago" && mk(p.paidAt || p.createdAt) === m).reduce((a, p) => a + p.amount, 0);
    const sold = s.proposals.filter((p) => p.status === "aceita" && mk(p.respondedAt || p.createdAt) === m).reduce((a, p) => a + propTotal(p), 0)
      + s.galleries.flatMap((g) => g.orders || []).filter((o) => mk(o.createdAt) === m).reduce((a, o) => a + o.total, 0);
    const toReceive = s.payments.filter((p) => p.status !== "pago").reduce((a, p) => a + p.amount, 0);
    return { received, sold, toReceive };
  }

  /* ---------------- desempenho da galeria ---------------- */
  function galleryStats(g, s) {
    if (g.type === "venda") {
      const carts = g.carts || [], orders = g.orders || [], paid = orders.filter((o) => o.status === "pago");
      const started = carts.length + orders.length;
      const bySize = {};
      orders.forEach((o) => { const k = o.items.length >= 10 ? "10+" : o.items.length >= 3 ? "3–9" : "1–2"; bySize[k] = (bySize[k] || { n: 0, v: 0 }); bySize[k].n++; bySize[k].v += o.total; });
      return { kind: "venda", funnel: [["Visitas", g.views || 0], ["Montaram carrinho", started], ["Pediram", orders.length], ["Pagaram", paid.length]],
        abandon: started ? 1 - orders.length / started : 0, avg: orders.length ? orders.reduce((a, o) => a + o.total, 0) / orders.length : 0, revenue: paid.reduce((a, o) => a + o.total, 0), bySize, carts };
    }
    const people = g.multi ? g.clients.length : 1;
    const startedN = g.multi ? Object.values(g.selections || {}).filter((x) => x.length).length : g.selection.length ? 1 : 0;
    const doneN = g.multi ? Object.values(g.clientState || {}).filter((x) => x.status === "finalizada").length : g.status === "finalizada" ? 1 : 0;
    const extras = g.limit ? Math.max(0, g.selection.length - g.limit) : 0;
    const extrasPaid = s.payments.filter((p) => p.galleryId === g.id && !p.orderId);
    return { kind: "selecao", funnel: [["Visitas", g.views || 0], ["Começaram a escolher", startedN], ["Finalizaram", doneN]], people,
      extras, extrasValue: extras * (g.extraPrice || 0), extrasPaid: extrasPaid.filter((p) => p.status === "pago").reduce((a, p) => a + p.amount, 0),
      comments: Object.keys(g.comments || {}).length, rate: g.limit ? g.selection.length / g.limit : null };
  }

  /* ---------------- preparação do cliente ---------------- */
  const PREP = {
    base: {
      checks: ["Contrato assinado", "Sinal pago", "Horário e endereço confirmados", "Roupas separadas", "Lista de pessoas importantes enviada"],
      questions: [["local", "Endereço exato e ponto de referência"], ["horario", "Horário de início e cronograma do dia"], ["pessoas", "Pessoas importantes para fotografar (nome e relação)"], ["evitar", "Algo que você NÃO quer nas fotos?"], ["referencias", "Referências ou ideias (links de Instagram/Pinterest)"]],
      tips: ["Durma bem na véspera e beba água.", "Evite roupas com logos grandes ou estampas muito pequenas.", "Chegue 15 minutos antes para começarmos sem pressa."],
    },
    Casamento: { questions: [["cerimonial", "Contato da assessoria/cerimonial"], ["making", "Onde será o making of de cada um?"], ["surpresas", "Alguma surpresa ou momento especial planejado?"]], tips: ["Deixe convites, alianças e perfume separados para as fotos de detalhes.", "Reserve 20 minutos só para o ensaio do casal no fim da tarde."] },
    Gestante: { questions: [["semanas", "Com quantas semanas você estará?"], ["nome", "O bebê já tem nome? Quer que apareça?"]], tips: ["O ideal é entre 28 e 34 semanas.", "Traga um vestido fluido e uma peça mais básica."] },
    Newborn: { questions: [["nascimento", "Data de nascimento do bebê"], ["amamentacao", "O bebê mama no peito ou mamadeira?"]], tips: ["Os primeiros 15 dias são os melhores para as fotos dormindo.", "Mantenha o bebê acordado 1h antes e alimentado ao chegar."] },
    Ensaio: { questions: [["estilo", "Que clima você imagina? (leve, editorial, divertido…)"]], tips: ["Leve duas trocas de roupa em cores que combinam entre si."] },
    "15 anos": { questions: [["valsa", "Música da valsa e quem participa"]], tips: ["Combine com o cerimonial o horário das fotos com a família."] },
    Corporativo: { questions: [["marca", "Manual de marca ou cores da empresa"], ["entregas", "Para quando precisa das fotos e em qual formato?"]], tips: ["Envie a lista de palestrantes e momentos-chave."] },
    Evento: { questions: [["programacao", "Programação do evento"]], tips: ["Indique uma pessoa de contato no local."] },
  };
  function prepTemplate(type) {
    const b = PREP.base, x = PREP[type] || {};
    return { checks: b.checks, questions: [...b.questions, ...(x.questions || [])], tips: [...(x.tips || []), ...b.tips] };
  }
  function prepProgress(pj, s) {
    const l = s.leads.find((x) => x.id === pj.leadId), tpl = prepTemplate(pj.type);
    const auto = { "Contrato assinado": !!l?.contract?.signedAt, "Sinal pago": s.payments.some((p) => p.leadId === pj.leadId && p.status === "pago") };
    const checks = tpl.checks.map((c) => ({ c, done: auto[c] ?? !!pj.prep?.checks?.[c], auto: c in auto }));
    const answered = tpl.questions.filter(([k]) => (pj.prep?.answers?.[k] || "").trim()).length;
    const pct = Math.round(((checks.filter((x) => x.done).length + answered) / (checks.length + tpl.questions.length)) * 100);
    return { tpl, checks, answered, pct };
  }

  /* ---------------- arquivo: cor dominante e busca ---------------- */
  function colorName([r, g, b]) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 510, sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
    if (l < 0.18) return "escuro"; if (l > 0.85 && sat < 0.25) return "claro"; if (sat < 0.15) return "neutro";
    let h = 0; const d = max - min;
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    return h < 20 || h >= 330 ? "vermelho" : h < 45 ? "laranja" : h < 70 ? "amarelo" : h < 165 ? "verde" : h < 255 ? "azul" : "rosa";
  }
  function norm(x) { return String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  window.Insights = { ensure, leadInsight, JOURNEY, journey, journeyOf, serviceProfit, priceFor, queue, postSale, opportunities, moneyState, galleryStats, prepTemplate, prepProgress, colorName, norm, freeSlots, propTotal, UPSELL };

  // completa os dados do estado já carregado (uma vez por página)
  if (window.Offbeat) { const st = window.Offbeat.get(); const before = JSON.stringify([st.settings, st.services?.length, st._seed2]); ensure(st, window.Offbeat); if (before !== JSON.stringify([st.settings, st.services?.length, st._seed2])) window.Offbeat.persist(false); }
})();
