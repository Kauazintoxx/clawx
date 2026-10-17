/* ==========================================================================
   OFFBEAT — proteção de imagens
   1. A foto nunca vira <img> no DOM: é desenhada em <canvas>, em resolução de
      tela (não o original), com marca d'água "queimada" nos pixels.
   2. A marca d'água é forense: leva o e-mail/nome do cliente e a data —
      se a imagem vazar por print, a origem é identificável.
   3. Bloqueia botão direito, arrastar, Ctrl+S/P/U, F12, e escurece o conteúdo
      quando a janela perde foco (ferramentas de recorte) ou em PrintScreen.
   Nenhuma proteção no navegador é absoluta; a combinação torna a cópia
   trabalhosa e rastreável — que é o que importa para o fotógrafo.
   ========================================================================== */
(function () {
  const MAX = 1400; // teto de pixels desenhados (o original nunca é exposto)

  function drawProtected(canvas, img, o = {}) {
    const cssW = o.width || canvas.clientWidth || 600;
    const ratio = img.naturalHeight / img.naturalWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.min(MAX, Math.round(cssW * dpr));
    const h = Math.round(w * ratio);
    canvas.width = w; canvas.height = h;
    if (o.fitCss !== false && o.width) canvas.style.aspectRatio = `${w} / ${h}`;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    if (o.watermark === false) return canvas;
    stamp(ctx, w, h, o);
    return canvas;
  }

  function stamp(ctx, w, h, o) {
    const mark = (o.watermark || "OFFBEAT").toUpperCase();
    const who = [o.client, new Date().toLocaleDateString("pt-BR")].filter(Boolean).join(" · ");
    const fs = Math.max(11, Math.round(w / 34));
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 7);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const stepX = fs * 16, stepY = fs * 5.5, R = Math.hypot(w, h);
    for (let y = -R, row = 0; y < R; y += stepY, row++) {
      for (let x = -R + (row % 2) * stepX / 2; x < R; x += stepX) {
        ctx.font = `600 ${fs}px "Inter Tight", system-ui, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,.17)";
        ctx.fillText(mark, x, y);
        if (who) {
          ctx.font = `500 ${Math.round(fs * 0.62)}px "JetBrains Mono", monospace`;
          ctx.fillStyle = "rgba(0,0,0,.16)";
          ctx.fillText(who, x, y + fs * 1.05);
        }
      }
    }
    ctx.restore();
    // selo central discreto
    ctx.save();
    ctx.globalAlpha = 0.28; ctx.fillStyle = "#fff";
    ctx.font = `italic ${Math.round(w / 9)}px "Instrument Serif", serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(o.center || "prova", w / 2, h / 2);
    ctx.restore();
  }

  let guarded = false;
  function guard({ root = document, onAttempt = () => {}, shield = document.body, global = true } = {}) {
    const stop = (why) => (e) => {
      if (root !== document && !root.contains(e.target)) return;
      if (e.target.closest?.("input, textarea, [contenteditable]")) return;
      e.preventDefault(); onAttempt(why);
    };
    root.addEventListener("contextmenu", stop("contextmenu"));
    root.addEventListener("dragstart", stop("drag"));
    root.addEventListener("copy", stop("copy"));
    if (!document.getElementById("prot-css")) {
      const st = document.createElement("style"); st.id = "prot-css";
      st.textContent = `.shielded canvas.prot{filter:blur(28px) brightness(.4)!important;transition:filter .15s}
      canvas.prot{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none}`;
      document.head.appendChild(st);
    }
    if (guarded || !global) return; guarded = true;

    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      const blocked = (mod && ["s", "p", "u"].includes(k)) || k === "f12" || (mod && e.shiftKey && ["i", "j", "c", "s"].includes(k));
      if (blocked) { e.preventDefault(); e.stopPropagation(); onAttempt("key:" + k); }
    }, true);
    window.addEventListener("keyup", (e) => {
      if (e.key === "PrintScreen") {
        shield.classList.add("shielded");
        try { navigator.clipboard.writeText("Conteúdo protegido · Offbeat"); } catch (_) {}
        onAttempt("printscreen");
        setTimeout(() => shield.classList.remove("shielded"), 1600);
      }
    });
    // ferramentas de recorte tiram o foco da janela antes de capturar
    window.addEventListener("blur", () => shield.classList.add("shielded"));
    window.addEventListener("focus", () => shield.classList.remove("shielded"));
    document.addEventListener("visibilitychange", () => shield.classList.toggle("shielded", document.hidden));

    const st = document.createElement("style");
    st.textContent = `@media print{body{visibility:hidden!important}body::after{content:"Conteúdo protegido";visibility:visible;position:fixed;inset:0;display:grid;place-items:center;font:24px sans-serif}}`;
    document.head.appendChild(st);
  }

  window.Protect = { drawProtected, guard, stamp };
})();
