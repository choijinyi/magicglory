import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {openDatabase} from '../server.mjs';
import {passwordHash} from '../worker/app.js';

export async function configureAdmin(DB,{username,password}){
 if(typeof username!=='string'||!/^[A-Za-z0-9_]{3,32}$/.test(username))throw Error('A valid administrator username is required.');
 if(typeof password!=='string'||password.length<1||password.length>128)throw Error('An administrator password is required.');
 const salt=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
 const hash=await passwordHash(password,salt);
 const existing=await DB.prepare('SELECT id FROM users WHERE username=?').bind(username).first();
 const id=existing?.id||crypto.randomUUID();
 await DB.batch([
  DB.prepare("INSERT INTO users(id,username,email,name,password_hash,salt,role,created_at) VALUES(?,?,'','관리자',?,?,'admin',?) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash,salt=excluded.salt,role='admin'").bind(id,username,hash,salt,new Date().toISOString()),
  DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(id),
 ]);
 return {username,role:'admin',configured:true};
}
async function input(){
 return new Promise((resolve,reject)=>{let data='';const tty=process.stdin.isTTY;
  const done=()=>{process.stdin.removeAllListeners('data');process.stdin.removeAllListeners('end');if(tty)process.stdin.setRawMode(false);process.stdin.pause();try{resolve(JSON.parse(data.trim()));}catch{reject(Error('Supply one JSON object on stdin.'));}};
  if(tty){process.stdin.setRawMode(true);process.stderr.write('Ready for administrator JSON on stdin (input is hidden).\n');}
  process.stdin.setEncoding('utf8');process.stdin.on('data',part=>{data+=part;if(data.length>8192){reject(Error('Input too large.'));process.stdin.pause();return;}if(data.includes('\n')||data.includes('\r'))done();});process.stdin.on('end',done);process.stdin.resume();
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const data=await input();
 if(process.argv.includes('--hash-only')){const salt=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');console.log(JSON.stringify({username:data.username,salt,hash:await passwordHash(data.password,salt)}));}
 else{const root=path.dirname(fileURLToPath(new URL('../server.mjs',import.meta.url)));fs.mkdirSync(path.join(root,'runtime'),{recursive:true});const DB=openDatabase(path.join(root,'runtime/glorymagic.sqlite'));try{console.log(JSON.stringify(await configureAdmin(DB,data)));}finally{DB.close();}}
}
