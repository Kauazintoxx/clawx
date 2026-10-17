/* ==========================================================================
   OFFBEAT — motion
   Assinatura: o "sincopado". Staggers não são lineares; seguem um padrão
   rítmico fora do tempo (1 · e · — · 4), como uma batida deslocada.
   ========================================================================== */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SYNC = [0, 0.07, 0.2, 0.24, 0.38, 0.45, 0.58, 0.62]; // batida deslocada
  const beat = (i, step = 1) => SYNC[i % SYNC.length] * step + Math.floor(i / SYNC.length) * 0.66 * step;

  /** Quebra o texto em palavras mascaradas; o atraso segue o padrão sincopado. */
  function split(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = 1;
    el.classList.add("split");
    const walk = (node, out) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) out.appendChild(document.createTextNode(" "));
            else { const w = document.createElement("span"); w.className = "w"; const s = document.createElement("span"); s.textContent = part; w.appendChild(s); out.appendChild(w); }
          });
        } else if (n.nodeType === 1) {
          const clone = n.cloneNode(false); walk(n, clone); out.appendChild(clone);
        }
      });
    };
    const frag = document.createDocumentFragment();
    walk(el, frag);
    el.textContent = ""; el.appendChild(frag);
    const base = parseFloat(el.dataset.delay || 0);
    el.querySelectorAll(".w > span").forEach((s, i) => s.style.setProperty("--d", (base + beat(i, 0.9)).toFixed(3) + "s"));
  }

  /** Revela elementos quando entram na tela. */
  function reveal(root = document) {
    root.querySelectorAll("[data-split]").forEach(split);
    const els = root.querySelectorAll("[data-reveal], [data-split]");
    if (reduce || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    els.forEach((e) => {
      // grupos: filhos [data-reveal] dentro de [data-stagger] ganham atraso sincopado
      const g = e.closest("[data-stagger]");
      if (g && e.hasAttribute("data-reveal") && !e.style.getPropertyValue("--d")) {
        const sibs = [...g.querySelectorAll("[data-reveal]")];
        e.style.setProperty("--d", beat(sibs.indexOf(e), 0.6).toFixed(3) + "s");
      }
      io.observe(e);
    });
  }

  /** Cursor-visor: colchetes de foco que travam no alvo e mostram uma etiqueta. */
  function viewfinder() {
    if (reduce || matchMedia("(hover: none)").matches) return;
    const vf = document.createElement("div");
    vf.className = "vf"; vf.setAttribute("aria-hidden", "true");
    vf.innerHTML = '<div class="vf__dot"></div><div class="vf__box"><i></i><i></i><i></i><i></i><span class="vf__label">AF·LOCK</span></div>';
    document.body.appendChild(vf);
    const box = vf.querySelector(".vf__box"), dot = vf.querySelector(".vf__dot"), label = vf.querySelector(".vf__label");
    let mx = innerWidth / 2, my = innerHeight / 2, bx = mx, by = my, target = null, bw = 34, bh = 34;
    addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY; vf.classList.add("on");
      const t = e.target.closest?.("[data-focus], a, button, .btn, input, select, textarea, label");
      if (t !== target) {
        target = t;
        vf.classList.toggle("lock", !!(t && t.dataset.focus !== undefined));
        if (t?.dataset.focus) label.textContent = t.dataset.focus;
        else label.textContent = "AF·LOCK";
      }
    }, { passive: true });
    document.addEventListener("pointerleave", () => vf.classList.remove("on"));
    (function loop() {
      let tx = mx, ty = my, tw = 34, th = 34;
      if (target && target.dataset.focus !== undefined) {
        const r = target.getBoundingClientRect();
        tx = r.left + r.width / 2; ty = r.top + r.height / 2; tw = r.width + 14; th = r.height + 14;
        if (tw > 520 || th > 520) { tx = mx; ty = my; tw = 64; th = 64; }
      } else if (target) { tw = 46; th = 46; }
      bx += (tx - bx) * 0.2; by += (ty - by) * 0.2; bw += (tw - bw) * 0.2; bh += (th - bh) * 0.2;
      box.style.transform = `translate(${bx - bw / 2}px, ${by - bh / 2}px)`;
      box.style.width = bw + "px"; box.style.height = bh + "px";
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      requestAnimationFrame(loop);
    })();
    box.style.transition = "none";
  }

  /** Botões magnéticos — leve atração, só em ponteiro fino. */
  function magnetic(root = document) {
    if (reduce || matchMedia("(hover: none)").matches) return;
    root.querySelectorAll("[data-magnetic]").forEach((el) => {
      const k = parseFloat(el.dataset.magnetic) || 0.25;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * k}px, ${(e.clientY - r.top - r.height / 2) * k}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /** Contador que sobe até o valor quando aparece. */
  function counters(root = document) {
    root.querySelectorAll("[data-count]").forEach((el) => {
      const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split(".")[1] || "").length;
      const pre = el.dataset.pre || "", suf = el.dataset.suf || "";
      const run = () => {
        if (reduce) { el.textContent = pre + end.toLocaleString("pt-BR", { minimumFractionDigits: dec }) + suf; return; }
        const t0 = performance.now(), dur = 1600;
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
          el.textContent = pre + (end * e).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };
      new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { run(); o.disconnect(); } }, { threshold: 0.5 }).observe(el);
    });
  }

  window.Motion = { reduce, beat, split, reveal, viewfinder, magnetic, counters };
})();
