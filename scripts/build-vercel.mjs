import fs from 'node:fs';
import path from 'node:path';
const output=path.resolve('vercel-public');
fs.mkdirSync(output,{recursive:true});
fs.cpSync('public',output,{recursive:true});
let files=0,bytes=0;
function count(directory){for(const item of fs.readdirSync(directory,{withFileTypes:true})){const filename=path.join(directory,item.name);if(item.isDirectory())count(filename);else{files++;bytes+=fs.statSync(filename).size;}}}
count(output);
console.log(JSON.stringify({staticFiles:files,staticBytes:bytes,outputDirectory:'vercel-public'}));
