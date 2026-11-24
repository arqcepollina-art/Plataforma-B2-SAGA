/* Motor geoespacial: proyecciones, lectura de teselas codificadas, capas vectoriales y estadística zonal. */
window.GEO = (() => {
  proj4.defs("GTM", "+proj=tmerc +lat_0=0 +lon_0=-90.5 +k=0.9998 +x_0=500000 +y_0=0 +datum=WGS84 +units=m +no_defs");
  const R = 6378137;
  const toM = ([lon, lat]) => [lon * Math.PI / 180 * R, Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * R];
  const fromM = ([x, y]) => [x / R * 180 / Math.PI, (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI];
  const toGTM = (ll) => proj4("EPSG:4326", "GTM", ll);
  const fromGTM = (xy) => proj4("GTM", "EPSG:4326", xy);
  const G = { X0: -10280000, Y0: 2030000, RES: 100, T: 512 };
  const BASE = "data/";

  // ---------- teselas ----------
  const info = {}, tiles = {};
  async function gridInfo(id) {
    if (!info[id]) info[id] = fetch(`${BASE}g/${id}/info.json`).then(r => r.json()).then(j => (j.set = new Set(j.tiles), j));
    return info[id];
  }
  async function tile(id, tx, ty) {
    const k = `${id}/${tx}_${ty}`;
    if (!(k in tiles)) tiles[k] = (async () => {
      const inf = await gridInfo(id);
      if (!inf.set.has(`${tx}_${ty}`)) return null;
      const blob = await (await fetch(`${BASE}g/${k}.png`)).blob();
      const bmp = await createImageBitmap(blob, { colorSpaceConversion: "none", premultiplyAlpha: "none" });
      const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
      const cx = c.getContext("2d", { willReadFrequently: true }); cx.drawImage(bmp, 0, 0);
      return cx.getImageData(0, 0, c.width, c.height).data;
    })();
    return tiles[k];
  }
  // Ventana de celdas [c0,r0,c1,r1] → función valor(col,row)
  async function window_(id, c0, r0, c1, r1) {
    const inf = await gridInfo(id); const T = G.T;
    const need = [];
    for (let ty = Math.floor(r0 / T); ty <= Math.floor(r1 / T); ty++)
      for (let tx = Math.floor(c0 / T); tx <= Math.floor(c1 / T); tx++) need.push([tx, ty]);
    const got = {};
    await Promise.all(need.map(async ([tx, ty]) => { got[`${tx}_${ty}`] = await tile(id, tx, ty); }));
    return (c, r) => {
      const tx = Math.floor(c / T), ty = Math.floor(r / T), d = got[`${tx}_${ty}`];
      if (!d) return null;
      const i = ((r - ty * T) * T + (c - tx * T)) * 4;
      if (d[i + 2] !== 1) return null;
      return ((d[i] << 8) | d[i + 1]) / inf.scale;
    };
  }
  const colOf = x => Math.floor((x - G.X0) / G.RES), rowOf = y => Math.floor((G.Y0 - y) / G.RES);
  const cx_ = c => G.X0 + (c + 0.5) * G.RES, cy_ = r => G.Y0 - (r + 0.5) * G.RES;

  // ---------- geometría ----------
  function ringsM(feat) { // anillos en 3857 de un Polygon/MultiPolygon
    const g = feat.geometry || feat; const P = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    return P.map(poly => poly.map(ring => ring.map(toM)));
  }
  function pip(x, y, polys) {
    for (const poly of polys) {
      let inside = false;
      for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) return true;
    }
    return false;
  }
  function bboxM(polys) { let a = [Infinity, Infinity, -Infinity, -Infinity]; for (const p of polys) for (const r of p) for (const [x, y] of r) { a[0] = Math.min(a[0], x); a[1] = Math.min(a[1], y); a[2] = Math.max(a[2], x); a[3] = Math.max(a[3], y); } return a; }

  // Estadística zonal de una capa en una zona (Feature WGS84)
  async function zonal(id, zone) {
    const polys = ringsM(zone), [x0, y0, x1, y1] = bboxM(polys);
    const c0 = colOf(x0), c1 = colOf(x1), r0 = rowOf(y1), r1 = rowOf(y0);
    const val = await window_(id, c0, r0, c1, r1);
    const cnt = {}; let n = 0, nd = 0, sum = 0, mn = Infinity, mx = -Infinity;
    const add = v => { if (v === null) { nd++; return; } n++; cnt[v] = (cnt[v] || 0) + 1; sum += v; mn = Math.min(mn, v); mx = Math.max(mx, v); };
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (pip(cx_(c), cy_(r), polys)) add(val(c, r));
    let central = false;
    if (n + nd === 0) { const ct = toM(turf.centroid(zone).geometry.coordinates); add(val(colOf(ct[0]), rowOf(ct[1]))); central = true; }
    const lat = turf.centroid(zone).geometry.coordinates[1], k = Math.cos(lat * Math.PI / 180);
    const haCell = (G.RES * k) ** 2 / 1e4;
    return { cnt, n, nd, mean: n ? sum / n : null, min: n ? mn : null, max: n ? mx : null, haCell, central };
  }
  async function valueAt(id, lonlat) { const [x, y] = toM(lonlat); const c = colOf(x), r = rowOf(y); const v = await window_(id, c, r, c, r); return v(c, r); }

  // ---------- vectores ----------
  const vcache = {};
  function vec(name) { if (!vcache[name]) vcache[name] = fetch(`${BASE}v/${name}.geojson`).then(r => r.json()); return vcache[name]; }
  let sismosP;
  function sismos() { if (!sismosP) sismosP = fetch(`${BASE}v/sismos.json`).then(r => r.json()); return sismosP; }
  let pueblosP; function pueblos() { if (!pueblosP) pueblosP = fetch(`${BASE}v/pueblos.json`).then(r => r.json()); return pueblosP; }
  let mapsP; function sheets() { if (!mapsP) mapsP = fetch(`${BASE}m/maps.json`).then(r => r.json()); return mapsP; }

  async function atPoint(name, lonlat) {
    const fc = await vec(name); const pt = turf.point(lonlat);
    return fc.features.find(f => f.geometry && turf.booleanPointInPolygon(pt, f)) || null;
  }
  // Composición de una zona por un atributo de capa poligonal (ha)
  async function overlay(name, zone, attr) {
    const fc = await vec(name); const out = {}; const bb = turf.bbox(zone);
    for (const f of fc.features) {
      if (!f.geometry) continue; const fb = turf.bbox(f);
      if (fb[0] > bb[2] || fb[2] < bb[0] || fb[1] > bb[3] || fb[3] < bb[1]) continue;
      let it = null; try { it = turf.intersect(turf.featureCollection([zone, f])); } catch (e) { }
      if (!it) continue; const a = turf.area(it) / 1e4; if (a <= 0) continue;
      const k = typeof attr === "function" ? attr(f.properties) : f.properties[attr];
      out[k] = (out[k] || 0) + a;
    }
    return out;
  }
  // Distancia (km) de la zona a cada entidad de una capa
  async function nearest(name, zone, lim = 5) {
    const fc = await vec(name); const res = [];
    const c = turf.centroid(zone);
    for (const f of fc.features) {
      if (!f.geometry) continue; let d;
      const t = f.geometry.type;
      if (t === "Point") d = turf.distance(c, f);
      else if (t.includes("Polygon")) { d = overlaps(zone, f) ? 0 : distToPoly(zone, f); }
      else { const Ls = t === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates; d = Math.min(...Ls.filter(l => l.length > 1).map(l => turf.pointToLineDistance(c, turf.lineString(l)))); }
      res.push({ f, d });
    }
    return res.sort((a, b) => a.d - b.d).slice(0, lim);
  }
  function overlaps(a, b) { const A = turf.bbox(a), B = turf.bbox(b); if (A[0] > B[2] || A[2] < B[0] || A[1] > B[3] || A[3] < B[1]) return false; try { return !!turf.intersect(turf.featureCollection([a, b])); } catch (e) { return false; } }
  function distToPoly(zone, f) {
    const c = turf.centroid(zone); let best = Infinity;
    const P = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of P) for (const ring of poly) if (ring.length > 1) best = Math.min(best, turf.pointToLineDistance(c, turf.lineString(ring)));
    // restar el "radio" aproximado del AP
    const r = Math.sqrt(turf.area(zone) / Math.PI) / 1000;
    return Math.max(0, best - r);
  }

  // ---------- sismicidad: Gutenberg-Richter ----------
  async function sismicidad(lonlat, radio = 100) {
    const S = await sismos(); const [ti, la, lo, de, ma] = [0, 1, 2, 3, 4];
    const ev = S.rows.map(r => ({ t: r[ti], lat: r[la], lon: r[lo], z: r[de], m: r[ma], p: r[5], d: turf.distance(turf.point(lonlat), turf.point([r[lo], r[la]])) })).filter(e => e.d <= radio);
    const Mc = 4.5, dM = 0.1, y0 = 1973, yr = 2026.9;
    const c = ev.filter(e => e.m >= Mc && +e.t.slice(0, 4) >= y0);
    let gr = null;
    if (c.length >= 15) {
      const mean = c.reduce((s, e) => s + e.m, 0) / c.length;
      const b = Math.LOG10E / (mean - (Mc - dM / 2));
      const a = Math.log10(c.length / (yr - y0)) + b * Mc;
      const tr = m => 1 / Math.pow(10, a - b * m);
      gr = { b, a, n: c.length, T: yr - y0, tr5: tr(5), tr6: tr(6), tr65: tr(6.5), tr7: tr(7), sb: b / Math.sqrt(c.length) };
    }
    const top = [...ev].sort((x, y) => y.m - x.m).slice(0, 8);
    const porM = { "4.0–4.9": 0, "5.0–5.9": 0, "6.0–6.9": 0, "≥7.0": 0 };
    for (const e of ev) porM[e.m >= 7 ? "≥7.0" : e.m >= 6 ? "6.0–6.9" : e.m >= 5 ? "5.0–5.9" : "4.0–4.9"]++;
    const sup = ev.filter(e => e.z <= 30).length;
    return { ev, gr, top, porM, sup, radio };
  }

  // ---------- lectura de polígonos ----------
  function parseKML(txt) {
    const doc = new DOMParser().parseFromString(txt, "text/xml"); const polys = [];
    for (const pg of doc.getElementsByTagName("Polygon")) {
      const ob = pg.getElementsByTagName("outerBoundaryIs")[0] || pg;
      const co = ob.getElementsByTagName("coordinates")[0]; if (!co) continue;
      const ring = co.textContent.trim().split(/\s+/).map(s => s.split(",").slice(0, 2).map(Number)).filter(p => p.length === 2 && !isNaN(p[0]));
      if (ring.length >= 3) polys.push(ring);
    }
    if (!polys.length) { // LineString cerrado
      for (const ls of doc.getElementsByTagName("LineString")) {
        const ring = ls.getElementsByTagName("coordinates")[0].textContent.trim().split(/\s+/).map(s => s.split(",").slice(0, 2).map(Number));
        if (ring.length >= 3) polys.push(ring);
      }
    }
    if (!polys.length) throw new Error("No se encontró ningún polígono en el archivo KML.");
    return toFeature(polys.sort((a, b) => turf.area(turf.polygon([close(b)])) - turf.area(turf.polygon([close(a)])))[0]);
  }
  function close(r) { const a = r[0], b = r[r.length - 1]; return (a[0] === b[0] && a[1] === b[1]) ? r : [...r, a]; }
  function toFeature(ring) { return turf.polygon([close(ring)]); }
  function parseGeoJSON(o) {
    const fs = o.type === "FeatureCollection" ? o.features : o.type === "Feature" ? [o] : [{ type: "Feature", geometry: o }];
    const f = fs.find(f => f.geometry && /Polygon/.test(f.geometry.type)); if (!f) throw new Error("El GeoJSON no contiene polígonos.");
    let ring = f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
    if (Math.abs(ring[0][0]) > 180) ring = ring.map(p => fromGTM(p)); // GeoJSON en GTM
    return toFeature(ring.map(p => p.slice(0, 2)));
  }
  // Texto de coordenadas: "x y" o "x,y" por línea. Detecta GTM (metros) o WGS84 (lat lon / lon lat)
  function parseCoords(txt, modo) {
    const pts = txt.split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => l.split(/[\s,;\t]+/).map(Number).filter(v => !isNaN(v))).filter(p => p.length >= 2).map(p => p.slice(-2));
    if (pts.length < 3) throw new Error("Se necesitan al menos 3 vértices.");
    let ring;
    if (modo === "gtm" || (modo === "auto" && Math.abs(pts[0][0]) > 1000)) ring = pts.map(p => fromGTM(p));
    else { ring = pts.map(([a, b]) => (Math.abs(a) <= 20 && Math.abs(b) > 80) ? [b, a] : [a, b]); }
    return toFeature(ring);
  }

  // ---------- KML de salida ----------
  function kml(zonas, nombre) {
    const sty = { AP: "ff0000ff", AID: "ff0080ff", AII: "ff00ffff" };
    const pm = Object.entries(zonas).map(([k, f]) => `<Placemark><name>${k}</name><Style><LineStyle><color>${sty[k]}</color><width>2</width></LineStyle><PolyStyle><color>33${sty[k].slice(2)}</color></PolyStyle></Style><Polygon><outerBoundaryIs><LinearRing><coordinates>${f.geometry.coordinates[0].map(p => p[0].toFixed(7) + "," + p[1].toFixed(7) + ",0").join(" ")}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`).join("");
    return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(nombre)}</name>${pm}</Document></kml>`;
  }
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  return { toM, fromM, toGTM, fromGTM, G, gridInfo, window: window_, colOf, rowOf, zonal, valueAt, vec, atPoint, overlay, nearest, sismicidad, sismos, pueblos, sheets, parseKML, parseGeoJSON, parseCoords, kml, ringsM, esc };
})();
