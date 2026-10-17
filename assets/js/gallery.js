/* ==========================================================================
   OFFBEAT — galeria do cliente (seleção · venda · contrato · pagamento)
   ========================================================================== */
(function () {
  const O = Offbeat;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const id = decodeURIComponent(location.hash.slice(1)) || "g_marina";
  const CIRC = 119.38;

  let g = find();
  const studio = () => O.get().studio;
  const lead = () => O.get().leads.find((l) => l.id === g.leadId);
  const isSale = () => g.type === "venda";
  const locked = () => !isSale() && g.status === "finalizada";

  const ui = { filter: "all", size: "", compare: false, cmp: [], lb: -1, list: [], query: "", dirty: false };
  const cartKey = "ob-cart-" + id, ordersKey = "ob-orders-" + id;
  let cart = readJSON(cartKey, []);

  function find() { return O.get().galleries.find((x) => x.id === id); }
  function readJSON(k, d) { try { return JSON.parse(sessionStorage.getItem(k)) ?? d; } catch (e) { return d; } }
  function saveCart() { sessionStorage.setItem(cartKey, JSON.stringify(cart)); }
  function mutate(fn) { O.update((s) => { const x = s.galleries.find((y) => y.id === id); fn(x, s); }); g = find(); }
  const firstName = () => (g.client || "Cliente").split(" ")[0];
  const photoById = (pid) => g.photos.find((p) => p.id === pid);
  const num = (pid) => g.photos.findIndex((p) => p.id === pid) + 1;

  if (!g) {
    document.body.innerHTML = `<section class="gate"><div class="gate__inner"><p class="mono">Offbeat</p><h1 class="serif">Galeria não encontrada.</h1><p class="gate__sub">O link pode ter expirado ou sido removido. Fale com o seu fotógrafo.</p></div></section>`;
    return;
  }

  /* ======================= CAPA ======================= */
  function gate() {
    document.title = `${g.title} — ${studio().brand}`;
    $("#gateStudio").textContent = `${studio().brand} · ${studio().name}`;
    $("#gateTitle").textContent = g.title;
    $("#gateSub").textContent = g.subtitle || "";
    const cover = photoById(g.cover) || g.photos[0];
    if (cover) O.loadImage(cover).then((im) => Protect.drawProtected($("#gateBg"), im, { width: innerWidth, watermark: false })).catch(() => {});
    const expired = g.expiresAt && g.expiresAt < Date.now();
    const days = Math.ceil((g.expiresAt - Date.now()) / O.DAY);
    $("#gateExp").textContent = expired ? "Esta galeria expirou." : g.expiresAt ? `Disponível por mais ${days} dia${days > 1 ? "s" : ""} · ${g.photos.length} fotos` : `${g.photos.length} fotos`;
    const unlocked = sessionStorage.getItem("ob-unlock-" + id) === "1";
    if (g.password && !unlocked) $("#gatePw").hidden = false;
    $("#gateForm").addEventListener("submit", (e) => {
      e.preventDefault();
      if (expired) { $("#gateErr").textContent = "Galeria expirada — peça ao fotógrafo para reativar."; return; }
      if (g.password && !unlocked && $("#gatePwInput").value !== g.password) {
        $("#gateErr").textContent = "Senha incorreta.";
        $("#gate").classList.remove("shake"); void $("#gate").offsetWidth; $("#gate").classList.add("shake");
        return;
      }
      sessionStorage.setItem("ob-unlock-" + id, "1");
      enter();
    });
    if ((!g.password || unlocked) && sessionStorage.getItem("ob-entered-" + id)) enter(true);
  }

  function enter(quick) {
    $("#gate").classList.add("gone");
    $("#shell").hidden = false;
    if (!sessionStorage.getItem("ob-entered-" + id)) {
      sessionStorage.setItem("ob-entered-" + id, "1");
      mutate((x, s) => { x.views = (x.views || 0) + 1; O.log(`${isSale() ? "Visitante" : firstName()} abriu a galeria “${x.title}”`, "view"); });
    }
    setup();
    if (!quick) setTimeout(() => $("#gate").remove(), 1000); else $("#gate").remove();
  }

  /* ======================= SHELL ======================= */
  function setup() {
    $("#brandName").textContent = studio().brand;
    const wa = `https://wa.me/${studio().whatsapp}?text=${encodeURIComponent(`Oi ${studio().name}! Estou na galeria “${g.title}”.`)}`;
    $("#helpWa").href = wa;
    $("#introKicker").textContent = isSale() ? `${g.subtitle} · ${g.photos.length} fotos` : `${g.subtitle} · ${g.photos.length} fotos`;
    $("#introTitle").innerHTML = isSale() ? `Encontre suas fotos, <em>${O.esc(g.title)}.</em>` : `Olá, ${O.esc(firstName())}. <em>Escolha as suas.</em>`;
    $("#introHow").textContent = isSale()
      ? `Busque pelo seu número de peito, adicione ao carrinho e pague com Pix. Foto avulsa ${O.money(g.unitPrice)}${(g.packages || []).map((p) => ` · ${p.qty} por ${O.money(p.price)}`).join("")}.`
      : `Seu pacote inclui ${g.limit} fotos. Toque no ♥ para escolher, abra a foto para comentar. Cada foto além do pacote custa ${O.money(g.extraPrice)}. Quando terminar, é só finalizar na barra de baixo.`;

    if (isSale()) {
      $("#searchBox").hidden = false; $("#cartBtn").hidden = false; $("#fSelBtn").firstChild.textContent = "No carrinho ";
      $("[data-filter='com']").hidden = true;
    } else {
      $("#dock").hidden = false;
    }
    // portal: contrato e pagamentos do mesmo cliente
    const l = lead();
    if (l?.contract) { const t = $("[data-tab='contrato']"); t.hidden = false; if (!l.contract.signedAt) t.insertAdjacentHTML("beforeend", '<span class="badge"></span>'); }
    if (pendingPayments().length || (l && O.get().payments.some((p) => p.leadId === l.id))) { const t = $("[data-tab='pagamento']"); t.hidden = false; if (pendingPayments().length) t.insertAdjacentHTML("beforeend", '<span class="badge"></span>'); }

    bind();
    renderGrid();
    updateMarks();
    Motion.magnetic();
    Motion.viewfinder();
    Protect.guard({ onAttempt: (why) => O.toast(why === "printscreen" ? "Captura bloqueada — esta foto leva seu nome na marca d'água." : "Foto protegida pelo fotógrafo.") });
  }

  function pendingPayments() {
    const l = lead();
    return O.get().payments.filter((p) => p.status !== "pago" && ((l && p.leadId === l.id) || p.galleryId === id) && !p.orderId);
  }

  function bind() {
    $$("#tabs button").forEach((b) => b.addEventListener("click", () => tab(b.dataset.tab)));
    $$(".seg button").forEach((b) => b.addEventListener("click", () => {
      ui.filter = b.dataset.filter; $$(".seg button").forEach((x) => x.classList.toggle("on", x === b)); renderGrid();
    }));
    const sizes = ["", "s", "l"], names = { "": "M", s: "P", l: "G" };
    $("#sizeBtn").addEventListener("click", () => {
      ui.size = sizes[(sizes.indexOf(ui.size) + 1) % 3];
      $("#grid").className = "masonry " + ui.size; $("#sizeBtn").textContent = "Grade: " + names[ui.size];
      $$("#grid .ph").forEach((el) => (el.dataset.drawn = ""));
      requestAnimationFrame(drawVisible);
    });
    $("#compareBtn").addEventListener("click", () => {
      ui.compare = !ui.compare; ui.cmp = [];
      $("#compareBtn").classList.toggle("on", ui.compare);
      document.body.classList.toggle("compare-mode", ui.compare);
      $$(".ph.cmp").forEach((e) => e.classList.remove("cmp"));
      if (ui.compare) O.toast("Toque em duas fotos para comparar lado a lado.");
    });
    $("#searchInput").addEventListener("input", (e) => { ui.query = e.target.value.trim(); renderGrid(); });
    $("#finishBtn").addEventListener("click", finishFlow);
    $("#cartBtn").addEventListener("click", openCart);
    $("#drawerClose").addEventListener("click", () => ($("#drawer").hidden = true));
    $("#checkoutBtn").addEventListener("click", checkout);
    // lightbox
    $("#lbClose").addEventListener("click", closeLb);
    $("#lbPrev").addEventListener("click", () => step(-1));
    $("#lbNext").addEventListener("click", () => step(1));
    $("#lbHeart").addEventListener("click", () => { const p = ui.list[ui.lb]; if (p) toggle(p.id); });
    $("#lbDownload").addEventListener("click", () => { const p = ui.list[ui.lb]; if (p) download(p); });
    let ct;
    $("#lbComment").addEventListener("input", (e) => {
      const p = ui.list[ui.lb]; if (!p || locked()) return;
      clearTimeout(ct); const v = e.target.value;
      ct = setTimeout(() => mutate((x) => { if (v.trim()) x.comments[p.id] = v; else delete x.comments[p.id]; }), 400);
    });
    $("#lbComment").addEventListener("change", (e) => { if (e.target.value.trim()) { O.update(() => O.log(`${firstName()} comentou na foto ${num(ui.list[ui.lb].id)}: “${e.target.value.slice(0, 60)}”`, "comment")); O.toast("Comentário enviado ao fotógrafo.", "ok"); } });
    addEventListener("keydown", (e) => {
      if ($("#lb").hidden) return;
      if (e.key === "Escape") { e.target.blur?.(); return closeLb(); }
      if (e.target.matches("textarea, input")) return;
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key.toLowerCase() === "f") { const p = ui.list[ui.lb]; if (p) toggle(p.id); }
    });
    // gesto de arrastar no celular
    let sx = null;
    $("#lbStage").addEventListener("pointerdown", (e) => (sx = e.clientX));
    $("#lbStage").addEventListener("pointerup", (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 50) step(e.clientX < sx ? 1 : -1); sx = null; });
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
    addEventListener("hashchange", () => location.reload());
    // o painel do fotógrafo pode mudar algo (liberar download, confirmar Pix) — reflete ao vivo
    O.onChange(() => { g = find(); if (g) updateMarks(); });
    // saiu sem finalizar? o fotógrafo fica sabendo (e pode mandar um lembrete)
    addEventListener("pagehide", () => {
      if (ui.dirty && !isSale() && g.status !== "finalizada") O.update(() => O.log(`${firstName()} saiu sem finalizar (${g.selection.length} escolhidas) — vale um lembrete`, "warn"));
    });
  }

  function tab(name) {
    $$("#tabs button").forEach((b) => { b.classList.toggle("on", b.dataset.tab === name); b.setAttribute("aria-selected", b.dataset.tab === name); });
    $$(".pane").forEach((p) => p.classList.toggle("on", p.dataset.pane === name));
    $("#dock").hidden = isSale() || name !== "fotos";
    if (name === "contrato") renderContract();
    if (name === "pagamento") renderPayments();
    scrollTo({ top: 0, behavior: Motion.reduce ? "auto" : "smooth" });
  }

  /* ======================= GRADE ======================= */
  let io;
  function filtered() {
    let list = g.photos;
    const chosen = isSale() ? cart : g.selection;
    if (ui.filter === "sel") list = list.filter((p) => chosen.includes(p.id));
    if (ui.filter === "com") list = list.filter((p) => g.comments[p.id]);
    if (ui.query) list = list.filter((p) => (p.tags || []).some((t) => t.startsWith(ui.query)));
    return list;
  }

  function renderGrid() {
    const grid = $("#grid");
    ui.list = filtered();
    grid.innerHTML = "";
    $("#empty").hidden = ui.list.length > 0;
    $("#empty").textContent = ui.query ? `Nenhuma foto com o número ${ui.query}.` : ui.filter === "sel" ? (isSale() ? "Seu carrinho está vazio." : "Você ainda não escolheu nenhuma foto.") : "Nenhuma foto aqui.";
    io?.disconnect();
    io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { draw(e.target); e.target.classList.add("in"); } }), { rootMargin: "300px 0px" });
    const frag = document.createDocumentFragment();
    ui.list.forEach((p, i) => {
      const el = document.createElement("figure");
      el.className = "ph"; el.dataset.id = p.id; el.dataset.focus = "Nº " + String(num(p.id)).padStart(3, "0");
      el.style.setProperty("--ar", (p.h / p.w) * 100 + "%");
      el.style.transitionDelay = Motion.beat(i % 8, 0.25) + "s";
      el.innerHTML = `<canvas class="prot" aria-label="Foto ${num(p.id)}"></canvas>
        <span class="ph__num">${String(num(p.id)).padStart(3, "0")}</span>
        ${isSale() ? `<span class="ph__price">${O.money(g.unitPrice)}</span>${p.tags ? `<span class="ph__tags">${p.tags.map((t) => `<span>#${t}</span>`).join("")}</span>` : ""}` : ""}
        <button class="ph__heart" aria-label="${isSale() ? "Adicionar ao carrinho" : "Escolher foto"} ${num(p.id)}">${isSale() ? "+" : "♥"}</button>`;
      el.querySelector(".ph__heart").addEventListener("click", (e) => { e.stopPropagation(); toggle(p.id, el); });
      el.addEventListener("click", () => (ui.compare ? pickCompare(p, el) : openLb(i)));
      el.addEventListener("dblclick", (e) => { e.preventDefault(); toggle(p.id, el); });
      frag.appendChild(el);
      io.observe(el);
    });
    grid.appendChild(frag);
    updateMarks();
  }

  function draw(el) {
    if (el.dataset.drawn) return;
    el.dataset.drawn = "1";
    const p = photoById(el.dataset.id), cv = el.querySelector("canvas");
    O.loadImage(p).then((im) => {
      Protect.drawProtected(cv, im, { width: el.clientWidth, watermark: g.watermark, client: wmClient(), center: canDownload(p.id) ? "" : "prova" });
      cv.classList.add("ready");
    }).catch(() => { cv.classList.add("ready"); });
  }
  function drawVisible() { $$("#grid .ph").forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight + 300 && r.bottom > -300) draw(el); }); }
  const wmClient = () => isSale() ? ($("#buyerEmail")?.value || "offbeat.foto") : g.clientEmail || g.client;

  function updateMarks() {
    const chosen = isSale() ? cart : g.selection;
    $$("#grid .ph").forEach((el) => {
      const i = chosen.indexOf(el.dataset.id);
      el.classList.toggle("sel", i >= 0);
      el.classList.toggle("extra", !isSale() && i >= g.limit);
      const has = g.comments[el.dataset.id];
      let c = el.querySelector(".ph__com");
      if (has && !c && !isSale()) { c = document.createElement("span"); c.className = "ph__com"; c.textContent = "💬 comentário"; el.appendChild(c); }
      if (!has && c) c.remove();
    });
    $("#fAll").textContent = g.photos.length;
    $("#fSel").textContent = chosen.length;
    $("#fCom").textContent = Object.keys(g.comments).length;
    document.body.classList.toggle("locked", locked());
    if (isSale()) { $("#cartCount").textContent = cart.length; } else dock();
    if (!$("#lb").hidden) syncLb();
  }

  /* ======================= SELEÇÃO ======================= */
  function toggle(pid, el) {
    if (isSale()) {
      const i = cart.indexOf(pid);
      if (i >= 0) cart.splice(i, 1); else cart.push(pid);
      saveCart();
      const b = $("#cartBtn"); b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
      if (i < 0) O.toast(`Foto ${num(pid)} no carrinho · ${priceFor(cart.length).text}`);
      updateMarks();
      return;
    }
    if (locked()) { O.toast("Seleção finalizada. Fale com o fotógrafo para reabrir."); return; }
    ui.dirty = true;
    let added = false;
    mutate((x) => {
      const i = x.selection.indexOf(pid);
      if (i >= 0) x.selection.splice(i, 1); else { x.selection.push(pid); added = true; }
      if (x.status === "enviada") x.status = "em-selecao";
    });
    const target = el || $(`.ph[data-id="${pid}"]`);
    if (target && added) { target.classList.remove("pop"); void target.offsetWidth; target.classList.add("pop"); }
    if (added && g.selection.length === g.limit) O.toast(`Pacote completo! ${g.limit} fotos. Pode finalizar ou escolher extras.`, "ok");
    if (added && g.selection.length === g.limit + 1) O.toast(`A partir daqui, cada foto é extra: ${O.money(g.extraPrice)}.`);
  }

  function extras() { return Math.max(0, g.selection.length - g.limit); }

  function dock() {
    const n = g.selection.length, L = g.limit, ex = extras();
    const ring = $("#ring"), wrap = $(".dock__ring");
    ring.style.strokeDashoffset = CIRC * (1 - Math.min(1, n / L));
    wrap.classList.toggle("full", n >= L);
    $("#ringN").textContent = n;
    const d = $("#dock");
    if (g.status === "finalizada") {
      $("#dockMain").textContent = `Seleção enviada · ${n} fotos`;
      $("#dockSub").textContent = g.delivered ? "Suas fotos editadas estão liberadas para download." : `Finalizada em ${O.date(g.finalizedAt, { day: "2-digit", month: "long" })}. ${studio().name} já foi avisado.`;
      $("#finishBtn").innerHTML = g.delivered ? 'Baixar tudo <span class="arr">↓</span>' : 'Ver resumo <span class="arr">→</span>';
      d.classList.remove("ready");
      return;
    }
    $("#dockMain").textContent = ex ? `${L} do pacote + ${ex} extra${ex > 1 ? "s" : ""}` : `${n} de ${L} fotos do pacote`;
    $("#dockSub").textContent = ex ? `Extras: ${O.money(ex * g.extraPrice)}` : n === 0 ? "Toque no ♥ para escolher" : n < L ? `Faltam ${L - n} para completar o pacote` : "Pacote completo — pode finalizar";
    d.classList.toggle("ready", n >= L);
  }

  function finishFlow() {
    if (g.status === "finalizada") { if (g.delivered) return downloadAll(); return summaryModal(); }
    const n = g.selection.length, ex = extras();
    if (!n) { O.toast("Escolha pelo menos uma foto antes de finalizar."); return; }
    modal(`
      <button class="lb__x" data-close aria-label="Fechar">×</button>
      <p class="mono">Revisar antes de enviar</p>
      <h2>Finalizar seleção?</h2>
      <div class="row"><span>Fotos escolhidas</span><b>${n}</b></div>
      <div class="row"><span>Incluídas no pacote</span><b>${Math.min(n, g.limit)} de ${g.limit}</b></div>
      <div class="row"><span>Extras</span><b>${ex} × ${O.money(g.extraPrice)}</b></div>
      <div class="row"><span>Comentários</span><b>${Object.keys(g.comments).length}</b></div>
      <div class="row"><span><strong>Total a pagar agora</strong></span><b>${O.money(ex * g.extraPrice)}</b></div>
      ${n < g.limit ? `<p class="mono" style="margin-top:14px;color:var(--warn)">Você ainda pode escolher ${g.limit - n} foto${g.limit - n > 1 ? "s" : ""} sem custo.</p>` : ""}
      <div class="acts"><button class="btn btn--red" id="confirmFinish">Enviar seleção <span class="arr">→</span></button><button class="btn btn--ghost" data-close>Continuar escolhendo</button></div>`);
    $("#confirmFinish").addEventListener("click", () => {
      let pay = null;
      mutate((x, s) => {
        x.status = "finalizada"; x.finalizedAt = Date.now();
        if (ex > 0) {
          pay = { id: O.uid("pay_"), desc: `Fotos extras — ${x.title} (${ex})`, amount: ex * x.extraPrice, status: "pendente", method: "pix", createdAt: Date.now(), leadId: x.leadId, galleryId: x.id };
          s.payments.unshift(pay);
        }
        O.log(`${firstName()} finalizou a seleção (${n} fotos${ex ? `, ${ex} extras` : ""})`, "select");
      });
      ui.dirty = false;
      modal(`
        <svg class="check" viewBox="0 0 72 72"><circle cx="36" cy="36" r="34"/><path d="M22 37l10 10 18-20"/></svg>
        <h2>Seleção enviada.</h2>
        <p>${studio().name} recebeu suas ${n} fotos e vai começar a edição. Você recebe um aviso quando estiverem prontas.</p>
        <div class="acts">${pay ? `<button class="btn btn--red" id="payNow">Pagar extras com Pix · ${O.money(pay.amount)}</button>` : ""}<button class="btn btn--ghost" data-close>Fechar</button></div>`);
      if (pay) { $("#payNow").addEventListener("click", () => pixModal(pay)); $("[data-tab='pagamento']").hidden = false; }
      updateMarks();
    });
  }

  function summaryModal() {
    modal(`<button class="lb__x" data-close aria-label="Fechar">×</button>
      <p class="mono">Seleção enviada</p><h2>${g.selection.length} fotos</h2>
      <p>Finalizada em ${O.date(g.finalizedAt, { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}. Se quiser trocar alguma foto, fale com ${studio().name}.</p>
      <div class="acts"><a class="btn btn--light" href="${$("#helpWa").href}" target="_blank" rel="noopener">Pedir para reabrir</a><button class="btn btn--ghost" data-close>Fechar</button></div>`);
  }

  /* ======================= COMPARAR ======================= */
  function pickCompare(p, el) {
    if (ui.cmp.includes(p)) { ui.cmp = ui.cmp.filter((x) => x !== p); el.classList.remove("cmp"); return; }
    ui.cmp.push(p); el.classList.add("cmp");
    if (ui.cmp.length === 2) {
      const [a, b] = ui.cmp;
      openLb(ui.list.indexOf(a), b);
      ui.cmp = []; $$(".ph.cmp").forEach((e) => e.classList.remove("cmp"));
    }
  }

  /* ======================= LIGHTBOX ======================= */
  let lastFocus = null;
  function openLb(i, second) {
    lastFocus = document.activeElement;
    ui.lb = i; ui.second = second || null;
    $("#lb").hidden = false; document.body.style.overflow = "hidden";
    renderLb(); $("#lbClose").focus();
  }
  function closeLb() { $("#lb").hidden = true; document.body.style.overflow = ""; ui.second = null; lastFocus?.focus?.(); }
  function step(d) { if (!ui.list.length) return; ui.second = null; ui.lb = (ui.lb + d + ui.list.length) % ui.list.length; renderLb(); }
  function renderLb() {
    const p = ui.list[ui.lb]; if (!p) return;
    const stage = $("#lbStage"), c1 = $("#lbCanvas"), c2 = $("#lbCanvas2");
    stage.classList.toggle("two", !!ui.second);
    c2.hidden = !ui.second;
    const cs = getComputedStyle(stage);
    const availW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - (ui.second ? 12 : 0);
    const availH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const fit = (ph) => Math.max(200, Math.min(1400, (ui.second ? availW / 2 : availW), availH * (ph.w / ph.h)));
    const paint = (cv, ph) => O.loadImage(ph).then((im) => { Protect.drawProtected(cv, im, { width: fit(ph), watermark: g.watermark, client: wmClient(), center: canDownload(ph.id) ? "" : "prova" }); cv.style.animation = "none"; void cv.offsetWidth; cv.style.animation = ""; });
    paint(c1, p);
    if (ui.second) paint(c2, ui.second);
    syncLb();
  }
  function syncLb() {
    const p = ui.list[ui.lb]; if (!p) return;
    const chosen = isSale() ? cart.includes(p.id) : g.selection.includes(p.id);
    $("#lbName").textContent = `Foto ${String(num(p.id)).padStart(3, "0")} · ${ui.lb + 1} de ${ui.list.length}${ui.second ? ` · comparando com ${String(num(ui.second.id)).padStart(3, "0")}` : ""}`;
    const h = $("#lbHeart");
    h.classList.toggle("on", chosen);
    h.textContent = isSale() ? (chosen ? "✓ No carrinho" : `+ Carrinho · ${O.money(g.unitPrice)}`) : chosen ? "♥ Escolhida" : "♥ Escolher";
    $("#lbComment").closest("label").hidden = isSale();
    $("#lbComment").value = g.comments[p.id] || "";
    $("#lbComment").disabled = locked();
    $("#lbDownload").hidden = !canDownload(p.id);
  }

  /* ======================= DOWNLOAD (só liberado) ======================= */
  function paidOrderPhotos() {
    const mine = readJSON(ordersKey, []);
    return (g.orders || []).filter((o) => mine.includes(o.id) && o.status === "pago").flatMap((o) => o.items);
  }
  function canDownload(pid) {
    if (isSale()) return paidOrderPhotos().includes(pid);
    return !!g.delivered && g.selection.includes(pid);
  }
  async function download(p) {
    if (!canDownload(p.id)) return O.toast("Download ainda não liberado.");
    try {
      const blob = p.src ? await (await fetch(p.src)).blob() : await O.getBlob(p.id);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = p.name || "foto.jpg";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { O.toast("Não foi possível baixar agora."); }
  }
  async function downloadAll() {
    const list = g.photos.filter((p) => canDownload(p.id));
    O.toast(`Baixando ${list.length} fotos…`, "ok");
    for (const p of list) { await download(p); await new Promise((r) => setTimeout(r, 350)); }
  }

  /* ======================= VENDA / CARRINHO ======================= */
  function bestPrice(n) {
    const unit = g.unitPrice, packs = g.packages || [];
    const dp = [0];
    for (let k = 1; k <= n; k++) {
      dp[k] = dp[k - 1] + unit;
      packs.forEach((pk) => { dp[k] = Math.min(dp[k], dp[Math.max(0, k - pk.qty)] + pk.price); });
    }
    return Math.round(dp[n] * 100) / 100;
  }
  function priceFor(n) {
    const total = bestPrice(n), full = n * g.unitPrice;
    return { total, save: Math.max(0, full - total), text: O.money(total) };
  }
  function openCart() {
    const d = $("#drawer"); d.hidden = false;
    const items = $("#cartItems");
    items.innerHTML = cart.length ? "" : '<p class="mono">Nenhuma foto ainda. Use o “+” nas fotos.</p>';
    cart.forEach((pid) => {
      const p = photoById(pid); if (!p) return;
      const row = document.createElement("div"); row.className = "ci";
      row.innerHTML = `<canvas class="prot"></canvas><span>Foto ${String(num(pid)).padStart(3, "0")}</span><button aria-label="Remover">×</button>`;
      O.loadImage(p).then((im) => Protect.drawProtected(row.querySelector("canvas"), im, { width: 64, watermark: g.watermark, center: "" }));
      row.querySelector("button").addEventListener("click", () => { toggle(pid); openCart(); });
      items.appendChild(row);
    });
    const pr = priceFor(cart.length);
    const next = (g.packages || []).find((pk) => pk.qty > cart.length);
    $("#cartSum").innerHTML = `
      <div><span>${cart.length} foto${cart.length === 1 ? "" : "s"}</span><span>${O.money(cart.length * g.unitPrice)}</span></div>
      ${pr.save ? `<div class="hint"><span>Desconto de pacote</span><span>− ${O.money(pr.save)}</span></div>` : ""}
      <div class="tot"><span>Total</span><span>${pr.text}</span></div>
      ${next ? `<p class="hint mono" style="text-transform:none">Leve ${next.qty} por ${O.money(next.price)} — faltam ${next.qty - cart.length}.</p>` : ""}`;
    $("#checkoutBtn").disabled = !cart.length;
  }
  function checkout() {
    const email = $("#buyerEmail").value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { $("#buyerEmail").focus(); return O.toast("Informe um e-mail válido para receber as fotos."); }
    const total = bestPrice(cart.length);
    const order = { id: O.uid("ord_"), email, items: [...cart], total, status: "pendente", createdAt: Date.now() };
    const pay = { id: O.uid("pay_"), desc: `Pedido ${g.title} — ${email}`, amount: total, status: "pendente", method: "pix", createdAt: Date.now(), leadId: null, galleryId: id, orderId: order.id };
    mutate((x, s) => { x.orders = x.orders || []; x.orders.unshift(order); s.payments.unshift(pay); O.log(`Novo pedido em “${x.title}”: ${order.items.length} fotos · ${O.money(total)}`, "pay"); });
    const mine = readJSON(ordersKey, []); mine.push(order.id); sessionStorage.setItem(ordersKey, JSON.stringify(mine));
    cart = []; saveCart(); updateMarks();
    $("#drawer").hidden = true;
    pixModal(pay, order);
  }

  /* ======================= PIX ======================= */
  function pixModal(pay, order) {
    const st = studio();
    const code = Pix.payload({ key: st.pixKey, name: st.pixName, city: st.city, amount: pay.amount, txid: pay.id.replace(/[^A-Za-z0-9]/g, "").slice(0, 25), desc: "" });
    modal(`<button class="lb__x" data-close aria-label="Fechar">×</button>
      <p class="mono">Pagamento via Pix</p><h2>${O.money(pay.amount)}</h2>
      <p>${O.esc(pay.desc)}</p>
      <div class="pixbox"><div class="qr">${Pix.qrSVG(code, { fg: "#0f0e0c" }) || '<p class="mono">QR indisponível offline</p>'}</div>
        <div><span class="mono">Pix copia e cola</span><textarea readonly id="pixCode">${code}</textarea><button class="btn btn--sm" id="copyPix">Copiar código</button></div></div>
      <p class="mono" style="margin-top:14px;text-transform:none">Recebedor: ${O.esc(st.pixName)} · chave ${O.esc(st.pixKey)}</p>
      <div class="acts"><button class="btn btn--red" id="paidBtn">Já paguei</button>
      ${order ? '<button class="btn btn--ghost btn--sm" id="simPay" title="Só na demonstração: simula a confirmação do banco">Simular confirmação (demo)</button>' : ""}</div>`);
    $("#copyPix").addEventListener("click", () => O.copy(code, "Código Pix copiado — cole no app do banco."));
    $("#paidBtn").addEventListener("click", () => {
      O.update((s) => { const p = s.payments.find((x) => x.id === pay.id); if (p && p.status === "pendente") p.status = "informado"; O.log(`Cliente informou pagamento: ${pay.desc} · ${O.money(pay.amount)}`, "pay"); });
      modal(`<svg class="check" viewBox="0 0 72 72"><circle cx="36" cy="36" r="34"/><path d="M22 37l10 10 18-20"/></svg><h2>Obrigado!</h2><p>Assim que o pagamento for confirmado, ${order ? "suas fotos ficam liberadas para download aqui mesmo." : `${st.name} recebe o aviso.`}</p><div class="acts"><button class="btn btn--ghost" data-close>Fechar</button></div>`);
    });
    $("#simPay")?.addEventListener("click", () => {
      mutate((x, s) => { const o = x.orders.find((y) => y.id === order.id); if (o) o.status = "pago"; const p = s.payments.find((y) => y.id === pay.id); if (p) p.status = "pago"; O.log(`Pix confirmado: ${pay.desc}`, "pay"); });
      closeModal(); O.toast("Pagamento confirmado — downloads liberados!", "ok");
      $$("#grid .ph").forEach((el) => (el.dataset.drawn = "")); drawVisible(); ui.filter = "all";
    });
  }

  /* ======================= CONTRATO ======================= */
  function renderContract() {
    const l = lead(), c = l?.contract, doc = $("#contractDoc");
    if (!c) { doc.innerHTML = "<p>Nenhum contrato disponível.</p>"; return; }
    doc.innerHTML = `<p class="mono">Contrato · ${O.date(c.createdAt, { day: "2-digit", month: "long", year: "numeric" })}</p>
      <h1>${O.esc(c.title)}</h1>
      <p><strong>Contratante:</strong> ${O.esc(l.name)} · <strong>Contratado:</strong> ${O.esc(studio().name)} (${O.esc(studio().brand)})</p>
      ${c.clauses.map((k, i) => `<h3>${i + 1}. ${O.esc(k.h)}</h3><p>${O.esc(k.p)}</p>`).join("")}
      <div class="sign" id="signBox"></div>`;
    const box = $("#signBox");
    if (c.signedAt) {
      box.innerHTML = `<span class="signed">✓ Assinado por ${O.esc(c.signerName)} em ${O.date(c.signedAt, { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span><img src="${c.signature}" alt="Assinatura" />`;
      return;
    }
    box.innerHTML = `<p class="mono">Assine com o dedo ou o mouse</p><canvas id="pad"></canvas>
      <label style="display:grid;gap:6px;margin-top:12px"><span class="mono">Nome completo</span><input id="signName" value="${O.esc(l.name)}" style="padding:10px 12px;border-radius:8px;border:1px solid var(--line)"></label>
      <label style="display:flex;gap:8px;margin-top:12px;font-size:.9rem"><input type="checkbox" id="signOk"> Li e concordo com os termos acima.</label>
      <div class="acts"><button class="btn btn--red" id="signBtn">Assinar contrato</button><button class="btn btn--ghost" id="padClear">Limpar</button></div>`;
    const pad = $("#pad"), ctx = pad.getContext("2d");
    const fit = () => { pad.width = pad.clientWidth * 2; pad.height = pad.clientHeight * 2; ctx.scale(2, 2); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.strokeStyle = "#0f0e0c"; };
    fit();
    let drawing = false, inked = false;
    const pos = (e) => { const r = pad.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    pad.addEventListener("pointerdown", (e) => { drawing = true; pad.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); });
    pad.addEventListener("pointermove", (e) => { if (!drawing) return; ctx.lineTo(...pos(e)); ctx.stroke(); inked = true; });
    pad.addEventListener("pointerup", () => (drawing = false));
    $("#padClear").addEventListener("click", () => { ctx.clearRect(0, 0, pad.width, pad.height); inked = false; });
    $("#signBtn").addEventListener("click", () => {
      const name = $("#signName").value.trim();
      if (!inked) return O.toast("Faça sua assinatura no quadro.");
      if (!name) return O.toast("Informe seu nome completo.");
      if (!$("#signOk").checked) return O.toast("Marque que leu e concorda com os termos.");
      const sig = pad.toDataURL("image/png");
      O.update((s) => { const L = s.leads.find((x) => x.id === l.id); Object.assign(L.contract, { signedAt: Date.now(), signature: sig, signerName: name, signerUA: navigator.userAgent.slice(0, 120) }); if (L.stage === "contrato") L.stage = "fechado"; O.log(`${name} assinou o contrato “${L.contract.title}”`, "contract"); });
      $("[data-tab='contrato'] .badge")?.remove();
      O.toast("Contrato assinado!", "ok");
      renderContract();
    });
  }

  /* ======================= PAGAMENTOS ======================= */
  function renderPayments() {
    const l = lead();
    const list = O.get().payments.filter((p) => ((l && p.leadId === l.id) || p.galleryId === id) && !p.orderId);
    const box = $("#payments");
    box.innerHTML = list.length ? "" : '<p class="mono">Nenhuma cobrança.</p>';
    list.forEach((p) => {
      const el = document.createElement("article");
      el.className = "pay-card" + (p.status === "pago" ? " paid" : "");
      el.innerHTML = `<span class="chip ${p.status === "pago" ? "ok" : ""}">${p.status === "pago" ? "pago" : p.status === "informado" ? "em confirmação" : "pendente"}</span>
        <h3>${O.esc(p.desc)}</h3><p class="amount">${O.money(p.amount)}</p>
        ${p.status === "pago" ? "" : '<button class="btn btn--red">Pagar com Pix</button>'}`;
      el.querySelector(".btn")?.addEventListener("click", () => pixModal(p));
      box.appendChild(el);
    });
  }

  /* ======================= MODAL ======================= */
  function modal(html) {
    const m = $("#modal"); $("#modalCard").innerHTML = html; m.hidden = false;
    $$("[data-close]", m).forEach((b) => b.addEventListener("click", closeModal));
    ($("#modalCard .btn") || $("#modalCard"))?.focus?.();
  }
  function closeModal() { $("#modal").hidden = true; }
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });

  gate();
})();
