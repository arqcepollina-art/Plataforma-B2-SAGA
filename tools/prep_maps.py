import rasterio, numpy as np, glob, json, os, re
from rasterio.warp import calculate_default_transform, reproject, Resampling
from PIL import Image
B="/mnt/user-data/uploads/MAPAS B2 SAGA/"; OUT="/home/claude/plataforma-b2/data/m/"
files=sorted(set(os.path.basename(f) for f in glob.glob(B+"**/*_modified.tif",recursive=True)))
files=[f for f in files if 'THORNTHWAITE_12X18_WS_modified_modified' not in f]+['MAPA_POT_MUNICIPIO_GTM.tif']
meta={}
for fn in files:
    src=glob.glob(B+"**/"+glob.escape(fn),recursive=True)[0]
    key=re.sub(r'(-1)?-scaled|_modified|\.tif|^\d+-?|Mapa[_-]?','',fn).strip('_- ').lower().replace(' ','_').replace('-','_')
    with rasterio.open(src) as d:
        f=0.5 if 'POT' in fn else 1.0
        t,w,h=calculate_default_transform(d.crs,'EPSG:3857',d.width,d.height,*d.bounds)
        w,h=int(w*f),int(h*f); t=t*t.scale(1/f,1/f)
        out=np.full((3,h,w),255,'uint8')
        for b in range(3):
            reproject(rasterio.band(d,b+1),out[b],src_crs=d.crs,dst_transform=t,dst_crs='EPSG:3857',resampling=Resampling.bilinear,dst_nodata=255)
    Image.fromarray(out.transpose(1,2,0)).save(OUT+key+'.jpg',quality=80,optimize=True)
    meta[key]={"file":"m/"+key+".jpg","bounds":[t.c,t.f+t.e*h,t.c+t.a*w,t.f],"w":w,"h":h,"src":fn}
    print(key,w,h,round(os.path.getsize(OUT+key+'.jpg')/1e6,2))
json.dump(meta,open(OUT+'maps.json','w'),indent=1,ensure_ascii=False)
