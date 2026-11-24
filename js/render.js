/* Dibujo de mapas en canvas (EPSG:3857) con el AP, AID y AII superpuestos, leyenda, cuadrícula GTM, norte y escala. */
window.RENDER = (() => {
  const { toM, fromM, toGTM, fromGTM, G } = GEO;
  const W = 1400, H = 1000, MAPW = 1040, TOP = 64, BOT = 46; // marco
  const FONT = "Inter, Segoe UI, Arial, sans-serif";

  function frame(title, sub) {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#0f2a44"; x.fillRect(0, 0, W, TOP);
    x.fillStyle = "#fff"; x.font = `600 26px ${FONT}`; x.fillText(title, 24, 40);
    if (sub) { x.font = `15px ${FONT}`; x.fillStyle = "#b9cde3"; x.fillText(sub, 24, 58); }
    return [c, x];
  }
  // ventana cuadrada en 3857 alrededor de una zona, con margen
  function winFor(zone, minKm = 3, pad = 1.35) {
    const bb = turf.bbox(zone); const a = toM([bb[0], bb[1]]), b = toM([bb[2], bb[3]]);
    const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
    const lat = (bb[1] + bb[3]) / 2, k = Math.cos(lat * Math.PI / 180);
    const ah = (H - TOP - BOT) / MAPW;
    let w = Math.max((b[0] - a[0]) * pad, (b[1] - a[1]) * pad / ah, minKm * 1000 / k);
    return [cx - w / 2, cy - w * ah / 2, cx + w / 2, cy + w * ah / 2];
  }
  function mapper(win) {
    const sx = MAPW / (win[2] - win[0]), sy = (H - TOP - BOT) / (win[3] - win[1]);
    return ([X, Y]) => [(X - win[0]) * sx, TOP + (win[3] - Y) * sy];
  }
  function clipMap(x) { x.save(); x.beginPath(); x.rect(0, TOP, MAPW, H - TOP - BOT); x.clip(); }

  // --- capas ---
  async function drawGrid(x, win, id, colorFn) {
    const c0 = GEO.colOf(win[0]), c1 = GEO.colOf(win[2]), r0 = GEO.rowOf(win[3]), r1 = GEO.rowOf(win[1]);
    const val = await GEO.window(id, c0, r0, c1, r1);
    const w = c1 - c0 + 1, h = r1 - r0 + 1; const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cx = cv.getContext("2d"); const im = cx.createImageData(w, h);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const v = val(c0 + c, r0 + r); if (v === null) continue; const col = colorFn(v); if (!col) continue;
      const i = (r * w + c) * 4; im.data[i] = parseInt(col.slice(1, 3), 16); im.data[i + 1] = parseInt(col.slice(3, 5), 16); im.data[i + 2] = parseInt(col.slice(5, 7), 16); im.data[i + 3] = 235;
    }
    cx.putImageData(im, 0, 0);
    const M = mapper(win); const p0 = M([G.X0 + c0 * G.RES, G.Y0 - r0 * G.RES]), p1 = M([G.X0 + (c1 + 1) * G.RES, G.Y0 - (r1 + 1) * G.RES]);
    x.imageSmoothingEnabled = false; x.drawImage(cv, p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]); x.imageSmoothingEnabled = true;
  }
  function path(x, M, geom) {
    const P = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : geom.type === "LineString" ? [[geom.coordinates]] : geom.type === "MultiLineString" ? [geom.coordinates] : [];
    x.beginPath();
    for (const poly of P) for (const ring of poly) ring.forEach((p, i) => { const [u, v] = M(toM(p)); i ? x.lineTo(u, v) : x.moveTo(u, v); });
  }
  function drawVec(x, win, fc, styleFn) {
    const M = mapper(win); const [a, b] = [fromM([win[0], win[1]]), fromM([win[2], win[3]])]; const drawn = [];
    for (const f of fc.features) {
      if (!f.geometry) continue; const bb = turf.bbox(f); if (bb[0] > b[0] || bb[2] < a[0] || bb[1] > b[1] || bb[3] < a[1]) continue;
      const s = styleFn(f.properties, f) || {}; const t = f.geometry.type; drawn.push(f.properties);
      if (t === "Point") { const [u, v] = M(toM(f.geometry.coordinates)); x.beginPath(); x.arc(u, v, s.r || 6, 0, 7); x.fillStyle = s.fill || "#333"; x.fill(); x.lineWidth = 1.5; x.strokeStyle = "#fff"; x.stroke(); if (s.label) { x.font = `13px ${FONT}`; x.fillStyle = "#111"; x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 4; x.strokeText(s.label, u + 9, v - 6); x.fillText(s.label, u + 9, v - 6); } continue; }
      path(x, M, f.geometry);
      if (s.fill && /Polygon/.test(t)) { x.fillStyle = s.fill; x.globalAlpha = s.alpha ?? 0.75; x.fill("evenodd"); x.globalAlpha = 1; }
      if (s.stroke) { x.strokeStyle = s.stroke; x.lineWidth = s.lw || 1; x.setLineDash(s.dash || []); x.stroke(); x.setLineDash([]); }
    }
    return drawn;
  }
  const imgCache = {};
  function loadImg(src) { if (!imgCache[src]) imgCache[src] = new Promise((ok, ko) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = ko; i.src = src; }); return imgCache[src]; }
  async function drawBase(x, win) { // ortofoto Esri (si hay red); si falla, fondo gris claro
    x.fillStyle = "#eef1f4"; x.fillRect(0, TOP, MAPW, H - TOP - BOT);
    const z = Math.max(1, Math.min(18, Math.round(Math.log2(2 * Math.PI * 6378137 * MAPW / (win[2] - win[0]) / 256))));
    const n = 2 ** z, span = 2 * Math.PI * 6378137, o = span / 2;
    const tx0 = Math.floor((win[0] + o) / span * n), tx1 = Math.floor((win[2] + o) / span * n), ty0 = Math.floor((o - win[3]) / span * n), ty1 = Math.floor((o - win[1]) / span * n);
    const M = mapper(win); const jobs = [];
    for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) jobs.push(loadImg(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`).then(img => {
      const p0 = M([tx / n * span - o, o - ty / n * span]), p1 = M([(tx + 1) / n * span - o, o - (ty + 1) / n * span]); x.drawImage(img, p0[0], p0[1], p1[0] - p0[0] + 0.5, p1[1] - p0[1] + 0.5);
    }).catch(() => { }));
    await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 9000))]);
    return true;
  }
  function drawZones(x, win, Z, light) {
    const M = mapper(win);
    const st = [["AII", "#f5d000", [14, 8], 3], ["AID", "#ff7f00", [10, 6], 3], ["AP", "#e31a1c", [], 3.5]];
    for (const [k, col, dash, lw] of st) { if (!Z[k]) continue; path(x, M, Z[k].geometry); x.strokeStyle = light ? "rgba(0,0,0,.55)" : "rgba(255,255,255,.85)"; x.lineWidth = lw + 3; x.setLineDash(dash); x.stroke(); x.strokeStyle = col; x.lineWidth = lw; x.stroke(); x.setLineDash([]); if (k === "AP") { x.fillStyle = "rgba(227,26,28,.18)"; x.fill(); } }
  }
  function gtmGrid(x, win, labels = true) {
    const corners = [[win[0], win[1]], [win[2], win[1]], [win[2], win[3]], [win[0], win[3]]].map(p => toGTM(fromM(p)));
    const ex = Math.min(...corners.map(p => p[0])), wx = Math.max(...corners.map(p => p[0])), sy = Math.min(...corners.map(p => p[1])), ny = Math.max(...corners.map(p => p[1]));
    const span = wx - ex; const step = [100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000].find(s => span / s <= 6) || 100000;
    const M = mapper(win); const P = g => M(toM(fromGTM(g)));
    clipMap(x); x.strokeStyle = "rgba(20,20,20,.35)"; x.lineWidth = 1; x.setLineDash([4, 4]);
    const xs = [], ys = [];
    for (let gx = Math.ceil(ex / step) * step; gx <= wx; gx += step) { x.beginPath(); for (let i = 0; i <= 10; i++) { const [u, v] = P([gx, sy + (ny - sy) * i / 10]); i ? x.lineTo(u, v) : x.moveTo(u, v); } x.stroke(); xs.push([gx, P([gx, (sy + ny) / 2])[0]]); }
    for (let gy = Math.ceil(sy / step) * step; gy <= ny; gy += step) { x.beginPath(); for (let i = 0; i <= 10; i++) { const [u, v] = P([ex + (wx - ex) * i / 10, gy]); i ? x.lineTo(u, v) : x.moveTo(u, v); } x.stroke(); ys.push([gy, P([(ex + wx) / 2, gy])[1]]); }
    x.restore(); x.setLineDash([]);
    if (!labels) return;
    x.font = `12px ${FONT}`; x.fillStyle = "#222";
    for (const [g, u] of xs) if (u > 40 && u < MAPW - 40) { x.fillText(`${Math.round(g)} E`, u - 30, H - BOT + 16); }
    x.save(); for (const [g, v] of ys) if (v > TOP + 40 && v < H - BOT - 10) { x.translate(MAPW + 14, v + 34); x.rotate(-Math.PI / 2); x.fillText(`${Math.round(g)} N`, 0, 0); x.setTransform(1, 0, 0, 1, 0, 0); } x.restore();
  }
  function decor(x, win, legend, fuente) {
    // norte
    x.save(); x.translate(MAPW - 44, TOP + 52); x.fillStyle = "#111"; x.beginPath(); x.moveTo(0, -28); x.lineTo(12, 14); x.lineTo(0, 6); x.lineTo(-12, 14); x.closePath(); x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 2; x.stroke(); x.font = `700 16px ${FONT}`; x.fillText("N", -5, 34); x.restore();
    // escala
    const lat = fromM([(win[0] + win[2]) / 2, (win[1] + win[3]) / 2])[1], k = Math.cos(lat * Math.PI / 180);
    const mpp = (win[2] - win[0]) / MAPW * k; const target = mpp * 220; const nice = [10, 20, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000].reduce((p, c) => c <= target ? c : p, 10);
    const px = nice / mpp, sx = 24, sy = H - BOT - 26;
    x.fillStyle = "rgba(255,255,255,.88)"; x.fillRect(sx - 10, sy - 22, px + 90, 38);
    for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? "#fff" : "#111"; x.fillRect(sx + i * px / 4, sy, px / 4, 8); } x.strokeStyle = "#111"; x.strokeRect(sx, sy, px, 8);
    x.fillStyle = "#111"; x.font = `13px ${FONT}`; x.fillText("0", sx - 3, sy - 6); x.fillText(nice >= 1000 ? `${nice / 1000} km` : `${nice} m`, sx + px - 10, sy - 6);
    // panel de leyenda
    x.fillStyle = "#f6f8fa"; x.fillRect(MAPW + 40, TOP, W - MAPW - 40, H - TOP); x.fillStyle = "#0f2a44"; x.font = `700 17px ${FONT}`; x.fillText("Leyenda", MAPW + 60, TOP + 34);
    let y = TOP + 66; x.font = `14px ${FONT}`;
    const items = [["AP – Área del proyecto", "#e31a1c", "line"], ["AID – Influencia directa", "#ff7f00", "dash"], ["AII – Influencia indirecta", "#f5d000", "dash"], ...legend];
    for (const [lab, col, kind] of items) {
      if (kind === "head") { y += 8; x.fillStyle = "#0f2a44"; x.font = `600 14px ${FONT}`; y = wrap(x, lab, MAPW + 60, y, 270, 18) + 26; x.font = `14px ${FONT}`; continue; }
      if (kind === "line" || kind === "dash") { x.strokeStyle = col; x.lineWidth = 4; x.setLineDash(kind === "dash" ? [8, 5] : []); x.beginPath(); x.moveTo(MAPW + 60, y - 5); x.lineTo(MAPW + 92, y - 5); x.stroke(); x.setLineDash([]); }
      else if (kind === "pt") { x.fillStyle = col; x.beginPath(); x.arc(MAPW + 76, y - 5, 7, 0, 7); x.fill(); }
      else { x.fillStyle = col; x.fillRect(MAPW + 60, y - 15, 32, 18); x.strokeStyle = "#999"; x.lineWidth = 1; x.strokeRect(MAPW + 60, y - 15, 32, 18); }
      x.fillStyle = "#222"; y = wrap(x, lab, MAPW + 102, y, 238, 18) + 28; if (y > H - 150) break;
    }
    x.fillStyle = "#555"; x.font = `12px ${FONT}`; let fy = H - 128; x.fillText("Proyección: WGS84 / Pseudo-Mercator;", MAPW + 60, fy); x.fillText("cuadrícula en coordenadas GTM (m).", MAPW + 60, fy + 16);
    wrap(x, "Fuente: " + fuente, MAPW + 60, fy + 40, 280, 15);
  }
  function wrap(x, txt, X, Y, maxW, lh) { const words = String(txt).split(" "); let line = ""; for (const w of words) { const t = line ? line + " " + w : w; if (x.measureText(t).width > maxW && line) { x.fillText(line, X, Y); Y += lh; line = w; } else line = t; } x.fillText(line, X, Y); return Y; }

  // ---------- mapas temáticos ----------
  async function gridMap(id, Z, title, opts = {}) {
    const L = KB.GRIDS[id]; const win = opts.win || winFor(Z.AII || Z.AP, opts.minKm || 4);
    const [c, x] = frame(title, L.nombre); clipMap(x); x.fillStyle = "#fafafa"; x.fillRect(0, TOP, MAPW, H - TOP - BOT);
    let colorFn, legend = [];
    if (L.clases) { colorFn = v => (L.clases[v] || [])[1]; const seen = new Set(); for (const [k, [lab, col]] of Object.entries(L.clases)) if (!seen.has(lab)) { seen.add(lab); legend.push([lab, col]); } }
    else if (L.catColor) { const f = id === "amen" ? v => L.decode(v).cat : id === "riesgo" ? v => L.tabla[v] : v => L.cat(v); colorFn = v => L.catColor[f(v)]; legend = Object.entries(L.catColor).map(([k, v]) => [k, v]); }
    else { const [a, b] = L.rango, R = L.rampa; colorFn = v => R[Math.max(0, Math.min(R.length - 1, Math.floor((v - a) / (b - a) * R.length)))]; legend = R.map((col, i) => [`${Math.round(a + (b - a) * i / R.length)}–${Math.round(a + (b - a) * (i + 1) / R.length)} ${L.continuo}`, col]); }
    await drawGrid(x, win, id, colorFn);
    gtmGrid(x, win, false); drawZones(x, win, Z, true); x.restore(); gtmGrid(x, win, true);
    decor(x, win, [[L.nombre, null, "head"], ...legend], L.cita.split(".")[0]);
    return c;
  }
  async function vecMap(name, Z, title, styleFn, legend, opts = {}) {
    const fc = await GEO.vec(name); const win = opts.win || winFor(Z.AII || Z.AP, opts.minKm || 6);
    const [c, x] = frame(title, KB.VEC[name].nombre); clipMap(x); x.fillStyle = "#fafafa"; x.fillRect(0, TOP, MAPW, H - TOP - BOT);
    if (opts.base) await drawBase(x, win);
    const drawn = drawVec(x, win, fc, styleFn); if (typeof legend === "function") legend = legend(drawn); if (opts.extra) await opts.extra(x, win, mapper(win));
    gtmGrid(x, win, false); drawZones(x, win, Z, !opts.base); x.restore(); gtmGrid(x, win, true);
    decor(x, win, [[KB.VEC[name].nombre, null, "head"], ...legend], KB.VEC[name].cita.split(".")[0]);
    return c;
  }
  async function zoneMap(Z, title, sub, opts = {}) { // ubicación AP/AID/AII sobre ortofoto (+ puntos)
    const win = opts.win || winFor(Z.AII || Z.AP, opts.minKm || 1.2, 1.25);
    const [c, x] = frame(title, sub); clipMap(x); await drawBase(x, win);
    gtmGrid(x, win, false); drawZones(x, win, Z, false);
    const M = mapper(win); const legend = [];
    for (const p of (opts.puntos || [])) { const [u, v] = M(toM(p.ll)); x.beginPath(); x.arc(u, v, 9, 0, 7); x.fillStyle = p.col; x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 2.5; x.stroke(); x.font = `700 14px ${FONT}`; x.strokeStyle = "rgba(0,0,0,.8)"; x.lineWidth = 4; x.strokeText(p.id, u + 12, v - 8); x.fillStyle = "#fff"; x.fillText(p.id, u + 12, v - 8); }
    if (opts.vertices) { const ring = Z.AP.geometry.coordinates[0].slice(0, -1); ring.forEach((p, i) => { const [u, v] = M(toM(p)); x.beginPath(); x.arc(u, v, 5, 0, 7); x.fillStyle = "#fff"; x.fill(); x.strokeStyle = "#e31a1c"; x.lineWidth = 2; x.stroke(); x.font = `700 13px ${FONT}`; x.strokeStyle = "rgba(0,0,0,.85)"; x.lineWidth = 4; x.strokeText("V" + (i + 1), u + 7, v - 7); x.fillStyle = "#fff"; x.fillText("V" + (i + 1), u + 7, v - 7); }); }
    x.restore(); gtmGrid(x, win, true);
    const types = {}; for (const p of (opts.puntos || [])) types[p.tipo] = p.col; for (const [k, v] of Object.entries(types)) legend.push([k, v, "pt"]);
    decor(x, win, legend, "Esri World Imagery (ortofoto de referencia); polígonos del proyecto");
    return c;
  }
  // Lámina georreferenciada: recorte regional + lámina completa con recuadro
  async function sheetMap(key, Z, meta) {
    const S = KB.SHEETS[key], m = meta[key]; if (!m) return null;
    const img = await loadImg(GEO_BASE() + m.file);
    const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); x.fillStyle = "#0f2a44"; x.fillRect(0, 0, W, TOP);
    x.fillStyle = "#fff"; x.font = `600 26px ${FONT}`; x.fillText(S.t, 24, 40); x.font = `15px ${FONT}`; x.fillStyle = "#b9cde3"; x.fillText("Lámina de consulta con la ubicación del proyecto", 24, 58);
    const ct = toM(turf.centroid(Z.AP).geometry.coordinates); const [bx0, by0, bx1, by1] = m.bounds;
    const ppm = m.w / (bx1 - bx0); // px por metro de la lámina
    const LW = 840, LH = H - TOP - BOT; const halfW = Math.max(Math.min(30000, (bx1 - bx0) * 0.08), (turf.bbox(Z.AII)[2] - turf.bbox(Z.AII)[0]) * 111000 * 1.5);
    const win = [ct[0] - halfW, ct[1] - halfW * LH / LW, ct[0] + halfW, ct[1] + halfW * LH / LW];
    const sx = (win[0] - bx0) * ppm, sy = (by1 - win[3]) * ppm, sw = (win[2] - win[0]) * ppm, sh = (win[3] - win[1]) * ppm;
    x.save(); x.beginPath(); x.rect(0, TOP, LW, LH); x.clip(); x.fillStyle = "#f2f2f2"; x.fillRect(0, TOP, LW, LH);
    x.drawImage(img, sx, sy, sw, sh, 0, TOP, LW, LH);
    const Mw = ([X, Y]) => [(X - win[0]) / (win[2] - win[0]) * LW, TOP + (win[3] - Y) / (win[3] - win[1]) * LH];
    for (const [k, col] of [["AII", "#f5d000"], ["AID", "#ff7f00"], ["AP", "#e31a1c"]]) { x.beginPath(); Z[k].geometry.coordinates[0].forEach((p, i) => { const [u, v] = Mw(toM(p)); i ? x.lineTo(u, v) : x.moveTo(u, v); }); x.strokeStyle = "#000"; x.lineWidth = 5; x.stroke(); x.strokeStyle = col; x.lineWidth = 3; x.stroke(); }
    const [pu, pv] = Mw(ct); x.strokeStyle = "#e31a1c"; x.lineWidth = 3; x.beginPath(); x.arc(pu, pv, 26, 0, 7); x.stroke(); x.beginPath(); x.moveTo(pu - 40, pv); x.lineTo(pu - 28, pv); x.moveTo(pu + 28, pv); x.lineTo(pu + 40, pv); x.moveTo(pu, pv - 40); x.lineTo(pu, pv - 28); x.moveTo(pu, pv + 28); x.lineTo(pu, pv + 40); x.stroke();
    x.restore(); x.strokeStyle = "#333"; x.lineWidth = 1; x.strokeRect(0.5, TOP, LW, LH);
    // lámina completa
    const RW = W - LW - 40, RH = H - TOP - BOT - 20; const sc = Math.min(RW / m.w, RH / m.h); const dw = m.w * sc, dh = m.h * sc, dx = LW + 20 + (RW - dw) / 2, dy = TOP + 10;
    x.drawImage(img, dx, dy, dw, dh); x.strokeStyle = "#999"; x.strokeRect(dx, dy, dw, dh);
    const q = ([X, Y]) => [dx + (X - bx0) / (bx1 - bx0) * dw, dy + (by1 - Y) / (by1 - by0) * dh];
    const [a0, a1] = q([win[0], win[3]]), [b0, b1] = q([win[2], win[1]]); x.strokeStyle = "#e31a1c"; x.lineWidth = 2.5; x.strokeRect(a0, a1, b0 - a0, b1 - a1);
    const [qx, qy] = q(ct); x.fillStyle = "#e31a1c"; x.beginPath(); x.arc(qx, qy, 5, 0, 7); x.fill();
    x.fillStyle = "#333"; x.font = `13px ${FONT}`; x.fillText(`Recuadro rojo: extensión del detalle (${Math.round(halfW * 2 / 1000)} km de ancho aprox.)`, 20, H - 26);
    wrap(x, "Fuente: " + S.f, LW + 20, H - 26, RW, 15);
    return c;
  }
  let GEO_BASE = () => "data/";
  return { gridMap, vecMap, zoneMap, sheetMap, winFor, W, H };
})();
