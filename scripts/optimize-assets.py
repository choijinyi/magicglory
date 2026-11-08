"""Create a hosted asset variant; keep all original image bytes in public/."""
import base64,json
from io import BytesIO
from pathlib import Path
from PIL import Image
result={}
for path in Path('public').rglob('*'):
    if not path.is_file() or path.suffix.lower() not in ('.jpg','.jpeg','.png'):continue
    original=path.read_bytes()
    if len(original)<25000:continue
    try:
        im=Image.open(BytesIO(original))
        im.thumbnail((1600,2000),Image.Resampling.LANCZOS)
        out=BytesIO();im.save(out,'WEBP',quality=86,method=6)
        if len(out.getvalue())<len(original)*0.85:
            result['/'+path.relative_to('public').as_posix()]={'base64':base64.b64encode(out.getvalue()).decode(),'mime':'image/webp'}
    except (OSError,ValueError):pass
Path('data/optimized-assets.json').write_text(json.dumps(result),encoding='utf8')
print(json.dumps({'optimized':len(result),'bytes':sum(len(v['base64'])*3//4 for v in result.values())}))
