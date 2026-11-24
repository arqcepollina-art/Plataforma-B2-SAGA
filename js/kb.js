/* Base de conocimiento: capas de la carpeta MAPAS B2 SAGA, su metodología y los TdR B2 (SAGA-MARN) por capítulo. */
window.KB = (() => {
  // ---------- Capas raster (teselas codificadas, EPSG:3857, 100 m) ----------
  const GRIDS = {
    desl: {
      nombre: "Amenaza a deslizamientos (UIE, 2023)", carpeta: "Mapas 66 / Deslizamientos_2.zip (Deslizamien_gt.tif, 20 m)",
      clases: { 0: ["Nula/baja", "#e8f0d8"], 1: ["Nula/baja", "#cfe3a8"], 2: ["Media", "#ffd966"], 3: ["Alta", "#f39c45"], 4: ["Muy alta", "#c0392b"] },
      cita: "Cuque Salazar, D. A. y Unidad de Datos e Información Estratégica (UIE). (2023). Mapa de amenazas a deslizamientos en la República de Guatemala [mapa digital]. URL-IARNA.",
      metodo: "Capa raster de 20 m elaborada por la UIE (URL) que clasifica el territorio en cinco niveles de amenaza (nula/baja a muy alta). Integra factores condicionantes del terreno (pendiente, litología y suelos, cobertura) con un factor detonante (lluvia) mediante superposición ponderada; por ello el valor dentro del polígono expresa la propensión del terreno y no la estabilidad de un talud concreto, que debe verificarse en campo.",
      aplica: "Se calculó la proporción del Área del Proyecto (AP), del Área de Influencia Directa (AID) y del Área de Influencia Indirecta (AII) en cada nivel de amenaza; los niveles «alta» y «muy alta» se usan como criterio para exigir medidas de estabilización y drenaje de taludes."
    },
    inun: {
      nombre: "Amenaza por inundaciones (UIE, 2023)", carpeta: "Mapas 60 y 66 / Inundaciones (Inundacionesfinal.tif, 20 m)",
      clases: { 0: ["Nula", "#eef4f7"], 1: ["Nula", "#eef4f7"], 10: ["Alta", "#2166ac"], 11: ["Muy alta", "#08306b"], 20: ["Media", "#4393c3"], 21: ["Alta", "#2166ac"], 30: ["Baja", "#92c5de"], 31: ["Media", "#4393c3"], 40: ["Muy baja", "#d1e5f0"], 41: ["Baja", "#92c5de"] },
      cita: "Cuque Salazar, D. A. y UIE. (2023). Mapa de amenazas a inundaciones en la República de Guatemala [mapa digital]. URL-IARNA.",
      metodo: "Raster de 20 m de la UIE que zonifica la amenaza de inundación a partir de la posición del terreno respecto a la red de drenaje (planicies, zonas bajas y cercanía a cauces) y de la recurrencia de lluvias intensas. Los códigos combinan el nivel de susceptibilidad del terreno con un ajuste por condición hidrológica; se agrupan aquí en seis niveles (nula a muy alta).",
      aplica: "Se midió la superficie del AP, AID y AII en cada nivel; un AP con amenaza media o mayor obliga a dimensionar el drenaje pluvial para eventos extremos, a fijar niveles de piso terminado sobre la cota de inundación y a evitar obstruir cauces."
    },
    helad: {
      nombre: "Amenaza por heladas (UIE, 2024)", carpeta: "Mapas 66 / Heladas-2024_abril.zip (Heladas_gt.tif)",
      clases: { 0: ["Nula", "#f4f4f4"], 1: ["Baja", "#c6dbef"], 2: ["Media", "#6baed6"], 3: ["Alta", "#08519c"] },
      cita: "Cuque Salazar, D. A. y UIE. (2024). Mapa de amenazas a ocurrencia de heladas en la República de Guatemala [mapa digital]. URL-IARNA.",
      metodo: "Zonificación de la UIE basada en temperaturas mínimas y altitud: identifica zonas donde la temperatura del aire desciende a valores de helada en la época fría.",
      aplica: "Se determinó el nivel de amenaza en el AP; es relevante para materiales, tuberías expuestas, revegetación y salud ocupacional."
    },
    amen: {
      nombre: "Amenazas inducidas por el cambio climático (UIE, 2024)", carpeta: "Mapas 66 / Amenazas_gt_2024_cat.zip",
      decode: (v) => { const h = v % 10, s = Math.floor(v / 10) % 10, i = Math.floor(v / 100) % 10, d = Math.floor(v / 1000) % 10; const L = []; if (h) L.push("Heladas"); if (s) L.push("Sequías"); if (i) L.push("Inundaciones"); if (d) L.push("Deslizamientos"); const n = L.length; return { label: n ? L.join(", ") : "Ninguna", cat: n === 0 ? "Baja" : n === 1 ? (h ? "Media" : "Alta") : "Muy alta" }; },
      catColor: { "Baja": "#e5f5e0", "Media": "#fee08b", "Alta": "#f46d43", "Muy alta": "#a50026" },
      cita: "Unidad de Datos e Información Estratégica (UIE). (2024). Mapa de amenazas de la República de Guatemala inducidas por el cambio climático [mapa digital]. URL-IARNA.",
      metodo: "Síntesis de cuatro amenazas (heladas, sequías, inundaciones y deslizamientos). Cada píxel lleva un código en el que cada dígito indica la presencia de una amenaza; la categoría sube con el número de amenazas concurrentes (una amenaza = alta, salvo heladas = media; dos o más = muy alta).",
      aplica: "Se decodificó el código de cada celda del AP y sus áreas de influencia para identificar qué amenazas concurren; la categoría resultante orienta las medidas de adaptación del capítulo 66."
    },
    riesgo: {
      nombre: "Riesgo a amenazas climáticas (UIE/IARNA, 2019)", carpeta: "Mapas 66 / RIESGO_2.zip (riesgo_gtm.tif)",
      tabla: { 11: "Muy bajo", 12: "Bajo", 13: "Bajo", 14: "Medio", 15: "Alto", 21: "Bajo", 22: "Bajo", 23: "Medio", 24: "Alto", 25: "Alto", 31: "Bajo", 32: "Medio", 33: "Alto", 34: "Alto", 35: "Muy alto", 41: "Medio", 42: "Medio", 43: "Alto", 44: "Muy alto", 45: "Muy alto" },
      catColor: { "Muy bajo": "#1a9850", "Bajo": "#a6d96a", "Medio": "#fee08b", "Alto": "#f46d43", "Muy alto": "#a50026" },
      cita: "UIE-IARNA. (2019). Mapa de riesgo a amenazas climáticas de la República de Guatemala [mapa digital]. URL.",
      metodo: "Matriz de riesgo: cada celda combina un nivel de amenaza climática y un nivel de vulnerabilidad en un código de dos dígitos (11 a 45), que la tabla de atributos de la capa traduce en cinco categorías de riesgo (muy bajo a muy alto).",
      aplica: "Se tradujo el código de cada celda del AP, AID y AII a su categoría de riesgo y se calculó su distribución."
    },
    prov: {
      nombre: "Provincias de humedad 2001–2018 (UIE, 2020)", carpeta: "Mapas 62 / Clima / provhm01-18",
      clases: { 1: ["Pluvial", "#08306b"], 2: ["Muy húmeda", "#2171b5"], 3: ["Húmeda", "#6baed6"], 4: ["Seca", "#fdae6b"], 5: ["Muy seca", "#d94801"] },
      cita: "UIE. (2020). Mapa de provincias de humedad de Guatemala, periodo 2001-2018 [mapa digital]. URL-IARNA.",
      metodo: "Clasificación de Holdridge de la relación entre evapotranspiración potencial y precipitación media anual del periodo 2001–2018 (100 m). Cada provincia indica cuánto excede o falta el agua respecto a la demanda atmosférica.",
      aplica: "Se identificó la provincia de humedad del AP; se usa para caracterizar el clima (cap. 62) y para elegir especies de revegetación (cap. 63)."
    },
    pp: {
      nombre: "Precipitación media anual 2001–2018 (UIE, 2020)", carpeta: "Mapas 62 / Clima / pp_2001-18", continuo: "mm/año",
      rampa: ["#fff5d6", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#0c2c84"], rango: [600, 5000],
      cita: "UIE. (2020). Mapa de precipitación media anual de Guatemala, periodo 2001-2018 [mapa digital]. URL-IARNA.",
      metodo: "Superficie continua de 100 m interpolada a partir de registros de estaciones meteorológicas del periodo 2001–2018. Fuera del territorio nacional los valores son artefactos de la interpolación y no se usan.",
      aplica: "Se obtuvo la precipitación media, mínima y máxima en el AP. Con ella se estima el volumen anual de escorrentía pluvial que generarán las superficies impermeables del proyecto (cap. 60)."
    },
    tmed: {
      nombre: "Temperatura media anual", carpeta: "Mapas 62 / Clima / Temperatura media 2020 (Tmedia.tif, ~1 km)", continuo: "°C",
      rampa: ["#313695", "#4575b4", "#74add1", "#fee090", "#fdae61", "#f46d43", "#a50026"], rango: [8, 28],
      cita: "Capa Tmedia.tif (temperatura media anual), carpeta «Temperatura media 2020» de MAPAS B2 SAGA; véase el metadato de la carpeta para la fuente primaria.",
      metodo: "Superficie continua (~1 km) de temperatura media anual del aire, derivada de la interpolación de registros de estaciones con corrección altitudinal.",
      aplica: "Se obtuvo la temperatura media del AP para describir el clima (cap. 62)."
    },
    cap: {
      nombre: "Capacidad de uso de la tierra – metodología INAB (UIE/IARNA, 2016)", carpeta: "Mapas 62 / Suelo / Capuso_Iarna (cap_inab25v3k, 25 m)",
      clases: { 1: ["A – Agricultura sin limitaciones", "#1a9850"], 2: ["Am – Agricultura con mejoras", "#66bd63"], 3: ["Aa – Agroforestería con cultivos anuales", "#a6d96a"], 4: ["Ss – Sistemas silvopastoriles", "#d9ef8b"], 5: ["Ap – Agroforestería con cultivos permanentes", "#fee08b"], 6: ["F – Tierras forestales de producción", "#3f7f3f"], 7: ["Fp – Tierras forestales de protección", "#1b4d1b"], 9: ["Ag – Cuerpos de agua / otros", "#6baed6"] },
      cita: "UIE/IARNA. (2016). Mapa de capacidad de uso de la tierra de Guatemala, según metodología del INAB [mapa digital]. URL.",
      metodo: "Metodología del INAB: dentro de cada región fisiográfica, la tierra se clasifica por pendiente y profundidad efectiva del suelo, y se ajusta por pedregosidad y drenaje. El resultado son ocho categorías que indican el uso más intensivo que la tierra soporta sin degradarse.",
      aplica: "Se calculó la proporción del AP en cada categoría y se comparó con el uso que tendrá el proyecto (construcción o urbanización). Usar tierras F o Fp para obras implica pérdida de función protectora y exige compensación y control de erosión."
    },
    intuso: {
      nombre: "Intensidad de uso de la tierra (UIE-IARNA, 2019)", carpeta: "Mapas 62 / Suelo / Intuso_Iarna (intuso_iarnaf, 25 m)",
      cat: (v) => { const t = { 1: "Sub uso", 2: "Uso adecuado", 3: "Sobre uso", 4: "Agua", 5: "Humedal", 6: "Urbano", 7: "Otro" }; return t[KB.INTUSO[v]] || "Sin dato"; },
      catColor: { "Sub uso": "#fee08b", "Uso adecuado": "#1a9850", "Sobre uso": "#d73027", "Agua": "#4575b4", "Humedal": "#74add1", "Urbano": "#7f7f7f", "Otro": "#c7c7c7", "Sin dato": "#eeeeee" },
      cita: "UIE-IARNA. (2019). Mapa de intensidad de uso de la tierra de Guatemala [mapa digital]. URL.",
      metodo: "Confronta la capacidad de uso (INAB) con el uso actual (cobertura vegetal y uso de la tierra) celda por celda: si el uso actual es más intensivo que la capacidad hay sobreuso, si es menos intensivo hay subuso y si coincide el uso es adecuado.",
      aplica: "Se calculó la intensidad de uso en el AP y en sus áreas de influencia para documentar el estado actual del suelo y anticipar si el proyecto agrava un sobreuso existente."
    },
    din: {
      nombre: "Dinámica de la cobertura forestal 1991–2016", carpeta: "Mapas 63 / Cobertura forestal 1991_2016 (din1991_2016.tif, 30 m)",
      clases: { 0: ["No bosque", "#f1e7c9"], 1: ["Bosque estable", "#1b7837"], 2: ["Pérdida de bosque", "#d73027"], 3: ["Ganancia de bosque", "#7fbc41"] },
      cita: "Dinámica de la cobertura forestal de Guatemala 1991–2016 (INAB-CONAP-UVG-URL), raster din1991_2016 de la carpeta MAPAS B2 SAGA.",
      metodo: "Comparación de clasificaciones de imágenes Landsat (30 m) de 1991 y 2016: cada píxel se marca como bosque estable, no bosque, pérdida o ganancia de cobertura forestal.",
      aplica: "Se cuantificó la superficie de bosque estable, pérdida y ganancia dentro del AP, AID y AII; la presencia de bosque en el AP obliga a gestionar la licencia o el aval forestal del INAB y a definir medidas de compensación."
    },
    pop: {
      nombre: "Población estimada 2020 (WorldPop, 100 m)", carpeta: "Mapas 64 / gtm_ppp_2020_constrained.tif", continuo: "hab/ha",
      rampa: ["#ffffe5", "#fee391", "#fec44f", "#fe9929", "#ec7014", "#cc4c02", "#8c2d04"], rango: [0, 60],
      cita: "WorldPop. (2020). Guatemala – Constrained individual countries 2020 (100 m). University of Southampton. https://www.worldpop.org",
      metodo: "Reparto dasimétrico de la población censal: un modelo de bosque aleatorio distribuye los totales de población por unidad administrativa a celdas de 100 m, restringido a áreas con edificaciones detectadas por satélite.",
      aplica: "Se sumó la población estimada dentro del AP, el AID y el AII para identificar a la población receptora de los impactos (ruido, polvo, tránsito) y calcular su densidad."
    },
    cab: {
      nombre: "Cabeceras de cuenca", carpeta: "Mapas 60 / Cabeceras de cuenca_2 (Cabecera_cuenca.tif, 20 m)",
      clases: { 0: ["Fuera de cabecera de cuenca", "#f2f2f2"], 1: ["Cabecera de cuenca", "#2c7fb8"] },
      cita: "Capa Cabecera_cuenca.tif (cabeceras de cuenca), carpeta «Cabeceras de cuenca_2» de MAPAS B2 SAGA.",
      metodo: "Delimitación de las partes altas de las cuencas, donde nacen los cauces y se concentra la recarga hídrica, a partir de la red de drenaje y del relieve (20 m).",
      aplica: "Se verificó si el AP está en una cabecera de cuenca. Si lo está, la impermeabilización afecta directamente la recarga, y el manejo pluvial debe priorizar la infiltración (pozos o zanjas de absorción)."
    }
  };

  // Intensidad de uso: valor del raster → código de categoría (vat.dbf)
  const INTUSO = {};
  const _t = { 4: [1005, 2005, 3005, 4005, 5005, 6005, 7005, 8005, 9003, 9005, 9021, 9023, 9024, 9221, 9222, 9223, 9224, 9230, 9231, 9232, 9233, 9234, 9235, 9236, 9238], 5: [1004, 2004, 3004, 4004, 5004, 6004, 7004, 8004, 9004], 7: [1033, 1040, 2033, 2040, 3033, 3040, 4033, 4040, 4239, 5033, 5040, 5239, 6033, 6040, 6239, 7033, 7040, 7239, 8033, 8040, 8239, 9033, 9040, 9239], 3: [2021, 2024, 2236, 3021, 3024, 3221, 3232, 3235, 3236, 4021, 4023, 4024, 4221, 4222, 4224, 4232, 4235, 4236, 5021, 5023, 5024, 5236, 6021, 6023, 6024, 6221, 6222, 6224, 6232, 6233, 6235, 6236, 7021, 7023, 7024, 7221, 7222, 7223, 7224, 7230, 7231, 7232, 7233, 7234, 7235, 7236, 8021, 8023, 8024, 8221, 8222, 8223, 8224, 8230, 8231, 8232, 8233, 8235, 8236], 1: [1023, 1221, 1222, 1223, 1224, 1230, 1231, 2023, 2230, 2231, 2238, 3023, 3222, 3224, 3230, 3231, 4230, 4231, 5230, 5231, 5238, 6230, 6231, 6238], 6: [1001, 2001, 3001, 4001, 5001, 6001, 7001, 8001, 9001], 2: [1003, 1021, 1024, 1232, 1233, 1234, 1235, 1236, 2003, 2221, 2222, 2223, 2224, 2232, 2233, 2234, 2235, 3003, 3223, 3233, 3234, 4003, 4223, 4233, 4234, 5003, 5221, 5222, 5223, 5224, 5232, 5233, 5234, 5235, 6003, 6223, 6234, 7003, 8003, 8234, 8238] };
  for (const [k, arr] of Object.entries(_t)) for (const v of arr) INTUSO[v] = +k;

  // ---------- Capas vectoriales ----------
  const VEC = {
    cuencas: { f: "cuencas", nombre: "Cuencas y subcuencas (IARNA-URL, 2015)", cita: "IARNA-URL. (2015). Mapa de cuencas y subcuencas hidrográficas de Guatemala [mapa digital].", metodo: "Delimitación de vertientes, cuencas y subcuencas a partir de la red de drenaje y de las divisorias topográficas." },
    microcuencas: { f: "microcuencas", nombre: "Disponibilidad hídrica por microcuenca (IARNA-URL, 2015)", cita: "IARNA-URL. (2015). Mapa de disponibilidad hídrica por microcuenca de Guatemala [mapa digital].", metodo: "Balance hídrico por microcuenca (precipitación menos evapotranspiración, escorrentía superficial, flujo subsuperficial y recarga). La disponibilidad actual y la proyectada a 2050 se expresan en m³/año y en m³/ha·año." },
    dh_muni: { f: "dh_muni", nombre: "Disponibilidad hídrica municipal per cápita (UIE, 2019)", cita: "UIE. (2019). Mapa de disponibilidad hídrica municipal actual [mapa digital]. URL-IARNA.", metodo: "La disponibilidad hídrica de las microcuencas se asigna a cada municipio en proporción a su área y se divide entre la población de 2018. El resultado (m³/hab·año) se clasifica con los umbrales de estrés hídrico de Arnell (2004): >1 700 sin estrés, 1 000–1 700 estrés moderado, 500–1 000 estrés alto, <500 estrés extremo." },
    migracion: { f: "migracion", nombre: "Migración municipal 2018 (UIE, 2020)", cita: "UIE. (2020). Mapa de migración municipal, Censo 2018 [mapa digital]. URL-IARNA.", metodo: "Porcentaje de la población municipal que emigró, calculado con datos del XII Censo de Población (INE, 2018) y agrupado en clases." },
    municipios: { f: "municipios", nombre: "División municipal de Guatemala", cita: "Límites municipales (shape municipios_GTM) de la carpeta MAPAS B2 SAGA, basados en IGN/SEGEPLAN.", metodo: "Polígonos de límites municipales oficiales en proyección GTM." },
    zonas_vida: { f: "zonas_vida", nombre: "Zonas de vida de Holdridge (IARNA, 2015)", cita: "IARNA-URL. (2015). Mapa de zonas de vida de Holdridge, versión simplificada (Pérez et al., 2016) [mapa digital].", metodo: "Sistema bioclimático de Holdridge: combina biotemperatura media anual, precipitación anual y relación de evapotranspiración potencial para definir pisos altitudinales y provincias de humedad. Cada zona de vida corresponde a un tipo potencial de vegetación." },
    geologia: { f: "geologia", nombre: "Mapa geológico de Guatemala (IGN, 1:500 000)", cita: "Instituto Geográfico Nacional (IGN). Mapa geológico de la República de Guatemala, escala 1:500 000 (capa Mapa_Geológico_de_Guatemala_WFL1).", metodo: "Unidades litoestratigráficas agrupadas por edad (Paleozoico, Jurásico-Cretácico, Cretácico, Terciario, Cuaternario) y tipo de roca (sedimentaria, volcánica, intrusiva, metamórfica)." },
    agies: { f: "agies", nombre: "Amenaza sísmica municipal – AGIES NSE 2018", cita: "AGIES. (2018). Normas de Seguridad Estructural NSE 2-2018: Demandas estructurales y condiciones de sitio. Índice de sismicidad Io por municipio.", metodo: "La norma asigna a cada municipio un índice de sismicidad (Io = 2 a 4.2) a partir del análisis probabilista de la amenaza sísmica (sismo de diseño con 10 % de probabilidad de excedencia en 50 años). Io ≥ 4 corresponde a amenaza alta." },
    sigap: { f: "sigap", nombre: "Sistema Guatemalteco de Áreas Protegidas – SIGAP 2022 (CONAP/INAB)", cita: "CONAP/INAB. (2022). Áreas protegidas del SIGAP (SIGAP_05_2022_INAB) [capa vectorial]; véase también Cuque, D. y Pérez, G. (UIE, 2023), Mapa del SIGAP.", metodo: "Polígonos oficiales de las áreas protegidas declaradas e inscritas en el SIGAP, con su categoría de manejo." },
    fallas: { f: "fallas", nombre: "Fallas activas (GEM Global Active Faults Database)", cita: "Styron, R. y Pagani, M. (2020). The GEM Global Active Faults Database. Earthquake Spectra, 36(1_suppl), 160-180.", metodo: "Trazas de fallas con evidencia de actividad cuaternaria, compiladas de catálogos regionales e indicando su tipo de desplazamiento." },
    volcanes: { f: "volcanes", nombre: "Volcanes de Guatemala (UIE/IARNA, 2020)", cita: "UIE/IARNA. (2020). Mapa orográfico de Guatemala – capa de volcanes [mapa digital]. URL.", metodo: "Ubicación puntual y altitud de los 35 edificios volcánicos principales del país." },
    sitios_turisticos: { f: "sitios_turisticos", nombre: "Sitios turísticos y de interés (IARNA, 2012)", cita: "IARNA-URL. (2012). Sitios turísticos de Guatemala [capa vectorial].", metodo: "Inventario de parques nacionales, biotopos, sitios arqueológicos y otros atractivos turísticos." },
  };
  const SISMOS = { nombre: "Catálogo sísmico USGS M≥4, 1900–2026", cita: "U.S. Geological Survey. (2026). ANSS Comprehensive Earthquake Catalog (ComCat), M≥4.0, 1900–2026, región de Guatemala. https://earthquake.usgs.gov", metodo: "Catálogo instrumental de sismos con su magnitud, profundidad y fecha. La recurrencia se estima con la ley de Gutenberg-Richter (log N = a − bM) a partir de los sismos registrados en un radio de 100 km alrededor del proyecto. El valor b se calcula por máxima verosimilitud (Aki-Utsu) para M ≥ 4.5 desde 1973, periodo en que el catálogo es completo para esas magnitudes." };
  const PUEBLOS = { nombre: "Población por pueblo de pertenencia – Censo 2018 (INE)", cita: "INE. (2019). XII Censo Nacional de Población y VII de Vivienda 2018. Cuadro A5.1, población por pueblos según departamento.", metodo: "Población censada por departamento según el pueblo de pertenencia declarado (maya, garífuna, xinka, afrodescendiente, ladino, extranjero)." };

  const GEO = {
    Qvol: ["Rocas volcánicas cuaternarias: rellenos piroclásticos (pómez), cenizas, tobas, lahares y coladas recientes", "Materiales poco consolidados, muy permeables y erosionables. En cortes verticales forman taludes que se desmoronan y cárcavas cuando se concentra la escorrentía; son susceptibles a la erosión regresiva y al colapso al saturarse."],
    Qsed: ["Sedimentos cuaternarios: aluviones, depósitos fluviales, lacustres y costeros", "Suelos granulares con nivel freático somero y susceptibles a inundación. En arenas saturadas puede haber licuefacción durante sismos fuertes; la capacidad de soporte es variable."],
    Tvol: ["Rocas volcánicas terciarias: andesitas, basaltos, riolitas e ignimbritas (Grupo Padre Miguel y equivalentes)", "Roca generalmente competente, pero con fracturamiento y meteorización profunda que forma suelos residuales arcillosos, susceptibles a deslizamientos en laderas empinadas."],
    Tintru: ["Rocas intrusivas: granitos, granodioritas y dioritas", "Roca sana competente; la meteorización forma maicillo (arena granítica), muy erosionable y propenso a deslizamientos superficiales en pendientes fuertes."],
    Tsed: ["Rocas sedimentarias terciarias: capas rojas, conglomerados, areniscas y margas (formaciones Subinal, Petén y equivalentes)", "Alternancia de estratos de distinta resistencia; las capas arcillosas pueden expandirse y deslizar a lo largo de los planos de estratificación."],
    KTsed: ["Rocas sedimentarias del Cretácico-Terciario: lutitas, areniscas y flysch (Formación Sepur y equivalentes)", "Lutitas meteorizadas de baja resistencia, propensas a reptación y deslizamientos rotacionales en laderas húmedas."],
    Ksed: ["Carbonatos cretácicos: calizas y dolomías (formaciones Cobán, Campur, Ixcoy)", "Terreno kárstico: hay dolinas, cavidades y flujo subterráneo rápido, por lo que las descargas al subsuelo contaminan con facilidad los acuíferos. Las cimentaciones requieren explorar si hay cavidades."],
    JKsed: ["Rocas sedimentarias del Jurásico-Cretácico: capas rojas, conglomerados y areniscas (Formación Todos Santos)", "Rocas de resistencia media a baja que se fracturan y meteorizan; los taludes son inestables si se cortan a favor de la estratificación."],
    Psed: ["Rocas sedimentarias paleozoicas: lutitas, areniscas y calizas (grupos Santa Rosa y Chochal)", "Rocas antiguas muy deformadas y fracturadas; las lutitas meteorizadas son susceptibles a deslizamientos."],
    Pmeta: ["Rocas metamórficas paleozoicas: esquistos, gneises, filitas, mármoles y serpentinitas", "La foliación y la meteorización profunda producen planos de debilidad; en laderas empinadas son frecuentes los deslizamientos traslacionales, sobre todo en serpentinitas."],
    water: ["Cuerpo de agua", "—"], desc: ["Unidad sin descripción", "—"]
  };

  const ZV = {
    "bh-PMT": "Bosque húmedo Premontano Tropical", "bh-T": "Bosque húmedo Tropical", "bs-T": "Bosque seco Tropical", "bh-MBT": "Bosque húmedo Montano Bajo Tropical", "bs-PMT": "Bosque seco Premontano Tropical", "bmh-T": "Bosque muy húmedo Tropical", "bmh-PMT": "Bosque muy húmedo Premontano Tropical", "bp-MT": "Bosque pluvial Montano Tropical", "bmh-MT": "Bosque muy húmedo Montano Tropical", "bmh-MBT": "Bosque muy húmedo Montano Bajo Tropical", "bp-PMT": "Bosque pluvial Premontano Tropical", "bms-T": "Bosque muy seco Tropical", "bp-SAT": "Bosque pluvial Subandino Tropical"
  };
  const ZV_COL = { "bh-PMT": "#7fbf7b", "bh-T": "#1b7837", "bs-T": "#e6c35c", "bh-MBT": "#5aae61", "bs-PMT": "#f1d38b", "bmh-T": "#00441b", "bmh-PMT": "#2b8c4a", "bp-MT": "#3288bd", "bmh-MT": "#66c2a5", "bmh-MBT": "#4ea36a", "bp-PMT": "#5e9fd0", "bms-T": "#d8a24a", "bp-SAT": "#5e4fa2" };
  const GEO_COL = { Qvol: "#f4a3a8", Qsed: "#fff3b0", Tvol: "#e0607e", Tintru: "#d7301f", Tsed: "#fdd49e", KTsed: "#a6d96a", Ksed: "#74c3e1", JKsed: "#b2abd2", Psed: "#9e9ac8", Pmeta: "#8c6d31", water: "#9ecae1", desc: "#dddddd" };

  // ---------- Mapas de consulta (láminas georreferenciadas, solo visualización) ----------
  const SHEETS = {
    hipsometrico: { t: "Mapa hipsométrico", f: "Perfil Ambiental de Guatemala 2022 (URL-VRIP-IARNA, UIE)", m: "Rangos altitudinales (m s. n. m.) derivados de mapas topográficos del IGN 1:50 000 y 1:250 000." },
    erosion_potencial: { t: "Mapa de erosión potencial", f: "Perfil Ambiental de Guatemala 2022 (URL-IARNA, UIE)", m: "Pérdida potencial de suelo estimada con un modelo de tipo USLE/RUSLE (erosividad de la lluvia, erodabilidad del suelo, longitud y grado de pendiente) sin considerar la protección de la cobertura." },
    deslizamientos_01092023: { t: "Mapa de amenaza a deslizamientos 2023", f: "UIE-URL (2023)", m: "Lámina publicada del raster de amenaza a deslizamientos analizado en este capítulo." },
    cuencas_hidrograficas: { t: "Mapa de cuencas hidrográficas", f: "Perfil Ambiental de Guatemala 2022 (URL-IARNA)", m: "Vertientes, cuencas y subcuencas del país." },
    hidrografia: { t: "Mapa de hidrografía", f: "Perfil Ambiental de Guatemala 2022 (URL-IARNA)", m: "Red de ríos y cuerpos de agua (IGN), jerarquizada." },
    captacion_regulacion_hidrica: { t: "Mapa de captación y regulación hídrica", f: "Perfil Ambiental de Guatemala 2022 (URL-IARNA)", m: "Zonas que captan y regulan el agua, según la combinación de precipitación, suelos, pendiente y cobertura." },
    inundaciones_uie: { t: "Mapa de amenaza a inundaciones", f: "UIE-URL (2023)", m: "Lámina publicada del raster de amenaza a inundaciones analizado en este capítulo." },
    disponibilidad_hidrica_microcuenca: { t: "Mapa de disponibilidad hídrica por microcuenca", f: "Perfil Ambiental de Guatemala 2022 (URL-IARNA)", m: "Lámina publicada de la capa de disponibilidad hídrica por microcuenca." },
    precipitacion_anual_al_2020: { t: "Mapa de precipitación anual", f: "Perfil Ambiental de Guatemala 2022 (UIE)", m: "Isoyetas y superficie interpolada de precipitación media anual." },
    temperatura_promedio_anual_2020: { t: "Mapa de temperatura promedio anual", f: "Perfil Ambiental de Guatemala 2022 (UIE)", m: "Temperatura media anual interpolada con corrección altitudinal." },
    clima_thornthwaite_12x18_ws: { t: "Clasificación climática de Thornthwaite", f: "Plantilla QGIS de la carpeta (INSIVUMEH, sistema Thornthwaite)", m: "Clasificación climática por índice de humedad (relación precipitación–evapotranspiración) y eficiencia térmica." },
    fisiografico: { t: "Mapa fisiográfico", f: "Perfil Ambiental de Guatemala 2022 (URL-IARNA), basado en MAGA 2001", m: "Regiones y grandes paisajes fisiográficos según origen geológico y forma del relieve." },
    taxonomico: { t: "Mapa taxonómico de suelos", f: "Perfil Ambiental de Guatemala 2022, basado en MAGA (2000)", m: "Órdenes de suelo según el sistema USDA Soil Taxonomy (Andisoles, Entisoles, Inceptisoles, Alfisoles, Mollisoles, etc.)." },
    capacidad_de_uso_de_la_tierra: { t: "Mapa de capacidad de uso de la tierra", f: "Perfil Ambiental de Guatemala 2022 (metodología INAB)", m: "Lámina publicada del raster de capacidad de uso analizado en este capítulo." },
    intensidad_de_uso: { t: "Mapa de intensidad de uso", f: "Perfil Ambiental de Guatemala 2022 (URL-IARNA)", m: "Lámina publicada del raster de intensidad de uso analizado en este capítulo." },
    zonas_de_vida: { t: "Mapa de zonas de vida", f: "Perfil Ambiental de Guatemala 2022 (IARNA-URL)", m: "Zonas de vida de Holdridge." },
    dinamica_forestal2016_2020: { t: "Mapa de dinámica forestal 2016–2020", f: "Perfil Ambiental de Guatemala 2022 (INAB-CONAP-UVG-URL)", m: "Cambio de cobertura forestal (pérdida y ganancia) entre 2016 y 2020 a partir de imágenes satelitales." },
    densidad_poblacional: { t: "Mapa de densidad poblacional", f: "Perfil Ambiental de Guatemala 2022 (INE 2018)", m: "Habitantes por km² por municipio, según el Censo 2018." },
    comunidades_linguisticas: { t: "Mapa de comunidades lingüísticas", f: "Perfil Ambiental de Guatemala 2022 (ALMG)", m: "Territorios de las comunidades lingüísticas mayas, garífuna, xinka y castellana." },
    sitios_arqueologicos: { t: "Mapa de sitios arqueológicos", f: "Perfil Ambiental de Guatemala 2022 (IDAEH/MCD)", m: "Ubicación de sitios arqueológicos registrados." },
    migracion2018: { t: "Mapa de migración 2018", f: "UIE (2020), Censo 2018", m: "Lámina publicada de la capa de migración municipal." },
    pobreza_general_2018: { t: "Mapa de pobreza general", f: "Perfil Ambiental de Guatemala 2022 (INE/SEGEPLAN)", m: "Porcentaje de población en pobreza general por municipio." },
    orografico: { t: "Mapa orográfico", f: "UIE/IARNA (2020)", m: "Sierras, montañas y volcanes del país sobre un modelo de relieve sombreado." },
    volcanes_lava: { t: "Amenaza volcánica – flujos de lava", f: "MAGA-UPIE, Laboratorio SIG (2001), proyecto CATIE; escala 1:2 000 000", m: "Zonas alcanzables por flujos de lava según la distancia a los centros eruptivos y la topografía." },
    volcanes_lahares: { t: "Amenaza volcánica – lahares", f: "MAGA-UPIE (2001); escala 1:2 000 000", m: "Cauces y abanicos que pueden recibir flujos de lodo volcánico." },
    volcanes_piroclasticos: { t: "Amenaza volcánica – flujos piroclásticos", f: "MAGA-UPIE (2001); escala 1:2 000 000", m: "Zonas alcanzables por flujos y oleadas piroclásticas." },
    volcanes_tefra: { t: "Amenaza volcánica – caída de tefra", f: "MAGA-UPIE (2001); escala 1:2 000 000", m: "Zonas de caída de ceniza según los vientos dominantes y el volumen eruptivo." },
    zonas_sismicas: { t: "Zonas sísmicas", f: "MAGA-UPIE (2001), con base en AGIES/INSIVUMEH", m: "Zonificación sísmica del país por aceleración esperada." },
    division_politica_administrativa: { t: "División político-administrativa", f: "Perfil Ambiental de Guatemala 2022 (IGN/SEGEPLAN)", m: "Departamentos y municipios de Guatemala." },
    de_areas_protegidas_2023: { t: "Mapa de áreas protegidas 2023", f: "UIE (2023) con base en CONAP", m: "Áreas protegidas del SIGAP por categoría de manejo." },
    mapa_pot_municipio_gtm: { t: "Plan de Ordenamiento Territorial (POT) – Municipio de Guatemala", f: "Municipalidad de Guatemala, POT (Acuerdo COM-30-2008 y reformas)", m: "Zonas generales G0 a G5 del POT, que regulan intensidad de construcción y usos del suelo." }
  };

  // ---------- Capítulos B2 (Términos de referencia SAGA-MARN) ----------
  const CAP = [
    { n: 11, t: "Movimientos en masa", tdr: "Indicar si el proyecto requiere movimiento de tierras y si el terreno tiene pendientes mayores a 15 %. En ese caso, describir el corte, el relleno y la estabilización de taludes, el destino del material excedente y las medidas para prevenir deslizamientos, erosión y arrastre de sedimentos. Apoyarse en mapas de pendiente, susceptibilidad a deslizamientos y geología.", grids: ["desl"], vec: ["geologia"], sheets: ["hipsometrico", "erosion_potencial", "deslizamientos_01092023"] },
    { n: 59, t: "Manejo de aguas residuales", tdr: "Describir el tipo y caudal de las aguas residuales (ordinarias o especiales), el sistema de recolección y tratamiento, y el punto de descarga, con un mapa del cuerpo receptor. Indicar el cumplimiento del Acuerdo Gubernativo 236-2006 (Reglamento de las descargas y reúso de aguas residuales y de la disposición de lodos).", grids: [], vec: ["cuencas", "microcuencas"], sheets: ["cuencas_hidrograficas", "hidrografia"] },
    { n: 60, t: "Manejo de aguas pluviales", tdr: "Describir el sistema de captación, conducción y disposición de las aguas pluviales, separado del de aguas residuales; el área impermeabilizada; las medidas de infiltración o retención y el sitio de descarga.", grids: ["pp", "inun", "cab"], vec: [], sheets: ["captacion_regulacion_hidrica", "hidrografia", "inundaciones_uie"] },
    { n: 62, t: "Elementos abióticos", tdr: "Describir el clima (precipitación, temperatura, clasificación climática), el suelo (fisiografía, taxonomía, capacidad e intensidad de uso), el agua (cuenca, microcuenca, cuerpos de agua cercanos y disponibilidad hídrica) y el aire (fuentes de emisión, ruido y vibraciones) del área del proyecto y de su área de influencia.", grids: ["pp", "tmed", "prov", "cap", "intuso"], vec: ["cuencas", "microcuencas", "dh_muni"], sheets: ["precipitacion_anual_al_2020", "temperatura_promedio_anual_2020", "clima_thornthwaite_12x18_ws", "fisiografico", "taxonomico", "capacidad_de_uso_de_la_tierra", "intensidad_de_uso", "hidrografia", "disponibilidad_hidrica_microcuenca"] },
    { n: 63, t: "Elementos bióticos", tdr: "Describir la zona de vida, la cobertura vegetal y forestal, la flora y la fauna del área del proyecto y de su área de influencia; indicar si hay especies amenazadas (Listado de Especies Amenazadas de CONAP y CITES) y la ubicación respecto a áreas protegidas y ecosistemas frágiles.", grids: ["din", "prov"], vec: ["zonas_vida", "sigap"], sheets: ["zonas_de_vida", "dinamica_forestal2016_2020", "de_areas_protegidas_2023"] },
    { n: 64, t: "Elementos socioeconómicos y culturales", tdr: "Describir la población del área de influencia (número, densidad, pueblos y comunidades lingüísticas, migración y pobreza), los servicios básicos, los sitios de valor histórico, arqueológico o cultural y la percepción de la población sobre el proyecto.", grids: ["pop"], vec: ["municipios", "migracion"], sheets: ["densidad_poblacional", "comunidades_linguisticas", "sitios_arqueologicos", "migracion2018", "pobreza_general_2018"] },
    { n: 65, t: "Elementos estéticos", tdr: "Describir el paisaje del área (relieve, vistas, elementos naturales y culturales de valor escénico) y cómo el proyecto lo modifica, con las medidas de integración paisajística.", grids: [], vec: ["volcanes", "sitios_turisticos"], sheets: ["orografico", "fisiografico"] },
    { n: 66, t: "Amenazas naturales", tdr: "Identificar y describir las amenazas naturales a las que está expuesto el proyecto: sísmica (sismicidad histórica, recurrencia, fallas), volcánica, inundaciones, deslizamientos, erosión, sequía, heladas y huracanes; y las medidas de reducción de riesgo.", grids: ["desl", "inun", "helad", "amen", "riesgo"], vec: ["agies", "fallas", "volcanes"], sheets: ["zonas_sismicas", "volcanes_lava", "volcanes_lahares", "volcanes_piroclasticos", "volcanes_tefra", "erosion_potencial"] },
    { n: 71, t: "Plan de monitoreo ambiental", tdr: "Presentar un mapa del AP, AID y AII con los puntos de monitoreo (agua, aire, ruido, suelo) y sus coordenadas WGS84, la frecuencia, los parámetros y los responsables.", grids: [], vec: [], sheets: [] },
    { n: 75, t: "Ubicación del proyecto", tdr: "Indicar la dirección, el municipio y el departamento, y las coordenadas WGS84 del proyecto. Señalar si el proyecto está en un área ambientalmente frágil (áreas protegidas, zonas de recarga, riberas, zonas de amenaza) y su compatibilidad con los planes de ordenamiento territorial vigentes.", grids: [], vec: ["municipios", "sigap"], sheets: ["division_politica_administrativa", "mapa_pot_municipio_gtm"] },
    { n: 76, t: "Área del proyecto (AP)", tdr: "Delimitar el área del proyecto: área en m² y ha, polígono con cuadrícula de coordenadas y tabla de vértices; adjuntar el polígono en KML/KMZ.", grids: [], vec: [], sheets: [] },
    { n: 77, t: "Área de influencia (AID y AII)", tdr: "Delimitar el área de influencia directa e indirecta explicando el criterio (alcance de los impactos), con sus áreas; identificar áreas protegidas y elementos sensibles dentro de ellas y la distancia a las más cercanas; adjuntar KML/KMZ.", grids: [], vec: ["sigap"], sheets: ["de_areas_protegidas_2023"] },
  ];

  return { GRIDS, INTUSO, VEC, SISMOS, PUEBLOS, GEO, ZV, ZV_COL, GEO_COL, SHEETS, CAP };
})();
