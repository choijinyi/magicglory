(()=>{'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const api=async(path,method='GET',data)=>{const response=await fetch(path,{method,credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const value=await response.json();if(!response.ok)throw Error(value.error||'요청을 처리하지 못했습니다.');return value;};
 const params=new URLSearchParams(location.search);let me,boards=[];
 const link=p=>p.origin==='original'?p.path:'/post?id='+encodeURIComponent(p.id);
 async function remove(id,button,after){if(!confirm('이 게시물을 삭제하시겠습니까?'))return;button.disabled=true;try{await api('/api/posts/'+encodeURIComponent(id),'DELETE',{});await after();}catch(e){button.disabled=false;const output=document.querySelector('#board-admin-message');if(output)output.textContent=e.message;else alert(e.message);}}
 function deleteButton(id,after){const button=document.createElement('button');button.type='button';button.className='replica-delete-button';button.textContent='삭제';button.addEventListener('click',()=>remove(id,button,after));return button;}
 async function applyVisibility(){const {ids}=await api('/api/deleted-posts');const deleted=new Set(ids);
  for(const a of document.querySelectorAll('a[href]')){let u;try{u=new URL(a.href,location.href);}catch{continue;}if(u.origin!==location.origin||u.pathname!=='/bbs/board.php')continue;const b=u.searchParams.get('bo_table'),id=u.searchParams.get('wr_id');if(!b||!id||!deleted.has('original-'+b+'-'+id))continue;
   const item=a.closest('tr,li,.list-item,.post-row,.list-row,.wr-row,.post-wrap,.gallery-item,.media');if(item)item.remove();else a.hidden=true;
  }
 }
 async function manager(){const root=document.querySelector('#board-manager');if(!root)return;if(!me||me.role!=='admin'){root.innerHTML='<p>관리자 로그인이 필요합니다.</p><a href="/bbs/login.php">로그인</a>';return;}
  const selected=params.get('board')||boards[0]?.id||'4_1';let page=Math.max(1,Number(params.get('page'))||1);const board=boards.find(b=>b.id===selected);
  root.innerHTML='<label>게시판 선택<select id="manage-board" aria-label="게시판 선택">'+boards.map(b=>`<option value="${esc(b.id)}"${b.id===selected?' selected':''}>${esc(b.name)}</option>`).join('')+'</select></label><div class="replica-actions"><a class="replica-button" href="/bbs/write.php?bo_table='+encodeURIComponent(selected)+'">새 글 작성</a><a href="/bbs/board.php?bo_table='+encodeURIComponent(selected)+'">게시판 보기</a></div><p id="board-admin-message" role="status"></p><div id="manage-posts"></div>';
  root.querySelector('select').addEventListener('change',e=>{location.href='/admin/boards?board='+encodeURIComponent(e.target.value);});
  const result=await api('/api/posts?board='+encodeURIComponent(selected)+'&page='+page);const list=root.querySelector('#manage-posts');
  const rows=[...(board?.staticPostId&&!board.staticDeleted?[{id:board.staticPostId,title:board.name,origin:'original',path:'/bbs/board.php?bo_table='+selected}]:[]),...result.items];
  list.innerHTML=rows.length?'<ul class="replica-list">'+rows.map(p=>`<li data-managed-post="${esc(p.id)}"><a href="${esc(link(p))}">${esc(p.title)}</a><small>${p.origin==='original'?'가져온 게시물':'새 게시물'}</small><span class="replica-post-controls"></span></li>`).join(''):'<p class="replica-empty">등록된 게시물이 없습니다.</p>';
  list.querySelectorAll('[data-managed-post]').forEach(row=>row.querySelector('.replica-post-controls').append(deleteButton(row.dataset.managedPost,()=>location.reload())));
  if(result.total>20){const nav=document.createElement('nav');nav.className='replica-pager';nav.innerHTML=(page>1?'<a href="?board='+encodeURIComponent(selected)+'&page='+(page-1)+'">이전</a>':'')+(page*20<result.total?'<a href="?board='+encodeURIComponent(selected)+'&page='+(page+1)+'">다음</a>':'');list.append(nav);}
 }
 document.querySelector('#admin-login')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.target,button=f.querySelector('button'),status=f.querySelector('.form-message');button.disabled=true;status.textContent='';try{const result=await api('/api/login','POST',Object.fromEntries(new FormData(f)));if(result.user?.role!=='admin')throw Error('관리자 계정으로 로그인해 주세요.');location.href='/admin/boards';}catch(error){status.textContent=error.message;button.disabled=false;}});
 async function init(){try{const profile=await api('/api/me');me=profile.user;boards=(await api('/api/boards')).items;await applyVisibility();await manager();
  if(me?.role!=='admin'){document.querySelectorAll('.replica-live-login').forEach(root=>{const a=document.createElement('a');a.href='/admin/login';a.textContent='관리자 로그인';root.append(document.createElement('br'),a);});}
  if(!me||me.role!=='admin')return;
  const board=params.get('bo_table');if(location.pathname==='/bbs/board.php'&&board){
   const toolbar=document.createElement('div');toolbar.className='replica-board-toolbar';toolbar.setAttribute('aria-label','게시판 관리자 도구');toolbar.innerHTML='<strong>관리자</strong><a class="replica-button" href="/bbs/write.php?bo_table='+encodeURIComponent(board)+'">글쓰기</a><a class="replica-button secondary" href="/admin/boards?board='+encodeURIComponent(board)+'">글 관리</a>';
   const id=params.get('wr_id');const b=boards.find(b=>b.id===board);
   if(id)toolbar.append(deleteButton('original-'+board+'-'+id,()=>location.href='/bbs/board.php?bo_table='+encodeURIComponent(board)));
   else if(b?.staticPostId&&!b.staticDeleted){const button=deleteButton(b.staticPostId,()=>location.reload());button.textContent='기존 게시글 삭제';toolbar.append(button);}
   const target=document.querySelector('#fboardlist')?.parentElement||document.querySelector('#bo_v')||document.querySelector('.view-wrap')||document.querySelector('#live-board')||document.querySelector('.at-body');target?.prepend(toolbar);
  }
 }catch(e){const root=document.querySelector('#board-manager');if(root)root.textContent=e.message;else console.info('Board management:',e.message);}}
 init();
})();
