/* ==========================================================================
   OFFBEAT — landing: coreografia das cenas
   ========================================================================== */
(function () {
  const { reduce } = Motion;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const img = (seed, w = 600, h = 750) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

  /* ---------- CENA 0: diafragma ---------- */
  function loader() {
    const el = $("#loader"), g = $(".iris__blades"), count = $("#loaderCount");
    const N = 8;
    for (let i = 0; i < N; i++) {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", "M-6,-4 L110,-70 L118,40 L14,34 Z");
      p.style.setProperty("--r", (i * 360) / N + "deg");
      p.style.setProperty("--tx", "70px");
      g.appendChild(p);
    }
    document.body.classList.add("loading");
    const seen = sessionStorage.getItem("ob-seen");
    const dur = reduce ? 0 : seen ? 450 : 1300;
    const t0 = performance.now();
    return new Promise((res) => {
      const tick = (t) => {
        const p = dur ? Math.min(1, (t - t0) / dur) : 1;
        count.textContent = String(Math.round(p * 100)).padStart(3, "0");
        if (p < 1) return requestAnimationFrame(tick);
        el.classList.add("open");
        sessionStorage.setItem("ob-seen", 1);
        setTimeout(() => { el.classList.add("done"); document.body.classList.remove("loading"); }, reduce ? 0 : 700);
        res();
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- nav ---------- */
  function nav() {
    const n = $("#nav"); let last = 0;
    addEventListener("scroll", () => {
      const y = scrollY;
      n.classList.toggle("scrolled", y > 40);
      n.classList.toggle("hide", y > 400 && y > last);
      last = y;
    }, { passive: true });
  }

  /* ---------- CENA 1: pilha de fotos do hero ---------- */
  function heroStack() {
    const st = $("#heroStack");
    const cards = [
      { s: "ob-hero-1", r: -9, x: -18, y: 6, z: 0.6, cap: "FR 07 · MARINA" },
      { s: "ob-hero-2", r: 6, x: 14, y: -4, z: 0.9, cap: "FR 12 · TEO" },
      { s: "ob-hero-3", r: -3, x: -4, y: -10, z: 1.3, cap: "FR 18 · JÚLIA" },
      { s: "ob-hero-4", r: 4, x: 6, y: 4, z: 1.8, cap: "FR 21 · PISTA" },
    ];
    cards.forEach((c, i) => {
      const d = document.createElement("div");
      d.className = "card";
      d.innerHTML = `<img src="${img(c.s, 700, 875)}" alt="" loading="${i > 1 ? "lazy" : "eager"}"><span class="cap">${c.cap}</span>`;
      d.style.transform = `translate(${c.x}%, ${c.y + 30}%) rotate(${c.r * 2}deg)`;
      d.style.transitionDelay = `${0.6 + Motion.beat(i, 0.8)}s`;
      st.appendChild(d);
      c.el = d;
    });
    let px = 0, py = 0, sy = 0;
    const apply = () => cards.forEach((c) => {
      const fan = sy * c.z * 0.06;
      c.el.style.transform = `translate(${c.x + px * c.z * 2}%, ${c.y + py * c.z * 2 - fan}%) rotate(${c.r * (1 + sy / 300) + px * c.z * 2}deg)`;
    });
    requestAnimationFrame(() => { st.classList.add("in"); apply(); });
    if (reduce) return;
    addEventListener("pointermove", (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; requestAnimationFrame(apply); }, { passive: true });
    addEventListener("scroll", () => { sy = Math.min(scrollY, innerHeight); requestAnimationFrame(apply); }, { passive: true });
    setTimeout(() => cards.forEach((c) => (c.el.style.transitionDelay = "0s", c.el.style.transition = "opacity 1s, transform .9s cubic-bezier(.16,1,.3,1)")), 2600);
  }

  /* ---------- faixa de filme ---------- */
  function strip() {
    const t = $("#strip");
    const html = Array.from({ length: 14 }, (_, i) => `<figure class="frame" data-focus="FR ${String(i + 1).padStart(2, "0")}"><span>${String(i + 1).padStart(2, "0")}A</span><img src="${img("ob-strip-" + i, 520, 347)}" alt="" loading="lazy"></figure>`).join("");
    t.innerHTML = html + html;
  }

  /* ---------- CENA 2: manifesto lido pela rolagem ---------- */
  function manifesto() {
    const p = $("#manifesto");
    const words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map((w) => `<span class="mw${/contratempo/i.test(w) ? " hot" : ""}">${w}</span>`).join(" ");
    const spans = $$(".mw", p);
    if (reduce) { spans.forEach((s) => s.classList.add("lit")); return; }
    const sec = p.closest("section");
    const upd = () => {
      const r = sec.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height * 0.9)));
      const n = Math.round(prog * spans.length);
      spans.forEach((s, i) => s.classList.toggle("lit", i < n));
    };
    addEventListener("scroll", () => requestAnimationFrame(upd), { passive: true });
    upd();
  }

  /* ---------- CENA 3: capítulos e palco ---------- */
  function solutions() {
    const items = $$("#solList li"), scrs = $$("#stage .scr"), n = $("#stageN");
    let cur = 0;
    const show = (i) => {
      if (i === cur) return;
      scrs.forEach((s) => s.classList.remove("was"));
      scrs[cur].classList.add("was");
      scrs[cur].classList.remove("on");
      scrs[i].classList.add("on");
      items.forEach((li, k) => li.classList.toggle("on", k === i));
      n.textContent = String(i + 1).padStart(2, "0");
      cur = i;
    };
    const io = new IntersectionObserver((en) => en.forEach((e) => e.isIntersecting && show(+e.target.dataset.i)), { rootMargin: "-45% 0px -45% 0px" });
    items.forEach((li) => io.observe(li));

    // conteúdo dos mocks
    const cells = (seed, k) => Array.from({ length: k }, (_, i) => `<div class="mk-cell"><img src="${img(seed + i, 240, 240)}" alt="" loading="lazy"></div>`).join("");
    $("#mkProva").innerHTML = cells("ob-wed-", 12);
    $("#mkPista").innerHTML = cells("ob-run-", 9);
    $("#mkPalco").innerHTML = [0, 1, 2].map((i) => `<img src="${img("ob-site-" + i, 500, 500)}" alt="" loading="lazy">`).join("");
    $("#mkAlbum").innerHTML = `<div class="mk-spread"><div><img src="${img("ob-ges-0", 500, 600)}" alt="" loading="lazy"></div><div><img src="${img("ob-ges-2", 300, 400)}" alt="" loading="lazy"><img src="${img("ob-ges-3", 300, 400)}" alt="" loading="lazy"></div></div>`;
    $("#mkThumbs").innerHTML = Array.from({ length: 12 }, (_, i) => `<img src="${img("ob-ges-" + i, 120, 90)}" alt="" loading="lazy">`).join("");
    const st = Offbeat.get().studio;
    $("#mkQr").innerHTML = Pix.qrSVG(Pix.payload({ key: st.pixKey, name: st.pixName, city: st.city, amount: 3360, txid: "OBSINAL" }), { fg: "#0f0e0c" });

    if (reduce) return;
    // a prova "se escolhe sozinha" enquanto está em cena
    const pc = $$("#mkProva .mk-cell"), bar = $(".scr--prova .mk-prog b"), lbl = $(".scr--prova .mk-bottom .mono");
    const order = [1, 4, 6, 9, 10, 2, 7];
    let step = 0;
    setInterval(() => {
      if (cur !== 0) return;
      pc.forEach((c) => c.classList.remove("sel"));
      step = (step + 1) % (order.length + 2);
      order.slice(0, step).forEach((k) => pc[k].classList.add("sel"));
      const nsel = Math.min(step, order.length);
      bar.style.width = (nsel / 7) * 100 + "%";
      lbl.textContent = `${nsel + 8} / 40 escolhidas`;
    }, 900);
    // busca por número de peito
    const pista = $$("#mkPista .mk-cell"), type = $(".mk-type");
    const nums = ["1", "12", "127"]; let ni = 0;
    setInterval(() => {
      if (cur !== 5) return;
      ni = (ni + 1) % (nums.length + 1);
      const q = nums[ni] || "";
      type.textContent = q;
      pista.forEach((c, k) => c.classList.toggle("dim", q.length === 3 && k % 3 !== 1));
    }, 1100);
  }

  /* ---------- CENA 4: demonstração protegida ---------- */
  function demo() {
    const grid = $("#demoGrid"), LIMIT = 4, EXTRA = 25;
    const sel = new Set();
    const photos = Array.from({ length: 8 }, (_, i) => ({ src: img("ob-demo-" + i, 800, 1000) }));
    photos.forEach((p, i) => {
      const cell = document.createElement("button");
      cell.className = "demo__cell"; cell.type = "button"; cell.dataset.focus = "FR " + String(i + 1).padStart(2, "0");
      cell.setAttribute("aria-label", "Selecionar foto " + (i + 1));
      cell.setAttribute("aria-pressed", "false");
      cell.innerHTML = `<canvas class="prot"></canvas><span class="heart" aria-hidden="true">♥</span>`;
      grid.appendChild(cell);
      Offbeat.loadImage(p).then((im) => Protect.drawProtected(cell.querySelector("canvas"), im, { width: 220, watermark: "OFFBEAT", client: "visitante@offbeat.foto", center: "" })).catch(() => {});
      cell.addEventListener("click", () => {
        sel.has(i) ? sel.delete(i) : sel.add(i);
        cell.classList.toggle("sel", sel.has(i));
        cell.setAttribute("aria-pressed", sel.has(i));
        render();
      });
    });
    function render() {
      const ordered = [...sel];
      $$(".demo__cell", grid).forEach((c, k) => c.classList.toggle("extra", sel.has(k) && ordered.indexOf(k) >= LIMIT));
      const extra = Math.max(0, sel.size - LIMIT);
      $("#demoCount").textContent = sel.size;
      $("#demoTotal").textContent = Offbeat.money(extra * EXTRA);
      $("#demoProg").style.width = Math.min(100, (sel.size / LIMIT) * 100) + "%";
      $("#demoLabel").textContent = sel.size < LIMIT ? `Faltam ${LIMIT - sel.size} do pacote` : extra ? `${extra} extra${extra > 1 ? "s" : ""} · ${Offbeat.money(extra * EXTRA)}` : "Pacote completo ✓";
    }
    Protect.guard({ root: grid, global: false, onAttempt: () => Offbeat.toast("Foto protegida — download só com liberação do fotógrafo.") });
  }

  /* ---------- planos ---------- */
  function plans() {
    const btns = $$(".toggle button"), pill = $(".toggle__pill");
    const place = (b) => { pill.style.width = b.offsetWidth + "px"; pill.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
    place(btns[0]);
    addEventListener("resize", () => place($(".toggle button.on")));
    btns.forEach((b) => b.addEventListener("click", () => {
      btns.forEach((x) => x.classList.toggle("on", x === b)); place(b);
      $$(".plan__price b").forEach((el) => {
        el.textContent = el.dataset[b.dataset.period];
        el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip");
      });
    }));
  }

  /* ---------- sequência ---------- */
  nav(); strip(); manifesto(); solutions(); demo(); plans();
  Motion.viewfinder(); Motion.magnetic(); Motion.counters();
  loader().then(() => { Motion.reveal(); heroStack(); });
})();
