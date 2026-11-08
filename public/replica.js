(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qs=s=>document.querySelector(s);let current=null,authMode='local';
const toast=m=>{const d=document.createElement('div');d.className='replica-dialog';d.role='status';d.textContent=m;document.body.append(d);setTimeout(()=>d.remove(),4500);};
async function api(path,method='GET',data){const r=await fetch(path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const d=await r.json();if(!r.ok)throw Error(d.error||d.message||'요청을 처리하지 못했습니다.');return d;}
const values=f=>Object.fromEntries(new FormData(f));
const message=(f,t)=>{let p=f.querySelector('.form-message');if(!p){p=document.createElement('p');p.className='form-message';p.role='status';f.append(p);}p.textContent=t;};
const busy=async(f,fn)=>{const b=f.querySelector('button[type=submit],button');if(b)b.disabled=true;try{await fn();}catch(e){message(f,e.message);}finally{if(b)b.disabled=false;}};
const loginLink=()=>authMode==='chatgpt'?'/signin-with-chatgpt?return_to='+encodeURIComponent(location.pathname+location.search):'/bbs/login.php';
const postLink=p=>p.origin==='original'?p.path:'/post?id='+encodeURIComponent(p.id);
for(const poster of document.querySelectorAll('.replica-video-preview')){
 const image=poster.querySelector('img');image?.addEventListener('error',()=>{if(!image.src.endsWith('/media/video-unavailable.svg'))image.src='/media/video-unavailable.svg';});
 if(poster.closest('a'))continue;
 const id=poster.dataset.youtubeId;poster.setAttribute('role','button');poster.tabIndex=0;poster.setAttribute('aria-label',(poster.dataset.videoTitle||'공연영상')+' 재생');
 const watch=document.createElement('a');watch.className='replica-watch-link';watch.href='https://www.youtube.com/watch?v='+id;watch.target='_blank';watch.rel='noopener';watch.textContent='YouTube에서 보기';poster.after(watch);
 const play=()=>{const iframe=document.createElement('iframe');iframe.src='https://www.youtube.com/embed/'+id+'?rel=0&autoplay=1&origin='+encodeURIComponent(location.origin);iframe.title=poster.dataset.videoTitle||'공연영상';iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';iframe.allowFullscreen=true;iframe.className='replica-video-iframe';poster.replaceWith(iframe);};
 poster.addEventListener('click',play);poster.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();play();}});
}
function listing(items){return '<ul class="replica-list">'+items.map(p=>`<li><a href="${esc(postLink(p))}">${esc(p.title)}</a><small>${esc(p.author_name||'회원')} ${esc(p.created_at?.slice(0,10)||'')}</small></li>`).join('')+'</ul>';}
document.addEventListener('click',e=>{
 const a=e.target.closest('a');if(!a)return;
 const target=a.dataset.target;if(target&&target.startsWith('#')){e.preventDefault();const el=qs(target);if(el){el.classList.toggle('open');el.style.display=el.classList.contains('open')?'block':'none';}return;}
 const href=a.getAttribute('href')||'';if(href.startsWith('javascript:')){e.preventDefault();if(a.closest('.nav-right'))location.href='/bbs/search.php';else if(a.querySelector('.fa-user'))location.href=loginLink();else toast('브라우저의 북마크 메뉴를 이용해 주세요.');}
 if(a.closest('[data-slide]'))e.preventDefault();
});
document.addEventListener('submit',e=>{
 const f=e.target;if(!(f instanceof HTMLFormElement))return;
 if(['basic_outlogin','sidebar_login_form','flogin'].includes(f.name)||f.action.includes('login_check.php')){if(f.id==='admin-login')return;e.preventDefault();busy(f,async()=>{if(authMode==='chatgpt'){location.href=loginLink();return;}const v=values(f);const d=await api('/api/login','POST',{username:v.mb_id,password:v.mb_password});location.href=d.redirect||(d.user?.role==='admin'?'/admin/boards':'/');});return;}
 if(f.name==='fregister'){e.preventDefault();if(!f.querySelector('[name=agree]:checked')||!f.querySelector('[name=agree2]:checked')){message(f,'이용약관과 개인정보처리방침에 동의해 주세요.');return;}location.href='/bbs/register_form.php';return;}
 if(f.id==='member-register'){e.preventDefault();busy(f,async()=>{if(authMode==='chatgpt'){location.href=loginLink();return;}await api('/api/register','POST',values(f));location.href='/bbs/login.php?registered=1';});return;}
 if(f.name==='fpasswordlost'){e.preventDefault();busy(f,async()=>{await api('/api/password-reset','POST',{email:values(f).mb_email||''});});return;}
 if(['tsearch','ctrlSearch','fsearch','faq_search_form'].includes(f.name)){e.preventDefault();const v=values(f);location.href='/bbs/search.php?stx='+encodeURIComponent(v.stx||v.q||'');return;}
 if(f.id==='post-editor'){e.preventDefault();busy(f,async()=>{const d=await api('/api/posts','POST',values(f));location.href='/post?id='+d.id;});return;}
 if(f.id==='search-form'){e.preventDefault();const q=values(f).q;history.replaceState(null,'','/bbs/search.php?stx='+encodeURIComponent(q));loadSearch(q);}
});
for(const carousel of document.querySelectorAll('.carousel')){
 const slides=[...carousel.querySelectorAll('.carousel-inner>.item')];if(slides.length<2)continue;let active=Math.max(0,slides.findIndex(s=>s.classList.contains('active')));
 const change=i=>{active=(i+slides.length)%slides.length;slides.forEach((s,k)=>s.classList.toggle('active',k===active));carousel.querySelectorAll('.carousel-indicators li').forEach((s,k)=>s.classList.toggle('active',k===active));};
 carousel.querySelectorAll('[data-slide]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();change(active+(b.dataset.slide==='prev'?-1:1));}));
 carousel.querySelectorAll('[data-slide-to]').forEach(b=>b.addEventListener('click',()=>change(Number(b.dataset.slideTo))));
 setInterval(()=>{if(!carousel.matches(':hover')&&!document.hidden)change(active+1);},6500);
}
document.querySelectorAll('[data-toggle=tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const target=a.getAttribute('href');if(!target?.startsWith('#'))return;const pane=qs(target);if(!pane)return;const root=pane.parentElement;root.querySelectorAll(':scope>.tab-pane').forEach(p=>{p.classList.toggle('active',p===pane);p.style.display=p===pane?'block':'none';});a.closest('ul')?.querySelectorAll('li').forEach(li=>li.classList.toggle('active',li===a.parentElement));}));
async function loadSearch(q){const el=qs('#search-results');if(!el)return;try{const d=await api('/api/posts?q='+encodeURIComponent(q||''));el.innerHTML=`<p class="replica-notice">총 ${d.total}건</p>`+listing(d.items);}catch(e){el.textContent=e.message;}}
async function comments(postId,root){const d=await api('/api/posts/'+encodeURIComponent(postId));root.innerHTML='<h3>댓글</h3>'+d.comments.map(c=>`<div class="replica-card"><strong>${esc(c.author_name)}</strong><p>${esc(c.body)}</p></div>`).join('')+(current?'<form class="comment-form"><textarea name="body" maxlength="5000" required aria-label="댓글"></textarea><button>댓글 등록</button><p class="form-message"></p></form>':`<a href="${loginLink()}">로그인 후 댓글을 작성할 수 있습니다.</a>`);root.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();busy(e.target,async()=>{await api('/api/comments','POST',{post_id:postId,body:values(e.target).body});await comments(postId,root);});});}
async function loadPost(){const el=qs('#live-post');if(!el)return;const id=new URLSearchParams(location.search).get('id');try{const {post:p}=await api('/api/posts/'+encodeURIComponent(id));el.innerHTML=`<h2>${esc(p.title)}</h2><p>${esc(p.author_name)} · ${esc(p.created_at.slice(0,10))}</p><pre>${esc(p.body)}</pre><div class="replica-actions"><a href="/bbs/board.php?bo_table=${encodeURIComponent(p.board)}">목록</a>${current&&(current.id===p.author_id||current.role==='admin')?'<button id="edit-post">수정</button><button id="delete-post" class="secondary">삭제</button>':''}</div><section class="replica-comments"></section>`;
 el.querySelector('#delete-post')?.addEventListener('click',async()=>{if(!confirm('게시물을 삭제하시겠습니까?'))return;try{await api('/api/posts/'+id,'DELETE');location.href='/bbs/board.php?bo_table='+p.board;}catch(e){toast(e.message);}});
 el.querySelector('#edit-post')?.addEventListener('click',()=>{el.innerHTML=`<form><label>제목<input name="title" value="${esc(p.title)}" required maxlength="200"></label><label>내용<textarea name="body" rows="14" maxlength="50000" required>${esc(p.body)}</textarea></label><button>수정 저장</button><p class="form-message"></p></form>`;el.querySelector('form').addEventListener('submit',e=>{e.preventDefault();busy(e.target,async()=>{await api('/api/posts/'+id,'PATCH',values(e.target));loadPost();});});});await comments(id,el.querySelector('.replica-comments'));
 }catch(e){el.textContent=e.message;}}
async function loadInquiries(admin=false){const el=qs(admin?'#admin-app':'#inquiry-app');if(!el)return;if(!current){el.innerHTML=`<p>회원 전용 서비스입니다.</p><a class="replica-button" href="${loginLink()}">로그인</a>`;return;}if(admin&&current.role!=='admin'){el.textContent='관리자 권한이 필요합니다.';return;}
 try{const d=await api('/api/inquiries');el.innerHTML=(admin?'<h2>문의 관리</h2>':'<form id="inquiry-form"><label>제목<input name="subject" maxlength="200" required></label><label>연락처<input name="contact" maxlength="200"></label><label>문의 내용<textarea name="body" rows="7" maxlength="20000" required></textarea></label><button>문의 등록</button><p class="form-message"></p></form>')+d.items.map(i=>`<article class="replica-card"><h3>${esc(i.subject)}</h3><small>${esc(i.name||'')} · ${esc(i.created_at.slice(0,10))} · ${i.status==='answered'?'답변 완료':'답변 대기'}</small><pre>${esc(i.body)}</pre><p>${esc(i.contact)}</p>${i.reply?`<h4>답변</h4><pre>${esc(i.reply)}</pre>`:''}${admin?`<form data-inquiry="${i.id}"><textarea name="reply" required maxlength="20000" rows="4">${esc(i.reply)}</textarea><button>답변 저장</button><p class="form-message"></p></form>`:''}</article>`).join('');
 el.querySelector('#inquiry-form')?.addEventListener('submit',e=>{e.preventDefault();busy(e.target,async()=>{await api('/api/inquiries','POST',values(e.target));loadInquiries();});});
 el.querySelectorAll('[data-inquiry]').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();busy(f,async()=>{await api('/api/inquiries/'+f.dataset.inquiry,'PATCH',values(f));loadInquiries(true);});}));
 if(admin){const users=await api('/api/admin/users');const box=document.createElement('section');box.innerHTML='<h2>회원 관리</h2>'+users.items.map(u=>`<p>${esc(u.name)} · ${esc(u.username||u.email)} · ${esc(u.role)}</p>`).join('');el.append(box);}
 }catch(e){el.textContent=e.message;}}
function updateAccountNavigation(){
 if(!current)return;
 const destination=current.role==='admin'?'/admin/boards':'/bbs/qalist.php';
 const label=current.role==='admin'?`관리자 (${current.username})`:`${current.name} 님 로그인 중`;
 for(const link of document.querySelectorAll('a[href]')){
  const href=link.getAttribute('href');
  if(new URL(link.href,location.href).pathname==='/bbs/login.php'||(href==='#'&&link.textContent.trim()==='로그인')){link.href=destination;link.textContent=label;}
 }
 const nav=qs('.replica-header nav');
 if(nav){const account=document.createElement('a');account.href=destination;account.textContent=label;nav.append(account);const logout=document.createElement('button');logout.type='button';logout.textContent='로그아웃';logout.addEventListener('click',async()=>{try{const r=await api('/api/logout','POST',{});location.href=r.redirect||'/';}catch(e){toast(e.message);}});nav.append(logout);}
}
async function init(){try{const d=await api('/api/me');current=d.user;authMode=d.authMode;updateAccountNavigation();
 if(current){document.querySelectorAll('form[action*=login_check]').forEach(f=>{f.innerHTML=`<div class="replica-live-login"><strong>${esc(current.name)}</strong> 님<br><a href="/bbs/qalist.php">내 문의</a> · <a href="/bbs/write.php?bo_table=4_3">글쓰기</a>${current.role==='admin'?' · <a href="/admin">관리자</a>':''}<br><button type="button" class="btn btn-default btn-sm" data-logout>로그아웃</button></div>`;f.querySelector('[data-logout]').addEventListener('click',async()=>{const r=await api('/api/logout','POST',{});location.href=r.redirect||'/';});});}
 else if(authMode==='chatgpt'){document.querySelectorAll('form[action*=login_check]').forEach(f=>{f.innerHTML=`<a class="btn btn-black btn-block" href="${loginLink()}" target="_top">ChatGPT로 로그인</a>`;});}
 if(qs('#member-register')&&authMode==='chatgpt'){qs('#member-register').innerHTML=current?`<p>${esc(current.name)} 님의 회원 정보가 등록되어 있습니다.</p><a href="/">홈으로</a>`:`<a class="replica-button" href="${loginLink()}" target="_top">ChatGPT로 회원 등록</a>`;}
 await Promise.all([loadPost(),loadInquiries(),loadInquiries(true),loadSearch(new URLSearchParams(location.search).get('stx'))]);
 const params=new URLSearchParams(location.search);const board=params.get('bo_table');
 if(location.pathname==='/bbs/board.php'&&board){if(params.has('wr_id')){const root=document.createElement('section');root.className='replica-comments';(qs('#bo_v')||qs('.view-wrap')||qs('.at-body')).append(root);comments('original-'+board+'-'+params.get('wr_id'),root).catch(()=>{});}else{
  const el=qs('#live-board')||qs('#fboardlist');if(el){const d=await api('/api/posts?board='+encodeURIComponent(board)+'&page='+(params.get('page')||'1'));const live=qs('#live-board')?d.items:d.items.filter(p=>p.origin==='new');const box=document.createElement('div');box.className='replica-new-posts';box.innerHTML=(current?`<div class="replica-actions"><a class="replica-button" href="/bbs/write.php?bo_table=${encodeURIComponent(board)}">글쓰기</a></div>`:'')+listing(live);if(qs('#live-board')){box.innerHTML+=`<nav class="replica-pager">${d.page>1?`<a href="?bo_table=${encodeURIComponent(board)}&page=${d.page-1}">이전</a>`:''}${d.page*20<d.total?`<a href="?bo_table=${encodeURIComponent(board)}&page=${d.page+1}">다음</a>`:''}</nav>`;}el.prepend(box);}
 }}
 }catch(e){console.info('Member service:',e.message);}}
init();
})();
