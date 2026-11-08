import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp,passwordHash} from '../worker/app.js';
import {openDatabase,loadData} from '../server.mjs';

test('independent administrator sessions work through JSON and native forms; logout affects only one device',async()=>{
 const DB=openDatabase(':memory:');
 try{
  const salt='65'.repeat(32),origin='https://replica.test';
  const env={DB,MODE:'vercel',ADMIN_USERNAME:'admin1004',ADMIN_PASSWORD_SALT:salt,ADMIN_PASSWORD_HASH:await passwordHash('TestPass9',salt)};
  const data=loadData();let app=createApp(data);
  const request=(path,options={})=>app.fetch(new Request(origin+path,options),env);
  const first=await request('/api/login',{method:'POST',headers:{origin,'content-type':'application/json','user-agent':'Computer A'},body:JSON.stringify({username:'admin1004',password:'TestPass9'})});
  assert.equal(first.status,200);
  const cookieA=first.headers.get('set-cookie').split(';')[0];
  const native=(password='TestPass9',source=origin)=>request('/bbs/login_check.php',{method:'POST',headers:{origin:source,'content-type':'application/x-www-form-urlencoded','user-agent':'Computer B'},body:new URLSearchParams({mb_id:'admin1004',mb_password:password,url:'https://external.test/'})});
  const second=await native();assert.equal(second.status,303);assert.equal(second.headers.get('location'),'/admin/boards');
  assert.match(second.headers.get('set-cookie'),/HttpOnly; Path=\/; SameSite=Lax; Max-Age=86400; Secure/);
  const cookieB=second.headers.get('set-cookie').split(';')[0];assert.notEqual(cookieA,cookieB);
  app=createApp(data);
  for(const cookie of [cookieA,cookieB]){
   const me=await request('/api/me',{headers:{cookie}});assert.equal((await me.json()).user.role,'admin');
   assert.equal((await request('/api/admin/users',{headers:{cookie}})).status,200);
  }
  const rejected=await native('incorrect');assert.equal(rejected.status,401);assert.equal(rejected.headers.get('set-cookie'),null);
  const crossSite=await native('TestPass9','https://external.test');assert.equal(crossSite.status,403);assert.equal(crossSite.headers.get('set-cookie'),null);
  await request('/api/logout',{method:'POST',headers:{origin,cookie:cookieA,'content-type':'application/json'},body:'{}'});
  assert.equal((await (await request('/api/me',{headers:{cookie:cookieA}})).json()).user,null);
  assert.equal((await (await request('/api/me',{headers:{cookie:cookieB}})).json()).user.username,'admin1004');
  assert.match(await (await request('/admin/login')).text(),/<form id="admin-login" action="\/bbs\/login_check.php" method="post">/);
 }finally{DB.close();}
});
