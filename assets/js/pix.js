/* ==========================================================================
   OFFBEAT — Pix BR Code (padrão EMV do Banco Central) + QR em SVG
   Gera um "Pix copia e cola" estático válido, aceito por qualquer banco.
   ========================================================================== */
(function () {
  const strip = (s, n) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 @._+\-]/g, "").toUpperCase().slice(0, n).trim();
  const f = (id, v) => id + String(v.length).padStart(2, "0") + v;

  function crc16(str) {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  /**
   * @param {{key:string,name:string,city:string,amount?:number,txid?:string,desc?:string}} o
   */
  function payload(o) {
    const key = String(o.key || "").trim();
    let mai = f("00", "br.gov.bcb.pix") + f("01", key);
    const desc = strip(o.desc, 40);
    if (desc && (mai.length + desc.length + 4) <= 99) mai += f("02", desc);
    const txid = (String(o.txid || "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25)) || "***";
    let p = f("00", "01") + f("26", mai) + f("52", "0000") + f("53", "986");
    if (o.amount && o.amount > 0) p += f("54", Number(o.amount).toFixed(2));
    p += f("58", "BR") + f("59", strip(o.name, 25) || "RECEBEDOR") + f("60", strip(o.city, 15) || "SAO PAULO");
    p += f("62", f("05", txid));
    p += "6304";
    return p + crc16(p);
  }

  /** QR como SVG (usa qrcode-generator do cdnjs; sem ele, devolve vazio). */
  function qrSVG(text, { fg = "currentColor", bg = "transparent", margin = 2 } = {}) {
    if (typeof window.qrcode !== "function") return "";
    const qr = window.qrcode(0, "M"); qr.addData(text); qr.make();
    const n = qr.getModuleCount(), s = n + margin * 2;
    let d = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x + margin} ${y + margin}h1v1h-1z`;
    return `<svg viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges" role="img" aria-label="QR Code"><rect width="${s}" height="${s}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
  }

  window.Pix = { payload, qrSVG, crc16 };
})();
