import fs from 'node:fs';
import {createTursoDatabase} from '../lib/turso-db.mjs';
const DB=createTursoDatabase();
try{
 const files=fs.readdirSync('migrations').filter(filename=>filename.endsWith('.sql')).sort();
 const statements=files.flatMap(filename=>fs.readFileSync('migrations/'+filename,'utf8').split(';').map(sql=>sql.trim()).filter(Boolean));
 await DB.batch(statements.map(sql=>DB.prepare(sql).bind()));
 const tables=await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").bind().all();
 console.log(JSON.stringify({migrations:files.length,tables:tables.results.map(row=>row.name)}));
}finally{DB.close();}
