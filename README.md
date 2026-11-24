# Plataforma B2 SAGA: análisis cartográfico ambiental

Página web estática, lista para GitHub Pages, que desarrolla los capítulos con mapas de los términos de referencia del instrumento ambiental **Categoría B2 del SAGA (MARN, Guatemala)**. Usa las capas de la carpeta **MAPAS B2 SAGA**.

## Flujo
1. **Datos del proyecto.** Se ingresan identificación, dimensiones, terreno, agua, aire, ruido y colindancias.
2. **Polígono.** El polígono del área del proyecto (AP) se carga de cuatro formas:
   - archivo KML o KMZ;
   - archivo GeoJSON;
   - coordenadas GTM o WGS84 pegadas como texto;
   - dibujo directo sobre el mapa.

   A partir del AP se generan el AID y el AII como franjas (buffer) de una distancia configurable.
3. **Análisis por capítulo.** Cubre los capítulos 11, 59, 60, 62, 63, 64, 65, 66, 71, 75, 76 y 77. Para cada uno:
   - se calcula, con cada capa, el porcentaje del AP, del AID y del AII en cada clase;
   - se redacta el texto según los TdR;
   - se describe la metodología con que se elaboró cada mapa y cómo se aplicó al proyecto.
4. **Informe Word (.docx).** Incluye requerimientos, análisis, cuadros, mapas con el AP, AID y AII superpuestos, metodología y fuentes. También se puede descargar un KML con el AP, el AID y el AII.

## Estructura
| Carpeta | Contenido |
|---|---|
| `index.html`, `js/` | Interfaz (`app.js`), motor geoespacial (`geo.js`), mapas en canvas (`render.js`), análisis (`analisis.js`), Word (`report.js`) y base de conocimiento de capas, metodologías y TdR (`kb.js`) |
| `data/g/` | 13 capas raster reproyectadas a EPSG:3857 con malla de 100 m, en teselas PNG de 512 px. El valor de cada celda es R·256 + G; la banda B = 1 marca un dato válido |
| `data/v/` | Capas vectoriales en GeoJSON simplificado: cuencas, microcuencas, disponibilidad hídrica, migración, municipios, zonas de vida, geología, AGIES, SIGAP, fallas, volcanes y sitios turísticos. Además, `sismos.json` (sismos USGS M≥4) y `pueblos.json` (INE 2018) |
| `data/m/` | Láminas georreferenciadas (JPG en EPSG:3857) con `maps.json` |
| `lib/` | Leaflet, proj4, Turf, JSZip y docx (copias locales, sin dependencia de CDN) |
| `tools/` | Scripts de Python que generan `data/` a partir de la carpeta MAPAS B2 SAGA |

## Publicar en GitHub Pages
1. Cree un repositorio, por ejemplo `Plataforma-B2-SAGA`, y suba todo el contenido de esta carpeta a la rama `main`.
2. Abra *Settings → Pages → Build and deployment*, elija *Deploy from a branch*, rama `main` y carpeta `/ (root)`.
3. La página quedará en `https://<usuario>.github.io/Plataforma-B2-SAGA/`.

## Para probarla localmente
```
cd plataforma-b2
python3 -m http.server 8000
```
Luego abra http://localhost:8000. Abrir `index.html` con doble clic no funciona, porque el navegador bloquea la lectura de las teselas desde `file://`.

## Limitaciones
- La carpeta no tiene un modelo de elevación de detalle. La pendiente se ingresa en el formulario.
- La resolución de análisis es de 100 m. En proyectos menores de 1 ha se lee la celda que contiene el centro del AP.
- Las láminas de imagen (Perfil Ambiental 2022, MAGA 2001, POT) solo sirven de consulta visual. La clase en el punto del proyecto se lee en la leyenda de cada lámina.
- La ortofoto de fondo (Esri World Imagery) y OpenStreetMap requieren conexión a internet.
- El resultado es un insumo técnico. El consultor ambiental responsable debe verificarlo y completarlo en campo.
