/* Exportación a Word (.docx) con docx.js: datos del proyecto + capítulos B2 con mapas, tablas, metodología y fuentes. */
window.REPORT = (() => {
  const D = window.docx;
  const FONT = "Arial";
  const t = (text, o = {}) => new D.TextRun({ text: String(text ?? ""), font: FONT, size: o.size || 21, bold: o.bold, italics: o.italics, color: o.color });
  const p = (text, o = {}) => new D.Paragraph({ children: Array.isArray(text) ? text : [t(text, o)], spacing: { after: o.after ?? 120, line: 276 }, alignment: o.align || D.AlignmentType.JUSTIFIED, heading: o.heading, keepNext: o.keepNext });
  const h = (text, level) => new D.Paragraph({ heading: level, spacing: { before: 240, after: 120 }, keepNext: true, children: [new D.TextRun({ text, font: FONT, bold: true, size: level === D.HeadingLevel.HEADING_1 ? 30 : level === D.HeadingLevel.HEADING_2 ? 25 : 22, color: "0F2A44" })] });
  const border = { style: D.BorderStyle.SINGLE, size: 4, color: "9AA7B4" };
  const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
  function table(cab, filas) {
    const cell = (txt, head) => new D.TableCell({ children: [new D.Paragraph({ children: [t(txt, { size: 17, bold: head, color: head ? "FFFFFF" : undefined })], spacing: { after: 0 } })], shading: head ? { type: D.ShadingType.CLEAR, fill: "1240E0", color: "auto" } : undefined, margins: { top: 50, bottom: 50, left: 80, right: 80 } });
    return new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, borders, rows: [new D.TableRow({ tableHeader: true, children: cab.map(c => cell(c, true)) }), ...filas.map(f => new D.TableRow({ cantSplit: true, children: f.map(c => cell(c)) }))] });
  }
  async function img(canvas) {
    const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.86));
    return new Uint8Array(await blob.arrayBuffer());
  }
  async function build(P, A, onProg) {
    const { ctx, R } = A; const body = []; let fig = 0, tab = 0;
    body.push(new D.Paragraph({ spacing: { before: 1800, after: 200 }, alignment: D.AlignmentType.CENTER, children: [t("INSTRUMENTO AMBIENTAL CATEGORÍA B2 – SAGA / MARN", { bold: true, size: 26, color: "1240E0" })] }));
    body.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 300 }, children: [t("Análisis cartográfico ambiental por capítulo", { size: 24 })] }));
    body.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { after: 600 }, children: [t(P.nombre || "Proyecto", { bold: true, size: 36 })] }));
    body.push(table(["Dato", "Valor"], [["Proponente", P.proponente || "—"], ["Representante legal", P.representante || "—"], ["Consultor / empresa consultora", P.consultor || "—"], ["Actividad", P.actividad || "—"], ["Ubicación", `${P.direccion ? P.direccion + ", " : ""}${ctx.muni}, ${ctx.depto}`], ["Coordenadas del centro (WGS84)", `${ctx.cen[1].toFixed(6)}, ${ctx.cen[0].toFixed(6)}`], ["Área del proyecto", `${ANALISIS.nf(ctx.areaAP, 2)} m² (${ANALISIS.nf(ctx.areaAP / 1e4, 4)} ha)`], ["Fecha del análisis", new Date().toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" })]]));
    body.push(new D.Paragraph({ children: [new D.PageBreak()] }));
    body.push(h("Nota metodológica general", D.HeadingLevel.HEADING_1));
    [ "Este documento desarrolla los capítulos con requerimiento cartográfico de los términos de referencia del instrumento Categoría B2 del SAGA (MARN), con las capas de la carpeta «MAPAS B2 SAGA».",
      "Las capas raster se reproyectaron a una malla común de 100 m (EPSG:3857). Para cada capa se calculó la proporción del área del proyecto (AP), del área de influencia directa (AID) y del área de influencia indirecta (AII) en cada clase, contando las celdas cuyo centro cae dentro de cada zona. Cuando el AP es menor que una celda, se leyó la celda de su centro. Las capas vectoriales se intersectaron con las zonas o se consultaron en el centro del AP, y se midieron distancias a los elementos de interés.",
      "En cada capítulo se describe la metodología con que se elaboró cada mapa y cómo se aplicó al proyecto, porque de ella dependen la escala, la precisión y la interpretación correcta del resultado. Las láminas de consulta (mapas publicados en imagen) se presentan con el polígono superpuesto; la clase en el punto del proyecto debe leerse en la leyenda de la propia lámina.",
      "Limitaciones: la resolución de las capas nacionales (20 m a 1 km) no sustituye el levantamiento topográfico, el estudio geotécnico ni la verificación de campo de flora, fauna, ruido y receptores sensibles. Los resultados deben revisarse y firmarse por el consultor ambiental responsable." ].forEach(s => body.push(p(s)));
    const order = [11, 59, 60, 62, 63, 64, 65, 66, 71, 75, 76, 77];
    for (const n of order) {
      const c = R[n]; const meta = KB.CAP.find(x => x.n === n); if (!c) continue;
      onProg && onProg(n);
      body.push(new D.Paragraph({ children: [new D.PageBreak()] }));
      body.push(h(`${n}. ${meta.t}`, D.HeadingLevel.HEADING_1));
      body.push(new D.Paragraph({ spacing: { after: 160 }, shading: { type: D.ShadingType.CLEAR, fill: "EEF2FF", color: "auto" }, children: [t("Requerimiento de los TdR: ", { bold: true, size: 19 }), t(meta.tdr, { italics: true, size: 19 })] }));
      for (const s of c.secs) {
        if (s.h) body.push(h(s.h, D.HeadingLevel.HEADING_2));
        for (const x of (s.p || [])) if (x) body.push(p(x));
        if (s.tabla && s.tabla.filas.length) { tab++; body.push(p(`Cuadro ${tab}. ${s.h || "Resultados"}`, { bold: true, size: 18, after: 60, keepNext: true, align: D.AlignmentType.LEFT })); body.push(table(s.tabla.cab, s.tabla.filas)); body.push(p("", { after: 80 })); }
      }
      if (c.figs.length) body.push(h("Mapas del capítulo", D.HeadingLevel.HEADING_2));
      for (const f of c.figs) {
        fig++; const data = await img(f.c);
        body.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, keepNext: true, spacing: { after: 60 }, children: [new D.ImageRun({ type: "jpg", data, transformation: { width: 620, height: Math.round(620 * f.c.height / f.c.width) } })] }));
        body.push(p([t(`Figura ${fig}. `, { bold: true, size: 18 }), t(f.cap, { size: 18 })], { align: D.AlignmentType.CENTER, after: 220 }));
      }
      body.push(h("Fuentes", D.HeadingLevel.HEADING_2));
      for (const s of [...new Set(c.fuentes.filter(Boolean))]) body.push(new D.Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [t(s, { size: 18 })] }));
    }
    const doc = new D.Document({
      creator: P.consultor || "Plataforma B2 SAGA", title: `Análisis B2 – ${P.nombre || "Proyecto"}`,
      styles: { default: { document: { run: { font: FONT, size: 21 } } } },
      sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1300, bottom: 1200, left: 1300, right: 1200 } } },
        headers: { default: new D.Header({ children: [new D.Paragraph({ alignment: D.AlignmentType.RIGHT, children: [t(`${P.nombre || "Proyecto"} – Instrumento B2 SAGA`, { size: 16, color: "6B7785" })] })] }) },
        footers: { default: new D.Footer({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ children: ["Página ", D.PageNumber.CURRENT, " de ", D.PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: "6B7785" })] })] }) },
        children: body }]
    });
    return D.Packer.toBlob(doc);
  }
  return { build };
})();
