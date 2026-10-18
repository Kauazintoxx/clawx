/* ==========================================================================
   OFFBEAT — painel · Realidade aumentada
   Liga uma foto impressa a um vídeo. O cliente aponta a câmera do celular
   para a foto (ar.html) e o vídeo toca "dentro" dela.
   Arquivos: alvo em IndexedDB "artgt:<id>", vídeo em "arvid:<id>".
   ========================================================================== */
(function () {
  const V = (window.OBViews = window.OBViews || {});

  V.ar = (v, _, c) => {
    const { O, $, $$, S, esc } = c, s = S();
    v.innerHTML = `
      <header class="vh"><div><p class="mono">${s.ar.length} experiências · ${s.ar.reduce((a, x) => a + (x.views || 0), 0)} aberturas</p><h1>Realidade <em>aumentada</em></h1></div>
        <div class="acts"><button class="btn btn--red" id="nar">+ Nova experiência</button></div></header>
      <div class="card ar-how"><ol>
        <li><b>1</b><span>Escolha a foto que vai ser impressa (do álbum, do quadro, do cartão).</span></li>
        <li><b>2</b><span>Envie o vídeo: making of, primeira dança, recado dos noivos.</span></li>
        <li><b>3</b><span>Imprima o QR Code no verso ou mande o link pelo WhatsApp.</span></li>
        <li><b>4</b><span>O cliente aponta a câmera para a foto e o vídeo toca em cima dela.</span></li></ol></div>
      <div class="gcards" style="margin-top:16px">${s.ar.map((x) => `
        <article class="gcard ar-card"><div class="gcard__img"><img data-ar="${x.id}" alt=""><span class="chip ${x.ready ? "ok" : ""}">▶ ${x.ready ? "pronta" : "sem vídeo"}</span></div>
          <div class="gcard__body"><strong>${esc(x.title)}</strong><small>${esc(x.client || "")} · ${x.views || 0} aberturas · ${x.videoName ? esc(x.videoName) : "—"}</small>
          <div class="acts" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><button class="btn btn--sm" data-share="${x.id}">Compartilhar</button><a class="btn btn--sm btn--ghost" href="${esc(O.arLink(x))}" target="_blank" rel="noopener">Testar ↗</a><button class="btn btn--sm btn--ghost" data-card="${x.id}">Cartão QR</button><button class="icon-btn" data-rm="${x.id}" aria-label="Excluir">×</button></div></div></article>`).join("")}
        <a class="gnew" href="javascript:void 0" id="nar2"><div><span>+</span>Nova experiência</div></a></div>`;
    $$("img[data-ar]", v).forEach((img) => O.getBlob("artgt:" + img.dataset.ar).then((b) => b && (img.src = URL.createObjectURL(b))));
    $("#nar", v).onclick = $("#nar2", v).onclick = () => create(c);
    $$("[data-share]", v).forEach((b) => (b.onclick = () => share(c, s.ar.find((x) => x.id === b.dataset.share))));
    $$("[data-card]", v).forEach((b) => (b.onclick = () => printCard(c, s.ar.find((x) => x.id === b.dataset.card))));
    $$("[data-rm]", v).forEach((b) => (b.onclick = () => {
      if (!confirm("Excluir esta experiência? O link deixa de funcionar.")) return;
      const id = b.dataset.rm; O.delBlob("artgt:" + id); O.delBlob("arvid:" + id); O.delBlob("armind:" + id);
      O.update((s2) => (s2.ar = s2.ar.filter((x) => x.id !== id)));
    }));
  };

  function create(c) {
    const { O, $, $$, S, esc, dialog, closeDialog } = c, s = S();
    const d = dialog(`<p class="mono">Realidade aumentada</p><h2>Nova experiência</h2><form class="form" id="far">
      <div class="field"><span>Título</span><input name="title" required placeholder="Primeira dança — Marina & Teo"></div>
      <div class="field"><span>Cliente</span><select name="leadId"><option value="">—</option>${s.leads.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join("")}</select></div>
      <div class="field"><span>Foto impressa (o alvo)</span><select name="src"><option value="upload">Enviar a foto do computador</option>${s.galleries.map((g) => `<option value="g:${g.id}">Escolher da galeria “${esc(g.title)}”</option>`).join("")}</select></div>
      <div class="field" id="upT"><input type="file" name="target" accept="image/*"><small>Use exatamente a imagem que vai ser impressa. Fotos com detalhes e contraste funcionam melhor do que céu liso ou fundo branco.</small></div>
      <div class="field" id="pickT" hidden><div class="pick" id="pick"></div></div>
      <div class="field"><span>Vídeo</span><input type="file" name="video" accept="video/mp4,video/webm,video/quicktime" required><small>MP4 (H.264) de até ~60 s abre em qualquer celular. O vídeo é enquadrado no tamanho da foto.</small></div>
      <div class="upbar" id="arBar" hidden><i></i></div>
      <div class="acts"><button class="btn btn--red">Criar experiência</button></div></form>`, { wide: true });
    const f = $("#far", d);
    let picked = null;
    f.src.onchange = () => {
      const g = f.src.value.startsWith("g:") && s.galleries.find((x) => x.id === f.src.value.slice(2));
      $("#upT", d).hidden = !!g; $("#pickT", d).hidden = !g; f.target.required = !g;
      if (g) {
        $("#pick", d).innerHTML = g.photos.filter((p) => !p.video).slice(0, 40).map((p) => `<button type="button" data-p="${p.id}">${c.imgTag(g, p.id, 160)}</button>`).join("");
        c.hydrate($("#pick", d));
        $$("[data-p]", d).forEach((b) => (b.onclick = () => { picked = { g, p: g.photos.find((x) => x.id === b.dataset.p) }; $$("[data-p]", d).forEach((x) => x.classList.toggle("on", x === b)); }));
      }
    };
    f.target.required = true;
    f.onsubmit = async (e) => {
      e.preventDefault();
      if (!f.target.files[0] && !picked) return O.toast("Escolha a foto impressa.");
      const vid = f.video.files[0];
      if (!vid) return O.toast("Envie o vídeo.");
      const bar = $("#arBar", d); bar.hidden = false; bar.firstElementChild.style.width = "20%";
      try {
        const id = O.uid("ar_");
        let target;
        if (f.target.files[0]) target = (await O.downscale(f.target.files[0], 1200, 0.92)).blob;
        else {
          const im = await O.loadImage(picked.p);
          const k = Math.min(1, 1200 / Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement("canvas");
          cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k); cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
          target = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.92));
        }
        bar.firstElementChild.style.width = "55%";
        await O.putBlob("artgt:" + id, target);
        await O.putBlob("arvid:" + id, vid);
        bar.firstElementChild.style.width = "100%";
        const lead = s.leads.find((l) => l.id === f.leadId.value);
        O.update((s2) => { s2.ar.unshift({ id, title: f.title.value, leadId: lead?.id || null, client: lead?.name || "", phone: lead?.phone || "", videoName: vid.name, videoSize: vid.size, ready: true, views: 0, createdAt: Date.now() }); O.log(`Experiência de realidade aumentada criada: ${f.title.value}`, "info"); });
        closeDialog();
        share(c, S().ar.find((x) => x.id === id));
      } catch (err) { O.toast("Não foi possível preparar os arquivos."); bar.hidden = true; }
    };
  }

  function share(c, x) {
    const { O, $, esc, dialog } = c, link = O.arLink(x);
    const d = dialog(`<p class="mono">Compartilhar</p><h2>${esc(x.title)}</h2>
      <div class="pixgrid"><div class="qr">${Pix.qrSVG(link, { fg: "#0f0e0c" })}</div>
      <div><div class="field"><span>Link da experiência</span><input readonly value="${esc(link)}"></div>
      <p class="mono" style="text-transform:none">O cliente abre o link no celular, permite a câmera e aponta para a foto impressa. Sem instalar nada.</p></div></div>
      <div class="acts"><button class="btn btn--sm" id="cpar">Copiar link</button>${x.phone ? `<a class="btn btn--sm btn--red" target="_blank" rel="noopener" href="${c.waLink(x.phone, `Oi! Preparei uma surpresa 🎬 Abra este link no celular e aponte a câmera para a foto impressa: ${link}`)}">Enviar no WhatsApp</a>` : `<a class="btn btn--sm btn--red" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Aponte a câmera do celular para a foto impressa: ${link}`)}">Enviar no WhatsApp</a>`}<button class="btn btn--sm btn--ghost" id="pcar">Imprimir cartão QR</button></div>`);
    $("#cpar", d).onclick = () => O.copy(link, "Link copiado.");
    $("#pcar", d).onclick = () => printCard(c, x);
  }

  async function printCard(c, x) {
    const { O, esc, printHTML } = c, link = O.arLink(x);
    const b = await O.getBlob("artgt:" + x.id);
    const src = b ? await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }) : "";
    printHTML(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center;border:1px solid #ddd;padding:24px;border-radius:12px;max-width:640px">
      ${src ? `<img src="${src}" style="width:100%;border-radius:6px" alt="">` : ""}
      <div><p class="mono">Esta foto tem uma surpresa</p><h1 style="font-size:30px">${esc(x.title)}</h1>
      <div style="width:150px">${Pix.qrSVG(link, { fg: "#0f0e0c" })}</div>
      <p style="font-size:12px">1. Leia o QR com a câmera do celular · 2. Permita a câmera · 3. Aponte para a foto.</p>
      <p class="mono">${esc(O.get().studio.brand)} · ${esc(O.get().studio.name)}</p></div></div>`);
  }
})();
