"""Prepare a compact CLI upload; keep the captured source images unchanged."""
from pathlib import Path
import io
import json
import shutil
import subprocess
import tempfile
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
destination = Path(tempfile.mkdtemp(prefix="magicglory-vercel-", dir=r"C:\Users\chlwl\AppData\Local\Temp"))
paths = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=root).decode("utf-8").split("\0")
before = after = optimized = count = 0
for name in sorted(set(filter(None, paths))):
    source = root / name
    if not source.is_file():
        continue
    target = destination / name
    target.parent.mkdir(parents=True, exist_ok=True)
    original = source.read_bytes()
    result = original
    if name.startswith("public/") and source.suffix.lower() in (".jpg", ".jpeg") and len(original) > 120_000:
        with Image.open(io.BytesIO(original)) as image:
            image = ImageOps.exif_transpose(image).convert("RGB")
            image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            image.save(buffer, "JPEG", quality=82, optimize=True, progressive=True)
            if buffer.tell() < len(original):
                result = buffer.getvalue()
                optimized += 1
    elif name.startswith("public/") and source.suffix.lower() == ".png" and len(original) > 200_000:
        with Image.open(io.BytesIO(original)) as image:
            image = ImageOps.exif_transpose(image)
            image.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            image.save(buffer, "PNG", optimize=True)
            if buffer.tell() < len(original):
                result = buffer.getvalue()
                optimized += 1
    target.write_bytes(result)
    count += 1
    before += len(original)
    after += len(result)
project = destination / ".vercel" / "project.json"
project.parent.mkdir(exist_ok=True)
shutil.copyfile(root / ".vercel" / "project.json", project)
if after > 95_000_000:
    raise RuntimeError(f"Upload remains too large: {after} bytes; use the Git deployment instead.")
result = {"directory": str(destination), "files": count, "sourceBytes": before, "uploadBytes": after, "optimizedImages": optimized}
(root / "runtime" / "vercel-upload.json").write_text(json.dumps(result), encoding="utf-8")
print(json.dumps(result))
