"""Package executable source and original media, excluding runtime and Git data."""
import sys,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]).resolve()
if output==root or root in output.parents:raise SystemExit('Choose an archive destination outside the source directory.')
output.parent.mkdir(parents=True,exist_ok=True)
excluded={'.git','node_modules','runtime','dist','.sites-runtime','.sites-checkout'}
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=4,strict_timestamps=False) as z:
    for p in sorted(root.rglob('*')):
        rel=p.relative_to(root)
        if not p.is_file() or any(part in excluded for part in rel.parts):continue
        if p.name.startswith('.env') or p.suffix in ('.sqlite','.db'):continue
        z.write(p,Path('glorymagic-replica')/rel)
with zipfile.ZipFile(output) as z:
    assert z.testzip() is None
    assert 'glorymagic-replica/package.json' in z.namelist()
    print({'archive':str(output),'bytes':output.stat().st_size,'files':len(z.infolist())})
