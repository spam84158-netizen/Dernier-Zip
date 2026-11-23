/* Snow Cloud Chek — lot 3 : messagerie façon WhatsApp (groupes, chaînes, messages privés). */
(()=>{'use strict';
const K=window.SCKit,SC=window.SC;if(!K||!SC||!SC.sb)return;
const{h,$,tip,fill,debounce,pickFile}=K,sb=SC.sb,LS=localStorage,doc=document;

/* ============ OUTILS ============ */
const pad=n=>String(n).padStart(2,'0'),hhmm=d=>pad(d.getHours())+':'+pad(d.getMinutes()),sameDay=(a,b)=>a.toDateString()===b.toDateString();
const dayLabel=d=>{const n=new Date();if(sameDay(d,n))return 'Aujourd’hui';if(sameDay(d,new Date(n-864e5)))return 'Hier';return d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});};
const listTime=d=>{const n=new Date();if(sameDay(d,n))return hhmm(d);if(sameDay(d,new Date(n-864e5)))return 'Hier';return pad(d.getDate())+'/'+pad(d.getMonth()+1);};
const monthYear=s=>new Date(s).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
const ic=c=>h('i',{class:'fa-solid '+c});
const copy=async t=>{try{await navigator.clipboard.writeText(t);tip('Copié');}catch(_){const x=h('textarea',{style:'position:fixed;opacity:0'},t);doc.body.append(x);x.select();try{doc.execCommand('copy');tip('Copié');}catch(__){}x.remove();}};
const share=async(title,text,url)=>{if(navigator.share){try{await navigator.share({title,text,url});return;}catch(e){if(e&&e.name==='AbortError')return;}}copy(url);};
function sheet(build){const bg=h('div',{class:'sheet-bg',on:{click:e=>{if(e.target===bg)close();}}}),sh=h('div',{class:'sheet'},h('div',{class:'grab'}));bg.append(sh);const close=()=>bg.remove();build(sh,close);doc.body.append(bg);if(window.scEmojify)window.scEmojify(sh);return close;}
const lightbox=src=>{const l=h('div',{style:'position:fixed;inset:0;z-index:10100;background:rgba(0,0,0,.92);display:grid;place-items:center',on:{click:()=>l.remove()}},h('img',{src,alt:'',style:'max-width:96vw;max-height:92dvh;border-radius:8px'}));doc.body.append(l);};
async function cropSquare(file,size=512){if(!/^image\//.test(file.type))throw new Error('Choisis une image.');const bmp=await createImageBitmap(file),s=Math.min(bmp.width,bmp.height),c=doc.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(bmp,(bmp.width-s)/2,(bmp.height-s)/2,s,s,0,0,size,size);const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.86));return new File([b],'a.jpg',{type:'image/jpeg'});}
async function fitImage(file,max=1280){if(!/^image\//.test(file.type))throw new Error('Choisis une image.');if(file.type==='image/gif'&&file.size<5e6)return file;const bmp=await createImageBitmap(file),r=Math.min(1,max/Math.max(bmp.width,bmp.height)),c=doc.createElement('canvas');c.width=Math.round(bmp.width*r);c.height=Math.round(bmp.height*r);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);const b=await new Promise(res=>c.toBlob(res,'image/jpeg',.82));return new File([b],'p.jpg',{type:'image/jpeg'});}
async function upload(file,prefix,ext,type){const path=ME.id+'/'+prefix+'_'+Date.now()+'.'+ext;const{error}=await sb.storage.from('media').upload(path,file,{contentType:type});if(error)throw error;return sb.storage.from('media').getPublicUrl(path).data.publicUrl;}
const hashN=s=>{let n=0;const t=String(s||'');for(let i=0;i<t.length;i++)n=(n*31+t.charCodeAt(i))>>>0;return n;};
const GR=[['#5b8cff','#7c5cff'],['#10b981','#0ea5a4'],['#f59e0b','#ef6c3c'],['#ec4899','#c026d3'],['#06b6d4','#3b82f6'],['#84cc16','#16a34a'],['#f43f5e','#fb7185'],['#8b5cf6','#6366f1']];
const grad=s=>{const g=GR[hashN(s)%GR.length];return 'linear-gradient(135deg,'+g[0]+','+g[1]+')';};
const colorFor=p=>GR[hashN(p&&(p.id||p.username))%GR.length][0];
const nameOf=p=>p?(p.display_name||p.username||'Membre'):'Membre';
const initials=n=>{const w=String(n||'?').replace(/[^\p{L}\p{N} ]/gu,'').trim().split(/\s+/).filter(Boolean);return((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase();};
function avatar(p,size=44){const nm=nameOf(p),e=h('span',{class:'av2',style:'width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*.38)+'px;background:'+grad(p&&(p.id||nm))},initials(nm));
  if(p&&p.avatar_url){const img=h('img',{src:p.avatar_url,alt:'',loading:'lazy',referrerpolicy:'no-referrer',on:{error:()=>img.remove()}});e.append(img);}return e;}
function groupAvatar(g,size=44){const e=h('span',{class:'av2',style:'width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*.42)+'px;background:'+grad(g&&g.id)},ic(g&&g.type==='channel'?'fa-bullhorn':'fa-user-group'));
  if(g&&g.avatar_url){const img=h('img',{src:g.avatar_url,alt:'',loading:'lazy',on:{error:()=>img.remove()}});e.append(img);}return e;}
/* Badges : OR pour les personnes, BLEU pour les groupes et chaînes */
const rosette=(()=>{let d='';for(let i=0;i<=120;i++){const a=i/120*Math.PI*2,r=10.1+.95*Math.cos(10*a);d+=(i?'L':'M')+(12+r*Math.cos(a)).toFixed(2)+' '+(12+r*Math.sin(a)).toFixed(2);}return d+'Z';})();
if(!doc.getElementById('scDefs')){const d=h('div',{id:'scDefs',style:'position:absolute;width:0;height:0;overflow:hidden'});d.innerHTML='<svg width="0" height="0"><defs><linearGradient id="scGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe28a"/><stop offset=".5" stop-color="#f6b92d"/><stop offset="1" stop-color="#d88a00"/></linearGradient><linearGradient id="scBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fb6ff"/><stop offset=".5" stop-color="#2f80ff"/><stop offset="1" stop-color="#1b55d6"/></linearGradient></defs></svg>';doc.body.append(d);}
const seal=(cls,fillId,title,s)=>{const e=h('span',{class:cls,title,'aria-label':title});e.innerHTML='<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+rosette+'" fill="url(#'+fillId+')"/><path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';return e;};
const GOLD=['admin','official','developer','moderator','verified','contributor'];
const goldB=(p,s=16)=>p&&GOLD.includes(p.badge)?seal('gold','scGold',({admin:'Administrateur',official:'Officiel',developer:'Développeur',moderator:'Modérateur',contributor:'Contributeur',verified:'Membre certifié'})[p.badge]||'Badge',s):null;
const blueB=(g,s=16)=>g&&g.blue_badge!==false?seal('blue','scBlue',g.type==='channel'?'Chaîne officielle':'Groupe officiel',s):null;
const linkify=t=>String(t).split(/(https?:\/\/[^\s<>"]+|@[a-z0-9_]{3,24})/g).map((p,i)=>{if(i%2===0)return p;if(p[0]==='@')return h('span',{class:'men'},p);return h('a',{href:p,target:'_blank',rel:'noopener noreferrer'},p);});
const emojiOnly=t=>/^[\p{Extended_Pictographic}\u200d\ufe0f\p{Emoji_Modifier}\s]+$/u.test(t||'')&&((t.match(/\p{Extended_Pictographic}/gu)||[]).length<=3);
const EMO={'😀':'😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬',
 '👍':'👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤝 🙏 ✍️ 💪 👏 🙌 👐 🤲 🫶 🫡 🤌',
 '❤️':'❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 😻 💋',
 '🐶':'🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🐙 🦀 🐠 🐬 🐳 🌸 🌹 🌻 🌴 🍀 🌍 ⭐ 🌙 ☀️ ⛅ 🌈 ❄️ 🔥 💧',
 '🍔':'🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🌽 🥕 🍞 🧀 🍗 🍖 🍔 🍟 🍕 🌭 🌮 🍝 🍜 🍣 🍤 🍦 🍩 🍪 🎂 🍰 🍫 🍬 ☕ 🍵 🍺 🥂 🍷',
 '⚽':'⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🥊 🎮 🎯 🎲 🎵 🎶 🎤 🎧 🎸 🎹 🥁 🎬 🏆 🥇 🥈 🥉',
 '🚗':'🚗 🚕 🚌 🚓 🚑 🚒 🚚 🏍️ 🚲 ✈️ 🚀 🚁 ⛵ 🚢 🏠 🏢 🏥 🏦 🏨 🌆 🗺️ 📍',
 '💡':'📱 💻 ⌨️ 🖥️ 📷 📞 💡 🔋 💰 💳 💎 🔑 🔒 🔓 📌 📎 ✏️ 📝 📚 📦 🎁 🔔 ✅ ❌ ⚠️ 💯 🆗 🆕'};

/* ============ ÉTAT ============ */
let ME=null,RT=null,TY=null,vvOff=()=>{},PENDING_OPEN=null,booted=null;
const PC=new Map(),BL=new Set(),PCOLS='id,username,display_name,avatar_url,badge,bio,created_at,role';
const isAdmin=()=>!!(ME&&ME.role==='admin');
const stopRT=()=>{[RT,TY].forEach(c=>{if(c){try{sb.removeChannel(c);}catch(_){}}});RT=TY=null;};
async function loadMe(force){if(ME&&!force)return ME;const u=SC.me();if(!u)return null;const{data}=await sb.from('profiles').select('*').eq('id',u.id).maybeSingle();ME=data||{id:u.id};PC.set(ME.id,ME);
  const m=u.user_metadata||{},pic=m.avatar_url||m.picture;if(ME&&!ME.avatar_url&&pic){const{error}=await sb.from('profiles').update({avatar_url:pic}).eq('id',u.id);if(!error)ME.avatar_url=pic;}
  const{data:bl}=await sb.from('blocks').select('blocked').eq('blocker',u.id);BL.clear();(bl||[]).forEach(x=>BL.add(x.blocked));return ME;}
async function getProfiles(ids){const need=[...new Set(ids)].filter(i=>i&&!PC.has(i));if(need.length){const{data}=await sb.from('profiles').select(PCOLS).in('id',need);(data||[]).forEach(p=>PC.set(p.id,p));}return ids.map(i=>PC.get(i));}
sb.auth.onAuthStateChange((_e,s)=>{if(s&&s.user){setTimeout(afterLogin,0);}else{ME=null;PC.clear();BL.clear();booted=null;}});
sb.auth.getSession().then(({data})=>{if(data&&data.session)afterLogin();});
async function afterLogin(){const u=SC.me();if(!u||booted===u.id)return;booted=u.id;try{await sb.rpc('ensure_auto_join');}catch(_){}await loadMe(true);
  const g=LS.getItem('sc-gjoin');if(g){LS.removeItem('sc-gjoin');try{const{data,error}=await sb.rpc('join_by_code',{p_code:g});if(error)tip(error.message);else if(data){if(data.status==='pending')tip('Demande envoyée : un administrateur doit l’accepter');else{PENDING_OPEN=data.group_id;tip('Tu as rejoint le groupe');SC.go('com');}}}catch(_){}}}

/* ============ NAVIGATION ============ */
const go1=SC.go,open1=SC.open;
function cleanup(){stopRT();vvOff();vvOff=()=>{};const b=$('#scv');if(b){b.classList.remove('v2c');b.style.height='';}}
SC.open=function(k,f){cleanup();return open1.call(this,k,f);};
SC.go=function(k){if(k==='com'&&SC.me())return openMessages();cleanup();return go1.apply(this,arguments);};
window.SCMessages={open:()=>openMessages()};
function fitVV(){const vv=window.visualViewport,box=$('#scv');if(!vv||!box)return;const set=()=>{box.style.height=vv.height+'px';box.style.bottom='auto';};set();vv.addEventListener('resize',set);vvOff=()=>vv.removeEventListener('resize',set);}

/* ============ VUE PRINCIPALE ============ */
function openMessages(){SC.open('dev',box=>{box.classList.add('v2','v2c');fitVV();const root=h('div',{class:'mw'}),list=h('div',{class:'m-list'}),chat=h('div',{class:'m-chat'},h('div',{class:'m-empty'},h('div',{},h('b',{},'Snow Cloud Chek'),'Choisis une discussion pour commencer.')));root.append(list,chat);box.append(root);boot(root,list,chat);});}
async function boot(root,list,chat){fill(list,h('div',{class:'ml-empty'},'Chargement…'));await loadMe();if(!ME){fill(list,h('div',{class:'ml-empty'},'Connecte-toi pour accéder à la messagerie.'));return;}
  const ctx={root,list,chat,filter:LS.getItem('sc-mfilter')||'all',q:'',convs:[]};
  ctx.showList=async()=>{root.classList.remove('in-chat');ctx.cur=null;stopRT();await drawList(ctx);};
  ctx.open=async conv=>{ctx.cur=conv.key;root.classList.add('in-chat');await openChat(ctx,conv);$$rows(ctx);};
  await drawList(ctx);
  if(PENDING_OPEN){const c=ctx.convs.find(x=>x.key==='g:'+PENDING_OPEN);PENDING_OPEN=null;if(c)ctx.open(c);}
  if(window.scEmojify)window.scEmojify(root);}
const $$rows=ctx=>ctx.list.querySelectorAll('.crow').forEach(r=>r.classList.toggle('on',r.dataset.key===ctx.cur));

/* ============ LISTE DES DISCUSSIONS ============ */
const MCOLS='id,group_id,dm_to,sender,body,kind,media_url,reply_to,edited_at,deleted,created_at,pinned,meta';
async function loadConvs(){const me=ME.id;
  const[{data:mem},{data:reads}]=await Promise.all([sb.from('group_members').select('group_id,role,joined_at').eq('user_id',me),sb.from('chat_reads').select('*').eq('user_id',me)]);
  const gids=(mem||[]).map(x=>x.group_id),R={};(reads||[]).forEach(r=>{R[r.chat_key]=r;});
  const[gr,gm,dr,ds]=await Promise.all([gids.length?sb.from('groups').select('*').in('id',gids):{data:[]},
    gids.length?sb.from('messages').select(MCOLS).in('group_id',gids).eq('deleted',false).order('created_at',{ascending:false}).limit(400):{data:[]},
    sb.from('messages').select(MCOLS).eq('dm_to',me).eq('deleted',false).order('created_at',{ascending:false}).limit(200),
    sb.from('messages').select(MCOLS).eq('sender',me).not('dm_to','is',null).eq('deleted',false).order('created_at',{ascending:false}).limit(200)]);
  const convs=new Map(),roleOf={},joined={};(mem||[]).forEach(m=>{roleOf[m.group_id]=m.role;joined[m.group_id]=m.joined_at;});
  (gr.data||[]).forEach(g=>convs.set('g:'+g.id,{key:'g:'+g.id,type:g.type==='channel'?'channel':'group',group:g,role:roleOf[g.id],last:null,unread:0,rd:R['g:'+g.id]||{},lr:(R['g:'+g.id]||{}).last_read||joined[g.id]||'1970'}));
  const add=(key,m)=>{const c=convs.get(key);if(!c)return;const cl=c.rd.cleared_at;if(cl&&m.created_at<=cl)return;if(!c.last)c.last=m;if(m.sender!==me&&m.created_at>c.lr)c.unread++;};
  (gm.data||[]).forEach(m=>add('g:'+m.group_id,m));
  const dms=[...(dr.data||[]),...(ds.data||[])].sort((a,b)=>b.created_at.localeCompare(a.created_at)),others=new Set();dms.forEach(m=>others.add(m.sender===me?m.dm_to:m.sender));await getProfiles([...others]);
  dms.forEach(m=>{const o=m.sender===me?m.dm_to:m.sender,key='u:'+o;if(BL.has(o))return;if(!convs.has(key))convs.set(key,{key,type:'dm',user:PC.get(o),last:null,unread:0,rd:R[key]||{},lr:(R[key]||{}).last_read||'1970'});add(key,m);});
  const senders=[];convs.forEach(c=>{if(c.last)senders.push(c.last.sender);});await getProfiles(senders);
  return[...convs.values()].sort((a,b)=>(b.rd.pinned?1:0)-(a.rd.pinned?1:0)||(b.last?b.last.created_at:'0').localeCompare(a.last?a.last.created_at:'0')||(b.group&&b.group.is_general?1:0)-(a.group&&a.group.is_general?1:0));}
const previewOf=(c)=>{const m=c.last;if(!m)return c.type==='channel'?'Chaîne':c.type==='group'?'Aucun message':'Dis bonjour';const mine=m.sender===ME.id,pre=c.type==='dm'?(mine?'Vous : ':''):(mine?'Vous : ':nameOf(PC.get(m.sender)).split(' ')[0]+' : ');
  const t=m.kind==='image'?'📷 Photo':m.kind==='audio'?'🎤 Message vocal':m.kind==='sticker'?'Sticker':m.kind==='system'?m.body:(m.body||'');return pre+t;};
function convRow(ctx,c){const nm=c.type==='dm'?nameOf(c.user):c.group.name,av=c.type==='dm'?avatar(c.user,52):groupAvatar(c.group,52),bd=c.type==='dm'?goldB(c.user,15):blueB(c.group,15);
  return h('button',{class:'crow'+(ctx.cur===c.key?' on':''),'data-key':c.key,type:'button',on:{click:()=>ctx.open(c)}},av,h('div',{class:'mid'},
    h('div',{class:'t1'},h('span',{class:'nm'},nm),bd,h('span',{class:'sp'}),c.rd.pinned?h('i',{class:'fa-solid fa-thumbtack mi'}):null,h('span',{class:'tm'+(c.unread?' un':'')},c.last?listTime(new Date(c.last.created_at)):'')),
    h('div',{class:'t2'},h('span',{class:'pv'},previewOf(c)),c.rd.muted?h('i',{class:'fa-solid fa-bell-slash mi'}):null,c.unread?h('span',{class:'ub'+(c.rd.muted?' mu':'')},c.unread>99?'99+':String(c.unread)):null)));}
async function drawList(ctx){const{list}=ctx;
  const head=h('div',{class:'ml-head'},h('h2',{},'Discussions'),h('button',{class:'icb',type:'button','aria-label':'Nouveau',on:{click:()=>newMenu(ctx)}},ic('fa-plus')));
  const qin=h('input',{placeholder:'Rechercher',value:ctx.q,on:{input:e=>{ctx.q=e.target.value;paint();}}}),
    filt=h('div',{class:'ml-filt'},...[['all','Tout'],['unread','Non lus'],['group','Groupes'],['channel','Chaînes'],['dm','Privé'],['explore','Explorer']].map(([k,l])=>h('button',{type:'button',class:ctx.filter===k?'on':'',on:{click:()=>{ctx.filter=k;LS.setItem('sc-mfilter',k);drawList(ctx);}}},l))),
    rows=h('div',{class:'ml-rows'});
  fill(list,head,h('div',{class:'ml-search'},ic('fa-magnifying-glass'),qin),filt,rows);
  const paint=()=>{const q=ctx.q.trim().toLowerCase();
    if(ctx.filter==='explore'){return paintExplore(ctx,rows,q);}
    let items=ctx.convs.filter(c=>ctx.filter==='all'||(ctx.filter==='unread'?c.unread>0:c.type===ctx.filter));
    if(q)items=items.filter(c=>(c.type==='dm'?nameOf(c.user)+' '+(c.user&&c.user.username):c.group.name).toLowerCase().includes(q));
    fill(rows,items.length?items.map(c=>convRow(ctx,c)):h('div',{class:'ml-empty'},q?'Aucun résultat.':ctx.filter==='unread'?'Tout est lu.':'Aucune discussion ici.'));
    if(window.scEmojify)window.scEmojify(rows);};
  if(!ctx.convs.length)fill(rows,h('div',{class:'ml-empty'},'Chargement…'));
  try{ctx.convs=await loadConvs();}catch(e){fill(rows,h('div',{class:'ml-empty'},'Erreur : '+((e&&e.message)||e)));return;}
  paint();
  stopRT();RT=sb.channel('ml-'+Date.now()).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},debounce(async()=>{if(ctx.root.classList.contains('in-chat'))return;try{ctx.convs=await loadConvs();paint();}catch(_){}},700)).subscribe();}
async function paintExplore(ctx,rows,q){fill(rows,h('div',{class:'ml-empty'},'Chargement…'));
  const mine=new Set(ctx.convs.filter(c=>c.group).map(c=>c.group.id));const{data}=await sb.from('groups').select('*').in('kind',['public','official']).order('created_at');
  let items=(data||[]).filter(g=>!mine.has(g.id));if(q)items=items.filter(g=>g.name.toLowerCase().includes(q));
  fill(rows,items.length?items.map(g=>{const btn=h('button',{class:'join-btn'+(g.join_mode==='approval'?' w':''),type:'button',on:{click:async e=>{e.stopPropagation();btn.disabled=true;const{data:r,error}=await sb.rpc('join_group',{p_id:g.id});if(error){tip(error.message);btn.disabled=false;return;}
        if(r&&r.status==='pending'){btn.textContent='Demande envoyée';tip('Un administrateur doit accepter ta demande');}else{tip('Tu as rejoint « '+g.name+' »');ctx.convs=await loadConvs();ctx.filter='all';drawList(ctx);}}}},g.join_mode==='approval'?'Demander':(g.type==='channel'?'Suivre':'Rejoindre'));
    return h('div',{class:'crow',style:'cursor:default'},groupAvatar(g,52),h('div',{class:'mid'},h('div',{class:'t1'},h('span',{class:'nm'},g.name),blueB(g,15)),h('div',{class:'t2'},h('span',{class:'pv'},(g.type==='channel'?'Chaîne':'Groupe')+(g.description?' · '+g.description:'')))),btn);}):h('div',{class:'ml-empty'},'Rien de nouveau à rejoindre pour le moment.'));
  if(window.scEmojify)window.scEmojify(rows);}
function newMenu(ctx){sheet((sh,close)=>{const row=(i,t,f,cls)=>h('button',{class:'row '+(cls||''),type:'button',on:{click:()=>{close();f();}}},ic(i),t);
  sh.append(h('h3',{},'Nouveau'),row('fa-user','Nouveau message',()=>userSearch(ctx)),row('fa-link','Rejoindre avec un lien',()=>joinLink(ctx)));
  if(isAdmin())sh.append(row('fa-user-group','Nouveau groupe',()=>groupForm(ctx,'group')),row('fa-bullhorn','Nouvelle chaîne',()=>groupForm(ctx,'channel')));});}
function joinLink(ctx){sheet((sh,close)=>{const i=h('input',{placeholder:'Colle le lien du groupe'});sh.append(h('h3',{},'Rejoindre avec un lien'),i,h('div',{style:'height:12px'}),h('button',{class:'btn2',style:'width:100%',type:'button',on:{click:async()=>{let code=i.value.trim();try{code=new URL(code).searchParams.get('g')||code;}catch(_){}if(!code)return;const{data,error}=await sb.rpc('join_by_code',{p_code:code});if(error){tip(error.message);return;}close();
    if(data.status==='pending')tip('Demande envoyée : un administrateur doit l’accepter');else{ctx.convs=await loadConvs();const c=ctx.convs.find(x=>x.key==='g:'+data.group_id);drawList(ctx);if(c)ctx.open(c);}}}},'Rejoindre'));});}
async function userSearch(ctx){sheet((sh,close)=>{const i=h('input',{placeholder:'Pseudo ou nom'}),out=h('div',{});sh.append(h('h3',{},'Nouveau message'),i,h('div',{style:'height:6px'}),out);
  const go=debounce(async()=>{const q=i.value.trim().replace(/[%,]/g,'');if(q.length<2){fill(out);return;}
    const[a,b]=await Promise.all([sb.from('profiles').select(PCOLS).ilike('username','%'+q+'%').limit(15),sb.from('profiles').select(PCOLS).ilike('display_name','%'+q+'%').limit(15)]);
    const m=new Map();[...(a.data||[]),...(b.data||[])].forEach(p=>{if(p.id!==ME.id)m.set(p.id,p);});m.forEach(p=>PC.set(p.id,p));
    fill(out,m.size?[...m.values()].map(p=>h('div',{class:'urow',style:'cursor:pointer',on:{click:()=>{close();ctx.open({key:'u:'+p.id,type:'dm',user:p,unread:0,rd:{}});}}},avatar(p,42),h('div',{class:'l'},h('div',{class:'n'},nameOf(p),goldB(p,14)),h('div',{class:'u'},'@'+p.username)))):h('div',{class:'ml-empty'},'Aucun membre trouvé.'));if(window.scEmojify)window.scEmojify(out);},300);
  i.addEventListener('input',go);setTimeout(()=>i.focus(),50);});}
function groupForm(ctx,type,g){sheet((sh,close)=>{const T=g||{name:'',description:'',join_mode:'open',post_mode:type==='channel'?'admins':'all',auto_join:false,avatar_url:null,type},ch=T.type==='channel';let jm=T.join_mode,pm=T.post_mode,aj=!!T.auto_join,photo=null;
  const nm=h('input',{value:T.name,placeholder:ch?'Nom de la chaîne':'Nom du groupe'}),ds=h('textarea',{rows:3,placeholder:'Description'},T.description||''),thumb=h('div',{style:'display:flex;justify-content:center;margin:6px 0 10px'});
  const drawT=()=>fill(thumb,h('div',{class:'avedit',on:{click:async()=>{const f=await pickFile('image/*');if(!f)return;try{photo=await upload(await cropSquare(f),'grp','jpg','image/jpeg');drawT();}catch(e){tip(e.message||'Envoi impossible');}}}},groupAvatar({...T,avatar_url:photo||T.avatar_url},84),h('span',{class:'cam'},ic('fa-camera'))));drawT();
  const seg=(opts,get,set)=>{const w=h('div',{class:'seg'});const d=()=>fill(w,opts.map(([v,l])=>h('button',{type:'button',class:get()===v?'on':'',on:{click:()=>{set(v);d();}}},l)));d();return w;};
  const ajb=h('div',{class:'tg'},h('span',{},'Ajouter automatiquement tous les membres'));const sw=h('input',{type:'checkbox',checked:aj,style:'width:auto;margin:0',on:{change:e=>{aj=e.target.checked;}}});ajb.append(sw);
  sh.append(h('h3',{},g?'Réglages':(ch?'Nouvelle chaîne':'Nouveau groupe')),thumb,nm,h('div',{style:'height:6px'}),ds,h('label',{},'Adhésion'),seg([['open','Libre'],['approval','Sur approbation'],['invite','Sur invitation']],()=>jm,v=>{jm=v;}));
  if(!ch)sh.append(h('label',{},'Qui peut écrire'),seg([['all','Tous les membres'],['admins','Admins seulement']],()=>pm,v=>{pm=v;}));
  if(isAdmin())sh.append(ajb);
  sh.append(h('div',{style:'height:12px'}),h('button',{class:'btn2',style:'width:100%',type:'button',on:{click:async e=>{e.target.disabled=true;let r;
    if(g)r=await sb.rpc('update_group',{p_id:g.id,p_name:nm.value,p_desc:ds.value,p_avatar:photo,p_join_mode:jm,p_post_mode:pm,p_auto_join:aj});
    else r=await sb.rpc('create_group',{p_name:nm.value,p_desc:ds.value,p_type:T.type,p_join_mode:jm,p_post_mode:pm,p_avatar:photo,p_auto_join:aj});
    e.target.disabled=false;if(r.error){tip(r.error.message);return;}close();tip(g?'Enregistré':(ch?'Chaîne créée':'Groupe créé'));ctx.convs=await loadConvs();await drawList(ctx);
    if(!g){const c=ctx.convs.find(x=>x.key==='g:'+r.data);if(c)ctx.open(c);}else if(ctx.cur){const c=ctx.convs.find(x=>x.key===ctx.cur);if(c)ctx.open(c);}}}},g?'Enregistrer':'Créer'));});}

/* ============ DISCUSSION ============ */
async function openChat(ctx,conv){
  const me=ME.id,key=conv.key,isGroup=conv.type!=='dm',g=conv.group,roleAdm=isGroup&&(isAdmin()||['owner','admin'].includes(conv.role)),
    canWrite=conv.type==='dm'||(roleAdm||(conv.type==='group'&&g.post_mode==='all'));
  const C={msgs:[],rx:[],hidden:new Set(),cleared:(conv.rd&&conv.rd.cleared_at)||null,reply:null,edit:null,q:'',more:true,typing:{},members:0};
  let rec=null;
  const sub=h('div',{class:'sub'},'…'),title=isGroup?g.name:nameOf(conv.user);
  const head=h('div',{class:'ch-head'},h('button',{class:'back',type:'button','aria-label':'Retour',on:{click:()=>ctx.showList()}},ic('fa-chevron-left')),
    h('button',{class:'who',type:'button',on:{click:()=>info()}},isGroup?groupAvatar(g,40):avatar(conv.user,40),h('div',{style:'min-width:0'},h('div',{class:'ttl'},title,isGroup?blueB(g,15):goldB(conv.user,15)),sub)),
    h('button',{class:'more',type:'button','aria-label':'Menu',on:{click:()=>menu()}},ic('fa-ellipsis-vertical')));
  const pin=h('div',{class:'pinbar',style:'display:none'}),sbar=h('div',{class:'searchbar',style:'display:none'}),body=h('div',{class:'cbody'}),replyHolder=h('div',{}),emoHolder=h('div',{}),compHolder=h('div',{});
  const wrap=h('div',{style:'display:flex;flex-direction:column;height:100%;min-height:0'},head,pin,sbar,body,replyHolder,emoHolder,compHolder);
  fill(ctx.chat,wrap);
  /* sous-titre */
  const setSub=async()=>{if(!isGroup){sub.textContent='@'+conv.user.username;return;}try{const{data}=await sb.rpc('group_member_count',{gid:g.id});C.members=Number(data)||0;}catch(_){}
    sub.textContent=(conv.type==='channel'?C.members+' abonné'+(C.members>1?'s':''):C.members+' membre'+(C.members>1?'s':''));};
  setSub();
  /* chargement des messages */
  const q0=()=>isGroup?sb.from('messages').select(MCOLS).eq('group_id',g.id).eq('deleted',false):null;
  async function load(older){let rows=[];const before=older&&C.msgs.length?C.msgs[0].created_at:null;
    if(isGroup){let q=q0();if(before)q=q.lt('created_at',before);const{data,error}=await q.order('created_at',{ascending:false}).limit(60);if(error)throw error;rows=data||[];}
    else{const mk=(a,b)=>{let q=sb.from('messages').select(MCOLS).eq('sender',a).eq('dm_to',b).eq('deleted',false);if(before)q=q.lt('created_at',before);return q.order('created_at',{ascending:false}).limit(60);};
      const[x,y]=await Promise.all([mk(me,conv.user.id),mk(conv.user.id,me)]);rows=[...(x.data||[]),...(y.data||[])].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,60);}
    C.more=rows.length>=60;rows.reverse();
    const merged=older?[...rows,...C.msgs]:rows;C.msgs=merged;
    await getProfiles(merged.map(m=>m.sender));const ids=merged.map(m=>m.id).filter(i=>!String(i).startsWith('tmp'));
    if(ids.length){const[r1,r2]=await Promise.all([sb.from('reactions').select('message_id,emoji,user_id').in('message_id',ids),sb.from('hidden_messages').select('message_id').eq('user_id',me).in('message_id',ids)]);C.rx=r1.data||[];C.hidden=new Set((r2.data||[]).map(x=>x.message_id));}
    render(!older);}
  const visible=()=>C.msgs.filter(m=>!C.hidden.has(m.id)&&!BL.has(m.sender)&&!(C.cleared&&m.created_at<=C.cleared)&&(!C.q||(m.body||'').toLowerCase().includes(C.q.toLowerCase())));
  const markRead=debounce(()=>{sb.from('chat_reads').upsert({user_id:me,chat_key:key,last_read:new Date().toISOString()},{onConflict:'user_id,chat_key'}).then(()=>{},()=>{});conv.unread=0;},400);
  /* rendu */
  function render(stick){const arr=visible(),near=body.scrollTop+body.clientHeight>=body.scrollHeight-90,by=new Map(C.msgs.map(m=>[m.id,m]));const out=[];let prev=null;
    if(C.more)out.push(h('button',{class:'older',type:'button',on:{click:async e=>{e.target.disabled=true;const h0=body.scrollHeight;try{await load(true);body.scrollTop=body.scrollHeight-h0;}catch(x){tip(x.message);}}}},'Messages plus anciens'));
    arr.forEach((m,i)=>{const d=new Date(m.created_at);if(!prev||!sameDay(new Date(prev.created_at),d))out.push(h('div',{class:'dsep'},dayLabel(d)));
      if(m.kind==='system'){out.push(h('div',{class:'sysm'},m.body));prev=m;return;}
      const next=arr[i+1],first=!prev||prev.sender!==m.sender||prev.kind==='system'||(d-new Date(prev.created_at))>3e5||!sameDay(d,new Date(prev.created_at)),last=!next||next.sender!==m.sender||(new Date(next.created_at)-d)>3e5||!sameDay(d,new Date(next.created_at));
      out.push(bubble(m,first,last,by));prev=m;});
    if(!arr.length)out.push(h('div',{class:'ml-empty'},C.q?'Aucun message trouvé.':conv.type==='channel'?'Aucune publication pour le moment.':isGroup?'Aucun message. Lance la discussion 👋':'Dis bonjour 👋'));
    fill(body,out);const pm=C.msgs.find(m=>m.pinned);if(pm){pin.style.display='';fill(pin,ic('fa-thumbtack'),h('span',{},h('b',{},'Épinglé'),(pm.body||(pm.kind==='image'?'📷 Photo':'Message'))),h('i',{class:'fa-solid fa-chevron-right',style:'color:var(--rdim)'}));pin.onclick=()=>{const el=body.querySelector('[data-id="'+pm.id+'"]');if(el){el.scrollIntoView({block:'center'});el.classList.add('hl');setTimeout(()=>el.classList.remove('hl'),1600);}};}else pin.style.display='none';
    if(stick||near)body.scrollTop=body.scrollHeight;if(window.scEmojify)window.scEmojify(body);markRead();}
  function bubble(m,first,last,by){const mine=m.sender===me,p=PC.get(m.sender),d=new Date(m.created_at),parts=[];
    if(isGroup&&!mine&&first)parts.push(h('span',{class:'sn',style:'color:'+colorFor(p)},nameOf(p),goldB(p,13)));
    if(m.meta&&m.meta.forwarded)parts.push(h('span',{class:'fw'},'↪ Transféré'));
    const q=m.reply_to&&by.get(m.reply_to);if(q)parts.push(h('span',{class:'qt'},h('b',{},nameOf(PC.get(q.sender))),q.body||(q.kind==='image'?'📷 Photo':q.kind==='audio'?'🎤 Vocal':'Message')));
    if(m.kind==='image'&&m.media_url)parts.push(h('img',{class:'pic',src:m.media_url,loading:'lazy',on:{click:e=>{e.stopPropagation();lightbox(m.media_url);}}}));
    if(m.kind==='audio'&&m.media_url)parts.push(audioEl(m));
    if(m.body&&m.kind!=='audio'){if(C.q){const t=m.body,i=t.toLowerCase().indexOf(C.q.toLowerCase());parts.push(i<0?h('span',{},linkify(t)):h('span',{},t.slice(0,i),h('mark',{},t.slice(i,i+C.q.length)),t.slice(i+C.q.length)));}else parts.push(emojiOnly(m.body)?h('span',{class:'big'},m.body):h('span',{},linkify(m.body)));}
    parts.push(h('span',{class:'tmx'},(m.pinned?'📌 ':'')+(m.edited_at?'modifié · ':'')+hhmm(d)));
    const rm={};C.rx.filter(x=>x.message_id===m.id).forEach(x=>{(rm[x.emoji]=rm[x.emoji]||[]).push(x.user_id);});
    if(Object.keys(rm).length)parts.push(h('div',{class:'rxs'},...Object.entries(rm).map(([e,u])=>h('span',{class:'rx'+(u.includes(me)?' mine':''),on:{click:ev=>{ev.stopPropagation();toggleRx(m,e);}}},e+' '+(u.length>1?u.length:'')))));
    const bub=h('div',{class:'mb','data-id':m.id,on:{click:e=>{if(e.target.closest('a,.rx,.pl'))return;msgMenu(m);}}},...parts);
    return h('div',{class:'mrow '+(mine?'me':'them')+(m.pending?' pending':''),style:first?'margin-top:6px':''},(!mine&&isGroup)?(last?h('span',{onclick:()=>profileSheet(p),style:'cursor:pointer'},avatar(p,30)):h('span',{class:'avs'})):null,bub);}
  function audioEl(m){const a=h('audio',{src:m.media_url,preload:'metadata'}),b=h('button',{class:'pl',type:'button'},ic('fa-play')),bar=h('i'),du=h('span',{class:'du'},fmtDur((m.meta&&m.meta.duration)||0));
    b.addEventListener('click',e=>{e.stopPropagation();if(a.paused){doc.querySelectorAll('audio').forEach(x=>x.pause());a.play().catch(()=>{});}else a.pause();});
    a.addEventListener('play',()=>fill(b,ic('fa-pause')));a.addEventListener('pause',()=>fill(b,ic('fa-play')));a.addEventListener('timeupdate',()=>{if(a.duration)bar.style.width=(a.currentTime/a.duration*100)+'%';});a.addEventListener('ended',()=>{bar.style.width='0';fill(b,ic('fa-play'));});
    a.addEventListener('loadedmetadata',()=>{if(isFinite(a.duration)&&!(m.meta&&m.meta.duration))du.textContent=fmtDur(a.duration);});return h('div',{class:'aud'},b,h('div',{class:'bar'},bar),du,a);}
  const fmtDur=s=>{s=Math.round(s||0);return Math.floor(s/60)+':'+pad(s%60);};
  /* actions sur un message */
  async function toggleRx(m,e){const mine=C.rx.find(x=>x.message_id===m.id&&x.user_id===me&&x.emoji===e);
    if(mine){C.rx=C.rx.filter(x=>x!==mine);render();await sb.from('reactions').delete().eq('message_id',m.id).eq('user_id',me).eq('emoji',e);}
    else{C.rx.push({message_id:m.id,user_id:me,emoji:e});render();const{error}=await sb.from('reactions').insert({message_id:m.id,user_id:me,emoji:e});if(error)tip(error.message);}}
  function msgMenu(m){if(String(m.id).startsWith('tmp'))return;const mine=m.sender===me;sheet((sh,close)=>{
    sh.append(h('div',{class:'qrx'},...['👍','❤️','😂','😮','😢','🙏'].map(e=>h('button',{type:'button',on:{click:()=>{close();toggleRx(m,e);}}},e))));
    const row=(i,t,f,cls)=>h('button',{class:'row '+(cls||''),type:'button',on:{click:()=>{close();f();}}},ic(i),t);
    if(canWrite)sh.append(row('fa-reply','Répondre',()=>setReply(m)));
    if(m.body)sh.append(row('fa-copy','Copier',()=>copy(m.body)));
    sh.append(row('fa-share','Transférer',()=>forward(m)));
    if(roleAdm&&isGroup)sh.append(row('fa-thumbtack',m.pinned?'Désépingler':'Épingler',async()=>{const{error}=await sb.rpc('pin_message',{p_id:m.id,p_on:!m.pinned});if(error)tip(error.message);else load();}));
    if(!mine)sh.append(row('fa-user','Voir le profil',()=>profileSheet(PC.get(m.sender))));
    if(mine&&m.kind==='text'&&canWrite)sh.append(row('fa-pen','Modifier',()=>startEdit(m)));
    sh.append(row('fa-eye-slash','Supprimer pour moi',async()=>{C.hidden.add(m.id);render();await sb.from('hidden_messages').insert({user_id:me,message_id:m.id});}));
    if(mine||roleAdm)sh.append(row('fa-trash','Supprimer pour tous',async()=>{if(!confirm('Supprimer ce message pour tous ?'))return;const{error}=await sb.rpc('delete_message',{p_id:m.id});if(error)tip(error.message);else{C.msgs=C.msgs.filter(x=>x.id!==m.id);render();}},'danger'));
    if(!mine)sh.append(row('fa-flag','Signaler',async()=>{const{error}=await sb.from('reports').insert({reporter:me,message_id:m.id,reason:'Signalé depuis la messagerie'});tip(error?error.message:'Merci, le message a été signalé');},'danger'));});}
  function forward(m){sheet((sh,close)=>{sh.append(h('h3',{},'Transférer à…'));const targets=ctx.convs.filter(c=>c.type==='dm'||c.type==='group'&&(c.group.post_mode==='all'||isAdmin()||['owner','admin'].includes(c.role))||c.type==='channel'&&(isAdmin()||['owner','admin'].includes(c.role)));
    sh.append(...targets.map(c=>h('div',{class:'urow',style:'cursor:pointer',on:{click:async()=>{close();const row={sender:me,body:m.body,kind:m.kind,media_url:m.media_url,meta:{...(m.meta||{}),forwarded:true}};if(c.type==='dm')row.dm_to=c.user.id;else row.group_id=c.group.id;const{error}=await sb.from('messages').insert(row);tip(error?error.message:'Message transféré');}}},c.type==='dm'?avatar(c.user,40):groupAvatar(c.group,40),h('div',{class:'l'},h('div',{class:'n'},c.type==='dm'?nameOf(c.user):c.group.name)))));});}
  const setReply=m=>{C.reply=m;C.edit=null;drawBars();ta&&ta.focus();};
  const startEdit=m=>{C.edit=m;C.reply=null;drawBars();ta.value=m.body;autoGrow();ta.focus();};
  function drawBars(){if(C.edit)fill(replyHolder,h('div',{class:'replybar'},ic('fa-pen'),h('div',{class:'qq'},h('b',{},'Modifier le message'),C.edit.body),h('button',{type:'button',on:{click:()=>{C.edit=null;ta.value='';autoGrow();drawBars();}}},ic('fa-xmark'))));
    else if(C.reply)fill(replyHolder,h('div',{class:'replybar'},ic('fa-reply'),h('div',{class:'qq'},h('b',{},nameOf(PC.get(C.reply.sender))),C.reply.body||(C.reply.kind==='image'?'📷 Photo':'Message')),h('button',{type:'button',on:{click:()=>{C.reply=null;drawBars();}}},ic('fa-xmark'))));else fill(replyHolder);}
  /* compositeur */
  let ta=null,sendBtn=null,lastTyping=0;
  const autoGrow=()=>{if(!ta)return;ta.style.height='auto';ta.style.height=Math.min(120,ta.scrollHeight)+'px';updBtn();};
  const updBtn=()=>{if(!sendBtn)return;const has=ta.value.trim().length>0||C.edit;sendBtn.className='send'+(has?'':' rec');fill(sendBtn,ic(has?'fa-paper-plane':'fa-microphone'));};
  function buildComposer(){if(!canWrite){fill(compHolder,h('div',{class:'roview'},conv.type==='channel'?'Seuls les administrateurs publient dans cette chaîne.':'Seuls les administrateurs peuvent écrire dans ce groupe.'));return;}
    ta=h('textarea',{rows:1,placeholder:'Message',on:{input:()=>{autoGrow();typing();},keydown:e=>{if(e.key==='Enter'&&!e.shiftKey&&matchMedia('(pointer:fine)').matches){e.preventDefault();sendText();}}}});
    sendBtn=h('button',{class:'send rec',type:'button','aria-label':'Envoyer',on:{click:()=>{if(ta.value.trim()||C.edit)sendText();else startRec();}}},ic('fa-microphone'));
    fill(compHolder,h('div',{class:'composer'},h('button',{class:'ib2',type:'button','aria-label':'Émojis',on:{click:toggleEmo}},ic('fa-face-smile')),h('button',{class:'ib2',type:'button','aria-label':'Photo',on:{click:sendPhoto}},ic('fa-image')),ta,sendBtn));updBtn();}
  buildComposer();
  function toggleEmo(){if(emoHolder.firstChild){fill(emoHolder);return;}const grid=h('div',{class:'emogrid'}),tabs=h('div',{class:'emotabs'});
    const show=k=>{fill(grid,EMO[k].split(' ').map(e=>h('button',{type:'button',on:{click:()=>{const s=ta.selectionStart||ta.value.length;ta.value=ta.value.slice(0,s)+e+ta.value.slice(ta.selectionEnd||s);ta.selectionStart=ta.selectionEnd=s+e.length;autoGrow();ta.focus();}}},e)));tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));if(window.scEmojify)window.scEmojify(grid);};
    fill(tabs,Object.keys(EMO).map(k=>h('button',{type:'button','data-k':k,on:{click:()=>show(k)}},k)));fill(emoHolder,h('div',{class:'emopanel'},tabs,grid));show(Object.keys(EMO)[0]);}
  async function send(row){const tmp={id:'tmp'+Date.now(),sender:me,created_at:new Date().toISOString(),pending:true,deleted:false,meta:{},...row};C.msgs.push(tmp);render(true);
    const ins={sender:me,kind:'text',...row};if(isGroup)ins.group_id=g.id;else ins.dm_to=conv.user.id;const{error}=await sb.from('messages').insert(ins);
    if(error){C.msgs=C.msgs.filter(x=>x!==tmp);render();tip(error.message);return false;}load();return true;}
  async function sendText(){const txt=ta.value.trim();if(C.edit){const m=C.edit;if(!txt)return;const{error}=await sb.from('messages').update({body:txt,edited_at:new Date().toISOString()}).eq('id',m.id);C.edit=null;ta.value='';autoGrow();drawBars();if(error)tip(error.message);else load();return;}
    if(!txt)return;const rep=C.reply;ta.value='';C.reply=null;drawBars();autoGrow();await send({body:txt,reply_to:rep?rep.id:null});}
  async function sendPhoto(){const f=await pickFile('image/*');if(!f)return;try{tip('Envoi de la photo…');const url=await upload(await fitImage(f),'img','jpg','image/jpeg');await send({kind:'image',media_url:url,body:null,reply_to:C.reply?C.reply.id:null});C.reply=null;drawBars();}catch(e){tip(e.message||'Envoi impossible');}}
  /* message vocal */
  async function startRec(){if(!navigator.mediaDevices||!window.MediaRecorder){tip('Les messages vocaux ne sont pas pris en charge ici.');return;}
    let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}catch(_){tip('Autorise le micro pour enregistrer un vocal.');return;}
    const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'',mr=new MediaRecorder(stream,mime?{mimeType:mime}:undefined),chunks=[],t0=Date.now();
    mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};rec={mr,stream,send:true};const timer=h('span',{},'0:00'),iv=setInterval(()=>{timer.textContent=fmtDur((Date.now()-t0)/1000);},500);
    const stop=ok=>{rec.send=ok;clearInterval(iv);mr.stop();};
    mr.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());buildComposer();const dur=(Date.now()-t0)/1000;if(!rec||!rec.send||dur<1){rec=null;return;}rec=null;
      try{tip('Envoi du vocal…');const base=(mr.mimeType||'audio/webm').split(';')[0],ext=base.includes('mp4')?'m4a':base.includes('ogg')?'ogg':'webm',url=await upload(new Blob(chunks,{type:base}),'voice',ext,base);await send({kind:'audio',media_url:url,body:null,meta:{duration:Math.round(dur)}});}catch(e){tip(e.message||'Envoi impossible');}};
    mr.start();fill(compHolder,h('div',{class:'composer'},h('div',{class:'recbar'},h('span',{class:'dot'}),timer,h('button',{class:'cx',type:'button',on:{click:()=>stop(false)}},'Annuler')),h('button',{class:'send',type:'button','aria-label':'Envoyer le vocal',on:{click:()=>stop(true)}},ic('fa-paper-plane'))));}
  /* « en train d'écrire » */
  const typing=()=>{if(!TY||Date.now()-lastTyping<2500)return;lastTyping=Date.now();try{TY.send({type:'broadcast',event:'typing',payload:{uid:me,name:nameOf(ME)}});}catch(_){}};
  const showTyping=()=>{const now=Date.now(),who=Object.entries(C.typing).filter(([,t])=>now-t.t<3500).map(([,t])=>t.name.split(' ')[0]);if(who.length){sub.className='sub ty';sub.textContent=isGroup?who.join(', ')+' écrit…':'écrit…';}else{sub.className='sub';setSub();}};
  /* menu et infos */
  function menu(){sheet((sh,close)=>{const row=(i,t,f,cls)=>h('button',{class:'row '+(cls||''),type:'button',on:{click:()=>{close();f();}}},ic(i),t);
    sh.append(row('fa-circle-info',isGroup?'Infos du groupe':'Voir le profil',()=>info()),row('fa-magnifying-glass','Rechercher',()=>{sbar.style.display='';const i=h('input',{placeholder:'Rechercher dans la discussion',value:C.q,on:{input:debounce(e=>{C.q=e.target.value.trim();render();},200)}});fill(sbar,i,h('button',{class:'ib2',style:'border:0;background:none;color:var(--rdim);font-size:18px',type:'button',on:{click:()=>{C.q='';sbar.style.display='none';render();}}},ic('fa-xmark')));i.focus();}),
      row(conv.rd&&conv.rd.muted?'fa-bell':'fa-bell-slash',conv.rd&&conv.rd.muted?'Réactiver les notifications':'Mettre en sourdine',async()=>{const v=!(conv.rd&&conv.rd.muted);conv.rd={...(conv.rd||{}),muted:v};await sb.from('chat_reads').upsert({user_id:me,chat_key:key,muted:v},{onConflict:'user_id,chat_key'});tip(v?'Discussion en sourdine':'Notifications réactivées');}),
      row('fa-thumbtack',conv.rd&&conv.rd.pinned?'Désépingler la discussion':'Épingler la discussion',async()=>{const v=!(conv.rd&&conv.rd.pinned);conv.rd={...(conv.rd||{}),pinned:v};await sb.from('chat_reads').upsert({user_id:me,chat_key:key,pinned:v},{onConflict:'user_id,chat_key'});tip(v?'Discussion épinglée':'Discussion désépinglée');}),
      row('fa-file-export','Exporter la discussion',exportChat),row('fa-eraser','Effacer la discussion',async()=>{if(!confirm('Effacer cette discussion pour toi ? Les autres membres la gardent.'))return;const t=new Date().toISOString();C.cleared=t;await sb.from('chat_reads').upsert({user_id:me,chat_key:key,cleared_at:t,last_read:t},{onConflict:'user_id,chat_key'});conv.rd={...(conv.rd||{}),cleared_at:t};render();tip('Discussion effacée');},'danger'));
    if(isGroup&&!g.is_general)sh.append(row('fa-right-from-bracket','Quitter',async()=>{if(!confirm('Quitter « '+g.name+' » ?'))return;const{error}=await sb.rpc('leave_group',{p_id:g.id});if(error)tip(error.message);else{ctx.showList();}},'danger'));});}
  async function exportChat(){tip('Préparation de l’export…');let rows=[];
    if(isGroup){const{data}=await sb.from('messages').select(MCOLS).eq('group_id',g.id).eq('deleted',false).order('created_at',{ascending:true}).limit(5000);rows=data||[];}
    else{const[x,y]=await Promise.all([sb.from('messages').select(MCOLS).eq('sender',me).eq('dm_to',conv.user.id).eq('deleted',false).order('created_at',{ascending:true}).limit(3000),sb.from('messages').select(MCOLS).eq('sender',conv.user.id).eq('dm_to',me).eq('deleted',false).order('created_at',{ascending:true}).limit(3000)]);rows=[...(x.data||[]),...(y.data||[])].sort((a,b)=>a.created_at.localeCompare(b.created_at));}
    await getProfiles(rows.map(m=>m.sender));const lines=['Discussion « '+title+' » — exportée le '+new Date().toLocaleString('fr-FR'),''].concat(rows.filter(m=>!(C.cleared&&m.created_at<=C.cleared)).map(m=>{const d=new Date(m.created_at);return '['+pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+hhmm(d)+'] '+nameOf(PC.get(m.sender))+' : '+(m.kind==='image'?'[photo] '+(m.media_url||''):m.kind==='audio'?'[vocal] '+(m.media_url||''):(m.body||''));}));
    const a=h('a',{href:URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'})),download:'discussion-'+title.replace(/[^\w-]+/g,'_')+'.txt'});doc.body.append(a);a.click();a.remove();tip('Discussion exportée');}
  function info(){if(!isGroup){profileSheet(conv.user,ctx);return;}groupInfo(ctx,conv,{C,reload:()=>load(),setSub});}
  /* temps réel */
  stopRT();const reload=debounce(()=>{load().catch(()=>{});},250);
  RT=sb.channel('chat-'+key+'-'+Date.now()).on('postgres_changes',{event:'*',schema:'public',table:'messages'},p=>{const m=p.new||{};if(m.id&&(isGroup?m.group_id!==g.id:!((m.sender===me&&m.dm_to===conv.user.id)||(m.sender===conv.user.id&&m.dm_to===me))))return;reload();}).on('postgres_changes',{event:'*',schema:'public',table:'reactions'},reload).subscribe();
  TY=sb.channel('typing-'+key).on('broadcast',{event:'typing'},p=>{const d=p.payload||p;if(!d||d.uid===me)return;C.typing[d.uid]={t:Date.now(),name:d.name||'Quelqu’un'};showTyping();setTimeout(showTyping,3700);}).subscribe();
  try{await load();}catch(e){fill(body,h('div',{class:'ml-empty'},'Erreur : '+((e&&e.message)||e)));}
  if(window.scEmojify)window.scEmojify(wrap);}

/* ============ INFOS DU GROUPE ============ */
async function groupInfo(ctx,conv,api){const g=conv.group,me=ME.id,adm=isAdmin()||['owner','admin'].includes(conv.role),ch=g.type==='channel';
  const pane=h('div',{style:'display:flex;flex-direction:column;height:100%;min-height:0'}),prevChildren=[...ctx.chat.childNodes];
  const back=()=>{fill(ctx.chat,prevChildren);};
  const body=h('div',{class:'info'});fill(pane,h('div',{class:'ch-head'},h('button',{class:'back',style:'display:block',type:'button',on:{click:back}},ic('fa-chevron-left')),h('div',{class:'ttl',style:'flex:1'},ch?'Infos de la chaîne':'Infos du groupe')),body);fill(ctx.chat,pane);
  async function draw(){const{data:gg}=await sb.from('groups').select('*').eq('id',g.id).maybeSingle();Object.assign(g,gg||{});
    const{data:cnt}=await sb.rpc('group_member_count',{gid:g.id});const n=Number(cnt)||0;
    let members=[],reqs=[];
    if(!ch||adm){const{data:mm}=await sb.from('group_members').select('user_id,role').eq('group_id',g.id).limit(500);members=mm||[];await getProfiles(members.map(x=>x.user_id));}
    if(adm&&g.join_mode==='approval'){const{data:rq}=await sb.from('join_requests').select('user_id,created_at').eq('group_id',g.id).eq('status','pending');reqs=rq||[];await getProfiles(reqs.map(x=>x.user_id));}
    const link=location.origin+'/?g='+g.invite_code,muted=!!(conv.rd&&conv.rd.muted);
    const avWrap=h('div',{class:adm?'avedit':'',on:adm?{click:async()=>{const f=await pickFile('image/*');if(!f)return;try{const url=await upload(await cropSquare(f),'grp','jpg','image/jpeg');const{error}=await sb.rpc('update_group',{p_id:g.id,p_name:g.name,p_desc:g.description,p_avatar:url,p_join_mode:g.join_mode,p_post_mode:g.post_mode,p_auto_join:g.auto_join});if(error)tip(error.message);else{tip('Photo mise à jour');draw();}}catch(e){tip(e.message||'Envoi impossible');}}}:{}},groupAvatar(g,112),adm?h('span',{class:'cam'},ic('fa-camera')):null);
    const act=(i,t,f)=>h('button',{type:'button',on:{click:f}},ic(i),t);
    const mrow=m=>{const p=PC.get(m.user_id);return h('button',{class:'mem',type:'button',on:{click:()=>profileSheet(p,ctx,{group:g,role:m.role,canManage:adm,after:draw})}},avatar(p,44),h('div',{class:'l'},h('div',{class:'n'},nameOf(p),goldB(p,14)),h('div',{class:'u'},'@'+(p&&p.username))),m.role!=='member'?h('span',{class:'pillr'},m.role==='owner'?'Propriétaire':'Admin'):null);};
    const media=api.C.msgs.filter(m=>m.kind==='image'&&m.media_url).slice(-9).reverse();
    fill(body,h('div',{class:'ihero'},avWrap,h('div',{class:'nm'},g.name,blueB(g,20)),h('div',{class:'sb'},(ch?'Chaîne · '+n+' abonné'+(n>1?'s':''):'Groupe · '+n+' membre'+(n>1?'s':'')))),
      h('div',{class:'iacts'},act(muted?'fa-bell':'fa-bell-slash',muted?'Réactiver':'Sourdine',async()=>{conv.rd={...(conv.rd||{}),muted:!muted};await sb.from('chat_reads').upsert({user_id:me,chat_key:conv.key,muted:!muted},{onConflict:'user_id,chat_key'});draw();}),act('fa-share-nodes','Partager',()=>share(g.name,'Rejoins « '+g.name+' » sur Snow Cloud Chek',link)),adm?act('fa-sliders','Réglages',()=>groupForm(ctx,g.type,g)):null),
      g.description?h('div',{},h('div',{class:'sec'},'Description'),h('div',{class:'box3'},h('p',{},g.description))):null,
      h('div',{class:'sec'},'Lien d’invitation'),h('div',{class:'box3'},h('div',{class:'linkbox'},ic('fa-link'),h('code',{},link.replace(/^https?:\/\//,'')),h('button',{class:'icb g',style:'width:36px;height:36px',type:'button','aria-label':'Copier',on:{click:()=>copy(link)}},ic('fa-copy')),
        adm?h('button',{class:'icb g',style:'width:36px;height:36px',type:'button','aria-label':'Nouveau lien',on:{click:async()=>{if(!confirm('Générer un nouveau lien ? L’ancien ne fonctionnera plus.'))return;const{error}=await sb.rpc('regen_invite',{p_id:g.id});if(error)tip(error.message);else draw();}}},ic('fa-rotate')):null)),
      reqs.length?h('div',{class:'reqs'},h('div',{class:'sec'},'Demandes d’adhésion ('+reqs.length+')'),h('div',{class:'box3'},...reqs.map(r=>{const p=PC.get(r.user_id);return h('div',{class:'urow',style:'padding:10px 14px'},avatar(p,40),h('div',{class:'l'},h('div',{class:'n'},nameOf(p)),h('div',{class:'u'},'@'+(p&&p.username))),
        h('button',{class:'join-btn',type:'button',on:{click:async()=>{const{error}=await sb.rpc('review_join',{p_group:g.id,p_user:r.user_id,p_ok:true});if(error)tip(error.message);else{tip('Membre accepté');draw();}}}},'Accepter'),h('button',{class:'join-btn w',style:'margin-left:6px',type:'button',on:{click:async()=>{const{error}=await sb.rpc('review_join',{p_group:g.id,p_user:r.user_id,p_ok:false});if(error)tip(error.message);else draw();}}},'Refuser'));}))):null,
      media.length?h('div',{},h('div',{class:'sec'},'Médias'),h('div',{class:'box3'},h('div',{class:'gal'},...media.map(m=>h('img',{src:m.media_url,alt:'',loading:'lazy',on:{click:()=>lightbox(m.media_url)}}))))):null,
      (!ch||adm)?h('div',{},h('div',{class:'sec'},ch?'Administrateurs':'Membres ('+n+')'),h('div',{class:'box3'},...(ch?members.filter(m=>m.role!=='member'):members).sort((a,b)=>({owner:0,admin:1,member:2}[a.role]-{owner:0,admin:1,member:2}[b.role])||nameOf(PC.get(a.user_id)).localeCompare(nameOf(PC.get(b.user_id)))).map(mrow))):null,
      h('div',{class:'sec'},'Actions'),h('div',{class:'box3'},!g.is_general?h('button',{class:'rowb danger',type:'button',on:{click:async()=>{if(!confirm('Quitter « '+g.name+' » ?'))return;const{error}=await sb.rpc('leave_group',{p_id:g.id});if(error)tip(error.message);else ctx.showList();}}},ic('fa-right-from-bracket'),'Quitter'):null,
        isAdmin()&&!g.is_general?h('button',{class:'rowb danger',type:'button',on:{click:async()=>{if(!confirm('Supprimer définitivement « '+g.name+' » et tous ses messages ?'))return;const{error}=await sb.rpc('delete_group',{p_id:g.id});if(error)tip(error.message);else{tip('Supprimé');ctx.showList();}}}},ic('fa-trash'),'Supprimer '+(ch?'la chaîne':'le groupe')):null));
    if(window.scEmojify)window.scEmojify(body);}
  try{await draw();}catch(e){fill(body,h('div',{class:'ml-empty'},'Erreur : '+((e&&e.message)||e)));}}

/* ============ FICHE D'UN MEMBRE ============ */
function profileSheet(p,ctx,opt){if(!p)return;opt=opt||{};sheet((sh,close)=>{const self=p.id===ME.id,blocked=BL.has(p.id);
  sh.append(h('div',{class:'ihero',style:'padding-top:6px'},avatar(p,104),h('div',{class:'nm'},nameOf(p),goldB(p,20)),h('div',{class:'sb'},'@'+p.username),p.bio?h('p',{style:'margin:10px 0 0;font:450 .95rem/1.4 Inter'},p.bio):null,p.created_at?h('div',{class:'sb',style:'margin-top:8px'},'Membre depuis '+monthYear(p.created_at)):null));
  if(!self){const row=(i,t,f,cls)=>h('button',{class:'row '+(cls||''),type:'button',on:{click:()=>{close();f();}}},ic(i),t);
    if(ctx&&ctx.open)sh.append(row('fa-comment','Envoyer un message',()=>ctx.open({key:'u:'+p.id,type:'dm',user:p,unread:0,rd:{}})));
    if(opt.canManage&&opt.group){if(opt.role!=='owner'){sh.append(row(opt.role==='admin'?'fa-user-minus':'fa-user-shield',opt.role==='admin'?'Retirer des admins':'Nommer admin',async()=>{const{error}=await sb.rpc('set_member_role',{p_group:opt.group.id,p_user:p.id,p_role:opt.role==='admin'?'member':'admin'});if(error)tip(error.message);else{tip('Rôle mis à jour');opt.after&&opt.after();}}));
      sh.append(row('fa-user-xmark','Retirer du groupe',async()=>{if(!confirm('Retirer '+nameOf(p)+' ?'))return;const{error}=await sb.rpc('remove_member',{p_group:opt.group.id,p_user:p.id});if(error)tip(error.message);else{tip('Membre retiré');opt.after&&opt.after();}},'danger'));}}
    sh.append(row(blocked?'fa-user-check':'fa-ban',blocked?'Débloquer':'Bloquer',async()=>{if(blocked){await sb.from('blocks').delete().eq('blocker',ME.id).eq('blocked',p.id);BL.delete(p.id);tip('Utilisateur débloqué');}else{await sb.from('blocks').insert({blocker:ME.id,blocked:p.id});BL.add(p.id);tip('Utilisateur bloqué');}},'danger'));}});}
})();
