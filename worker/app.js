import {prepareMediaMarkup} from './media.js';
const enc=new TextEncoder();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const unhex=s=>Uint8Array.from(s.match(/../g)||[],x=>parseInt(x,16));
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const now=()=>new Date().toISOString();
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
export async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations:100000,hash:'SHA-256'},key,256));}
const safeEqual=(a,b)=>{if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;};
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(s,m)=>{throw new HttpError(s,m)};
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const html=s=>new Response(prepareMediaMarkup(s.includes('src="/board-admin.js"')?s:s.replace('</body>','<script src="/board-admin.js" defer></script></body>')),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
const publicUser=u=>u?{id:u.id,username:u.username,email:u.email,name:u.name,role:u.role}:null;
const get=async(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const run=async(db,sql,...args)=>db.prepare(sql).bind(...args).run();
async function configuredAdmin(env){
 if(!env.ADMIN_USERNAME||!env.ADMIN_PASSWORD_HASH||!env.ADMIN_PASSWORD_SALT)return false;
 const existing=await get(env.DB,'SELECT id FROM users WHERE username=?',env.ADMIN_USERNAME);
 if(!existing)await run(env.DB,"INSERT OR IGNORE INTO users(id,username,email,name,password_hash,salt,role,created_at) VALUES(?,?,?,?,?,?,'admin',?)",crypto.randomUUID(),env.ADMIN_USERNAME,'','관리자',env.ADMIN_PASSWORD_HASH,env.ADMIN_PASSWORD_SALT,now());
 return true;
}
const field=(obj,key,min=1,max=1000)=>{const v=typeof obj[key]==='string'?obj[key].trim():'';if(v.length<min||v.length>max)fail(400,`${key}: ${min}~${max}자로 입력해 주세요.`);return v;};
const boardId=v=>{if(!/^[\w-]{1,32}$/.test(v||''))fail(400,'게시판을 확인해 주세요.');return v;};
const writeBoards=new Set(['4_3','event','chulsuk']);
async function body(req){if(!req.headers.get('content-type')?.includes('application/json'))fail(415,'JSON 요청이 필요합니다.');const raw=await req.text();if(enc.encode(raw).byteLength>131072)fail(413,'입력 내용이 너무 큽니다.');try{const d=JSON.parse(raw);if(!d||Array.isArray(d)||typeof d!=='object')fail(400,'올바른 입력이 필요합니다.');return d;}catch(e){if(e.status)throw e;fail(400,'JSON 형식이 올바르지 않습니다.');}}
async function user(req,env){
 const token=req.headers.get('cookie')?.match(/(?:^|;\s*)gm_session=([a-f0-9]{64})(?:;|$)/)?.[1];
 if(token){const member=await get(env.DB,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?',await sha(token),Date.now());if(member&&(env.MODE!=='hosted'||(member.role==='admin'&&member.username===env.ADMIN_USERNAME)))return member;}
 if(env.MODE==='hosted'){
  const id=req.headers.get('oai-authenticated-user-id');if(!id)return null;
  let u=await get(env.DB,'SELECT * FROM users WHERE id=?',id);
  if(!u){const email=req.headers.get('oai-authenticated-user-email')||'';let name=req.headers.get('oai-authenticated-user-full-name')||email||'회원';try{if(req.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8')name=decodeURIComponent(name);}catch{}
   await run(env.DB,'INSERT OR IGNORE INTO users(id,email,name,role,created_at) VALUES(?,?,?,?,?)',id,email,name,env.ADMIN_USER_ID===id?'admin':'member',now());u=await get(env.DB,'SELECT * FROM users WHERE id=?',id);
  }return u;
 }
 return null;
}
async function rate(req,env,action,limit=12){const ip=req.headers.get('cf-connecting-ip')||'local';const key=await sha(action+':'+ip);const t=Date.now();await run(env.DB,'INSERT INTO rate_limits(key,hits,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN reset_at<? THEN 1 ELSE hits+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END',key,t+60000,t,t);const r=await get(env.DB,'SELECT hits FROM rate_limits WHERE key=?',key);if(r.hits>limit)fail(429,'잠시 후 다시 시도해 주세요.');}
function pageKey(u){const q=new URLSearchParams();if(u.pathname==='/bbs/board.php'){for(const k of ['bo_table','wr_id','page'])if(u.searchParams.has(k)&&!(k==='page'&&u.searchParams.get(k)==='1'))q.set(k,u.searchParams.get(k));}else if(u.pathname==='/bbs/page.php')q.set('hid',u.searchParams.get('hid')||'intro');q.sort();return u.pathname==='/'||u.pathname==='/index.php'?'/':u.pathname+(q.size?'?'+q:'');}
export function createApp(data){
 const {pages,assets,imported}=data;
 const posts=imported.map(p=>({...p,id:'original-'+p.board+'-'+p.original_id,body:p.text||p.title,author_name:'최고관리자',created_at:p.date||'',origin:'original'}));
 const originalById=new Map(posts.map(p=>[p.id,p]));
 const boards=new Map();
 for(const [key,value]of Object.entries(pages)){const url=new URL(key,'http://local.test');const id=url.searchParams.get('bo_table');if(url.pathname!=='/bbs/board.php'||!id||url.searchParams.has('wr_id')||boards.has(id))continue;const title=(value.match(/<title>(.*?)<\/title>/)?.[1]||id).replace(/\s+\d+\s+페이지[\s\S]*/,'').replaceAll('&amp;','&').replaceAll('&gt;','>').trim();boards.set(id,{id,name:title});}
 for(const [id,name]of [['event','이벤트'],['chulsuk','출석부']])if(!boards.has(id))boards.set(id,{id,name});
 for(const board of boards.values()){if(!posts.some(p=>p.board===board.id)&&pages['/bbs/board.php?bo_table='+board.id]){const id='original-'+board.id+'-page';board.staticPostId=id;originalById.set(id,{id,board:board.id,title:board.name,body:'',origin:'original',path:'/bbs/board.php?bo_table='+board.id,static_page:true,author_name:'최고관리자',created_at:''});}}
 const deletedIds=async env=>new Set((await all(env.DB,'SELECT post_id FROM deleted_original_posts')).map(r=>r.post_id));
 const shell=(title,content)=>`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | 글로리매직</title><link rel="stylesheet" href="/thema/Basic1/assets/bs3/css/bootstrap.min.css"><link rel="stylesheet" href="/replica.css"></head><body><header class="replica-header"><a href="/"><img src="/img/logo2.png" alt="글로리매직"></a><nav><a href="/">홈</a><a href="/bbs/board.php?bo_table=4_1">공지사항</a><a href="/bbs/board.php?bo_table=4_3">질문과 답변</a><a href="/bbs/qalist.php">1:1 문의</a><a href="/admin">관리</a></nav></header><main class="replica-page"><h1>${esc(title)}</h1>${content}</main><footer class="replica-footer">경기도 남양주시 미금로 128번길1 2층 · 02-932-0871 / 010-3365-0125<br>Copyright © 글로리매직 All rights reserved.</footer><script src="/replica.js" defer></script></body></html>`;
 async function handler(req,env){
  const u=new URL(req.url);const p=u.pathname;
  if(p==='/api/health')return json({ok:!!env.DB,mode:env.MODE,storage:env.DB?'configured':'missing',snapshotPages:Object.keys(pages).length,originalPosts:posts.length},env.DB?200:503);
  if(assets[p]){const a=assets[p];if(a.remote){const cached=env.BUCKET?await env.BUCKET.get(p.slice(1)):null;if(cached)return new Response(req.method==='HEAD'?null:cached.body,{headers:{'Content-Type':cached.httpMetadata?.contentType||a.mime,'Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff'}});const r=await fetch(a.remote,{redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)return new Response('Asset unavailable',{status:r.status});return new Response(req.method==='HEAD'?null:r.body,{headers:{'Content-Type':r.headers.get('content-type')||a.mime,'Cache-Control':'public,max-age=3600','X-Content-Type-Options':'nosniff'}});}const bytes=Uint8Array.from(atob(a.base64),c=>c.charCodeAt(0));return new Response(req.method==='HEAD'?null:bytes,{headers:{'Content-Type':a.mime,'Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff'}});}
  if(p.startsWith('/api/')){
   if(!env.DB)fail(503,'데이터베이스 연결 설정이 필요합니다.');
   if(env.MODE==='vercel'&&!await configuredAdmin(env))fail(503,'관리자 계정 배포 설정이 필요합니다.');
   if(!['GET','HEAD'].includes(req.method)){if(req.headers.get('origin')!==u.origin)fail(403,'동일한 사이트에서 요청해 주세요.');await rate(req,env,'write',60);}
   const me=await user(req,env);const requireUser=()=>{if(!me)fail(401,'로그인이 필요합니다.');return me;};const requireAdmin=()=>{requireUser();if(me.role!=='admin')fail(403,'관리자 권한이 필요합니다.');};
   if(p==='/api/me'&&req.method==='GET')return json({user:publicUser(me),authMode:env.MODE==='hosted'?(env.ADMIN_USERNAME?'hybrid':'chatgpt'):'local'});
   if(p==='/api/boards'&&req.method==='GET'){const deleted=await deletedIds(env);return json({items:[...boards.values()].map(b=>({...b,canWrite:!!me&&(me.role==='admin'||writeBoards.has(b.id)),staticDeleted:!!b.staticPostId&&deleted.has(b.staticPostId)}))});}
   if(p==='/api/deleted-posts'&&req.method==='GET')return json({ids:[...await deletedIds(env)]});
   if(p==='/api/register'&&req.method==='POST'){
    if(env.MODE==='hosted')fail(409,'ChatGPT 로그인 후 회원 정보를 등록해 주세요.');await rate(req,env,'register',5);const b=await body(req);
    const username=field(b,'username',3,32);if(!/^[a-zA-Z0-9_]+$/.test(username))fail(400,'아이디는 영문·숫자·밑줄을 사용해 주세요.');
    const password=field(b,'password',10,128),name=field(b,'name',1,60),email=field(b,'email',3,254);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'이메일을 확인해 주세요.');
    const salt=random(),hash=await passwordHash(password,salt),id=crypto.randomUUID();
    try{await run(env.DB,"INSERT INTO users(id,username,email,name,password_hash,salt,role,created_at) VALUES(?,?,?,?,?,?,CASE WHEN EXISTS(SELECT 1 FROM users) THEN 'member' ELSE 'admin' END,?)",id,username,email,name,hash,salt,now());}catch{fail(409,'이미 사용 중인 아이디입니다.');}return json({ok:true},201);
   }
   if(p==='/api/login'&&req.method==='POST'){
    if(env.MODE==='hosted'&&!env.ADMIN_USERNAME)return json({redirect:'/signin-with-chatgpt?return_to=%2F'});
    if(env.MODE==='hosted')await configuredAdmin(env);
    await rate(req,env,'login',10);const b=await body(req);const candidate=await get(env.DB,'SELECT * FROM users WHERE username=?',field(b,'username',1,32));const salt=candidate?.salt||'0'.repeat(64);const hash=await passwordHash(field(b,'password',1,128),salt);
    if(!candidate||!candidate.password_hash||!safeEqual(hash,candidate.password_hash)||(env.MODE==='hosted'&&(candidate.role!=='admin'||candidate.username!==env.ADMIN_USERNAME)))fail(401,'아이디 또는 비밀번호를 확인해 주세요.');const token=random();await run(env.DB,'INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',await sha(token),candidate.id,Date.now()+86400000);
    return json({user:publicUser(candidate)},200,{'Set-Cookie':`gm_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${u.protocol==='https:'?'; Secure':''}`});
   }
   if(p==='/api/logout'&&req.method==='POST'){const token=req.headers.get('cookie')?.match(/gm_session=([a-f0-9]{64})/)?.[1];if(token)await run(env.DB,'DELETE FROM sessions WHERE token_hash=?',await sha(token));return json(env.MODE==='hosted'?{redirect:'/signout-with-chatgpt?return_to=%2F'}:{ok:true},200,{'Set-Cookie':'gm_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});}
   if(p==='/api/profile'&&req.method==='PATCH'){requireUser();const b=await body(req);await run(env.DB,'UPDATE users SET name=? WHERE id=?',field(b,'name',1,60),me.id);return json({ok:true});}
   if(p==='/api/password-reset'&&req.method==='POST'){await rate(req,env,'reset',3);return json({ok:false,message:env.MODE==='hosted'?'ChatGPT 계정에서 비밀번호를 관리해 주세요.':'이메일 발송 서비스가 연결되지 않았습니다. 사이트 관리자에게 문의해 주세요.'},503);}
   if(p==='/api/posts'&&req.method==='GET'){
    const b=u.searchParams.get('board');if(b)boardId(b);const q=(u.searchParams.get('q')||'').slice(0,100);const page=Math.max(1,Math.min(10000,parseInt(u.searchParams.get('page')||'1')||1));
    const rows=await all(env.DB,'SELECT p.*,u.name AS author_name FROM posts p JOIN users u ON u.id=p.author_id ORDER BY created_at DESC LIMIT 2000');
    const deleted=await deletedIds(env);const merged=[...rows.map(r=>({...r,origin:'new'})),...posts].filter(r=>!deleted.has(r.id)&&(!b||r.board===b)&&(!q||(r.title+' '+r.body).toLowerCase().includes(q.toLowerCase())));
    return json({total:merged.length,page,pageSize:20,items:merged.slice((page-1)*20,page*20).map(({html,...r})=>r)});
   }
   if(p==='/api/posts'&&req.method==='POST'){requireUser();const b=await body(req),board=boardId(field(b,'board',1,32));if(!writeBoards.has(board))requireAdmin();const id=crypto.randomUUID(),time=now();await run(env.DB,'INSERT INTO posts(id,board,title,body,author_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',id,board,field(b,'title',1,200),field(b,'body',1,50000),me.id,time,time);return json({id},201);}
   const pm=p.match(/^\/api\/posts\/([\w-]+)$/);
   if(pm){const id=pm[1];const post=await get(env.DB,'SELECT p.*,u.name AS author_name FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=?',id)||originalById.get(id);if(!post||((!post.author_id)&&(await deletedIds(env)).has(id)))fail(404,'게시물을 찾을 수 없습니다.');
    if(req.method==='GET')return json({post,comments:await all(env.DB,'SELECT c.*,u.name AS author_name FROM comments c JOIN users u ON u.id=c.author_id WHERE post_id=? ORDER BY created_at',id)});
    requireUser();if(!post.author_id){requireAdmin();if(req.method!=='DELETE')fail(409,'가져온 게시물은 삭제만 지원합니다.');await env.DB.batch([env.DB.prepare('INSERT INTO deleted_original_posts(post_id,deleted_by,deleted_at) VALUES(?,?,?)').bind(id,me.id,now()),env.DB.prepare('DELETE FROM comments WHERE post_id=?').bind(id)]);return json({ok:true});}if(me.role!=='admin'&&post.author_id!==me.id)fail(403,'수정 권한이 없습니다.');
    if(req.method==='DELETE'){await env.DB.batch([env.DB.prepare('DELETE FROM comments WHERE post_id=?').bind(id),env.DB.prepare('DELETE FROM posts WHERE id=?').bind(id)]);return json({ok:true});}
    if(req.method==='PATCH'){const b=await body(req);await run(env.DB,'UPDATE posts SET title=?,body=?,updated_at=? WHERE id=?',field(b,'title',1,200),field(b,'body',1,50000),now(),id);return json({ok:true});}
   }
   if(p==='/api/comments'&&req.method==='POST'){requireUser();const b=await body(req),id=field(b,'post_id',1,100);if((await deletedIds(env)).has(id)||(!originalById.has(id)&&!await get(env.DB,'SELECT id FROM posts WHERE id=?',id)))fail(404,'게시물이 없습니다.');await run(env.DB,'INSERT INTO comments(id,post_id,body,author_id,created_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),id,field(b,'body',1,5000),me.id,now());return json({ok:true},201);}
   if(p==='/api/inquiries'&&req.method==='GET'){requireUser();return json({items:me.role==='admin'?await all(env.DB,'SELECT i.*,u.name FROM inquiries i JOIN users u ON u.id=i.user_id ORDER BY created_at DESC'):await all(env.DB,'SELECT * FROM inquiries WHERE user_id=? ORDER BY created_at DESC',me.id)});}
   if(p==='/api/inquiries'&&req.method==='POST'){requireUser();const b=await body(req),id=crypto.randomUUID(),t=now();await run(env.DB,'INSERT INTO inquiries(id,subject,body,contact,user_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',id,field(b,'subject',1,200),field(b,'body',1,20000),field(b,'contact',0,200),me.id,t,t);return json({id},201);}
   const im=p.match(/^\/api\/inquiries\/([\w-]+)$/);if(im&&req.method==='PATCH'){requireAdmin();const b=await body(req);if(!await get(env.DB,'SELECT id FROM inquiries WHERE id=?',im[1]))fail(404,'문의가 없습니다.');await run(env.DB,"UPDATE inquiries SET reply=?,status='answered',updated_at=? WHERE id=?",field(b,'reply',1,20000),now(),im[1]);return json({ok:true});}
   if(p==='/api/admin/users'&&req.method==='GET'){requireAdmin();return json({items:(await all(env.DB,'SELECT id,username,email,name,role,created_at FROM users ORDER BY created_at DESC'))});}
   fail(404,'요청한 API가 없습니다.');
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return html(shell('요청 안내','<p>이 페이지는 화면의 입력 양식으로 이용해 주세요.</p><a href="/">홈으로</a>'));
  if(p==='/admin/boards')return html(shell('게시판 관리','<div id="board-manager"></div>'));
  if(p==='/admin/login')return html(shell('관리자 로그인','<form id="admin-login"><label>관리자 아이디<input name="username" required autocomplete="username"></label><label>비밀번호<input name="password" type="password" required autocomplete="current-password"></label><button type="submit">관리자 로그인</button><p class="form-message" role="status"></p></form>'));
  if(p==='/admin')return html(shell('관리자',`<div class="replica-actions"><a class="replica-button" href="/admin/boards">게시판 글 관리</a></div><div id="admin-app"></div>`));
  if(p==='/bbs/qalist.php')return html(shell('1:1 문의','<div id="inquiry-app"></div>'));
  if(p==='/bbs/write.php')return html(shell('글쓰기',`<form id="post-editor"><input type="hidden" name="board" value="${esc(boardId(u.searchParams.get('bo_table')||'4_3'))}"><label>제목<input name="title" maxlength="200" required></label><label>내용<textarea name="body" rows="14" maxlength="50000" required></textarea></label><button>등록</button><p class="form-message" role="status"></p></form>`));
  if(p==='/bbs/register_form.php')return html(shell('회원가입','<form id="member-register"><label>아이디<input name="username" minlength="3" maxlength="32" required autocomplete="username"></label><label>이름<input name="name" maxlength="60" required autocomplete="name"></label><label>이메일<input name="email" type="email" required autocomplete="email"></label><label>비밀번호<input name="password" type="password" minlength="10" maxlength="128" required autocomplete="new-password"></label><label><input type="checkbox" name="agree" required> 이용약관 및 개인정보처리방침에 동의합니다.</label><button>회원가입</button><p class="form-message" role="status"></p></form>'));
  if(p==='/bbs/search.php')return html(shell('전체 검색',`<form id="search-form"><input name="q" aria-label="검색어" value="${esc(u.searchParams.get('stx')||'')}" placeholder="검색어"><button>검색</button></form><div id="search-results"></div>`));
  if(p==='/post')return html(shell('게시물','<article id="live-post"></article>'));
  if(p==='/bbs/new.php')return html(shell('새글 모음','<div id="search-results"></div>'));
  if(p==='/bbs/sns_send.php'){const title=encodeURIComponent('글로리매직'),link=encodeURIComponent(u.origin+'/');const targets={facebook:'https://www.facebook.com/sharer/sharer.php?u='+link,twitter:'https://twitter.com/intent/tweet?url='+link+'&text='+title,kakaostory:'https://story.kakao.com/share?url='+link,naverband:'https://band.us/plugin/share?body='+title+'%20'+link};const target=targets[u.searchParams.get('sns')];return target?Response.redirect(target,302):html(shell('공유','<p>브라우저의 공유 기능을 이용해 주세요.</p>'));}
  if(p==='/rss/rss.php'){const rows=env.DB?await all(env.DB,'SELECT * FROM posts ORDER BY created_at DESC LIMIT 20'):[];const deleted=env.DB?await deletedIds(env):new Set();const items=[...rows.map(r=>({...r,path:'/post?id='+r.id})),...posts].filter(r=>!deleted.has(r.id)).slice(0,30);return new Response('<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>글로리매직</title><link>'+esc(u.origin)+'</link><description>글로리매직 새글</description>'+items.map(r=>'<item><title>'+esc(r.title)+'</title><link>'+esc(u.origin+r.path)+'</link><description>'+esc(r.body.slice(0,300))+'</description></item>').join('')+'</channel></rss>',{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});}
  if(p==='/bbs/current_connect.php')return html(shell('현재 접속자','<p>현재 접속자 통계는 원본 서버와 연동되지 않습니다.</p>'));
  const key=pageKey(u);
  if(p==='/bbs/board.php'&&env.DB){const board=u.searchParams.get('bo_table'),id=u.searchParams.get('wr_id'),deleted=await deletedIds(env);if(id&&deleted.has('original-'+board+'-'+id))return new Response(shell('삭제된 게시물','<p>삭제된 게시물입니다.</p><a href="/bbs/board.php?bo_table='+esc(board)+'">목록으로</a>'),{status:404,headers:{'Content-Type':'text/html; charset=utf-8'}});const staticId=boards.get(board)?.staticPostId;if(!id&&staticId&&deleted.has(staticId))return html(shell(boards.get(board).name,`<div id="live-board" data-board="${esc(board)}"></div>`));}
  if(pages[key])return html(pages[key]);
  if(p==='/bbs/board.php')return html(shell('게시판',`<div id="live-board" data-board="${esc(boardId(u.searchParams.get('bo_table')||'4_3'))}"></div>`));
  return new Response(shell('페이지를 찾을 수 없습니다','<a href="/">홈으로 돌아가기</a>'),{status:404,headers:{'Content-Type':'text/html; charset=utf-8'}});
 }
 return {async fetch(req,env,ctx){try{return await handler(req,env,ctx);}catch(e){if(e.status)return req.url.includes('/api/')?json({error:e.message},e.status):new Response(shell('안내',`<p>${esc(e.message)}</p>`),{status:e.status,headers:{'Content-Type':'text/html; charset=utf-8'}});console.error('Request failed',e.message);return json({error:'서버 요청을 처리하지 못했습니다.'},500);}}};
}
