/* Análisis por capítulo B2: aplica cada capa (y su metodología) al AP, AID y AII y redacta el contenido. */
window.ANALISIS = (() => {
  const K = KB, nf = (v, d = 0) => v == null || isNaN(v) ? "—" : Number(v).toLocaleString("es-GT", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = (a, b) => b ? a / b * 100 : 0;
  const ZN = { AP: "Área del proyecto (AP)", AID: "Área de influencia directa (AID)", AII: "Área de influencia indirecta (AII)" };

  // Tabla de distribución por categoría de una capa raster para AP/AID/AII
  async function dist(id, Z, labelFn) {
    const out = {}; const L = K.GRIDS[id];
    const lab = labelFn || (L.clases ? v => L.clases[v]?.[0] ?? `Valor ${v}` : id === "amen" ? v => L.decode(v).cat : id === "riesgo" ? v => L.tabla[v] : id === "intuso" ? v => L.cat(v) : v => v);
    for (const k of ["AP", "AID", "AII"]) {
      const z = await GEO.zonal(id, Z[k]); const m = {};
      for (const [v, c] of Object.entries(z.cnt)) { const l = lab(+v); m[l] = (m[l] || 0) + c; }
      out[k] = { m, n: z.n, central: z.central, ha: z.haCell, raw: z };
    }
    const cats = [...new Set(["AP", "AID", "AII"].flatMap(k => Object.keys(out[k].m)))];
    const order = L.clases ? [...new Set(Object.values(L.clases).map(c => c[0]))] : L.catColor ? Object.keys(L.catColor) : cats;
    cats.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const filas = cats.map(c => [c, ...["AP", "AID", "AII"].map(k => out[k].n ? `${nf(pct(out[k].m[c] || 0, out[k].n), 1)} %` : "—")]);
    const dom = k => Object.entries(out[k].m).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ c, p: pct(n, out[k].n) }));
    return { out, tabla: { cab: ["Categoría", "AP", "AID", "AII"], filas }, dom };
  }
  const domTxt = (d, k) => { const a = d.dom(k).filter(x => x.p >= 1); return a.length ? a.map(x => `${x.c} (${nf(x.p, 0)} %)`).join(", ") : "sin dato"; };
  const has = (d, k, cats) => d.dom(k).some(x => cats.includes(x.c) && x.p >= 5);
  const metodo = (L, extra) => ({ h: "Metodología de la capa y su aplicación al proyecto", p: [`${L.nombre}. ${L.metodo}`, L.aplica || extra || ""].filter(Boolean) });
  const fuente = (L) => L.cita;

  async function run(P, Z, prog) {
    const ap = Z.AP, cen = turf.centroid(ap).geometry.coordinates, gtm = GEO.toGTM(cen);
    const areaAP = turf.area(ap), perim = ap.geometry.coordinates[0].reduce((s, p, i, a) => i ? s + turf.distance(a[i - 1], p, { units: "meters" }) : 0, 0);
    const muni = await GEO.atPoint("municipios", cen);
    const ctx = { cen, gtm, areaAP, perim, muni: muni?.properties?.Municipio || "—", depto: muni?.properties?.Departamen || "—", codMuni: muni?.properties?.Codigo };
    const R = {}; const step = async (n, f) => { prog && prog(n); R[n] = await f(); };
    const meta = await GEO.sheets();
    const sheetsFor = async (keys) => { const out = []; for (const k of keys) { const c = await RENDER.sheetMap(k, Z, meta); if (c) out.push({ c, cap: `${K.SHEETS[k].t} — lámina de consulta con la ubicación del proyecto. Fuente: ${K.SHEETS[k].f}.`, meto: `${K.SHEETS[k].t}: ${K.SHEETS[k].m}` }); } return out; };
    const sheetNotes = keys => ({ h: "Láminas de consulta (mapas de la carpeta MAPAS B2 SAGA)", p: keys.map(k => `${K.SHEETS[k].t} (${K.SHEETS[k].f}): ${K.SHEETS[k].m} La lámina se presenta con el polígono del proyecto superpuesto; la lectura de la clase en el punto del proyecto debe confirmarse con la leyenda de la propia lámina.`) });

    // ---------- 76 ----------
    await step(76, async () => {
      const ring = ap.geometry.coordinates[0].slice(0, -1);
      const filas = ring.map((p, i) => { const g = GEO.toGTM(p); return [`V${i + 1}`, nf(g[0], 2), nf(g[1], 2), p[1].toFixed(6), p[0].toFixed(6)]; });
      const fig = await RENDER.zoneMap({ AP: ap }, "Área del proyecto (AP)", "Polígono con vértices y cuadrícula de coordenadas GTM", { vertices: true, minKm: 0.25 });
      return {
        secs: [{ h: "Delimitación del área del proyecto", p: [
          `El área del proyecto (AP) corresponde al polígono del terreno de ${P.nombre || "el proyecto"}, con una superficie de ${nf(areaAP, 2)} m² (${nf(areaAP / 1e4, 4)} ha) y un perímetro de ${nf(perim, 2)} m, ubicado en ${ctx.muni}, ${ctx.depto}.`,
          P.area_terreno ? `La superficie declarada del terreno es de ${nf(+P.area_terreno, 2)} m²; la diferencia con el polígono digital es de ${nf(Math.abs(areaAP - P.area_terreno) / P.area_terreno * 100, 1)} %${Math.abs(areaAP - P.area_terreno) / P.area_terreno > 0.05 ? ", por lo que conviene revisar el levantamiento o el polígono cargado" : ", dentro de la tolerancia esperada para un polígono digital"}.` : "",
          `El área de ocupación del proyecto es de ${P.area_ocupacion ? nf(+P.area_ocupacion, 2) + " m²" : "(no indicada)"} y el área de construcción de ${P.area_construccion ? nf(+P.area_construccion, 2) + " m²" : "(no indicada)"}. El polígono se adjunta en formato KML (AP, AID y AII) generado por esta plataforma.`].filter(Boolean) },
        { h: "Cuadro de vértices del AP", tabla: { cab: ["Vértice", "X GTM (m)", "Y GTM (m)", "Latitud (WGS84)", "Longitud (WGS84)"], filas } }],
        figs: [{ c: fig, cap: "Polígono del área del proyecto con sus vértices y cuadrícula de coordenadas GTM sobre ortofoto." }],
        fuentes: ["Polígono proporcionado por el proponente; coordenadas convertidas a GTM (ESRI:103598) y WGS84.", "Esri World Imagery (ortofoto de referencia)."]
      };
    });

    // ---------- 77 ----------
    await step(77, async () => {
      const aAID = turf.area(Z.AID), aAII = turf.area(Z.AII);
      const sgInAII = await GEO.overlay("sigap", Z.AII, p => p.area_especifica || p.area_macro);
      const sgInAP = await GEO.overlay("sigap", ap, p => p.area_especifica || p.area_macro);
      const near = await GEO.nearest("sigap", ap, 4);
      const fig = await RENDER.vecMap("sigap", Z, "Áreas de influencia y áreas protegidas", () => ({ fill: "#2ca25f", stroke: "#006d2c", lw: 1.5, alpha: 0.35 }), [["Área protegida (SIGAP)", "#2ca25f"]], { base: true, minKm: Math.max(4, Math.min(60, (near[0]?.d || 2) * 2.4 + 2)) });
      return {
        secs: [{ h: "Criterio de delimitación", p: [
          `Área de influencia directa (AID): franja de ${P.aid} m alrededor del AP. ${P.criterio_aid || "Comprende el espacio donde se manifiestan de forma inmediata los impactos de construcción y operación: ruido de maquinaria, polvo, tránsito de vehículos de carga, escorrentía y vecindad inmediata."}`,
          `Área de influencia indirecta (AII): franja de ${P.aii} m alrededor del AP. ${P.criterio_aii || "Comprende el entorno donde los impactos llegan de forma mediata: rutas de acceso, comunidades vecinas que usan los mismos servicios, la microcuenca receptora de escorrentías y descargas, y la demanda de bienes y empleo."}`,
          `Superficies: AP = ${nf(areaAP / 1e4, 4)} ha; AID = ${nf(aAID / 1e4, 2)} ha (incluye el AP); AII = ${nf(aAII / 1e4, 2)} ha (incluye el AID).`] },
        { h: "Áreas protegidas y elementos sensibles", p: [
          Object.keys(sgInAP).length ? `El AP se superpone con el área protegida ${Object.keys(sgInAP).join(", ")} (${nf(Object.values(sgInAP).reduce((a, b) => a + b, 0), 2)} ha). Se requiere opinión técnica o dictamen favorable del CONAP y verificar la zonificación del plan maestro.` : "El AP no se superpone con ninguna área protegida del SIGAP (capa SIGAP 2022).",
          Object.keys(sgInAII).length ? `Dentro del AII hay áreas protegidas: ${Object.entries(sgInAII).map(([k, v]) => `${k} (${nf(v, 2)} ha)`).join("; ")}.` : "Ninguna área protegida intersecta el AII.",
        ], tabla: { cab: ["Área protegida más cercana", "Categoría / código", "Distancia al AP (km)"], filas: near.map(n => [n.f.properties.area_especifica || n.f.properties.area_macro, n.f.properties.codigo_macro || "—", nf(n.d, 2)]) } },
        metodo(K.VEC.sigap, "Se intersectaron el AP y el AII con los polígonos del SIGAP y se midió la distancia del borde del AP al límite de cada área protegida.")],
        figs: [{ c: fig, cap: "AP, AID y AII respecto a las áreas protegidas del SIGAP (ortofoto de fondo)." }],
        fuentes: [K.VEC.sigap.cita]
      };
    });

    // ---------- 75 ----------
    await step(75, async () => {
      const dms = (v, pos, neg) => { const s = v < 0 ? neg : pos; v = Math.abs(v); const d = Math.floor(v), m = Math.floor((v - d) * 60), se = ((v - d) * 60 - m) * 60; return `${d}° ${m}' ${se.toFixed(2)}" ${s}`; };
      const sg = await GEO.overlay("sigap", ap, p => p.area_especifica || p.area_macro);
      const inun = await dist("inun", Z), cab = await dist("cab", Z), desl = await dist("desl", Z), din = await dist("din", Z);
      const fr = [
        ["Área protegida (SIGAP)", Object.keys(sg).length ? "Sí: " + Object.keys(sg).join(", ") : "No"],
        ["Amenaza de inundación media o mayor en el AP", has(inun, "AP", ["Media", "Alta", "Muy alta"]) ? "Sí" : "No"],
        ["Cabecera de cuenca (zona de recarga)", has(cab, "AP", ["Cabecera de cuenca"]) ? "Sí" : "No"],
        ["Amenaza alta o muy alta a deslizamientos", has(desl, "AP", ["Alta", "Muy alta"]) ? "Sí" : "No"],
        ["Cobertura de bosque estable en el AP", has(din, "AP", ["Bosque estable", "Ganancia de bosque"]) ? "Sí" : "No"]];
      const inPOT = +ctx.codMuni === 101;
      const fig = await RENDER.zoneMap(Z, "Ubicación del proyecto", `${ctx.muni}, ${ctx.depto}`, { minKm: 1.5 });
      const sh = await sheetsFor(inPOT ? ["division_politica_administrativa", "mapa_pot_municipio_gtm"] : ["division_politica_administrativa"]);
      return {
        secs: [{ h: "Localización", p: [`Dirección: ${P.direccion || "(indicar dirección)"}. Municipio de ${ctx.muni}, departamento de ${ctx.depto}.`, `Coordenadas del centro del AP: ${cen[1].toFixed(6)}, ${cen[0].toFixed(6)} (WGS84, grados decimales) = ${dms(cen[1], "N", "S")}, ${dms(cen[0], "E", "O")}; GTM X = ${nf(gtm[0], 2)} m, Y = ${nf(gtm[1], 2)} m.`, `Colindancias: Norte: ${P.col_n || "—"}; Sur: ${P.col_s || "—"}; Este: ${P.col_e || "—"}; Oeste: ${P.col_o || "—"}.`] },
        { h: "Áreas ambientalmente frágiles", p: ["Se revisó si el AP está en alguna de las condiciones de fragilidad identificables con las capas de la carpeta:"], tabla: { cab: ["Condición", "Resultado"], filas: fr } },
        { h: "Planificación territorial", p: [inPOT ? `El proyecto se ubica dentro del ámbito del Plan de Ordenamiento Territorial (POT) del municipio de Guatemala. La lámina del POT se presenta con el polígono superpuesto; debe identificarse la zona general (G0 a G5) y comprobar que el uso, la altura y el índice de edificabilidad propuestos son compatibles. Para ello se requiere la certificación o el dictamen de la Dirección de Control Territorial.` : `En la carpeta no hay un plan de ordenamiento territorial digital para ${ctx.muni}. Debe consultarse a la Municipalidad si existe un POT o un reglamento de construcción vigente y adjuntar la licencia o constancia de uso del suelo correspondiente.`, P.uso_actual ? `Uso actual del terreno declarado: ${P.uso_actual}.` : ""].filter(Boolean) }],
        figs: [{ c: fig, cap: "Ubicación del AP, AID y AII sobre ortofoto, con cuadrícula GTM." }, ...sh.map(s => ({ c: s.c, cap: s.cap }))],
        fuentes: [K.VEC.municipios.cita, K.VEC.sigap.cita, K.GRIDS.inun.cita, K.GRIDS.cab.cita, K.GRIDS.desl.cita, ...sh.map(s => s.cap.split("Fuente: ")[1])]
      };
    });

    // ---------- 11 ----------
    await step(11, async () => {
      const d = await dist("desl", Z); const geo = await GEO.overlay("geologia", ap, "KEY_"); const geoI = await GEO.overlay("geologia", Z.AII, "KEY_");
      const tot = Object.values(geo).reduce((a, b) => a + b, 0) || 1;
      let gkeys = Object.entries(geo).sort((a, b) => b[1] - a[1]); if (!gkeys.length) { const f = await GEO.atPoint("geologia", cen); if (f) gkeys = [[f.properties.KEY_, tot]]; }
      const pend = P.pend_max === "" || P.pend_max == null ? null : +P.pend_max;
      const alta = has(d, "AP", ["Alta", "Muy alta"]);
      const req = (pend != null && pend > 15) || alta;
      const f1 = await RENDER.gridMap("desl", Z, "Amenaza a deslizamientos"), f2 = await RENDER.vecMap("geologia", Z, "Geología del área del proyecto", p => ({ fill: K.GEO_COL[p.KEY_] || "#ddd", stroke: "#555", lw: 0.8 }), d => [...new Set(d.map(p => p.KEY_))].map(k => [`${k} – ${K.GEO[k]?.[0].split(":")[0] || k}`, K.GEO_COL[k] || "#ddd"]), { minKm: 8 });
      const sh = await sheetsFor(["hipsometrico", "erosion_potencial"]);
      return {
        secs: [{ h: "Pendiente y movimiento de tierras", p: [
          pend != null ? `La pendiente máxima del terreno es de ${nf(pend, 1)} %${pend > 15 ? ", mayor que el umbral de 15 % de los TdR, por lo que este capítulo debe desarrollar las medidas de estabilización" : ", menor que el umbral de 15 % de los TdR"}.` : "No se indicó la pendiente del terreno. La carpeta no incluye un modelo de elevación con resolución suficiente; la pendiente debe obtenerse del levantamiento topográfico.",
          (P.corte || P.relleno) ? `Movimiento de tierras previsto: corte de ${nf(+P.corte || 0)} m³ y relleno de ${nf(+P.relleno || 0)} m³; balance de ${nf((+P.corte || 0) - (+P.relleno || 0))} m³ ${(+P.corte || 0) > (+P.relleno || 0) ? "de excedente, que debe disponerse en un sitio autorizado por la municipalidad" : "(sin excedente; puede requerir material de préstamo de un banco autorizado)"}.` : "No se declararon volúmenes de corte y relleno."] },
        { h: "Amenaza a deslizamientos", p: [`Según el mapa de amenaza a deslizamientos de la UIE (2023), el AP está en: ${domTxt(d, "AP")}${d.out.AP.central ? " (el AP es menor que una celda de análisis de 100 m; se leyó la celda de su centro)" : ""}. En el AID predomina ${domTxt(d, "AID")} y en el AII ${domTxt(d, "AII")}.`], tabla: d.tabla },
        { h: "Geología y comportamiento geotécnico", p: gkeys.map(([k, a]) => `${k} – ${K.GEO[k]?.[0] || "Unidad geológica"} (${nf(a / tot * 100, 0)} % del AP). ${K.GEO[k]?.[1] || ""}`) },
        { h: "Conclusión para el capítulo", p: [req ? `El terreno ${pend != null && pend > 15 ? "supera el 15 % de pendiente" : ""}${pend != null && pend > 15 && alta ? " y " : ""}${alta ? "está en una zona de amenaza alta o muy alta a deslizamientos" : ""}. Por ello se requiere: (1) un estudio geotécnico con capacidad de soporte y diseño de taludes; (2) taludes con inclinación compatible con la litología (${gkeys[0]?.[0] || "—"}), con bermas y cunetas de coronación y pie; (3) muros de contención o terraceo donde sea necesario; (4) conducción controlada de la escorrentía, sin descargarla sobre los taludes; (5) revegetación inmediata de las superficies expuestas; y (6) trabajos de corte fuera de la época lluviosa o con protección temporal (geotextil o plástico).` : "Con la pendiente declarada y el nivel de amenaza obtenido, no se prevén movimientos en masa significativos. Basta con medidas de control de erosión y sedimentos durante la construcción (barreras de sedimentos, cobertura de acopios de tierra y revegetación)."] },
        metodo(K.GRIDS.desl), { h: "Metodología – geología", p: [`${K.VEC.geologia.nombre}. ${K.VEC.geologia.metodo} Se intersectó el AP con las unidades geológicas y se asignó a cada una el comportamiento geotécnico típico de su litología, como criterio para el diseño de taludes y cimentaciones.`] }, sheetNotes(["hipsometrico", "erosion_potencial"])],
        figs: [{ c: f1, cap: "Amenaza a deslizamientos (UIE, 2023) en el AP, AID y AII." }, { c: f2, cap: "Unidades geológicas en el entorno del proyecto." }, ...sh.map(s => ({ c: s.c, cap: s.cap }))],
        fuentes: [K.GRIDS.desl.cita, K.VEC.geologia.cita, ...sh.map(s => s.cap.split("Fuente: ")[1])]
      };
    });

    // ---------- 59 ----------
    const mc = await GEO.atPoint("microcuencas", cen), cu = await GEO.atPoint("cuencas", cen);
    await step(59, async () => {
      const m = mc?.properties || {}, c = cu?.properties || {};
      const q = +P.ar_caudal || (P.agua_demanda ? +P.agua_demanda * 0.8 : null);
      const desc = P.descarga_lat && P.descarga_lon ? [+P.descarga_lon, +P.descarga_lat] : null;
      const f1 = await RENDER.vecMap("microcuencas", Z, "Cuenca y microcuenca receptora", (p, f) => ({ fill: f === mc ? "#9ecae1" : "#f0f4f8", stroke: "#3182bd", lw: 1.2, alpha: 0.6 }), [["Microcuenca del proyecto", "#9ecae1"], ["Otras microcuencas", "#f0f4f8"]], { minKm: 10, extra: desc ? (x, w, M) => { const [u, v] = M(GEO.toM(desc)); x.fillStyle = "#6a3d9a"; x.beginPath(); x.arc(u, v, 9, 0, 7); x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 2; x.stroke(); } : null });
      const sh = await sheetsFor(["cuencas_hidrograficas", "hidrografia"]);
      const trat = { municipal: "conexión al alcantarillado municipal", planta: "planta de tratamiento propia", fosa: "fosa séptica con pozo de absorción", otro: P.ar_tratamiento_otro || "otro sistema" }[P.ar_tratamiento] || "(no indicado)";
      return {
        secs: [{ h: "Caracterización de las aguas residuales", p: [
          `Tipo de aguas residuales: ${{ ordinarias: "ordinarias (de servicios sanitarios, lavamanos y cocina)", especiales: "especiales (de proceso)", ambas: "ordinarias y especiales" }[P.ar_tipo] || "(no indicado)"}. Caudal estimado: ${q ? nf(q, 2) + " m³/día" : "(no indicado)"}${!P.ar_caudal && P.agua_demanda ? " (80 % de la demanda de agua declarada, factor de retorno usual)" : ""}${P.empleados_op ? `, generado por ${P.empleados_op} personas en operación` : ""}.`,
          `Sistema de tratamiento y disposición: ${trat}. Punto de descarga: ${P.descarga_tipo || "(no indicado)"}${desc ? ` en las coordenadas ${desc[1].toFixed(6)}, ${desc[0].toFixed(6)} (WGS84)` : ""}.`] },
        { h: "Cuerpo receptor y cuenca", p: [`El proyecto drena hacia la vertiente ${c.VERTIENTE || m.VERTIENTE || "—"}, cuenca ${c.CUENCA || m.CCA_IARNA || "—"}, subcuenca ${c.SUBCUENCA || m.SCCA_IARNA || "—"}, microcuenca «${m.Nombre || "—"}» (${nf(m.AREA_HA, 0)} ha).`, m.Dis_act_ha ? `La microcuenca tiene una disponibilidad hídrica actual de ${nf(m.Dis_act_ha, 0)} m³/ha·año, que se proyecta en ${nf(+m.Dis_2050_h, 0)} m³/ha·año para 2050 (una reducción de ${nf(m.Dif_DH_por, 1)} %). Esa reducción limita la capacidad de dilución del cuerpo receptor y refuerza la necesidad de tratar las aguas antes de descargarlas.` : ""].filter(Boolean) },
        { h: "Cumplimiento del Acuerdo Gubernativo 236-2006", p: [
          (P.ar_tratamiento === "municipal" || /alcantarill|municipal/i.test(P.descarga_tipo || "")) ? "Al descargar al alcantarillado municipal, el ente generador debe cumplir los límites del artículo 24 (descargas a alcantarillado) y presentar el estudio técnico de caracterización (artículo 5)." : "Al descargar a un cuerpo receptor o al suelo, el ente generador debe cumplir los límites máximos permisibles del artículo 20 (descargas a cuerpos receptores), el modelo de reducción progresiva de cargas de DBO₅ y el estudio técnico de caracterización (artículo 5).",
          "Parámetros de control: temperatura, potencial de hidrógeno (pH), grasas y aceites, materia flotante, sólidos suspendidos, demanda bioquímica de oxígeno (DBO₅), nitrógeno total, fósforo total, coliformes fecales, color, arsénico, cadmio, cianuro, cobre, cromo hexavalente, mercurio, níquel, plomo y zinc. Los lodos deben manejarse según los artículos 41 a 43 (análisis y disposición final)."] },
        { h: "Metodología de las capas y su aplicación", p: [`${K.VEC.cuencas.nombre}: ${K.VEC.cuencas.metodo}`, `${K.VEC.microcuencas.nombre}: ${K.VEC.microcuencas.metodo} Se identificó la microcuenca que contiene el centro del AP; su disponibilidad actual y la proyectada a 2050 se usan como indicador de la sensibilidad del cuerpo receptor.`] }, sheetNotes(["cuencas_hidrograficas", "hidrografia"])],
        figs: [{ c: f1, cap: `Microcuenca receptora «${m.Nombre || "—"}»${desc ? " y punto de descarga (morado)" : ""}.` }, ...sh.map(s => ({ c: s.c, cap: s.cap }))],
        fuentes: [K.VEC.cuencas.cita, K.VEC.microcuencas.cita, "Acuerdo Gubernativo 236-2006, Reglamento de las descargas y reúso de aguas residuales y de la disposición de lodos.", ...sh.map(s => s.cap.split("Fuente: ")[1])]
      };
    });

    // ---------- 60 ----------
    await step(60, async () => {
      const pp = await GEO.zonal("pp", ap); const inun = await dist("inun", Z); const cab = await dist("cab", Z);
      const Aimp = +P.area_impermeable || +P.area_ocupacion || 0; const C = 0.9; const vol = pp.mean && Aimp ? pp.mean / 1000 * Aimp * C : null;
      const enCab = has(cab, "AP", ["Cabecera de cuenca"]);
      const f1 = await RENDER.gridMap("pp", Z, "Precipitación media anual", { minKm: 8 }), f2 = await RENDER.gridMap("inun", Z, "Amenaza por inundación"), f3 = await RENDER.gridMap("cab", Z, "Cabeceras de cuenca", { minKm: 8 });
      const sh = await sheetsFor(["captacion_regulacion_hidrica"]);
      return {
        secs: [{ h: "Escorrentía generada por el proyecto", p: [
          `La precipitación media anual en el AP es de ${nf(pp.mean, 0)} mm (rango ${nf(pp.min, 0)}–${nf(pp.max, 0)} mm, periodo 2001–2018).`,
          vol ? `Con una superficie impermeabilizada de ${nf(Aimp, 2)} m² y un coeficiente de escorrentía de ${C} (techos y pavimentos), el volumen pluvial anual estimado es de V = P × A × C = ${nf(pp.mean / 1000, 3)} m × ${nf(Aimp, 0)} m² × ${C} = ${nf(vol, 0)} m³/año.` : "Indique el área impermeabilizada (techos y pavimentos) para estimar el volumen pluvial anual.",
          "El caudal de diseño de canales, tragantes y tuberías se calcula con el método racional Q = C·i·A/360 (Q en m³/s, i en mm/h, A en ha). La intensidad i se toma de las curvas intensidad-duración-frecuencia (IDF) de la estación INSIVUMEH más cercana, con un periodo de retorno mínimo de 10 años.",
          `Manejo propuesto: ${P.pluvial || "(no indicado)"}. Las aguas pluviales deben conducirse por un sistema independiente del de aguas residuales.`] },
        { h: "Inundación y recarga", p: [`Amenaza por inundación en el AP: ${domTxt(inun, "AP")}; en el AII: ${domTxt(inun, "AII")}.`, enCab ? "El AP está en una cabecera de cuenca. La impermeabilización reduce directamente la recarga, por lo que se recomienda infiltrar en el propio predio al menos el volumen equivalente a la lluvia sobre el área impermeabilizada (pozos o zanjas de absorción, pavimentos permeables) y descargar solo el excedente." : "El AP no está en una cabecera de cuenca según la capa disponible; aun así se recomienda retener o infiltrar en el predio para no incrementar el caudal pico aguas abajo."], tabla: inun.tabla },
        metodo(K.GRIDS.pp), metodo(K.GRIDS.inun), metodo(K.GRIDS.cab), sheetNotes(["captacion_regulacion_hidrica"])],
        figs: [{ c: f1, cap: "Precipitación media anual 2001–2018 en el entorno del proyecto." }, { c: f2, cap: "Amenaza por inundación (UIE, 2023)." }, { c: f3, cap: "Cabeceras de cuenca." }, ...sh.map(s => ({ c: s.c, cap: s.cap }))],
        fuentes: [K.GRIDS.pp.cita, K.GRIDS.inun.cita, K.GRIDS.cab.cita, ...sh.map(s => s.cap.split("Fuente: ")[1])]
      };
    });

    // ---------- 62 ----------
    await step(62, async () => {
      const pp = await GEO.zonal("pp", ap), tm = await GEO.zonal("tmed", ap), pv = await dist("prov", Z), cap = await dist("cap", Z), iu = await dist("intuso", Z);
      const m = mc?.properties || {}; const dm = await GEO.atPoint("dh_muni", cen); const dh = dm?.properties?.DH_mun;
      const est = dh == null ? "—" : dh > 1700 ? "sin estrés" : dh > 1000 ? "estrés moderado" : dh > 500 ? "estrés alto" : "estrés extremo";
      const figs = [await RENDER.gridMap("pp", Z, "Precipitación media anual", { minKm: 8 }), await RENDER.gridMap("tmed", Z, "Temperatura media anual", { minKm: 10 }), await RENDER.gridMap("prov", Z, "Provincias de humedad", { minKm: 8 }), await RENDER.gridMap("cap", Z, "Capacidad de uso de la tierra (INAB)"), await RENDER.gridMap("intuso", Z, "Intensidad de uso de la tierra")];
      const keys = ["clima_thornthwaite_12x18_ws", "fisiografico", "taxonomico", "hidrografia", "disponibilidad_hidrica_microcuenca"]; const sh = await sheetsFor(keys);
      return {
        secs: [{ h: "Clima", p: [`Precipitación media anual: ${nf(pp.mean, 0)} mm. Temperatura media anual: ${nf(tm.mean, 1)} °C. Provincia de humedad (Holdridge): ${domTxt(pv, "AP")}.`, "La clasificación climática de Thornthwaite se lee en la lámina adjunta, en el punto del proyecto. Conviene complementar con la estación INSIVUMEH más cercana (lluvia mensual, días de lluvia, vientos dominantes y brillo solar)."] },
        { h: "Suelo", p: [`Capacidad de uso de la tierra (INAB) en el AP: ${domTxt(cap, "AP")}. Intensidad de uso actual: ${domTxt(iu, "AP")}.`, has(cap, "AP", ["F – Tierras forestales de producción", "Fp – Tierras forestales de protección"]) ? "Parte del AP tiene vocación forestal. Su conversión a uso urbano o industrial implica pérdida de función protectora del suelo; se recomienda conservar o restituir cobertura arbórea en las áreas libres y controlar la erosión." : "La capacidad de uso del AP no es predominantemente forestal; el cambio de uso debe acompañarse de manejo del suelo orgánico removido (reutilizarlo en las áreas verdes).", "La fisiografía y el orden de suelos se leen en las láminas fisiográfica y taxonómica adjuntas."], tabla: cap.tabla },
        { h: "Intensidad de uso", tabla: iu.tabla },
        { h: "Agua", p: [`El AP se ubica en la microcuenca «${m.Nombre || "—"}» (subcuenca ${m.SCCA_IARNA || "—"}, cuenca ${m.CCA_IARNA || "—"}). Disponibilidad hídrica actual: ${nf(m.Dis_act_ha, 0)} m³/ha·año; proyección a 2050: ${nf(+m.Dis_2050_h, 0)} m³/ha·año.`, dh != null ? `Disponibilidad hídrica per cápita del municipio: ${nf(dh, 0)} m³/hab·año, que corresponde a «${est}» según Arnell (2004).${P.agua_demanda ? ` La demanda del proyecto (${nf(+P.agua_demanda, 2)} m³/día = ${nf(P.agua_demanda * 365, 0)} m³/año) se abastecerá de ${P.agua_fuente || "(fuente no indicada)"}.` : ""}` : ""].filter(Boolean) },
        { h: "Aire, ruido y vibraciones", p: [`Fuentes de emisión previstas: ${P.emisiones || "polvo y gases de combustión de maquinaria durante la construcción; vehículos en operación"}. Fuentes de ruido: ${P.ruido || "maquinaria de construcción y equipos en operación"}. Horario: ${P.horario || "(no indicado)"}.`, "Guatemala no tiene una norma nacional de ruido ambiental. Como referencia se usan los valores guía de la OMS y del Banco Mundial: 55 dB(A) de día y 45 dB(A) de noche en zonas residenciales, y 70 dB(A) en zonas industriales o comerciales, medidos en el receptor más cercano dentro del AID."] },
        metodo(K.GRIDS.pp), metodo(K.GRIDS.tmed), metodo(K.GRIDS.prov), metodo(K.GRIDS.cap), metodo(K.GRIDS.intuso), { h: "Metodología – disponibilidad hídrica", p: [`${K.VEC.microcuencas.nombre}: ${K.VEC.microcuencas.metodo}`, `${K.VEC.dh_muni.nombre}: ${K.VEC.dh_muni.metodo}`] }, sheetNotes(keys)],
        figs: [...figs.map((c, i) => ({ c, cap: ["Precipitación media anual 2001–2018.", "Temperatura media anual.", "Provincias de humedad 2001–2018.", "Capacidad de uso de la tierra, metodología INAB.", "Intensidad de uso de la tierra."][i] })), ...sh.map(s => ({ c: s.c, cap: s.cap }))],
        fuentes: [K.GRIDS.pp.cita, K.GRIDS.tmed.cita, K.GRIDS.prov.cita, K.GRIDS.cap.cita, K.GRIDS.intuso.cita, K.VEC.microcuencas.cita, K.VEC.dh_muni.cita, "Arnell, N. W. (2004). Climate change and global water resources: SRES emissions and socio-economic scenarios. Global Environmental Change, 14, 31-52.", ...sh.map(s => s.cap.split("Fuente: ")[1])]
      };
    });

    // ---------- 63 ----------
    await step(63, async () => {
      const zv = await GEO.overlay("zonas_vida", ap, "NOM_ZV_ABR"); let zvk = Object.entries(zv).sort((a, b) => b[1] - a[1]); if (!zvk.length) { const f = await GEO.atPoint("zonas_vida", cen); if (f) zvk = [[f.properties.NOM_ZV_ABR, 1]]; }
      const zvI = await GEO.overlay("zonas_vida", Z.AII, "NOM_ZV_ABR");
      const din = await dist("din", Z); const sg = await GEO.nearest("sigap", ap, 3);
      const bosque = has(din, "AP", ["Bosque estable", "Ganancia de bosque"]);
      const f1 = await RENDER.vecMap("zonas_vida", Z, "Zonas de vida de Holdridge", p => ({ fill: K.ZV_COL[p.NOM_ZV_ABR] || "#ccc", stroke: "#555", lw: 0.8 }), d => [...new Set(d.map(p => p.NOM_ZV_ABR))].filter(Boolean).map(k => [`${k} – ${K.ZV[k] || k}`, K.ZV_COL[k] || "#ccc"]), { minKm: 10 });
      const f2 = await RENDER.gridMap("din", Z, "Dinámica de la cobertura forestal 1991–2016");
      const keys = ["zonas_de_vida", "dinamica_forestal2016_2020", "de_areas_protegidas_2023"]; const sh = await sheetsFor(keys);
      return {
        secs: [{ h: "Zona de vida", p: zvk.map(([k]) => `${K.ZV[k] || k} (${k}). Según el sistema de Holdridge, esta zona corresponde a una vegetación potencial de ${/bs|bms/.test(k) ? "bosque seco, con especies caducifolias adaptadas a una época seca prolongada" : /bp/.test(k) ? "bosque pluvial, con alta humedad todo el año" : /bmh/.test(k) ? "bosque muy húmedo, perennifolio" : "bosque húmedo, con estacionalidad moderada"}, que sirve de referencia para la flora y fauna esperables y para elegir especies nativas en la revegetación.`) },
        { h: "Cobertura forestal", p: [`Dinámica forestal 1991–2016 en el AP: ${domTxt(din, "AP")}; en el AII: ${domTxt(din, "AII")}.`, bosque ? "Hay cobertura boscosa en el AP. Si se removerán árboles se requiere licencia o autorización del INAB (o de la municipalidad en área urbana), con inventario forestal y compensación." : "La capa no muestra bosque en el AP. Los árboles aislados que se remuevan deben inventariarse y compensarse según el reglamento municipal o del INAB.", "El inventario de flora y fauna debe hacerse en campo y contrastarse con la Lista de Especies Amenazadas (LEA) del CONAP y los apéndices de CITES."], tabla: din.tabla },
        { h: "Áreas protegidas", tabla: { cab: ["Área protegida más cercana", "Código", "Distancia (km)"], filas: sg.map(n => [n.f.properties.area_especifica || n.f.properties.area_macro, n.f.properties.codigo_macro || "—", nf(n.d, 2)]) } },
        { h: "Metodología – zonas de vida", p: [`${K.VEC.zonas_vida.nombre}. ${K.VEC.zonas_vida.metodo} Se intersectaron el AP y el AII con la capa para identificar sus zonas de vida.`] }, metodo(K.GRIDS.din), { h: "Metodología – SIGAP", p: [`${K.VEC.sigap.metodo} Se midió la distancia del AP a las áreas protegidas más cercanas.`] }, sheetNotes(keys)],
        figs: [{ c: f1, cap: "Zonas de vida de Holdridge en el entorno del proyecto." }, { c: f2, cap: "Dinámica de la cobertura forestal 1991–2016." }, ...sh.map(s => ({ c: s.c, cap: s.cap }))],
        fuentes: [K.VEC.zonas_vida.cita, K.GRIDS.din.cita, K.VEC.sigap.cita, ...sh.map(s => s.cap.split("Fuente: ")[1])]
      };
    });

    // ---------- 64 ----------
    await step(64, async () => {
      const pop = {}; for (const k of ["AP", "AID", "AII"]) { const z = await GEO.zonal("pop", Z[k]); pop[k] = { tot: Object.entries(z.cnt).reduce((s, [v, c]) => s + v * c, 0), ha: turf.area(Z[k]) / 1e4, central: z.central }; }
      const mg = (await GEO.atPoint("migracion", cen))?.properties || {}; const pb = await GEO.pueblos(); const dep = pb.find(r => r.depto.toLowerCase() === String(ctx.depto).toLowerCase());
      const f1 = await RENDER.gridMap("pop", Z, "Población estimada (WorldPop 2020)");
      const keys = ["densidad_poblacional", "comunidades_linguisticas", "sitios_arqueologicos", "migracion2018", "pobreza_general_2018"]; const sh = await sheetsFor(keys);
      return {
        secs: [{ h: "Población del área de influencia", p: [`Población estimada (WorldPop 2020, 100 m): AID ≈ ${nf(pop.AID.tot, 0)} habitantes (${nf(pop.AID.tot / (pop.AID.ha / 100), 0)} hab/km²); AII ≈ ${nf(pop.AII.tot, 0)} habitantes (${nf(pop.AII.tot / (pop.AII.ha / 100), 0)} hab/km²). Son estimaciones modeladas: deben confirmarse con el censo de vivienda o el conteo de viviendas del AID.`], tabla: { cab: ["Zona", "Superficie (ha)", "Población estimada", "Densidad (hab/km²)"], filas: ["AP", "AID", "AII"].map(k => [k, nf(pop[k].ha, 2), nf(pop[k].tot, 0), nf(pop[k].tot / (pop[k].ha / 100), 0)]) } },
        { h: "Municipio, migración y pueblos", p: [`Municipio: ${ctx.muni} (${ctx.depto}). Población municipal censada en 2018: ${nf(mg.Poblacion, 0)} habitantes; emigrantes registrados: ${nf(mg.Migrantes, 0)} (clase de migración ${mg.clase || "—"}).`, dep ? `Población del departamento de ${dep.depto} por pueblo de pertenencia (Censo 2018): maya ${nf(pct(dep.Maya, dep.total), 1)} %, ladino ${nf(pct(dep.Ladina, dep.total), 1)} %, xinka ${nf(pct(dep.Xinka, dep.total), 1)} %, garífuna ${nf(pct(dep["Garífuna"], dep.total), 2)} %, afrodescendiente ${nf(pct(dep.Afrodescendiente, dep.total), 2)} %, extranjero ${nf(pct(dep.Extranjera, dep.total), 2)} %. La comunidad lingüística del lugar se lee en la lámina correspondiente.` : "", "Los servicios básicos (agua, drenaje, energía, recolección de residuos), los sitios arqueológicos o culturales cercanos y la percepción de los vecinos se documentan en campo y mediante el instrumento de participación pública (encuesta o entrevistas en el AID)."].filter(Boolean) },
        metodo(K.GRIDS.pop), { h: "Metodología – migración y pueblos", p: [`${K.VEC.migracion.nombre}: ${K.VEC.migracion.metodo}`, `${K.PUEBLOS.nombre}: ${K.PUEBLOS.metodo}`] }, sheetNotes(keys)],
        figs: [{ c: f1, cap: "Población estimada por celda de 100 m (WorldPop 2020) en el AID y el AII." }, ...sh.map(s => ({ c: s.c, cap: s.cap }))],
        fuentes: [K.GRIDS.pop.cita, K.VEC.migracion.cita, K.PUEBLOS.cita, ...sh.map(s => s.cap.split("Fuente: ")[1])]
      };
    });

    // ---------- 65 ----------
    await step(65, async () => {
      const vol = (await GEO.nearest("volcanes", ap, 6)).filter(v => v.d <= 60);
      const tur = (await GEO.nearest("sitios_turisticos", ap, 8)).filter(v => v.d <= 25);
      const f1 = await RENDER.vecMap("volcanes", Z, "Volcanes y sitios de interés escénico", p => ({ fill: "#b2182b", r: 8, label: p.Nombre }), [["Volcán", "#b2182b", "pt"], ["Sitio turístico (IARNA 2012)", "#1f78b4", "pt"]], { base: true, minKm: 50, extra: async (x, w, M) => { const fc = await GEO.vec("sitios_turisticos"); for (const f of fc.features) { const [u, v] = M(GEO.toM(f.geometry.coordinates)); if (u < 0 || u > 1040 || v < 64 || v > 954) continue; x.fillStyle = "#1f78b4"; x.beginPath(); x.arc(u, v, 6, 0, 7); x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 1.5; x.stroke(); } } });
      const keys = ["orografico", "fisiografico"]; const sh = await sheetsFor(keys);
      return {
        secs: [{ h: "Paisaje y relieve", p: [vol.length ? `En un radio de 60 km se encuentran los volcanes ${vol.map(v => `${v.f.properties.Nombre} (${nf(v.f.properties.Altitud)} m, a ${nf(v.d, 1)} km)`).join(", ")}, que forman parte de las cuencas visuales del entorno.` : "No hay edificios volcánicos dentro de 60 km.", tur.length ? `Sitios de interés turístico o escénico en un radio de 25 km: ${tur.map(t => `${t.f.properties.NOMBRE} (${t.f.properties.CAT || t.f.properties.TIPO}, ${nf(t.d, 1)} km)`).join("; ")}.` : "No hay sitios turísticos registrados (IARNA, 2012) en un radio de 25 km.", `El proyecto incorpora ${P.niveles ? P.niveles + " nivel(es) de construcción" : "edificaciones"} en un área de ${nf(+P.area_construccion || 0)} m². Para integrarlo al paisaje se recomienda limitar la altura y el volumen frente a las vistas principales, usar colores y materiales del entorno, conservar o plantar barreras vegetales nativas en los linderos y controlar la iluminación exterior para no generar contaminación lumínica.`] },
        { h: "Metodología", p: [`${K.VEC.volcanes.nombre}: ${K.VEC.volcanes.metodo} ${K.VEC.sitios_turisticos.nombre}: ${K.VEC.sitios_turisticos.metodo} Se midió la distancia del AP a cada elemento escénico para identificar los que son visibles o relevantes desde el proyecto.`] }, sheetNotes(keys)],
        figs: [{ c: f1, cap: "Volcanes y sitios de interés escénico en el entorno regional (ortofoto de fondo)." }, ...sh.map(s => ({ c: s.c, cap: s.cap }))],
        fuentes: [K.VEC.volcanes.cita, K.VEC.sitios_turisticos.cita, ...sh.map(s => s.cap.split("Fuente: ")[1])]
      };
    });

    // ---------- 66 ----------
    await step(66, async () => {
      const S = await GEO.sismicidad(cen, 100); const fa = await GEO.nearest("fallas", ap, 4); const ag = (await GEO.atPoint("agies", cen))?.properties || {};
      const vol = await GEO.nearest("volcanes", ap, 3);
      const de = await dist("desl", Z), in_ = await dist("inun", Z), he = await dist("helad", Z), am = await dist("amen", Z, v => KB.GRIDS.amen.decode(v).label + " – " + KB.GRIDS.amen.decode(v).cat), ri = await dist("riesgo", Z);
      const amCat = await dist("amen", Z);
      const sis = await GEO.sismos();
      const fS = await RENDER.vecMap("fallas", Z, "Sismicidad (USGS M≥4) y fallas activas", p => ({ stroke: "#7a0177", lw: 2.5 }), [["Falla activa (GEM)", "#7a0177", "line"], ["Sismo M4–4.9", "#fdae61", "pt"], ["Sismo M5–5.9", "#f46d43", "pt"], ["Sismo M≥6", "#a50026", "pt"]], { minKm: 220, extra: (x, w, M) => { for (const r of sis.rows) { const [u, v] = M(GEO.toM([r[2], r[1]])); if (u < 0 || u > 1040 || v < 64 || v > 954) continue; const m = r[4]; x.fillStyle = m >= 6 ? "#a50026" : m >= 5 ? "#f46d43" : "#fdae61"; x.globalAlpha = 0.75; x.beginPath(); x.arc(u, v, Math.max(2, (m - 3.5) * 3.2), 0, 7); x.fill(); x.globalAlpha = 1; } const c = M(GEO.toM(cen)); const k = Math.cos(cen[1] * Math.PI / 180); const rpx = 100000 / k * 1040 / (w[2] - w[0]); x.strokeStyle = "#111"; x.setLineDash([6, 6]); x.lineWidth = 2; x.beginPath(); x.arc(c[0], c[1], rpx, 0, 7); x.stroke(); x.setLineDash([]); } });
      const figs = [fS, await RENDER.gridMap("desl", Z, "Amenaza a deslizamientos"), await RENDER.gridMap("inun", Z, "Amenaza por inundación"), await RENDER.gridMap("amen", Z, "Amenazas inducidas por el cambio climático"), await RENDER.gridMap("riesgo", Z, "Riesgo a amenazas climáticas")];
      const heAny = he.dom("AII").some(x => x.c !== "Nula" && x.p > 0); if (heAny) figs.push(await RENDER.gridMap("helad", Z, "Amenaza por heladas"));
      const keys = ["zonas_sismicas", "volcanes_lava", "volcanes_lahares", "volcanes_piroclasticos", "volcanes_tefra", "erosion_potencial"]; const sh = await sheetsFor(keys);
      const g = S.gr; const v0 = vol[0];
      return {
        secs: [{ h: "Amenaza sísmica", p: [
          `Índice de sismicidad AGIES NSE 2018 para ${ag.municipio || ctx.muni}: Io = ${ag.io ?? "—"} (amenaza ${String(ag.amenaza || "—").toLowerCase()}). El diseño estructural debe aplicar las demandas de la norma NSE 2-2018 con ese índice.`,
          `En un radio de 100 km el catálogo USGS registra ${nf(S.ev.length)} sismos de magnitud 4 o mayor desde 1900 (${Object.entries(S.porM).map(([k, v]) => `${v} de M ${k}`).join(", ")}); ${nf(S.sup)} fueron superficiales (≤ 30 km de profundidad).`,
          g ? `Recurrencia (Gutenberg-Richter, ${g.n} sismos M ≥ 4.5 entre 1973 y 2026): log N = ${g.a.toFixed(2)} − ${g.b.toFixed(2)}·M (b = ${g.b.toFixed(2)} ± ${g.sb.toFixed(2)}). Periodos de retorno estimados para un sismo dentro de 100 km: M ≥ 5.0 cada ${nf(g.tr5, 1)} años; M ≥ 6.0 cada ${nf(g.tr6, 0)} años; M ≥ 6.5 cada ${nf(g.tr65, 0)} años; M ≥ 7.0 cada ${nf(g.tr7, 0)} años. La extrapolación a magnitudes altas tiene más incertidumbre, porque hay pocos eventos grandes en el catálogo.` : "Hay menos de 15 sismos M ≥ 4.5 desde 1973 en un radio de 100 km; la muestra no basta para ajustar la ley de Gutenberg-Richter, lo que indica una sismicidad local baja.",
          fa.length ? `Fallas activas más cercanas: ${fa.map(f => `${f.f.properties.name || "sin nombre"} (${f.f.properties.slip_type || "tipo no indicado"}, ${nf(f.d, 1)} km)`).join("; ")}.` : ""].filter(Boolean),
          tabla: { cab: ["Fecha", "Magnitud", "Profundidad (km)", "Distancia (km)", "Localización (USGS)"], filas: S.top.map(e => [e.t, e.m.toFixed(1), nf(e.z, 0), nf(e.d, 1), e.p || "—"]) } },
        { h: "Amenaza volcánica", p: [v0 ? `El volcán más cercano es ${v0.f.properties.Nombre}, a ${nf(v0.d, 1)} km${vol[1] ? `, seguido de ${vol[1].f.properties.Nombre} (${nf(vol[1].d, 1)} km)` : ""}. ${v0.d < 10 ? "A menos de 10 km el proyecto puede quedar expuesto a flujos de lava, piroclásticos y lahares; revise las láminas de amenaza volcánica y los mapas del INSIVUMEH." : v0.d < 30 ? "A esa distancia la principal amenaza es la caída de ceniza (tefra) y, si el proyecto está en un cauce que nace en el volcán, los lahares." : "A esa distancia la amenaza volcánica se limita a una posible caída de ceniza en erupciones mayores."}` : "—"] },
        { h: "Deslizamientos, inundaciones, heladas y cambio climático", p: [`Deslizamientos en el AP: ${domTxt(de, "AP")}. Inundaciones: ${domTxt(in_, "AP")}. Heladas: ${domTxt(he, "AP")}.`, `Amenazas inducidas por el cambio climático (UIE, 2024) en el AP: ${domTxt(am, "AP")}. Riesgo a amenazas climáticas (UIE/IARNA, 2019): ${domTxt(ri, "AP")}.`, "Huracanes y tormentas tropicales: Guatemala está expuesta a ciclones del Atlántico y del Pacífico (por ejemplo Mitch 1998, Stan 2005, Agatha 2010, Eta e Iota 2020). Sus efectos en tierra se manifiestan sobre todo como lluvias extremas, que activan las amenazas de inundación y deslizamiento evaluadas arriba; el drenaje pluvial y la estabilidad de taludes deben diseñarse para esos eventos."], tabla: { cab: ["Amenaza (AP)", "Resultado"], filas: [["Deslizamientos", domTxt(de, "AP")], ["Inundaciones", domTxt(in_, "AP")], ["Heladas", domTxt(he, "AP")], ["Cambio climático (categoría)", domTxt(amCat, "AP")], ["Riesgo climático", domTxt(ri, "AP")]] } },
        { h: "Distribución en AP, AID y AII – cambio climático", tabla: amCat.tabla },
        { h: "Metodología – sismicidad", p: [`${K.SISMOS.nombre}. ${K.SISMOS.metodo}`, `${K.VEC.fallas.nombre}: ${K.VEC.fallas.metodo}`, `${K.VEC.agies.nombre}: ${K.VEC.agies.metodo}`] }, metodo(K.GRIDS.desl), metodo(K.GRIDS.inun), metodo(K.GRIDS.helad), metodo(K.GRIDS.amen), metodo(K.GRIDS.riesgo), sheetNotes(keys)],
        figs: [...figs.map((c, i) => ({ c, cap: ["Sismos M≥4 (USGS, 1900–2026), fallas activas y radio de 100 km de análisis.", "Amenaza a deslizamientos.", "Amenaza por inundación.", "Amenazas inducidas por el cambio climático (categoría).", "Riesgo a amenazas climáticas.", "Amenaza por heladas."][i] })), ...sh.map(s => ({ c: s.c, cap: s.cap }))],
        fuentes: [K.VEC.agies.cita, K.SISMOS.cita, K.VEC.fallas.cita, K.VEC.volcanes.cita, K.GRIDS.desl.cita, K.GRIDS.inun.cita, K.GRIDS.helad.cita, K.GRIDS.amen.cita, K.GRIDS.riesgo.cita, ...sh.map(s => s.cap.split("Fuente: ")[1])]
      };
    });

    // ---------- 71 ----------
    await step(71, async () => {
      const ring = ap.geometry.coordinates[0]; const bb = turf.bbox(ap);
      const edge = (cmp) => ring.reduce((a, p) => cmp(p, a) ? p : a);
      const pts = [{ id: "M-1", ll: cen, tipo: "Aire y ruido (centro del AP)", col: "#e31a1c", par: "PM10, PM2.5 (polvo) y nivel de presión sonora Leq dB(A)", fr: "Mensual en construcción; semestral en operación" },
        { id: "M-2", ll: edge((p, a) => p[1] > a[1]), tipo: "Ruido perimetral", col: "#ff7f00", par: "Leq dB(A) diurno y nocturno", fr: "Mensual en construcción; semestral en operación" },
        { id: "M-3", ll: edge((p, a) => p[1] < a[1]), tipo: "Ruido perimetral", col: "#ff7f00", par: "Leq dB(A) diurno y nocturno", fr: "Mensual en construcción; semestral en operación" },
        { id: "M-4", ll: edge((p, a) => p[0] > a[0]), tipo: "Ruido perimetral", col: "#ff7f00", par: "Leq dB(A) diurno y nocturno", fr: "Mensual en construcción; semestral en operación" },
        { id: "M-5", ll: edge((p, a) => p[0] < a[0]), tipo: "Ruido perimetral", col: "#ff7f00", par: "Leq dB(A) diurno y nocturno", fr: "Mensual en construcción; semestral en operación" }];
      if (P.descarga_lat && P.descarga_lon) pts.push({ id: "M-6", ll: [+P.descarga_lon, +P.descarga_lat], tipo: "Agua residual (punto de descarga)", col: "#6a3d9a", par: "Parámetros del AG 236-2006 (DBO₅, SST, grasas y aceites, N, P, coliformes fecales, pH, temperatura)", fr: "Según el AG 236-2006 (estudio técnico y muestreos periódicos)" });
      const rec = turf.destination(cen, ((+P.aid || 300) + Math.sqrt(areaAP / Math.PI)) / 1000 * 0.8, 0, { units: "kilometers" }).geometry.coordinates;
      pts.push({ id: "M-" + (pts.length + 1), ll: rec, tipo: "Receptor en AID", col: "#1f78b4", par: "Ruido y partículas en el receptor sensible más cercano (ajustar en campo)", fr: "Trimestral en construcción" });
      const fig = await RENDER.zoneMap(Z, "Puntos de monitoreo ambiental", "AP, AID y AII con puntos de muestreo", { puntos: pts, win: RENDER.winFor(Z.AID, 0.5, 1.15) });
      return {
        secs: [{ h: "Ubicación de los puntos de monitoreo", p: ["Los puntos se ubican de forma preliminar a partir del polígono: centro del AP, extremos del perímetro hacia los vecinos, punto de descarga (si se indicó) y un receptor en el AID. Deben ajustarse en campo a los receptores sensibles reales (viviendas, escuelas, centros de salud)."], tabla: { cab: ["Punto", "Tipo", "Latitud", "Longitud", "X GTM", "Y GTM", "Parámetros", "Frecuencia"], filas: pts.map(p => { const g = GEO.toGTM(p.ll); return [p.id, p.tipo, p.ll[1].toFixed(6), p.ll[0].toFixed(6), nf(g[0], 1), nf(g[1], 1), p.par, p.fr]; }) } },
        { h: "Responsables", p: [`El proponente (${P.proponente || "—"}) es responsable de ejecutar el plan de monitoreo por medio del consultor ambiental o de un laboratorio acreditado, y de conservar los registros para la Dirección de Gestión Ambiental y Recursos Naturales del MARN.`] }],
        figs: [{ c: fig, cap: "Mapa de AP, AID y AII con los puntos de monitoreo (coordenadas WGS84 en el cuadro)." }],
        fuentes: ["Puntos generados por la plataforma a partir del polígono del proyecto."]
      };
    });

    return { ctx, R };
  }
  return { run, nf };
})();
