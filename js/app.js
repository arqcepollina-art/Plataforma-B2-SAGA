{
  const $ = s => document.querySelector(s), esc = GEO.esc;
  const ST = { P: {}, Z: null, A: null };
  // ---------- pestañas ----------
  const tabs = [...document.querySelectorAll("nav button")];
  function show(n) { tabs.forEach(b => b.setAttribute("aria-selected", b.dataset.s == n)); for (let i = 1; i <= 4; i++) $("#s" + i).hidden = i != n; if (n == 2) setTimeout(() => map.invalidateSize(), 50); window.scrollTo({ top: 0 }); }
  tabs.forEach(b => b.addEventListener("click", () => show(b.dataset.s)));
  const done = n => tabs[n - 1].classList.add("done");

  // ---------- formulario ----------
  const form = $("#f");
  try { const s = JSON.parse(localStorage.getItem("b2saga_form") || "{}"); for (const [k, v] of Object.entries(s)) if (form.elements[k]) form.elements[k].value = v; } catch (e) { }
  const readForm = () => Object.fromEntries(new FormData(form).entries());
  form.addEventListener("input", () => { try { localStorage.setItem("b2saga_form", JSON.stringify(readForm())); } catch (e) { } });
  form.addEventListener("submit", e => { e.preventDefault(); ST.P = readForm(); done(1); show(2); });

  // ---------- mapa ----------
  const map = L.map("map", { zoomControl: true }).setView([15.6, -90.3], 7);
  const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
  const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Esri World Imagery" }).addTo(map);
  L.control.layers({ "Ortofoto (Esri)": sat, "OpenStreetMap": osm }, {}, { position: "topright" }).addTo(map);
  const zl = L.layerGroup().addTo(map); let sheetLayer = null;
  GEO.sheets().then(m => { const sel = $("#sheet"); for (const [k, v] of Object.entries(m)) { const o = document.createElement("option"); o.value = k; o.textContent = KB.SHEETS[k]?.t || k; sel.append(o); } });
  $("#sheet").addEventListener("change", async e => {
    if (sheetLayer) { map.removeLayer(sheetLayer); sheetLayer = null; }
    const k = e.target.value; if (!k) return; const m = (await GEO.sheets())[k];
    const sw = GEO.fromM([m.bounds[0], m.bounds[1]]), ne = GEO.fromM([m.bounds[2], m.bounds[3]]);
    sheetLayer = L.imageOverlay("data/" + m.file, [[sw[1], sw[0]], [ne[1], ne[0]]], { opacity: 0.75 }).addTo(map);
  });

  const msg = (t, err) => { const m = $("#m2"); m.textContent = t; m.classList.toggle("err", !!err); };
  function setAP(f) {
    try {
      if (turf.kinks(f).features.length) msg("Advertencia: el polígono se cruza consigo mismo; revise el orden de los vértices.", true);
      ST.ap = turf.rewind(f); buildZones(); msg(`Polígono cargado: ${ST.ap.geometry.coordinates[0].length - 1} vértices.`);
    } catch (e) { msg("No se pudo usar el polígono: " + e.message, true); }
  }
  function buildZones() {
    if (!ST.ap) return; const aid = Math.max(10, +$("#aid").value || 300), aii = Math.max(aid + 10, +$("#aii").value || 1000);
    const buf = m => { const b = turf.buffer(ST.ap, m / 1000, { units: "kilometers", steps: 16 }); return b.geometry.type === "MultiPolygon" ? turf.polygon(b.geometry.coordinates[0]) : b; };
    ST.Z = { AP: ST.ap, AID: buf(aid), AII: buf(aii) }; ST.aid = aid; ST.aii = aii;
    zl.clearLayers();
    L.geoJSON(ST.Z.AII, { style: { color: "#f5d000", weight: 2, dashArray: "8 6", fillOpacity: 0.04 } }).addTo(zl);
    L.geoJSON(ST.Z.AID, { style: { color: "#ff7f00", weight: 2, dashArray: "6 5", fillOpacity: 0.05 } }).addTo(zl);
    const apL = L.geoJSON(ST.Z.AP, { style: { color: "#e31a1c", weight: 3, fillOpacity: 0.2 } }).addTo(zl);
    map.fitBounds(L.geoJSON(ST.Z.AII).getBounds(), { maxZoom: 17 });
    const s = [...document.querySelectorAll("#stat b")]; ["AP", "AID", "AII"].forEach((k, i) => s[i].textContent = ANALISIS.nf(turf.area(ST.Z[k]) / 1e4, k === "AP" ? 3 : 1));
    $("#bGo").disabled = false; $("#bKml").disabled = false;
  }
  ["#aid", "#aii"].forEach(s => $(s).addEventListener("change", buildZones));
  $("#file").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      if (/\.kmz$/i.test(f.name)) { const z = await JSZip.loadAsync(f); const k = Object.keys(z.files).find(n => /\.kml$/i.test(n)); setAP(GEO.parseKML(await z.file(k).async("string"))); }
      else if (/\.kml$/i.test(f.name)) setAP(GEO.parseKML(await f.text()));
      else setAP(GEO.parseGeoJSON(JSON.parse(await f.text())));
    } catch (err) { msg(err.message, true); }
  });
  $("#bCoords").addEventListener("click", () => { try { setAP(GEO.parseCoords($("#coords").value, $("#crs").value)); } catch (e) { msg(e.message, true); } });
  let drawPts = null, drawLine = null;
  $("#bDraw").addEventListener("click", () => { drawPts = []; drawLine && map.removeLayer(drawLine); drawLine = L.polyline([], { color: "#e31a1c" }).addTo(map); $("#bEnd").hidden = false; msg("Haga clic en el mapa para agregar vértices y luego pulse «Cerrar polígono»."); map.getContainer().style.cursor = "crosshair"; });
  map.on("click", e => { if (!drawPts) return; drawPts.push([e.latlng.lng, e.latlng.lat]); drawLine.setLatLngs(drawPts.map(p => [p[1], p[0]])); });
  $("#bEnd").addEventListener("click", () => { if (!drawPts || drawPts.length < 3) { msg("Se necesitan al menos 3 vértices.", true); return; } const f = turf.polygon([[...drawPts, drawPts[0]]]); map.removeLayer(drawLine); drawPts = null; $("#bEnd").hidden = true; map.getContainer().style.cursor = ""; setAP(f); });
  $("#bGo").addEventListener("click", () => { done(2); show(3); });

  // ---------- análisis ----------
  const order = [11, 59, 60, 62, 63, 64, 65, 66, 71, 75, 76, 77];
  function progUI(cur, ok) { $("#prog").innerHTML = order.map(n => { const c = KB.CAP.find(x => x.n === n); return `<div class="${ok.has(n) ? "ok" : n === cur ? "run" : ""}">${n}. ${esc(c.t)}${ok.has(n) ? " ✓" : ""}</div>`; }).join(""); }
  $("#bRun").addEventListener("click", async () => {
    if (!ST.Z) { $("#m3").textContent = "Primero cargue el polígono (paso 2)."; return; }
    ST.P = { ...readForm(), aid: ST.aid, aii: ST.aii, criterio_aid: $("#caid").value.trim(), criterio_aii: $("#caii").value.trim() };
    const b = $("#bRun"); b.disabled = true; $("#res").innerHTML = ""; const ok = new Set(); let last = null;
    $("#m3").textContent = "Analizando…";
    try {
      ST.A = await ANALISIS.run(ST.P, ST.Z, n => { if (last) ok.add(last); last = n; progUI(n, ok); });
      ok.add(last); progUI(null, ok); renderRes(); done(3); $("#bDoc").disabled = false;
      $("#m3").textContent = `Análisis terminado: ${ST.A.ctx.muni}, ${ST.A.ctx.depto}. Revise los capítulos y descargue el informe en el paso 4.`;
    } catch (e) { console.error(e); $("#m3").textContent = "Error en el análisis: " + e.message; }
    b.disabled = false;
  });
  function renderRes() {
    const { R } = ST.A;
    $("#res").innerHTML = order.map(n => { const c = R[n], m = KB.CAP.find(x => x.n === n); if (!c) return ""; return `<details class="cap"${n === 11 ? " open" : ""}><summary>${n}. ${esc(m.t)}</summary><div class="in"><p class="tdr">${esc(m.tdr)}</p>${c.secs.map(s => `${s.h ? `<h4>${esc(s.h)}</h4>` : ""}${(s.p || []).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join("")}${s.tabla && s.tabla.filas.length ? `<div class="scroll"><table><thead><tr>${s.tabla.cab.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.tabla.filas.map(f => `<tr>${f.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}`).join("")}<div class="figs" data-n="${n}"></div></div></details>`; }).join("");
    for (const n of order) { const box = document.querySelector(`.figs[data-n="${n}"]`); if (!box) continue; for (const f of R[n].figs) { const fig = document.createElement("figure"); const img = new Image(); img.src = f.c.toDataURL("image/jpeg", 0.8); img.alt = f.cap; img.addEventListener("click", () => { $("#dlg img").src = img.src; $("#dlg").showModal(); }); const cap = document.createElement("figcaption"); cap.textContent = f.cap; fig.append(img, cap); box.append(fig); } }
  }
  $("#dlg").addEventListener("click", () => $("#dlg").close());

  // ---------- descargas ----------
  function save(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
  const slug = () => (ST.P.nombre || "proyecto").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "_").slice(0, 60);
  $("#bDoc").addEventListener("click", async () => {
    const b = $("#bDoc"); b.disabled = true; $("#m4").textContent = "Generando el documento…";
    try { const blob = await REPORT.build(ST.P, ST.A, n => $("#m4").textContent = `Generando capítulo ${n}…`); window.__lastDocx = blob; save(blob, `Analisis_B2_${slug()}.docx`); $("#m4").textContent = `Informe generado (${(blob.size / 1e6).toFixed(1)} MB).`; done(4); }
    catch (e) { console.error(e); $("#m4").textContent = "No se pudo generar el Word: " + e.message; }
    b.disabled = false;
  });
  $("#bKml").addEventListener("click", () => { if (ST.Z) save(new Blob([GEO.kml(ST.Z, ST.P.nombre || "Proyecto")], { type: "application/vnd.google-earth.kml+xml" }), `AP_AID_AII_${slug()}.kml`); });
  window.__B2 = { ST, setAP, show };
}
