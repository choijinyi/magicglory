import sys,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
files=['.gitignore','.openai/hosting.json','README.md','package.json','worker/app.js','public/board-admin.js','public/replica.css','server.mjs','scripts/build.mjs','scripts/validate-artifact.mjs','scripts/configure-admin.mjs','scripts/set-admin.ps1','scripts/package-admin-update.py','tests/backend.test.mjs','migrations/0002_board_management.sql','drizzle/0000_core.sql','drizzle/0001_board_management.sql','drizzle/meta/_journal.json','docs/ADMIN-UPDATE.md']
output=Path(sys.argv[1]).resolve();output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,strict_timestamps=False) as archive:
    for name in files:archive.write(root/name,name)
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    print({'file':str(output),'bytes':output.stat().st_size,'files':len(archive.infolist())})
