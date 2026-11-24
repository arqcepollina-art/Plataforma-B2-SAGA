import pyogrio, geopandas as gpd, pandas as pd, json, os, glob, warnings
warnings.filterwarnings("ignore")
B = "/mnt/user-data/uploads/MAPAS B2 SAGA/"
OUT = "/home/claude/plataforma-b2/data/v/"; os.makedirs(OUT, exist_ok=True)
GTM = "+proj=tmerc +lat_0=0 +lon_0=-90.5 +k=0.9998 +x_0=500000 +y_0=0 +datum=WGS84 +units=m +no_defs"

def fix(s):
    if isinstance(s, str) and ("Ã" in s or "Â" in s):
        try: return s.encode("latin1").decode("utf8")
        except Exception: return s
    return s

def save(name, g, cols, tol=None, ren=None):
    g = g[cols + ["geometry"]].copy()
    if ren: g = g.rename(columns=ren)
    for c in g.columns:
        if c != "geometry": g[c] = g[c].map(fix)
    if tol:
        g = g.to_crs("EPSG:3857"); g["geometry"] = g.geometry.simplify(tol, preserve_topology=True);
    g = g.to_crs("EPSG:4326")
    g = g[~g.geometry.is_empty & g.geometry.notna()]
    g.to_file(OUT + name + ".geojson", driver="GeoJSON", COORDINATE_PRECISION=5)
    print(name, len(g), round(os.path.getsize(OUT + name + ".geojson") / 1e6, 2), "MB")

def rd(p, crs=None):
    g = gpd.read_file(glob.glob(B + p, recursive=True)[0])
    if g.crs is None: g = g.set_crs(crs or GTM)
    return g

save("cuencas", rd("**/cuencas_subcuencas_iarna_gtm.shp"), ["VERTIENTE", "CUENCA", "SUBCUENCA", "HECTARES"], 150)
m = rd("**/dh-microcuencas_iarna_gtm.shp")
save("microcuencas", m, ["Nombre", "VERTIENTE", "CCA_IARNA", "SCCA_IARNA", "AREA_HA", "Disp_act", "Dis_act_ha", "Disp_2050", "Dis_2050_h", "Dif_DH_por"], 60)
d = rd("**/Disponibilidad Hídrica muni actual.shp")
d = d.dissolve(by="CODIGO", aggfunc="first").reset_index()
save("dh_muni", d, ["CODIGO", "MUNICIPIO", "DEPARTAMEN", "DH_mun", "RH_pc2018", "Pob2018"], 150)
mg = rd("**/Migracion_muni-2018.shp")
c = list(mg.columns); mg = mg.rename(columns={c[16]: "Poblacion", c[19]: "Migrantes"})
save("migracion", mg, ["CODIGO", "MUNICIPIO", "DEPARTAMEN", "Poblacion", "Migrantes", "clase"], 150)
save("sitios_turisticos", rd("**/sitios_turisticos_iarna_2012.shp"), ["NOMBRE", "CAT", "TIPO", "DEPARTAMEN"])
save("volcanes", rd("**/Volcanes/Volcanes.shp"), ["Nombre", "Altitud"])
save("municipios", rd("**/municipios_GTM.shp"), ["Codigo", "Municipio", "Departamen", "AreaKm2"], 80)
zv = gpd.read_file("/home/claude/src/zv/zv.shp")
if zv.crs is None: zv = zv.set_crs(GTM)
save("zonas_vida", zv, ["NOM_ZV_ABR", "PISO_ALT", "PROV_HUM"], 80)
save("geologia", rd("**/Mapa_Geol%C3%B3gico_de_Guatemala_WFL1.geojson"), ["KEY_"], 80)
ag = rd("**/agies_sismica.geojson")
save("agies", ag, ["municipio", "departamen", "io", "amenaza"], 150)
sg = rd("**/SIGAP_05_2022_INAB.geojson")
sg = sg[sg.geometry.notna()]
save("sigap", sg, ["area_macro", "area_especifica", "codigo_macro", "area_prot"], 40)
fa = rd("**/Fallas_activas_GEM_Guatemala.geojson"); print(list(fa.columns))
save("fallas", fa, [c for c in ["name", "slip_type", "average_dip", "net_slip_rate", "catalog_name"] if c in fa.columns], 100)
s = pd.read_csv(glob.glob(B + "**/Sismos_USGS_Guatemala_M4_1900-2026.csv", recursive=True)[0])
s = s[["time", "latitude", "longitude", "depth", "mag", "place"]].copy()
s["time"] = s.time.str[:10]
json.dump({"cols": list(s.columns), "rows": s.round(4).values.tolist()}, open(OUT + "sismos.json", "w"), ensure_ascii=False)
print("sismos", len(s))
x = pd.read_excel(glob.glob(B + "**/ine_pueblos_A5.xlsx", recursive=True)[0], header=None)
rows = []
for _, r in x.iloc[9:].iterrows():
    if pd.notna(r[1]) and pd.notna(r[2]):
        rows.append({"depto": str(r[1]).strip(), "total": r[2], "Maya": r[3], "Garífuna": r[4], "Xinka": r[5], "Afrodescendiente": r[6], "Ladina": r[7], "Extranjera": r[8]})
json.dump(rows, open(OUT + "pueblos.json", "w"), ensure_ascii=False, default=float)
print("pueblos", len(rows))
