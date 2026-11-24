"""Reproyecta las capas raster de MAPAS B2 SAGA a una malla común EPSG:3857 (100 m)
y las guarda como teselas PNG codificadas: valor = R*256+G, B=1 válido / 0 sin dato."""
import rasterio, numpy as np, os, json, sys
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_origin
from PIL import Image

B = "/mnt/user-data/uploads/MAPAS B2 SAGA/"
OUT = "/home/claude/plataforma-b2/data/g/"
X0, Y0, RES, W, H, T = -10280000, 2030000, 100, 4800, 5100, 512
DST = from_origin(X0, Y0, RES, RES)
GTM = "+proj=tmerc +lat_0=0 +lon_0=-90.5 +k=0.9998 +x_0=500000 +y_0=0 +datum=WGS84 +units=m +no_defs"
Z = "/vsizip/" + B

L = {
 "desl":  (Z+"Mapas 66. Amenazas naturales/Deslizamientos_2.zip/Deslizamien_gt.tif", "mode", 1, None),
 "inun":  (B+"Mapas 60. Manejo de aguas pluviales/Inundaciones/Inundacionesfinal.tif", "mode", 1, None),
 "helad": (Z+"Mapas 66. Amenazas naturales/Heladas-2024_abril.zip/Heladas 2024/Heladas_gt.tif", "mode", 1, None),
 "amen":  (Z+"Mapas 66. Amenazas naturales/Amenazas_gt_2024_cat.zip/Amenazas_gt_2024_cat.tif", "mode", 1, None),
 "riesgo":(Z+"Mapas 66. Amenazas naturales/RIESGO_2.zip/RIESGO_2/riesgo_gtm.tif", "mode", 1, None),
 "prov":  (None, "mode", 1, "provhm"),
 "pp":    (None, "average", 1, "pp"),
 "tmed":  (B+"Mapas 62. Elementos abióticos/Clima/Temperatura media 2020_2/Tmedia.tif", "bilinear", 10, None),
 "cap":   (None, "mode", 1, "cap"),
 "intuso":(None, "mode", 1, "intuso"),
 "din":   (B+"Mapas 63. Elementos bióticos/Cobertura forestal 1991_2016_2/din1991_2016.tif", "mode", 1, None),
 "pop":   (B+"Mapas 64. Elementos socioeconómicos y culturales/gtm_ppp_2020_constrained.tif", "sum", 10, None),
 "cab":   (B+"Mapas 60. Manejo de aguas pluviales/Cabeceras de cuenca_2/Cabecera_cuenca.tif", "mode", 1, None),
}

def find(key):
    import glob
    pats = {"provhm": "**/provhm01-18/hdr.adf", "pp": "**/pp_2001-18/hdr.adf",
            "cap": "**/cap_inab25v3k/hdr.adf", "intuso": "**/intuso_iarnaf/hdr.adf"}
    r = glob.glob(B + pats[key], recursive=True)
    return os.path.dirname(r[0])

def run(name):
    src, rs, scale, k = L[name]
    if k: src = find(k)
    with rasterio.open(src) as d:
        crs = d.crs if d.crs else GTM
        nod = d.nodata
        dst = np.full((H, W), np.nan, dtype="float32")
        reproject(rasterio.band(d, 1), dst, src_crs=crs, src_nodata=nod, dst_transform=DST,
                  dst_crs="EPSG:3857", dst_nodata=np.nan, resampling=getattr(Resampling, rs),
                  num_threads=4)
    valid = np.isfinite(dst)
    if name == "pop":
        valid &= dst >= 0
    if name == "cab": valid &= dst != 3
    if name == "din": valid &= dst != 15
    if name == "prov": valid &= dst != 255
    if name == "pp": valid &= dst > 0
    if name == "tmed": valid &= dst > -50
    v = np.where(valid, np.clip(np.round(dst * scale), 0, 65534), 0).astype("uint16")
    os.makedirs(OUT + name, exist_ok=True)
    tiles = []
    for ty in range((H + T - 1) // T):
        for tx in range((W + T - 1) // T):
            sl = (slice(ty*T, min(H, (ty+1)*T)), slice(tx*T, min(W, (tx+1)*T)))
            vv, ok = v[sl], valid[sl]
            if not ok.any(): continue
            img = np.zeros((T, T, 3), "uint8")
            h, w = vv.shape
            img[:h, :w, 0] = vv >> 8; img[:h, :w, 1] = vv & 255; img[:h, :w, 2] = ok
            Image.fromarray(img).save(f"{OUT}{name}/{tx}_{ty}.png", optimize=True)
            tiles.append(f"{tx}_{ty}")
    u = np.unique(v[valid])
    info = {"tiles": tiles, "scale": scale, "n": int(valid.sum()),
            "min": float(v[valid].min()) / scale, "max": float(v[valid].max()) / scale,
            "values": u[:60].tolist() if len(u) < 60 else None}
    json.dump(info, open(OUT + name + "/info.json", "w"))
    print(name, len(tiles), info["min"], info["max"], info["values"], flush=True)

if __name__ == "__main__":
    for n in (sys.argv[1:] or L): run(n)
