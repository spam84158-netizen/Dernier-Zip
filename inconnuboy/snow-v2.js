/* Snow Cloud Chek — lot 1 : thème, emojis iPhone, vidéos, logos de résultat, écran de résultat. Chargé après shell.js. */
(()=>{'use strict';
const LS=localStorage,doc=document,$=(s,r=doc)=>r.querySelector(s),$$=(s,r=doc)=>[...r.querySelectorAll(s)];
const h=(n,a={},...c)=>{const e=doc.createElement(n);for(const k in a){const v=a[k];if(v==null||v===false)continue;if(k==='on'){for(const ev in v)e.addEventListener(ev,v[ev]);}else if(k==='class')e.className=v;else if(k==='style')e.style.cssText=v;else e.setAttribute(k,v===true?'':v);}
  c.flat(9).forEach(x=>{if(x==null||x===false)return;e.append(x.nodeType?x:doc.createTextNode(String(x)));});return e;};
const html=(s)=>{const t=doc.createElement('template');t.innerHTML=s.trim();return t.content.firstChild;};
const tip=m=>{const d=h('div',{class:'v2toast'},m);doc.body.append(d);setTimeout(()=>d.remove(),2800);};
const pad=n=>String(n).padStart(2,'0');
const fmtDate=d=>d.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})+' · '+pad(d.getHours())+':'+pad(d.getMinutes());
const shortDate=d=>d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
const usd=n=>'$'+Number(n||0).toFixed(2);
const fill=(box,...c)=>box.replaceChildren(...c.flat(9).filter(x=>x!=null&&x!==false));
const debounce=(f,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>f(...a),ms);};};

window.SCKit={h,$,$$,tip,html,fill,debounce,pad,fmtDate,get pickFile(){return pickFile;},get squarePng(){return squarePng;},get setTheme(){return setTheme;},get themePref(){return themePref;}};

/* ============ THÈME CLAIR / SOMBRE / AUTO ============ */
const sysDark=()=>!!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
const themePref=()=>LS.getItem('sc-theme')||'light';
function applyTheme(){const p=themePref(),dark=p==='dark'||(p==='auto'&&sysDark());doc.documentElement.dataset.theme=dark?'dark':'light';
  let m=$('meta[name=theme-color]');if(!m){m=h('meta',{name:'theme-color'});doc.head.append(m);}m.content=dark?'#0b0f17':'#f5f7fb';
  const i=$('#sctop .themebtn i');if(i)i.className='fa-solid '+(dark?'fa-sun':'fa-moon');
  $$('.topt').forEach(b=>b.classList.toggle('on',b.dataset.t===p));}
const setTheme=p=>{LS.setItem('sc-theme',p);applyTheme();};
applyTheme();if(window.matchMedia)try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(themePref()==='auto')applyTheme();});}catch(_){}
function ensureThemeBtn(){const top=$('#sctop');if(!top||top.querySelector('.themebtn'))return;
  const b=h('button',{class:'themebtn',title:'Thème clair / sombre','aria-label':'Changer de thème',on:{click:()=>setTheme(doc.documentElement.dataset.theme==='dark'?'light':'dark')}},h('i',{class:'fa-solid fa-moon'}));
  top.insertBefore(b,top.children[2]||null);applyTheme();}
{const top=$('#sctop');ensureThemeBtn();new MutationObserver(ensureThemeBtn).observe(top||doc.body,{childList:true,subtree:!top});}

/* ============ EMOJIS STYLE iPHONE (partout, sur tous les appareils) ============ */
// Jeu d'images : 'apple' (rendu iPhone). Pour changer : window.SC_EMOJI_SET='google' | 'twitter' | 'facebook' | 'native' (désactive)
const EMO_SET=()=>window.SC_EMOJI_SET||'apple';
const EMO_URL=(set,code)=>`https://cdn.jsdelivr.net/npm/emoji-datasource-${set}@15.1.2/img/${set}/64/${code}.png`;
const EMO_RE=/(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F)\p{Emoji_Modifier}?(?:\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})\uFE0F?\p{Emoji_Modifier}?)*)/gu;
const cps=s=>[...s].map(c=>c.codePointAt(0).toString(16).padStart(4,'0'));
const EMO_FAIL=new Set();
const emoText=ch=>h('span',{class:'no-emo'},ch);
function emoImg(ch){if(EMO_FAIL.has(ch))return emoText(ch);const set=EMO_SET(),full=cps(ch),noVS=full.filter(x=>x!=='fe0f');
  const tries=[...new Set([full.join('-'),noVS.join('-'),noVS.join('-')+'-fe0f'])];let i=0;
  const img=h('img',{class:'emo-img',alt:ch,draggable:'false',decoding:'async'});
  img.addEventListener('error',()=>{i++;if(i<tries.length)img.src=EMO_URL(set,tries[i]);else{EMO_FAIL.add(ch);img.replaceWith(emoText(ch));}});
  img.src=EMO_URL(set,tries[0]);return img;}
const SKIP='SCRIPT,STYLE,TEXTAREA,INPUT,SELECT,OPTION,CODE,PRE,NOSCRIPT,SVG,.emo-img,.no-emo';
function emojify(root){if(EMO_SET()==='native'||!root)return;
  const w=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||p.closest(SKIP))return NodeFilter.FILTER_REJECT;EMO_RE.lastIndex=0;return EMO_RE.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
  const list=[];while(w.nextNode())list.push(w.currentNode);
  list.forEach(n=>{const t=n.nodeValue,frag=doc.createDocumentFragment();let last=0;EMO_RE.lastIndex=0;let m;
    while((m=EMO_RE.exec(t))){if(m.index>last)frag.append(t.slice(last,m.index));frag.append(emoImg(m[0]));last=m.index+m[0].length;}
    if(last<t.length)frag.append(t.slice(last));n.replaceWith(frag);});}
{let q=new Set(),busy=false;const run=()=>{busy=false;const a=[...q];q=new Set();a.forEach(n=>{if(n.isConnected)emojify(n);});};
 new MutationObserver(ms=>{ms.forEach(m=>{m.addedNodes.forEach(n=>{if(n.nodeType===1)q.add(n);else if(n.nodeType===3&&n.parentElement)q.add(n.parentElement);});if(m.type==='characterData'&&m.target.parentElement)q.add(m.target.parentElement);});
  if(!busy&&q.size){busy=true;(window.requestIdleCallback||setTimeout)(run,{timeout:300});}}).observe(doc.body,{childList:true,subtree:true,characterData:true});
 emojify(doc.body);}
window.scEmojify=emojify;

/* ============ PASTILLES « Actif / Banni » dans les listes ============ */
const normChips=root=>root.querySelectorAll&&root.querySelectorAll('.status-chip').forEach(c=>{const t=c.textContent.trim().toUpperCase();if(t==='NON BANNI')c.textContent='Actif';else if(t==='BANNI')c.textContent='Banni';});
['recentList','histList'].forEach(id=>{const el=doc.getElementById(id);if(el){normChips(el);new MutationObserver(()=>normChips(el)).observe(el,{childList:true});}});

/* ============ SESSION (facultative) + gains renvoyés par le serveur ============ */
const SC=window.SC,sb=SC&&SC.sb;
window.__scReward=null;
const _fetch=window.fetch.bind(window);
const sameOrigin=u=>u.startsWith('/')||u.startsWith(location.origin);
const UPSTREAM='https://inconnu-check-ban-api.onrender.com';
const fetchT=(url,opts,ms)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);return _fetch(url,{...opts,signal:c.signal}).finally(()=>clearTimeout(t));};
window.fetch=async function(input,init){
  const url=typeof input==='string'?input:(input&&input.url)||'';
  if(!/\/api\/check(\?|$)/.test(url)||!init||String(init.method||'GET').toUpperCase()!=='POST'||!sameOrigin(url))return _fetch(input,init);
  const headers=new Headers(init.headers||{});
  if(sb){try{const r=await Promise.race([sb.auth.getSession(),new Promise(res=>setTimeout(()=>res(null),1500))]);const tk=r&&r.data&&r.data.session&&r.data.session.access_token;if(tk)headers.set('Authorization','Bearer '+tk);}catch(_){}}
  // 1) via le serveur du site (gains, mémoire, reprises) — jamais plus de 32 s
  const ctl=new AbortController(),us=init.signal,tm=setTimeout(()=>ctl.abort(),32000);
  if(us){if(us.aborted)ctl.abort();else us.addEventListener('abort',()=>ctl.abort(),{once:true});}
  let res=null;
  try{res=await _fetch(input,{...init,headers,signal:ctl.signal});}catch(e){if(us&&us.aborted){clearTimeout(tm);throw e;}}
  clearTimeout(tm);
  if(res&&res.status!==429&&res.status<500){try{const d=await res.clone().json();window.__scReward=(d&&d.reward)||null;}catch(_){window.__scReward=null;}return res;}
  // 2) repli : le navigateur interroge directement l'API (depuis l'adresse de l'utilisateur)
  try{const raw=JSON.parse(init.body||'{}'),digits=String(raw.number||'').replace(/\D/g,'');
    if(digits.length>=8&&digits.length<=15){const r2=await fetchT(UPSTREAM+'/check',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({number:'+'+digits})},15000);
      if(r2.ok){const d2=await r2.json();if(d2&&typeof d2.banned==='boolean'&&!d2.error){window.__scReward=null;
        return new Response(JSON.stringify({success:true,number:'+'+digits,banned:d2.banned,status:d2.banned?'banned':'not_banned',reason:typeof d2.reason==='string'?d2.reason:'',checkedAt:new Date().toISOString(),reward:{status:'direct'},via:'direct'}),{status:200,headers:{'Content-Type':'application/json'}});}}}}catch(_){}
  if(res)return res;
  throw new TypeError('Service de vérification injoignable');};
// Réveille le service de vérification (Render s'endort) : à l'ouverture, puis au retour sur l'onglet
{let last=0;const warm=()=>{if(Date.now()-last<3e5)return;last=Date.now();_fetch('/api/check',{method:'GET'}).catch(()=>{});};warm();doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible')warm();});}
let authorName=null;
async function whoAmI(){if(authorName)return authorName;try{const u=SC&&SC.me&&SC.me();if(!u||!sb)return null;const{data}=await sb.from('profiles').select('username,display_name').eq('id',u.id).maybeSingle();
  if(data&&data.username){authorName='@'+data.username;return authorName;}if(data&&data.display_name){authorName=data.display_name;return authorName;}}catch(_){}return null;}
if(sb)sb.auth.onAuthStateChange(()=>{authorName=null;});

/* ============ FOND D'ÉCRAN : image OU vidéo (+ vidéo par défaut) ============ */
const DEFAULT_BG='./videos/accueil.mp4';
const idb=(()=>{let p;const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('snow-v2',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));
  const tx=(m,f)=>open().then(db=>new Promise((res,rej)=>{const t=db.transaction('kv',m),s=t.objectStore('kv'),q=f(s);t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);}));
  return{get:k=>tx('readonly',s=>s.get(k)),set:(k,v)=>tx('readwrite',s=>s.put(v,k)),del:k=>tx('readwrite',s=>s.delete(k))};})();
const bgVid=h('video',{id:'scBgVid',muted:'',loop:'',playsinline:'','webkit-playsinline':'',preload:'auto','aria-hidden':'true'});bgVid.muted=true;
const sndBtn=h('button',{id:'scSnd','aria-label':'Activer ou couper le son du fond',on:{click:()=>{LS.setItem('sc-bgsound',bgVid.muted?'1':'0');bgVid.muted=!bgVid.muted;paintSnd();}}},h('i',{class:'fa-solid fa-volume-xmark'}));
{const pic=$('#bgPhoto');(pic?pic.after.bind(pic):doc.body.prepend.bind(doc.body))(bgVid);doc.body.append(sndBtn);}
let bgUrl=null,bgHasAudio=false;
const hasAudio=v=>!!(v.mozHasAudio||(v.webkitAudioDecodedByteCount>0)||(v.audioTracks&&v.audioTracks.length));
function paintSnd(){sndBtn.classList.toggle('show',bgVid.classList.contains('on')&&bgHasAudio);sndBtn.firstChild.className='fa-solid '+(bgVid.muted?'fa-volume-xmark':'fa-volume-high');}
function setBgVideo(src,{userChosen}={}){const pic=$('#bgPhoto');
  bgVid.onerror=()=>{bgVid.classList.remove('on');doc.documentElement.classList.remove('has-vid');paintSnd();};
  bgVid.onloadeddata=()=>{bgVid.classList.add('on');doc.documentElement.classList.add('has-vid');if(pic)pic.classList.remove('on');bgVid.play().catch(()=>{});setTimeout(()=>{bgHasAudio=hasAudio(bgVid);paintSnd();},700);};
  bgVid.src=src;bgVid.load();}
function clearBgVideo(){bgVid.classList.remove('on');doc.documentElement.classList.remove('has-vid');bgVid.removeAttribute('src');bgVid.load();if(bgUrl){URL.revokeObjectURL(bgUrl);bgUrl=null;}paintSnd();}
// Son : les navigateurs bloquent le son avant un premier appui. Le 1er appui (ex. « Open ») le débloque.
doc.addEventListener('pointerdown',()=>{if(bgVid.classList.contains('on')&&LS.getItem('sc-bgsound')!=='0'&&bgVid.muted){bgVid.muted=false;bgVid.play().catch(()=>{bgVid.muted=true;});setTimeout(()=>{bgHasAudio=hasAudio(bgVid);paintSnd();},300);}},{once:true,capture:true});
(async()=>{let blob=null;try{blob=await idb.get('bg-video');}catch(_){}
  if(blob){bgUrl=URL.createObjectURL(blob);setBgVideo(bgUrl,{userChosen:true});}
  else if(!LS.getItem('xyl-bg')){setBgVideo(DEFAULT_BG);}})();

/* ============ RÉGLAGES : thème visible, logos du résultat, fond vidéo, compteurs ============ */
const SHIELD='M32 5l21 8v15c0 14-9 25-21 31C20 53 11 42 11 28V13z';
const G_OK=`<svg viewBox="0 0 64 64" fill="none"><path d="${SHIELD}" fill="#fff" fill-opacity=".22" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/><path d="M22.5 32.5l7 7 12.5-14" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const G_BAN=`<svg viewBox="0 0 64 64" fill="none"><path d="${SHIELD}" fill="#fff" fill-opacity=".22" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/><path d="M24 24.5l16 16M40 24.5l-16 16" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`;
const G_SCAN=`<svg viewBox="0 0 64 64" fill="none"><path d="${SHIELD}" fill="#fff" fill-opacity=".22" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/><circle cx="32" cy="30" r="7" stroke="#fff" stroke-width="3.4"/><path d="M37 35l6 6" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>`;
const iconKey=k=>'sc-icon-'+k;
async function squarePng(file,size=256){if(!/^image\//.test(file.type))throw new Error('Choisis une image.');const bmp=await createImageBitmap(file),s=Math.min(bmp.width,bmp.height),c=doc.createElement('canvas');c.width=c.height=size;
  c.getContext('2d').drawImage(bmp,(bmp.width-s)/2,(bmp.height-s)/2,s,s,0,0,size,size);
  return c.toDataURL(file.type==='image/png'||file.type==='image/webp'||file.type==='image/gif'?'image/png':'image/jpeg',.9);}
function pickFile(accept){return new Promise(res=>{const i=h('input',{type:'file',accept,style:'display:none',on:{change:()=>{res(i.files&&i.files[0]||null);i.remove();}}});doc.body.append(i);i.click();});}
function iconRow(kind,title,hint){const prev=h('div',{class:'prev '+kind});
  const paint=()=>{prev.replaceChildren();const u=LS.getItem(iconKey(kind));if(u)prev.append(h('img',{src:u,alt:''}));else prev.append(html(kind==='ok'?G_OK:G_BAN));};
  const imp=h('button',{class:'mini-btn pri',type:'button',on:{click:async()=>{const f=await pickFile('image/*');if(!f)return;try{LS.setItem(iconKey(kind),await squarePng(f));paint();tip('Logo mis à jour');}catch(e){tip(e.message||'Image impossible');}}}},'Importer une image');
  const rst=h('button',{class:'mini-btn',type:'button',on:{click:()=>{LS.removeItem(iconKey(kind));paint();tip('Logo d’origine rétabli');}}},'Réinitialiser');
  paint();return h('div',{},h('div',{class:'iconrow'},prev,h('div',{class:'t'},title,h('small',{},hint))),h('div',{class:'iconbtns'},imp,rst));}
function counter(ta,max){ta.maxLength=max;const c=h('span',{},'0 / '+max);const pv=h('button',{type:'button'},'Aperçu');const row=h('div',{class:'cnt'},c,pv);ta.after(row);
  const upd=()=>{c.textContent=ta.value.length+' / '+max;};ta.addEventListener('input',upd);upd();return pv;}
function enhanceSettings(){const panel=$('.panel[data-panel="settings"] .panel-inner');if(!panel||panel.dataset.v2)return;panel.dataset.v2='1';
  const first=$('.set-block',panel);
  // Apparence (bien visible, en haut)
  const ap=h('div',{class:'set-block'},h('div',{class:'set-label'},h('i',{class:'fa-solid fa-circle-half-stroke'}),' Apparence'),h('p',{class:'set-hint'},'Choisis le thème du site. « Auto » suit ton téléphone ou ton ordinateur.'),
    h('div',{class:'themeopts'},...[['light','Clair','m-l'],['dark','Sombre','m-d'],['auto','Auto','m-a']].map(([t,l,c])=>h('button',{type:'button',class:'topt','data-t':t,on:{click:()=>setTheme(t)}},h('div',{class:'mini '+c}),l))));
  panel.insertBefore(ap,first);
  // Logos du résultat
  const lg=h('div',{class:'set-block'},h('div',{class:'set-label'},h('i',{class:'fa-solid fa-shield-halved'}),' Logos du résultat'),h('p',{class:'set-hint'},'Importe ton image : elle remplace le logo affiché quand le numéro est actif ou banni.'),
    iconRow('ok','Numéro actif','Remplace le logo vert'),iconRow('ban','Numéro banni','Remplace le logo rouge'));
  panel.insertBefore(lg,first);
  // Fond : image ou vidéo
  const up=$('#bgUpload');if(up){up.accept='image/*,video/*';const lab=up.closest('label');if(lab&&lab.firstChild)lab.childNodes.forEach(n=>{if(n.nodeType===3&&/select an image/i.test(n.nodeValue))n.nodeValue=' Image ou vidéo ';});
    const hint=$('.set-hint',up.closest('.set-block'));if(hint)hint.textContent='Choisis une photo ou une vidéo. Si la vidéo a du son, il se lance après ton premier appui sur le site.';
    up.addEventListener('change',async e=>{const f=up.files&&up.files[0];
      if(f&&f.type.startsWith('video/')){e.stopImmediatePropagation();
        if(f.size>60*1024*1024){tip('Vidéo trop lourde (60 Mo maximum).');up.value='';return;}
        try{await idb.set('bg-video',f);LS.removeItem('xyl-bg');const pic=$('#bgPhoto');if(pic){pic.classList.remove('on');pic.removeAttribute('src');}clearBgVideo();bgUrl=URL.createObjectURL(f);setBgVideo(bgUrl,{userChosen:true});tip('Fond vidéo mis à jour');}
        catch(_){tip('Impossible d’enregistrer cette vidéo.');}up.value='';}
      else if(f){idb.del('bg-video').catch(()=>{});clearBgVideo();}},true);
    const clr=$('#bgClear');if(clr)clr.addEventListener('click',()=>{idb.del('bg-video').catch(()=>{});clearBgVideo();setTimeout(()=>{if(!LS.getItem('xyl-bg'))setBgVideo(DEFAULT_BG);},50);},true);}
  // Messages : compteur + aperçu
  [['setBanMsg',true],['setOkMsg',false]].forEach(([id,banned])=>{const ta=$('#'+id);if(!ta)return;const pv=counter(ta,2000);
    pv.addEventListener('click',()=>{const lab=$(banned?'#setBanLabel':'#setOkLabel');previewResult({banned,label:lab&&lab.value.trim(),msg:ta.value.trim()});});});
}
enhanceSettings();new MutationObserver(enhanceSettings).observe(doc.body,{childList:true,subtree:true});

/* ============ ÉCRAN DE RÉSULTAT ============ */
const DIAL='225:CI,221:SN,223:ML,226:BF,228:TG,229:BJ,227:NE,224:GN,233:GH,234:NG,237:CM,241:GA,242:CG,243:CD,212:MA,213:DZ,216:TN,20:EG,27:ZA,254:KE,255:TZ,256:UG,250:RW,251:ET,33:FR,32:BE,41:CH,44:GB,49:DE,34:ES,39:IT,351:PT,31:NL,1:US,52:MX,55:BR,54:AR,57:CO,58:VE,51:PE,56:CL,91:IN,92:PK,880:BD,86:CN,81:JP,82:KR,62:ID,60:MY,63:PH,66:TH,84:VN,90:TR,966:SA,971:AE,972:IL,961:LB,7:RU,380:UA,48:PL,40:RO,30:GR'.split(',').reduce((o,x)=>{const[k,v]=x.split(':');o[k]=v;return o;},{});
function parseNum(raw){const d=String(raw||'').replace(/\D/g,'');if(!d)return{txt:String(raw||''),cc:'',iso:''};let code='',iso='';for(const n of[3,2,1]){if(DIAL[d.slice(0,n)]){code=d.slice(0,n);iso=DIAL[code];break;}}
  const rest=d.slice(code.length),g=rest.length%2?rest[0]+' '+(rest.slice(1).match(/\d{1,2}/g)||[]).join(' '):(rest.match(/\d{1,2}/g)||[]).join(' ');
  return{txt:'+'+(code?code+' ':'')+g.trim(),cc:code,iso:iso||'INTL'};}
const IC={cal:'<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
 hist:'<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 4v4.5H8M12 8v4.5l3 2"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',coin:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h3.8a1.8 1.8 0 0 1 0 3.6h-2.6a1.8 1.8 0 0 0 0 3.6h3.8"/>',
 share:'<path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',copy:'<rect x="9" y="9" width="11" height="11" rx="3"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',help:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 8v5M12 16h.01"/>',
 again:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',chk:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',vol:'<path d="M4 9.5v5h4l5 4v-13l-5 4zM16.5 9a4 4 0 0 1 0 6M19 6.500a7.500 7.500 0 0 1 0 11"/>',mute:'<path d="M4 9.5v5h4l5 4v-13l-5 4zM17 9.500l4 5M21 9.500l-4 5"/>'};
const ico=(k,s=17)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
const I=(k,s)=>html(`<span style="display:inline-flex">${ico(k,s)}</span>`);
const RS={el:null,vid:null,snd:null,state:'off',cancelled:false,hintT:[],muted:LS.getItem('sc-ressound')==='0'};
function buildRS(){if(RS.el)return;
  RS.vid=h('video',{class:'rs-vid',loop:'',playsinline:'','webkit-playsinline':'',preload:'auto','aria-hidden':'true'});
  RS.vid.addEventListener('loadeddata',()=>RS.el.classList.add('has-vid'));RS.vid.addEventListener('error',()=>RS.el.classList.remove('has-vid'));
  RS.snd=h('button',{class:'rs-btn snd','aria-label':'Son',type:'button',on:{click:()=>{RS.muted=!RS.muted;LS.setItem('sc-ressound',RS.muted?'0':'1');RS.vid.muted=RS.muted;paintRsSnd();}}});
  const close=h('button',{class:'rs-btn','aria-label':'Fermer',type:'button',on:{click:()=>closeRS(true)}},I('x',16));
  RS.hero=h('div',{class:'rs-hero'});RS.sheetBox=h('div',{class:'rs-sheet'});
  RS.el=h('div',{id:'scRes',class:'rs',role:'dialog','aria-modal':'true'},RS.vid,h('div',{class:'rs-scrim'}),h('div',{class:'rs-glow'}),
    h('div',{class:'rs-wrap'},h('div',{class:'rs-top'},RS.tag=h('span',{class:'rs-tag'},'Résultat'),h('div',{class:'rs-tools'},RS.snd,close)),RS.hero,RS.sheetBox));
  doc.body.append(RS.el);doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&RS.state!=='off'){const ap=$('.rs-appeal');if(ap)ap.remove();else closeRS(true);}});}
function paintRsSnd(){RS.snd.replaceChildren(I(RS.vid.muted?'mute':'vol',17));}
function playRS(name){const v=RS.vid,src='./videos/'+name+'.mp4';if(v.dataset.n===name&&!v.paused)return;v.dataset.n=name;RS.el.classList.remove('has-vid');v.muted=RS.muted;v.src=src;
  const p=v.play();if(p&&p.catch)p.catch(()=>{v.muted=true;v.play().catch(()=>{});paintRsSnd();});paintRsSnd();}
function openRS(cls){buildRS();RS.el.classList.remove('ok','ban','scan','compact');cls.split(' ').forEach(c=>c&&RS.el.classList.add(c));RS.el.classList.add('on');RS.el.scrollTop=0;
  if(RS.state==='off'){doc.documentElement.style.overflow='hidden';}RS.state=cls.includes('scan')?'scan':'result';}
function closeRS(byUser){if(!RS.el||RS.state==='off')return;const was=RS.state;RS.hintT.forEach(clearTimeout);RS.hintT=[];RS.el.classList.remove('on','has-vid');RS.vid.pause();RS.state='off';doc.documentElement.style.overflow='';
  if(byUser&&was==='scan')RS.cancelled=true;}
function showScan(){RS.cancelled=false;buildRS();openRS('scan');RS.tag.textContent='Vérification';RS.sheetBox.style.display='none';RS.hero.className='rs-hero';
  const raw=($('#phone')||{}).value||'',n=parseNum(raw);
  const st=[h('div',{class:'rs-st done'},h('span',{class:'d'},I('chk',13)),'Connexion au service'),h('div',{class:'rs-st now'},h('span',{class:'d'}),'Analyse du numéro…'),h('div',{class:'rs-st'},h('span',{class:'d'}),'Résultat')];
  const hint=h('div',{class:'rs-hint'},'Cela peut prendre quelques secondes');
  fill(RS.hero,h('div',{class:'rs-ring'},h('i'),h('i'),h('i'),h('div',{class:'arc'}),h('div',{class:'rs-core'},html(G_SCAN))),h('h1',{class:'rs-title',style:'font-size:28px'},'Analyse en cours'),
    h('div',{class:'rs-num'},n.iso?h('span',{class:'rs-cc'},n.iso):null,n.txt),h('div',{class:'rs-steps'},...st),h('div',{class:'rs-bar'},h('i')),hint);
  RS.hintT.push(setTimeout(()=>{hint.textContent='Le service se réveille, merci de patienter…';},9000),setTimeout(()=>{hint.textContent='Encore quelques secondes, ça arrive…';},22000));
  playRS('verification');}
const DEFAULT_OK_MSG=/aucun bannissement|no ban|not banned/i,DEFAULT_BAN_MSG=/signale un bannissement|ban.*report|is banned/i;
function history(num,banned){let a=[];try{a=JSON.parse(LS.getItem('xyl-hist')||'[]');}catch(_){}
  const key=String(num||'').replace(/\D/g,''),mine=a.filter(x=>String(x.num||x.number||'').replace(/\D/g,'')===key).sort((x,y)=>(y.ts||y.t||0)-(x.ts||x.t||0));
  if(!mine.length)return 'Première vérification';const n=mine.length,tsOf=x=>new Date(x.ts||x.t||Date.now());
  const isB=x=>x.banned===true||x.status==='banned'||x.s==='banned';let i=0;while(i<mine.length&&isB(mine[i])===banned)i++;
  const plural=n+(n>1?' vérifications':' vérification');
  if(i===mine.length)return plural+' · '+(banned?'banni depuis le '+shortDate(tsOf(mine[mine.length-1])):'toujours actif');
  return plural+' · '+(banned?'passé de actif à banni':'redevenu actif')+' le '+shortDate(tsOf(mine[i-1]));}
async function showResult(o){buildRS();RS.hintT.forEach(clearTimeout);RS.hintT=[];
  const banned=!!o.banned,n=parseNum(o.num),when=new Date();
  let title=o.label||(banned?'Numéro banni':'Numéro actif');const L=String(title).trim().toUpperCase();
  if(['NON BANNI','NOT BANNED','ACTIF','ACTIVE'].includes(L))title='Numéro actif';else if(['BANNI','BANNED'].includes(L))title='Numéro banni';
  const msg=(o.msg||'').trim(),isDefault=!msg||(banned?DEFAULT_BAN_MSG:DEFAULT_OK_MSG).test(msg),long=!isDefault&&(msg.length>90||/\n/.test(msg));
  const sub=isDefault?(banned?'Un bannissement est signalé':'Aucun bannissement signalé'):(long?'':msg);
  openRS((banned?'ban':'ok')+(long?' compact':''));RS.tag.textContent='Résultat';RS.sheetBox.style.display='';
  const custom=LS.getItem(iconKey(banned?'ban':'ok'));
  const seal=h('div',{class:'rs-seal'+(custom?' custom':'')},custom?h('img',{src:custom,alt:''}):html(banned?G_BAN:G_OK));
  const numEl=h('div',{class:'rs-num'},n.iso?h('span',{class:'rs-cc'},n.iso):null,n.txt);
  RS.hero.className='rs-hero';
  fill(RS.hero,...(long?[seal,h('div',{},h('h1',{class:'rs-title'},title),numEl)]:[seal,h('h1',{class:'rs-title'},title),sub?h('div',{class:'rs-sub'},sub):null,numEl]));
  const by=o.preview?'@toi (aperçu)':(await whoAmI())||'Invité';
  const rw=o.preview?null:window.__scReward;window.__scReward=null;let chip=null;
  if(rw&&rw.status==='credited')chip=h('div',{class:'rs-reward'},I('coin',18),window.SCMoney?window.SCMoney.reward(rw):'+'+usd(rw.amount)+' ajoutés à ton solde');
  else if(rw&&rw.status==='cooldown')chip=h('div',{class:'rs-reward soft'},'Numéro déjà récompensé récemment');
  else if(rw&&rw.status==='cap')chip=h('div',{class:'rs-reward soft'},'Limite de gains du jour atteinte');
  if(rw&&rw.status==='credited')doc.dispatchEvent(new CustomEvent('sc-reward',{detail:rw}));
  const row=(k,l,v)=>h('div',{class:'rs-row'},h('div',{class:'rs-ic'},I(k,16)),h('div',{},h('small',{},l),h('b',{},v)));
  const rows=[row('cal','Vérifié le',fmtDate(when)),row('user','Vérifié par',by)];
  if(banned)rows.push(row('info','Raison',o.reason||'Aucune raison communiquée'));
  rows.push(row('hist','Historique de ce numéro',o.preview?'Aperçu du résultat':history(o.num,banned)));
  const again=h('button',{class:'rs-b p',type:'button',on:{click:()=>{closeRS(false);const p=$('#phone');if(p){p.value='';p.focus();}}}},I('again',19),'Vérifier un autre numéro');
  const text=`${title} — ${n.txt}\nVérifié le ${fmtDate(when)} avec Snow Cloud Chek`;
  const shareB=h('button',{class:'rs-b g',type:'button',on:{click:async()=>{if(navigator.share){try{await navigator.share({title:'Snow Cloud Chek',text});return;}catch(e){if(e&&e.name==='AbortError')return;}}try{await navigator.clipboard.writeText(text);tip('Copié');}catch(_){}}}},I('share',18),'Partager');
  const copyB=h('button',{class:'rs-b g',type:'button',on:{click:async()=>{try{await navigator.clipboard.writeText(text);tip('Copié');}catch(_){tip('Copie impossible');}}}},I('copy',18),'Copier');
  const msgCard=long?(()=>{const p=h('p',{},msg),more=h('button',{class:'more',type:'button'},'Lire la suite ▾'),c=h('div',{class:'rs-msg'},h('div',{class:'mh'},I('info',16),'Message de l’équipe'),p,more);
    more.addEventListener('click',()=>{const o2=c.classList.toggle('open');more.textContent=o2?'Réduire ▴':'Lire la suite ▾';});
    requestAnimationFrame(()=>{if(p.scrollHeight<=p.clientHeight+2)more.remove();});return c;})():null;
  fill(RS.sheetBox,h('div',{class:'rs-grab'}),msgCard,chip,h('div',{class:'rs-rows'},...rows),
    h('div',{class:'rs-btns'},banned?h('button',{class:'rs-b a',type:'button',on:{click:appeal}},I('help',19),'Faire appel'):null,again,h('div',{class:'rs-two'},shareB,copyB)));
  if(window.scEmojify)window.scEmojify(RS.el);
  playRS(banned?'banni':'actif');}
function appeal(){const bd=h('div',{class:'rs-appeal',on:{click:e=>{if(e.target===bd)bd.remove();}}});
  const sup=$('#banSupport');
  bd.append(h('div',{class:'rs-ap'},h('h3',{},'Faire appel d’un bannissement'),h('p',{},'WhatsApp décide seul. Voici la démarche qui donne le plus de chances.'),
    h('ol',{},h('li',{},'Ouvre WhatsApp et saisis ton numéro avec le code reçu par SMS.'),h('li',{},'Si « Votre compte est banni » s’affiche, touche « Demander un examen » et explique calmement ta situation.'),h('li',{},'Attends 24 à 72 heures avant de réessayer, sans désinstaller l’application.'),h('li',{},'Évite les applications modifiées : elles sont la première cause de bannissement.')),
    sup?h('button',{class:'rs-b p',type:'button',on:{click:()=>{bd.remove();sup.click();}}},'Contacter le support'):null,
    h('button',{class:'rs-b g',type:'button',on:{click:()=>bd.remove()}},'Fermer')));doc.body.append(bd);}
function previewResult(o){showResult({banned:o.banned,num:'+2250556333313',label:o.label,msg:o.msg,reason:o.banned?'Exemple de raison communiquée par le service':'',preview:true});}
/* Déclencheurs : on observe l'écran existant sans toucher à son code */
{const spin=$('#spin');
 if(spin)new MutationObserver(()=>{const on=spin.classList.contains('active');
   if(on){showScan();}
   else if(RS.state==='scan'){setTimeout(()=>{if(RS.state==='scan')closeRS(false);},250);}}).observe(spin,{attributes:true,attributeFilter:['class']});
 ['dlgBan','dlgOk'].forEach(id=>{const el=doc.getElementById(id);if(!el)return;let was=false;
   new MutationObserver(()=>{const on=el.classList.contains('show');
     if(on&&!was){if(RS.cancelled){was=on;tip('Résultat enregistré dans l’historique');return;}const banned=id==='dlgBan',g=s=>{const e=$(s);return e?e.textContent.trim():'';};
       const reasonWrap=$('#banReasonWrap');
       showResult({banned,num:g(banned?'#banNum':'#okNum'),label:g(banned?'#banStatusLabel':'#okStatusLabel'),msg:g(banned?'#banMsg':'#okMsg'),reason:(reasonWrap&&reasonWrap.classList.contains('show'))?g('#banReason'):''});}
     was=on;}).observe(el,{attributes:true,attributeFilter:['class']});});}
window.SCResult={preview:previewResult};
})();
