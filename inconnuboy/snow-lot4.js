/* Snow Cloud Chek — lot 4 : profil façon WhatsApp (photo, pseudo, infos, activités, préférences, notifications). */
(()=>{'use strict';
const K=window.SCKit,SC=window.SC;if(!K||!SC||!SC.sb)return;
const{h,$,tip,fill,pickFile}=K,sb=SC.sb,LS=localStorage,doc=document;

/* ============ OUTILS ============ */
const ic=c=>h('i',{class:'fa-solid '+c});
const pad=n=>String(n).padStart(2,'0');
const dateTime=s=>{const d=new Date(s);return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' · '+pad(d.getHours())+':'+pad(d.getMinutes());};
const monthYear=s=>new Date(s).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
const nf=n=>Math.round(Number(n)||0).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g,' ');
function sheet(build){const bg=h('div',{class:'sheet-bg',on:{click:e=>{if(e.target===bg)close();}}}),sh=h('div',{class:'sheet'},h('div',{class:'grab'}));bg.append(sh);const close=()=>bg.remove();build(sh,close);doc.body.append(bg);if(window.scEmojify)window.scEmojify(sh);return close;}
async function cropSquare(file,size=512){if(!/^image\//.test(file.type))throw new Error('Choisis une image.');const bmp=await createImageBitmap(file),s=Math.min(bmp.width,bmp.height),c=doc.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(bmp,(bmp.width-s)/2,(bmp.height-s)/2,s,s,0,0,size,size);const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.86));return new File([b],'a.jpg',{type:'image/jpeg'});}
const hashN=s=>{let n=0;const t=String(s||'');for(let i=0;i<t.length;i++)n=(n*31+t.charCodeAt(i))>>>0;return n;};
const GR=[['#5b8cff','#7c5cff'],['#10b981','#0ea5a4'],['#f59e0b','#ef6c3c'],['#ec4899','#c026d3'],['#06b6d4','#3b82f6'],['#84cc16','#16a34a'],['#f43f5e','#fb7185'],['#8b5cf6','#6366f1']];
const grad=s=>{const g=GR[hashN(s)%GR.length];return 'linear-gradient(135deg,'+g[0]+','+g[1]+')';};
const nameOf=p=>p?(p.display_name||p.username||'Membre'):'Membre';
const initials=n=>{const w=String(n||'?').replace(/[^\p{L}\p{N} ]/gu,'').trim().split(/\s+/).filter(Boolean);return((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase();};
const rosette=(()=>{let d='';for(let i=0;i<=120;i++){const a=i/120*Math.PI*2,r=10.1+.95*Math.cos(10*a);d+=(i?'L':'M')+(12+r*Math.cos(a)).toFixed(2)+' '+(12+r*Math.sin(a)).toFixed(2);}return d+'Z';})();
const GOLD=['admin','official','developer','moderator','verified','contributor'];
function goldB(p,s=18){if(!p||!GOLD.includes(p.badge))return null;if(!doc.getElementById('scDefs')){const d=h('div',{id:'scDefs',style:'position:absolute;width:0;height:0;overflow:hidden'});d.innerHTML='<svg width="0" height="0"><defs><linearGradient id="scGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe28a"/><stop offset=".5" stop-color="#f6b92d"/><stop offset="1" stop-color="#d88a00"/></linearGradient><linearGradient id="scBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fb6ff"/><stop offset=".5" stop-color="#2f80ff"/><stop offset="1" stop-color="#1b55d6"/></linearGradient></defs></svg>';doc.body.append(d);}
  const e=h('span',{class:'gold',style:'display:inline-flex;vertical-align:-3px;margin-left:5px',title:({admin:'Administrateur',official:'Officiel',developer:'Développeur',moderator:'Modérateur',contributor:'Contributeur',verified:'Membre certifié'})[p.badge]||'Badge'});
  e.innerHTML='<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" aria-hidden="true"><path d="'+rosette+'" fill="url(#scGold)"/><path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';return e;}
function avatar(p,size){const nm=nameOf(p),e=h('span',{class:'pf-av',style:'width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*.36)+'px;background:'+grad(p&&(p.id||nm))},initials(nm));
  if(p&&p.avatar_url){const img=h('img',{src:p.avatar_url,alt:'',referrerpolicy:'no-referrer',on:{error:()=>img.remove()}});e.append(img);}return e;}

/* ============ PHOTO DANS LA BARRE DU HAUT ET LE MENU ============ */
let ME=null;
function paintAvatars(){doc.querySelectorAll('#sctop .av,#scdr .av').forEach(a=>{const cur=a.querySelector('img.pf-img'),url=ME&&ME.avatar_url;
  if(!url){if(cur)cur.remove();return;}if(cur&&cur.getAttribute('src')===url)return;if(cur)cur.remove();a.style.position='relative';a.style.overflow='hidden';
  const img=h('img',{class:'pf-img',src:url,alt:'',referrerpolicy:'no-referrer',style:'position:absolute;inset:0;width:100%;height:100%;object-fit:cover',on:{error:()=>img.remove()}});a.append(img);});}
{let t;const q=()=>{clearTimeout(t);t=setTimeout(paintAvatars,50);},o=new MutationObserver(q);['sctop','scdr'].forEach(id=>{const e=doc.getElementById(id);if(e)o.observe(e,{childList:true,subtree:true});});window.addEventListener('sc-auth',()=>setTimeout(paintAvatars,60));}
async function loadMe(force){const u=SC.me();if(!u){ME=null;paintAvatars();return null;}if(ME&&ME.id===u.id&&!force)return ME;const{data}=await sb.from('profiles').select('*').eq('id',u.id).maybeSingle();ME=data||{id:u.id};
  const m=u.user_metadata||{},pic=m.avatar_url||m.picture;if(!ME.avatar_url&&pic){const{error}=await sb.from('profiles').update({avatar_url:pic}).eq('id',u.id);if(!error)ME.avatar_url=pic;}paintAvatars();return ME;}
sb.auth.onAuthStateChange((_e,s)=>{ME=null;if(s&&s.user)setTimeout(()=>loadMe(true),0);else paintAvatars();});
sb.auth.getSession().then(({data})=>{if(data&&data.session)loadMe(true);});

/* ============ NAVIGATION ============ */
const go2=SC.go;
SC.go=function(k){if(k==='acc'&&SC.me())return openProfile();return go2.apply(this,arguments);};
window.SCProfile={open:()=>openProfile()};
function openProfile(){SC.open('dev',box=>{box.classList.add('v2');const r=h('div',{class:'pf'});box.append(r);render(r);});}
const setTheme=p=>{if(K.setTheme)K.setTheme(p);else{LS.setItem('sc-theme',p);doc.documentElement.dataset.theme=(p==='dark'||(p==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches))?'dark':'light';}};
const themePref=()=>K.themePref?K.themePref():(LS.getItem('sc-theme')||'light');
const M=()=>window.SCMoney||null;
const money=usd=>M()&&M().money?M().money(usd):'$'+(+usd||0).toFixed(2);

/* ============ PAGE ============ */
async function render(r){fill(r,h('div',{class:'pf-empty'},'Chargement…'));const u=SC.me();await loadMe(true);if(M()&&M().load)await M().load();
  const uid=u.id,since=new Date(Date.now()-864e5*30).toISOString();
  const cnt=(t,col,extra)=>{let q=sb.from(t).select('*',{count:'exact',head:true}).eq(col,uid);if(extra)q=extra(q);return q;};
  const[chk,ban,msg,ref,wal,rc,rw,wd,nt]=await Promise.all([cnt('checks','user_id'),cnt('checks','user_id',q=>q.eq('status','banned')),cnt('messages','sender'),sb.from('profiles').select('*',{count:'exact',head:true}).eq('referred_by',uid),
    sb.from('wallets').select('total_earned,balance').eq('user_id',uid).maybeSingle(),
    sb.from('checks').select('number,status,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(8),
    sb.from('rewards').select('amount,kind,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(6),
    sb.from('withdrawals').select('amount,method,created_at,status').eq('user_id',uid).order('created_at',{ascending:false}).limit(3),
    sb.from('notifications').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(15)]);
  const P=ME||{},meta=u.user_metadata||{},socialPic=meta.avatar_url||meta.picture,provider=(u.app_metadata&&u.app_metadata.provider)||'email';
  const refresh=()=>render(r);
  /* — photo — */
  const avBox=h('div',{class:'pf-avwrap',on:{click:()=>photoMenu()}},avatar(P,116),h('span',{class:'pf-cam'},ic('fa-camera')));
  async function setPhoto(url){const{error}=await sb.from('profiles').update({avatar_url:url}).eq('id',uid);if(error){tip(error.message);return false;}ME.avatar_url=url;paintAvatars();return true;}
  function photoMenu(){sheet((sh,close)=>{const row=(i,t,f,cls)=>h('button',{class:'row '+(cls||''),type:'button',on:{click:()=>{close();f();}}},ic(i),t);
    sh.append(h('h3',{},'Photo de profil'),row('fa-image','Choisir une photo',async()=>{const f=await pickFile('image/*');if(!f)return;try{tip('Envoi de la photo…');const sq=await cropSquare(f),path=uid+'/avatar_'+Date.now()+'.jpg',{error}=await sb.storage.from('media').upload(path,sq,{contentType:'image/jpeg'});if(error)throw error;
        if(await setPhoto(sb.storage.from('media').getPublicUrl(path).data.publicUrl)){tip('Photo mise à jour');refresh();}}catch(e){tip((e&&e.message)||'Envoi impossible');}}));
    if(socialPic&&socialPic!==P.avatar_url)sh.append(row('fa-rotate','Utiliser ma photo '+(provider==='github'?'GitHub':provider==='google'?'Google':'de connexion'),async()=>{if(await setPhoto(socialPic)){tip('Photo mise à jour');refresh();}}));
    if(P.avatar_url)sh.append(row('fa-trash','Supprimer la photo',async()=>{if(await setPhoto(null)){tip('Photo supprimée');refresh();}},'danger'));});}
  /* — édition d'un champ — */
  function edit(label,value,{max=40,multiline=false,prefix='',hint='',validate,save}){sheet((sh,close)=>{const inp=multiline?h('textarea',{rows:4,maxlength:max},value||''):h('input',{value:value||'',maxlength:max,autocapitalize:'off'}),cnt=h('div',{style:'text-align:right;font:500 .75rem Inter;opacity:.6;margin-top:4px'},'');
    const upd=()=>{cnt.textContent=inp.value.length+' / '+max;};inp.addEventListener('input',upd);upd();
    sh.append(h('h3',{},label),prefix?h('div',{style:'display:flex;align-items:center;gap:8px'},h('b',{style:'font-size:1.1rem'},prefix),inp):inp,cnt,hint?h('div',{style:'font:450 .8rem/1.4 Inter;opacity:.7;margin-top:6px'},hint):null,
      h('div',{class:'btns'},h('button',{class:'g',type:'button',on:{click:close}},'Annuler'),h('button',{type:'button',on:{click:async e=>{let v=inp.value.trim();const bad=validate&&validate(v);if(bad){tip(bad);return;}e.target.disabled=true;const err=await save(v);e.target.disabled=false;if(err){tip(err);return;}close();tip('Enregistré');refresh();}}},'Enregistrer')));setTimeout(()=>inp.focus(),60);});}
  const upd1=async patch=>{const{error}=await sb.from('profiles').update(patch).eq('id',uid);if(error)return /duplicate|unique|23505/i.test(error.message+(error.code||''))?'Ce pseudo est déjà pris.':error.message;Object.assign(ME,patch);paintAvatars();return null;};
  const rowi=(icon,label,value,onClick,ro)=>h('button',{class:'pf-row',type:'button',disabled:!!ro,on:onClick?{click:onClick}:{}},h('span',{class:'ic'},ic(icon)),h('span',{class:'tx'},h('span',{class:'lb'},label),h('span',{class:'vl'},value||'—')),ro?null:ic('fa-chevron-right go'));
  /* — activités — */
  const total=Number(wal.data&&wal.data.total_earned)||0;
  const feed=[...(rc.data||[]).map(x=>({ts:x.created_at,icon:x.status==='banned'?'fa-ban':'fa-shield-halved',t:(x.status==='banned'?'Numéro banni':x.status==='not_banned'?'Numéro actif':'Vérification'),s:x.number,c:x.status==='banned'?'bad':'ok'})),
    ...(rw.data||[]).map(x=>({ts:x.created_at,icon:'fa-coins',t:({check_ok:'Gain · numéro actif',check_ban:'Gain · numéro banni',referral:'Bonus de parrainage',referral_tier:'Palier de parrainage',task:'Mission validée'})[x.kind]||'Gain',s:'+'+money(x.amount),c:'gold'})),
    ...(wd.data||[]).map(x=>({ts:x.created_at,icon:'fa-arrow-up',t:'Retrait '+x.method,s:money(x.amount)+' · '+({pending:'en attente',processing:'en cours',approved:'approuvé',paid:'payé',rejected:'refusé'})[x.status],c:'in'}))].sort((a,b)=>b.ts.localeCompare(a.ts)).slice(0,10);
  const tile=(b,l)=>h('div',{class:'pf-stat'},h('b',{},b),h('span',{},l));
  /* — notifications — */
  const nts=nt.data||[],unread=nts.filter(n=>!n.read).length;
  /* — préférences — */
  const seg=(opts,get,set)=>{const w=h('div',{class:'pf-seg'});const d=()=>fill(w,opts.map(([v,l])=>h('button',{type:'button',class:get()===v?'on':'',on:{click:()=>{set(v);d();}}},l)));d();return w;};
  const curNow=()=>LS.getItem('sc-cur')==='USD'?'USD':'FCFA',lang=LS.getItem('sc-lang')||'fr';
  const prefs=h('div',{class:'pf-card'},h('div',{class:'pf-pref'},h('small',{},'Apparence'),seg([['light','Clair'],['dark','Sombre'],['auto','Auto']],themePref,v=>setTheme(v))),
    h('div',{class:'pf-pref'},h('small',{},'Devise d’affichage'),seg([['FCFA','FCFA'],['USD','USD']],curNow,v=>{LS.setItem('sc-cur',v);})),
    h('div',{class:'pf-pref'},h('small',{},'Langue du menu'),seg([['fr','Français'],['en','English'],['es','Español']],()=>LS.getItem('sc-lang')||'fr',v=>{LS.setItem('sc-lang',v);sb.from('profiles').update({lang:v}).eq('id',uid).then(()=>{},()=>{});tip('Langue enregistrée');setTimeout(()=>location.reload(),600);})));
  /* — page — */
  fill(r,h('div',{class:'pf-hero'},avBox,h('div',{class:'pf-name'},nameOf(P),goldB(P,20)),h('div',{class:'pf-handle'},'@'+(P.username||'')),P.bio?h('div',{class:'pf-bio'},P.bio):null),
    h('div',{class:'pf-sec'},'Infos'),h('div',{class:'pf-card'},
      rowi('fa-user','Nom',P.display_name,()=>edit('Nom',P.display_name,{max:40,validate:v=>v.length<2?'Le nom est trop court.':'',save:v=>upd1({display_name:v})})),
      rowi('fa-at','Pseudo','@'+(P.username||''),()=>edit('Pseudo',P.username,{max:24,prefix:'@',hint:'3 à 24 caractères : lettres minuscules, chiffres et « _ ».',validate:v=>/^[a-z0-9_]{3,24}$/.test(v)?'':'Pseudo invalide : utilise 3 à 24 lettres minuscules, chiffres ou « _ ».',save:v=>upd1({username:v.toLowerCase()})})),
      rowi('fa-circle-info','Infos',P.bio||'Hey ! J’utilise Snow Cloud Chek.',()=>edit('Infos',P.bio,{max:140,multiline:true,hint:'Une courte présentation visible par les autres membres.',save:v=>upd1({bio:v||null})})),
      rowi('fa-envelope','E-mail',u.email||'—',null,true),rowi('fa-calendar','Membre depuis',P.created_at?monthYear(P.created_at):'—',null,true)),
    h('div',{class:'pf-sec'},'Activités'),h('div',{class:'pf-stats'},tile(nf(chk.count),'Vérifications'),tile(nf(ban.count),'Numéros bannis'),tile(nf(msg.count),'Messages envoyés'),tile(money(total),'Gains totaux'),tile(nf(ref.count),'Filleuls')),
    feed.length?h('div',{class:'pf-card',style:'margin-top:12px'},...feed.map(x=>h('div',{class:'pf-act'},h('span',{class:'ai '+x.c},ic(x.icon)),h('span',{class:'tx'},h('b',{},x.t),h('small',{},dateTime(x.ts)+(x.s?' · '+x.s:'')))))):h('div',{class:'pf-empty'},'Ton activité apparaîtra ici.'),
    h('div',{class:'pf-sec'},'Préférences'),prefs,
    h('div',{class:'pf-sec'},'Notifications'+(unread?' ('+unread+')':'')),nts.length?h('div',{class:'pf-card'},...nts.map(n=>h('div',{class:'pf-act'+(n.read?'':' un')},h('span',{class:'ai in'},ic('fa-bell')),h('span',{class:'tx'},h('b',{},n.title||'Notification'),h('small',{},(n.body||'')+(n.body?' · ':'')+dateTime(n.created_at)))))):h('div',{class:'pf-empty'},'Aucune notification.'),
    unread?h('button',{class:'pf-btn ghost',type:'button',style:'margin-top:10px',on:{click:async()=>{await sb.from('notifications').update({read:true}).eq('user_id',uid).eq('read',false);refresh();}}},'Tout marquer comme lu'):null,
    h('div',{class:'pf-sec'},'Compte'),h('div',{class:'pf-card'},
      rowi('fa-coins','Gains et retraits','Solde '+money(Number(wal.data&&wal.data.balance)||0),window.SCWallet?()=>window.SCWallet.open('gains'):null),
      rowi('fa-user-plus','Parrainage',nf(ref.count)+' filleul(s)',window.SCWallet?()=>window.SCWallet.open('parrainage'):null),
      provider==='email'?rowi('fa-key','Changer le mot de passe','',()=>pwd()):null,
      P.role==='admin'&&window.SCWallet?rowi('fa-sliders','Administration','Taux, missions, retraits',()=>window.SCWallet.openAdmin()):null),
    h('button',{class:'pf-btn danger',type:'button',style:'margin-top:18px',on:{click:async()=>{await sb.auth.signOut();SC.go('chk');}}},ic('fa-right-from-bracket'),' Se déconnecter'),
    h('div',{class:'pf-foot'},'Snow Cloud Chek'));
  function pwd(){sheet((sh,close)=>{const a=h('input',{type:'password',placeholder:'Nouveau mot de passe (8 caractères minimum)',autocomplete:'new-password'}),b=h('input',{type:'password',placeholder:'Confirme le mot de passe',autocomplete:'new-password',style:'margin-top:8px'});
    sh.append(h('h3',{},'Changer le mot de passe'),a,b,h('div',{class:'btns'},h('button',{class:'g',type:'button',on:{click:close}},'Annuler'),h('button',{type:'button',on:{click:async e=>{if(a.value.length<8){tip('8 caractères minimum.');return;}if(a.value!==b.value){tip('Les deux mots de passe ne correspondent pas.');return;}e.target.disabled=true;const{error}=await sb.auth.updateUser({password:a.value});e.target.disabled=false;if(error)tip(error.message);else{close();tip('Mot de passe modifié');}}}},'Enregistrer')));});}
  if(window.scEmojify)window.scEmojify(r);}
})();
