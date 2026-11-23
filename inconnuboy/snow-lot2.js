/* Snow Cloud Chek — lot 2 : gains en points, devise USD/FCFA, missions, retraits (QR), parrainage, administration. */
(()=>{'use strict';
const K=window.SCKit,SC=window.SC;if(!K||!SC||!SC.sb)return;
const{h,$,tip,html,fill,debounce,pickFile}=K,sb=SC.sb,LS=localStorage,doc=document;

/* ============ RÉGLAGES + ARGENT ============ */
const DEF={rates:{fcfa_per_usd:600,fcfa_per_pt:10},
  rewards:{pts_active:9,pts_banned:15,cooldown_days:30,daily_cap_pts:60,ref_bonus_pts:50,ref_after_checks:5,tiers:[{actives:10,bonus_pts:500}]},
  withdraw:{min_usd:25,methods:[{id:'wave',name:'Wave',kind:'phone',active:true},{id:'orange',name:'Orange Money',kind:'phone',active:true},{id:'mtn',name:'MTN MoMo',kind:'phone',active:true},
    {id:'binance',name:'Binance',kind:'crypto',active:true},{id:'usdt',name:'USDT',kind:'crypto',active:true},{id:'wallet',name:'Wallet crypto',kind:'crypto',active:true}]}};
let SET=JSON.parse(JSON.stringify(DEF));
async function loadSettings(){try{const{data}=await sb.from('app_settings').select('key,value');(data||[]).forEach(r=>{if(r&&r.value)SET[r.key]=r.value;});}catch(_){}return SET;}
const RT=()=>SET.rates||DEF.rates,RW=()=>SET.rewards||DEF.rewards,WD=()=>SET.withdraw||DEF.withdraw;
const curPref=()=>LS.getItem('sc-cur')==='USD'?'USD':'FCFA';
const nf=n=>Math.round(Number(n)||0).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g,' ');
const toF=usd=>usd*RT().fcfa_per_usd,toP=usd=>toF(usd)/RT().fcfa_per_pt,toUsd=pts=>pts*RT().fcfa_per_pt/RT().fcfa_per_usd;
const money=(usd,c)=>(c||curPref())==='USD'?'$'+(+usd||0).toFixed(2):nf(toF(usd))+' FCFA';
const pts=usd=>nf(toP(usd))+' pts';
window.SCMoney={load:loadSettings,reward:rw=>'+'+nf(rw.points!=null?rw.points:toP(rw.amount))+' pts · '+money(rw.amount)+' ajoutés à ton solde'};
loadSettings();

/* ============ SESSION ============ */
let ME=null;
async function me(force){if(ME&&!force)return ME;const u=SC.me();if(!u)return null;const{data}=await sb.from('profiles').select('*').eq('id',u.id).maybeSingle();ME=data||{id:u.id};return ME;}
const isAdmin=()=>!!(ME&&ME.role==='admin');
sb.auth.onAuthStateChange((_e,s)=>{ME=null;if(s&&s.user)setTimeout(afterLogin,0);});
sb.auth.getSession().then(({data})=>{if(data&&data.session)afterLogin();});

/* Lien de parrainage : on retient le code avant l'inscription, on l'applique après */
{const q=new URLSearchParams(location.search),r=q.get('ref'),g=q.get('g');
 if(r){LS.setItem('sc-ref',r.slice(0,20));if(!sessionStorage.getItem('sc-rc')){sessionStorage.setItem('sc-rc','1');sb.rpc('track_ref_click',{p_code:r}).then(()=>{},()=>{});}}
 if(g)LS.setItem('sc-gjoin',g.slice(0,40));
 if(r||g){q.delete('ref');q.delete('g');const s=q.toString();try{history.replaceState(null,'',location.pathname+(s?'?'+s:'')+location.hash);}catch(_){}}}
let applied=null;
async function afterLogin(){const u=SC.me();if(!u||applied===u.id)return;applied=u.id;const ref=LS.getItem('sc-ref');
  if(ref){LS.removeItem('sc-ref');try{const{data}=await sb.rpc('apply_referral',{p_code:ref});if(data==='ok')tip('Parrainage enregistré');}catch(_){}}}

/* ============ OUTILS ============ */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const monthDay=s=>new Date(s).toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
const dateTime=s=>{const d=new Date(s);return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})+' · '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
const ic=c=>h('i',{class:'fa-solid '+c});
function sheet(build){const bg=h('div',{class:'sheet-bg',on:{click:e=>{if(e.target===bg)close();}}}),sh=h('div',{class:'sheet'},h('div',{class:'grab'}));bg.append(sh);const close=()=>bg.remove();build(sh,close);doc.body.append(bg);return close;}
const lightbox=src=>{const l=h('div',{style:'position:fixed;inset:0;z-index:10100;background:rgba(0,0,0,.92);display:grid;place-items:center',on:{click:()=>l.remove()}},h('img',{src,alt:'',style:'max-width:96vw;max-height:92dvh;border-radius:8px'}));doc.body.append(l);};
const copy=async t=>{try{await navigator.clipboard.writeText(t);tip('Copié');}catch(_){const x=h('textarea',{style:'position:fixed;opacity:0'},t);doc.body.append(x);x.select();try{doc.execCommand('copy');tip('Copié');}catch(__){}x.remove();}};
async function fitImage(file,max=1280){if(!/^image\//.test(file.type))throw new Error('Choisis une image.');const bmp=await createImageBitmap(file),r=Math.min(1,max/Math.max(bmp.width,bmp.height)),c=doc.createElement('canvas');
  c.width=Math.round(bmp.width*r);c.height=Math.round(bmp.height*r);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);const blob=await new Promise(res=>c.toBlob(res,'image/jpeg',.85));return new File([blob],'img.jpg',{type:'image/jpeg'});}
async function uploadImg(file,prefix){const u=SC.me(),f=await fitImage(file),path=u.id+'/'+prefix+'_'+Date.now()+'.jpg';
  const{error}=await sb.storage.from('media').upload(path,f,{contentType:'image/jpeg'});if(error)throw error;return sb.storage.from('media').getPublicUrl(path).data.publicUrl;}
const hashN=s=>{let n=0;for(let i=0;i<String(s).length;i++)n=(n*31+String(s).charCodeAt(i))>>>0;return n;};
const GRAD=['#5b8cff','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6','#f43f5e','#84cc16'];
const initials=n=>{const w=String(n||'?').replace(/[^\p{L}\p{N} ]/gu,'').trim().split(/\s+/).filter(Boolean);return((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase();};
function avatar3(p){const nm=p.display_name||p.username||'?',e=h('div',{class:'av3',style:'background:'+GRAD[hashN(p.id||nm)%GRAD.length]},initials(nm));if(p.avatar_url){const i=h('img',{src:p.avatar_url,alt:'',referrerpolicy:'no-referrer',on:{error:()=>i.remove()}});e.append(i);}return e;}
const METH_COL={wave:'#1ba1ff',orange:'#ff7900',mtn:'#ffcc00',moov:'#0a67b2',binance:'#f0b90b',usdt:'#26a17b',wallet:'#5b6cf5'};
const METH_INI={wave:'W',orange:'OM',mtn:'MTN',moov:'M',binance:'B',usdt:'₮',wallet:'W'};
function logo(id,name){const box=h('div',{class:'lg'}),ext=['svg','png','webp','jpg'];let i=0;
  const ph=()=>{box.className='lg ph';box.style.background=METH_COL[id]||'#64748b';if(id==='mtn')box.style.color='#1b1b1b';box.replaceChildren(document.createTextNode(METH_INI[id]||initials(name)));};
  const img=h('img',{alt:name,on:{error:()=>{i++;if(i<ext.length)img.src='./logos/'+id+'.'+ext[i];else ph();}}});img.src='./logos/'+id+'.'+ext[0];box.append(img);return box;}
const methName=id=>{const m=(WD().methods||[]).find(x=>x.id===id);return m?m.name:id;};

/* ============ NAVIGATION ============ */
const go0=SC.go;
SC.go=function(k){if(k==='rew'&&SC.me())return openWallet();if(k==='adm'&&SC.me())return openAdmin();return go0.apply(this,arguments);};
window.SCWallet={open:openWallet,openAdmin};
function mount(f){SC.open('dev',box=>{box.classList.add('v2');const r=h('div',{class:'wl'});box.append(r);f(r);});}
function openWallet(tab){mount(r=>renderWallet(r,tab||LS.getItem('sc-wtab')||'gains'));}
function curSeg(re){return h('div',{class:'seg'},...['USD','FCFA'].map(c=>h('button',{class:curPref()===c?'on':'',on:{click:()=>{LS.setItem('sc-cur',c);re();}}},c)));}
async function renderWallet(r,tab){
  fill(r,h('div',{class:'empty2'},'Chargement…'));await Promise.all([loadSettings(),me()]);LS.setItem('sc-wtab',tab);
  const body=h('div',{}),re=()=>renderWallet(r,tab);
  fill(r,h('div',{class:'wl-head'},h('h2',{},'Gains'),curSeg(re)),
    h('div',{class:'seg wl-tabs'},...[['gains','Gains'],['retrait','Retrait'],['parrainage','Parrainage']].map(([k,l])=>h('button',{class:tab===k?'on':'',on:{click:()=>renderWallet(r,k)}},l))),
    body,isAdmin()?h('button',{class:'adm-link',type:'button',on:{click:()=>openAdmin()}},ic('fa-sliders'),'Administration : taux, missions, retraits'):null);
  try{await({gains:vGains,retrait:vWithdraw,parrainage:vRef})[tab](body,re,r);}catch(e){fill(body,h('div',{class:'empty2'},'Erreur : '+((e&&e.message)||e)));}
  if(window.scEmojify)window.scEmojify(r);}

/* ============ ONGLET GAINS ============ */
const KIND_UI={join_group:['fa-users','linear-gradient(135deg,#3b82f6,#6366f1)','Rejoindre'],checks_today:['fa-shield-halved','linear-gradient(135deg,#10b981,#0ea5a4)','Valider'],daily_login:['fa-calendar-check','linear-gradient(135deg,#f59e0b,#ef6c3c)','Réclamer'],
  invite_friends:['fa-user-plus','linear-gradient(135deg,#ec4899,#c026d3)','Valider'],link:['fa-link','linear-gradient(135deg,#0ea5e9,#2563eb)','Ouvrir'],proof:['fa-camera','linear-gradient(135deg,#0f172a,#334155)','Envoyer une capture']};
const todayStr=()=>new Date().toISOString().slice(0,10);
async function vGains(b,re,root){const uid=SC.me().id,since=new Date();since.setUTCHours(0,0,0,0);
  const[w,rw,tk,tc,rf]=await Promise.all([sb.from('wallets').select('balance,total_earned').eq('user_id',uid).maybeSingle(),
    sb.from('rewards').select('id,amount,kind,created_at,task_id').eq('user_id',uid).order('created_at',{ascending:false}).limit(40),
    sb.from('tasks').select('*').eq('active',true).order('sort'),sb.from('task_claims').select('task_id,status,day,note').eq('user_id',uid),
    sb.from('rewards').select('*',{count:'exact',head:true}).eq('user_id',uid).eq('kind','referral')]);
  const bal=Number(w.data&&w.data.balance)||0,minUsd=Number(WD().min_usd)||25,rows=rw.data||[],tasks=tk.data||[],claims=tc.data||[];
  const paid=rows.filter(x=>['check_ok','check_ban'].includes(x.kind)&&new Date(x.created_at)>=since),usedUsd=paid.reduce((s,x)=>s+Number(x.amount),0),capPts=Number(RW().daily_cap_pts)||0;
  const actives=rf.count||0,pct=Math.min(100,Math.round(bal/minUsd*100));
  const card=h('div',{class:'bal'},h('small',{},'Solde disponible'),h('div',{class:'big'},curPref()==='USD'?'$'+bal.toFixed(2):[nf(toF(bal)),' ',h('span',{},'FCFA')]),
    h('div',{class:'eq'},curPref()==='USD'?'≈ '+nf(toF(bal))+' FCFA':'≈ $'+bal.toFixed(2),' · ',pts(bal)),h('div',{class:'prog'},h('i',{style:'width:'+pct+'%'})),
    h('div',{class:'meta'},h('span',{},pct>=100?'Tu peux demander un retrait':pct+' % du seuil de retrait'),h('span',{},'Retrait dès '+money(minUsd))));
  const chips=h('div',{class:'chips'},h('div',{class:'chip'},h('b',{},paid.length+' vérif.'),h('span',{},'Payées aujourd’hui')),h('div',{class:'chip'},h('b',{},nf(toP(usedUsd))+' / '+nf(capPts)+' pts'),h('span',{},'Plafond du jour')));
  const taskRow=t=>{const ui=KIND_UI[t.kind]||KIND_UI.link,day=t.repeat==='daily'?todayStr():'1970-01-01',cl=claims.filter(c=>c.task_id===t.id&&String(c.day).slice(0,10)===day),
      ok=cl.find(c=>c.status==='approved'),pe=cl.find(c=>c.status==='pending'),rj=cl.filter(c=>c.status==='rejected').pop();
    let sub=t.description||(t.repeat==='daily'?'Chaque jour':'Une seule fois'),prog=null,btn;
    if(t.kind==='checks_today'){const n=paid.length;sub=n+' / '+t.target+' aujourd’hui';prog=h('div',{class:'mini'},h('i',{style:'width:'+Math.min(100,n/t.target*100)+'%'}));}
    if(t.kind==='invite_friends'){sub=actives+' / '+t.target+' filleul(s) actif(s)';prog=h('div',{class:'mini'},h('i',{style:'width:'+Math.min(100,actives/t.target*100)+'%'}));}
    if(rj&&!ok&&!pe)sub='Refusée'+(rj.note?' : '+rj.note:'')+' — réessaie';
    if(ok)btn=h('button',{class:'go done',type:'button',disabled:true},'Fait');else if(pe)btn=h('button',{class:'go wait',type:'button',disabled:true},'En attente');
    else{const notReady=(t.kind==='checks_today'&&paid.length<t.target)||(t.kind==='invite_friends'&&actives<t.target);
      btn=h('button',{class:'go',type:'button',on:{click:async e=>{if(t.kind==='invite_friends'&&notReady){renderWallet(root,'parrainage');return;}e.target.disabled=true;await doTask(t);re();}}},t.kind==='invite_friends'&&notReady?'Inviter':ui[2]);}
    return h('div',{class:'task'},h('div',{class:'ti',style:'background:'+ui[1]},ic(ui[0])),h('div',{class:'m'},h('b',{},t.title),h('span',{},sub),prog),h('span',{class:'pts'},'+'+t.points),btn);};
  const hist=[...rows.map(x=>({ts:x.created_at,kind:x.kind,amt:Number(x.amount)}))].slice(0,12);
  const KL={check_ok:['Numéro actif','i-ok','fa-circle-check'],check_ban:['Numéro banni','i-ban','fa-ban'],referral:['Bonus de parrainage','i-ref','fa-user-plus'],referral_tier:['Palier de parrainage','i-ref','fa-trophy'],task:['Mission','i-ref','fa-star']};
  const rates=RW();
  fill(b,card,chips,h('h3',{},'Missions'),tasks.length?h('div',{class:'card'},...tasks.map(taskRow)):h('div',{class:'empty2'},'Aucune mission pour le moment.'),
    h('h3',{},'Barème'),h('div',{class:'card'},
      h('div',{class:'hrow'},h('div',{class:'hi i-ok'},ic('fa-circle-check')),h('div',{class:'m'},h('b',{},'Numéro actif'),h('span',{},'Un même numéro rapporte une fois tous les '+rates.cooldown_days+' jours')),h('div',{class:'a plus'},'+'+rates.pts_active+' pts')),
      h('div',{class:'hrow'},h('div',{class:'hi i-ban'},ic('fa-ban')),h('div',{class:'m'},h('b',{},'Numéro banni'),h('span',{},'Plafond : '+rates.daily_cap_pts+' pts par jour')),h('div',{class:'a plus'},'+'+rates.pts_banned+' pts')),
      h('div',{class:'hrow'},h('div',{class:'hi i-out'},ic('fa-coins')),h('div',{class:'m'},h('b',{},'Valeur d’un point'),h('span',{},'Taux fixé par l’équipe')),h('div',{class:'a'},nf(RT().fcfa_per_pt)+' FCFA'))),
    h('h3',{},'Historique'),hist.length?h('div',{class:'card'},...hist.map(x=>{const k=KL[x.kind]||['Gain','i-ok','fa-coins'];return h('div',{class:'hrow'},h('div',{class:'hi '+k[1]},ic(k[2])),h('div',{class:'m'},h('b',{},k[0]),h('span',{},dateTime(x.ts))),h('div',{class:'a plus'},'+'+nf(toP(x.amt))+' pts'));})):h('div',{class:'empty2'},'Tes gains apparaîtront ici après ta première vérification.'));}
async function doTask(t){try{let proof=null;
  if(t.kind==='proof'){const f=await pickFile('image/*');if(!f)return;tip('Envoi de la capture…');proof=await uploadImg(f,'proof');}
  if(t.kind==='link'&&t.url){window.open(t.url,'_blank','noopener');await sleep(2500);}
  const{data,error}=await sb.rpc('claim_task',{p_task:t.id,p_proof:proof});if(error)throw error;
  tip(data&&data.status==='credited'?'+'+nf(data.points)+' pts ajoutés':'Envoyée : en attente de validation');}catch(e){tip((e&&e.message)||String(e));}}

/* ============ ONGLET RETRAIT ============ */
const NETS=['TRC20 (USDT)','BEP20 (USDT)','ERC20','Binance Pay (ID)','Bitcoin','Autre réseau'];
async function vWithdraw(b,re){const uid=SC.me().id,[w,wd]=await Promise.all([sb.from('wallets').select('balance').eq('user_id',uid).maybeSingle(),sb.from('withdrawals').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(20)]);
  const bal=Number(w.data&&w.data.balance)||0,minUsd=Number(WD().min_usd)||25,cur=curPref(),methods=(WD().methods||[]).filter(m=>m.active!==false);
  const minLocal=cur==='USD'?minUsd:Math.ceil(toF(minUsd)),maxLocal=cur==='USD'?Math.floor(bal*100)/100:Math.floor(toF(bal));
  const S={method:methods[0]?methods[0].id:null,amt:String(minLocal<=maxLocal?minLocal:''),phone:'',holder:'',addr:'',net:NETS[0],qr:null};
  const amtIn=h('input',{type:'text',inputmode:'decimal',value:S.amt,on:{input:()=>{S.amt=amtIn.value.replace(',','.');upd();}}});
  const eq=h('small',{}),mBox=h('div',{class:'meths'}),fBox=h('div',{class:'card',style:'margin-top:0'}),cta=h('button',{class:'cta',type:'button'},ic('fa-arrow-up'),'Demander le retrait');
  const cur_m=()=>methods.find(m=>m.id===S.method);
  const valid=()=>{const a=parseFloat(S.amt),m=cur_m();if(!m||!(a>0)||a<minLocal||a>maxLocal)return false;
    if(m.kind==='phone')return S.phone.replace(/\D/g,'').length>=8&&S.holder.trim().length>=2;return S.addr.trim().length>=5;};
  const upd=()=>{const a=parseFloat(S.amt)||0;eq.textContent=a>0?('≈ '+(cur==='USD'?nf(a*RT().fcfa_per_usd)+' FCFA':'$'+(a/RT().fcfa_per_usd).toFixed(2))+' · solde '+money(bal)):'Solde '+money(bal);cta.disabled=!valid();};
  const drawM=()=>{fill(mBox,...methods.map(m=>h('div',{class:'mt'+(S.method===m.id?' on':''),on:{click:()=>{S.method=m.id;drawM();drawF();upd();}}},logo(m.id,m.name),m.name)));if(window.scEmojify)window.scEmojify(mBox);};
  const inp=(k,ph,type)=>h('input',{type:type||'text',placeholder:ph,value:S[k],on:{input:e=>{S[k]=e.target.value;upd();}}});
  const drawF=()=>{const m=cur_m();if(!m){fill(fBox,h('div',{class:'empty2'},'Aucun moyen de retrait disponible pour le moment.'));return;}
    if(m.kind==='phone')fill(fBox,h('div',{class:'fld'},h('small',{},'Numéro '+m.name),inp('phone','Ex. 07 00 00 00 00','tel')),h('div',{class:'fld'},h('small',{},'Nom du titulaire du compte'),inp('holder','Nom et prénom')));
    else{const th=h('div',{class:'th'},S.qr?h('img',{src:S.qr,alt:''}):ic('fa-qrcode')),tx=h('div',{},h('b',{},S.qr?'QR importé':'Importer ma capture QR'),h('span',{},S.qr?'Touche pour changer':'Capture de ton QR '+m.name+' (facultatif)'));
      fill(fBox,h('div',{class:'fld'},h('small',{},'Adresse ou ID '+m.name),inp('addr','Colle ton adresse ou ton ID')),
        h('div',{class:'fld'},h('small',{},'Réseau'),(()=>{const s=h('select',{on:{change:e=>{S.net=e.target.value;}}},...NETS.map(n=>h('option',{value:n,selected:n===S.net},n)));return s;})()),
        h('div',{class:'fld'},h('small',{},'Capture de ton QR'),h('div',{class:'drop',on:{click:async()=>{const f=await pickFile('image/*');if(!f)return;try{tip('Envoi…');S.qr=await uploadImg(f,'qr');drawF();}catch(e){tip((e&&e.message)||'Envoi impossible');}}}},th,tx)));}
    if(window.scEmojify)window.scEmojify(fBox);};
  cta.addEventListener('click',async()=>{const m=cur_m();cta.disabled=true;
    const details=m.kind==='phone'?S.holder.trim()+' | '+S.phone.trim():S.addr.trim()+' | '+S.net;
    try{const{error}=await sb.rpc('request_withdrawal2',{p_amount_local:parseFloat(S.amt),p_currency:cur,p_method:m.id,p_details:details,p_qr:m.kind==='crypto'?S.qr:null});if(error)throw error;tip('Demande envoyée');re();}catch(e){tip((e&&e.message)||String(e));cta.disabled=!valid();}});
  const quick=h('div',{class:'qk'},h('button',{type:'button',on:{click:()=>{amtIn.value=S.amt=String(minLocal);upd();}}},'Minimum'),h('button',{type:'button',on:{click:()=>{amtIn.value=S.amt=String(maxLocal);upd();}}},'Tout'));
  const ST={pending:['En attente','wt'],processing:['En cours','in'],approved:['Approuvé','in'],paid:['Payé','ok'],rejected:['Refusé','no']};
  fill(b,h('div',{class:'card amt'},h('small',{},'Montant à retirer'),h('div',{class:'inp'},amtIn,h('span',{class:'cur'},cur==='USD'?'$':'FCFA')),eq,quick),
    h('h3',{},'Moyen de retrait'),mBox,h('h3',{},'Détails'),fBox,cta,
    h('div',{class:'note'},bal<minUsd?'Il te manque '+money(minUsd-bal)+' pour atteindre le retrait minimum ('+money(minUsd)+').':'Traité par l’équipe. Le montant est bloqué jusqu’à la décision.'),
    h('h3',{},'Mes retraits'),(wd.data||[]).length?h('div',{class:'card'},...wd.data.map(x=>{const s=ST[x.status]||[x.status,'in'];
      return h('div',{class:'hrow'},h('div',{class:'hi i-out'},ic('fa-arrow-up')),h('div',{class:'m'},h('b',{},methName(x.method)+' · '+(x.amount_local?nf(x.amount_local)+' '+(x.currency||'USD'):money(x.amount))),h('span',{},dateTime(x.created_at)+(x.note?' · '+x.note:''))),h('span',{class:'pill '+s[1]},s[0]));})):h('div',{class:'empty2'},'Aucun retrait pour le moment.'));
  drawM();drawF();upd();}

/* ============ ONGLET PARRAINAGE ============ */
let qrLib=null;
function loadQr(){if(window.qrcode)return Promise.resolve(window.qrcode);if(qrLib)return qrLib;qrLib=new Promise((res,rej)=>{const s=h('script',{src:'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'});s.onload=()=>res(window.qrcode);s.onerror=rej;doc.head.append(s);});return qrLib;}
function savePng(svg,name){const x=new XMLSerializer().serializeToString(svg),img=new Image();img.onload=()=>{const c=doc.createElement('canvas');c.width=c.height=720;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,720,720);g.drawImage(img,40,40,640,640);
  c.toBlob(bl=>{const a=h('a',{href:URL.createObjectURL(bl),download:name});doc.body.append(a);a.click();a.remove();},'image/png');};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(x);}
async function vRef(b){const uid=SC.me().id,P=await me(),code=(P&&P.referral_code)||'',link=location.origin+'/?ref='+code,r=RW();
  const[cl,rf,lst,bn]=await Promise.all([sb.from('ref_clicks').select('n').eq('user_id',uid),sb.from('profiles').select('*',{count:'exact',head:true}).eq('referred_by',uid),sb.rpc('my_referrals'),sb.from('rewards').select('amount').eq('user_id',uid).in('kind',['referral','referral_tier'])]);
  const clicks=(cl.data||[]).reduce((s,x)=>s+(x.n||0),0),signups=rf.count||0,list=lst.data||[],actives=list.filter(x=>x.active).length,earned=(bn.data||[]).reduce((s,x)=>s+Number(x.amount),0);
  const tiers=(r.tiers||[]).slice().sort((a,c)=>a.actives-c.actives),next=tiers.find(t=>t.actives>actives);
  const msg='Rejoins-moi sur Snow Cloud Chek : vérifie des numéros WhatsApp et gagne de l’argent. '+link;
  const qbox=h('div',{class:'q'});
  loadQr().then(q=>{const o=q(0,'M');o.addData(link);o.make();qbox.innerHTML=o.createSvgTag(4,0);const sv=$('svg',qbox);if(sv){sv.removeAttribute('width');sv.removeAttribute('height');}}).catch(()=>{qbox.append(ic('fa-qrcode'));});
  fill(b,h('div',{class:'hero2'},h('h4',{},'Invite tes amis,',h('br'),'gagnez ensemble'),h('p',{},'Tu reçois ',h('b',{},'+'+r.ref_bonus_pts+' points'),' quand ton ami a fait '+r.ref_after_checks+' vérifications.'),
      h('div',{class:'code'},h('b',{},code||'—'),h('button',{class:'cp',type:'button',on:{click:()=>copy(code)}},'Copier'))),
    h('div',{class:'card',style:'margin-top:12px'},h('div',{class:'linkrow'},ic('fa-link'),h('code',{},link.replace(/^https?:\/\//,'')),h('button',{class:'cp',type:'button',on:{click:()=>copy(link)}},'Copier')),
      h('div',{class:'share'},h('button',{type:'button',on:{click:()=>window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener')}},ic('fa-brands fa-whatsapp'),'WhatsApp'),
        h('button',{type:'button',on:{click:()=>{location.href='sms:?&body='+encodeURIComponent(msg);}}},ic('fa-message'),'Message'),
        h('button',{type:'button',on:{click:async()=>{if(navigator.share){try{await navigator.share({title:'Snow Cloud Chek',text:msg,url:link});}catch(_){}}else copy(link);}}},ic('fa-share-nodes'),'Partager'))),
    h('div',{class:'card qrw',style:'margin-top:12px'},qbox,h('p',{},h('b',{},'Ton QR code'),'Un ami le scanne et arrive directement sur l’inscription avec ton code.',h('br'),h('button',{class:'lk',type:'button',on:{click:()=>{const sv=$('svg',qbox);if(sv)savePng(sv,'snow-parrainage.png');else tip('QR indisponible');}}},'Enregistrer l’image'))),
    h('h3',{},'Mes statistiques'),h('div',{class:'stats'},h('div',{class:'stat'},h('b',{},nf(clicks)),h('span',{},'Clics sur ton lien')),h('div',{class:'stat'},h('b',{},nf(signups)),h('span',{},'Inscrits')),
      h('div',{class:'stat'},h('b',{},nf(actives)),h('span',{},'Filleuls actifs')),h('div',{class:'stat'},h('b',{class:'plus',style:'color:var(--ok)'},nf(toP(earned))+' pts'),h('span',{},'Gagnés ('+money(earned)+')'))),
    next?h('div',{},h('h3',{},'Prochain palier'),h('div',{class:'card tier'},h('div',{class:'t1'},h('b',{},next.actives+' filleuls actifs'),h('span',{},'+'+nf(next.bonus_pts)+' pts')),h('div',{class:'bar2'},h('i',{style:'width:'+Math.min(100,actives/next.actives*100)+'%'})),h('small',{},'Plus que '+(next.actives-actives)+' filleul(s) actif(s) pour débloquer le bonus.'))):null,
    h('h3',{},'Mes filleuls'),list.length?h('div',{class:'card'},...list.map(x=>h('div',{class:'ref'},avatar3(x),h('div',{class:'m'},h('b',{},x.display_name||x.username,' ',h('span',{style:'font-weight:500'},'@'+x.username)),h('span',{},x.active?'Actif · '+x.paid_checks+' vérifications':'Inscrit · '+x.paid_checks+' / '+r.ref_after_checks+' vérifications')),h('span',{class:'pill '+(x.active?'ok':'wt')},x.active?'Actif':'En cours')))):h('div',{class:'empty2'},'Personne ne s’est encore inscrit avec ton lien.'));}

/* ============ ADMINISTRATION ============ */
const num=v=>{const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:0;};
function openAdmin(){mount(async r=>{fill(r,h('div',{class:'empty2'},'Chargement…'));await Promise.all([me(true),loadSettings()]);
  if(!isAdmin()){go0.call(SC,'adm');return;}renderAdmin(r,LS.getItem('sc-atab')||'gains');});}
function renderAdmin(r,tab){LS.setItem('sc-atab',tab);const body=h('div',{});
  fill(r,h('div',{class:'wl-head'},h('h2',{},'Administration'),h('button',{class:'btn3 ghost sm',type:'button',on:{click:()=>openWallet()}},'Retour')),
    h('div',{class:'seg wl-tabs'},...[['gains','Taux'],['tasks','Missions'],['wd','Retraits'],['proofs','Captures']].map(([k,l])=>h('button',{class:tab===k?'on':'',on:{click:()=>renderAdmin(r,k)}},l))),body,
    h('button',{class:'adm-link',type:'button',on:{click:()=>go0.call(SC,'adm')}},ic('fa-gear'),'Ancien panneau (utilisateurs, groupes, FAQ…)'));
  ({gains:aSettings,tasks:aTasks,wd:aWithdrawals,proofs:aProofs})[tab](body,()=>renderAdmin(r,tab)).catch(e=>fill(body,h('div',{class:'empty2'},'Erreur : '+((e&&e.message)||e))));}
const fld=(label,input)=>h('div',{class:'fld'},h('small',{},label),input);
async function aSettings(b,re){const rt=RT(),rw=RW(),wd=WD(),t0=(rw.tiers&&rw.tiers[0])||{actives:10,bonus_pts:500};
  const I={fu:h('input',{value:rt.fcfa_per_usd,inputmode:'decimal'}),fp:h('input',{value:rt.fcfa_per_pt,inputmode:'decimal'}),pa:h('input',{value:rw.pts_active,inputmode:'decimal'}),pb:h('input',{value:rw.pts_banned,inputmode:'decimal'}),
    cd:h('input',{value:rw.cooldown_days,inputmode:'numeric'}),dc:h('input',{value:rw.daily_cap_pts,inputmode:'decimal'}),rb:h('input',{value:rw.ref_bonus_pts,inputmode:'decimal'}),ra:h('input',{value:rw.ref_after_checks,inputmode:'numeric'}),
    ta:h('input',{value:t0.actives,inputmode:'numeric'}),tb:h('input',{value:t0.bonus_pts,inputmode:'decimal'}),mn:h('input',{value:wd.min_usd,inputmode:'decimal'})};
  const meths=(wd.methods||[]).map(m=>({...m})),sw=h('div',{class:'card'});
  const drawM=()=>fill(sw,...meths.map(m=>h('div',{class:'tog'},h('span',{},m.name),h('button',{class:'sw'+(m.active!==false?' on':''),type:'button','aria-label':m.name,on:{click:()=>{m.active=m.active===false;drawM();}}}))));drawM();
  const hint=h('div',{class:'hint'});const upd=()=>{hint.textContent='1 point = '+num(I.fp.value)+' FCFA ≈ $'+(num(I.fp.value)/(num(I.fu.value)||1)).toFixed(3)+' · Numéro actif : '+num(I.pa.value)+' pts = '+nf(num(I.pa.value)*num(I.fp.value))+' FCFA · Numéro banni : '+num(I.pb.value)+' pts = '+nf(num(I.pb.value)*num(I.fp.value))+' FCFA';};
  Object.values(I).forEach(i=>i.addEventListener('input',upd));upd();
  const save=h('button',{class:'cta',type:'button',on:{click:async()=>{save.disabled=true;
    const rows=[{key:'rates',value:{fcfa_per_usd:num(I.fu.value),fcfa_per_pt:num(I.fp.value)}},
      {key:'rewards',value:{pts_active:num(I.pa.value),pts_banned:num(I.pb.value),cooldown_days:Math.round(num(I.cd.value)),daily_cap_pts:num(I.dc.value),ref_bonus_pts:num(I.rb.value),ref_after_checks:Math.round(num(I.ra.value)),tiers:[{actives:Math.round(num(I.ta.value)),bonus_pts:num(I.tb.value)}]}},
      {key:'withdraw',value:{min_usd:num(I.mn.value),methods:meths}}];
    if(rows[0].value.fcfa_per_usd<=0||rows[0].value.fcfa_per_pt<=0){tip('Les taux doivent être supérieurs à 0.');save.disabled=false;return;}
    const{error}=await sb.from('app_settings').upsert(rows.map(x=>({...x,updated_at:new Date().toISOString()})));save.disabled=false;
    if(error)tip(error.message);else{SET.rates=rows[0].value;SET.rewards=rows[1].value;SET.withdraw=rows[2].value;tip('Réglages enregistrés');}}}},'Enregistrer');
  fill(b,h('h3',{},'Taux de change'),h('div',{class:'card'},fld('FCFA pour 1 USD',I.fu),fld('FCFA pour 1 point',I.fp)),
    h('h3',{},'Gains des vérifications'),h('div',{class:'card'},fld('Points pour un numéro actif',I.pa),fld('Points pour un numéro banni',I.pb),fld('Délai avant qu’un même numéro rapporte à nouveau (jours)',I.cd),fld('Plafond de points par jour et par membre',I.dc)),hint,
    h('h3',{},'Parrainage'),h('div',{class:'card'},fld('Bonus du parrain (points)',I.rb),fld('Vérifications payées du filleul avant le bonus',I.ra),fld('Palier : nombre de filleuls actifs',I.ta),fld('Palier : bonus (points)',I.tb)),
    h('h3',{},'Retraits'),h('div',{class:'card'},fld('Retrait minimum (USD)',I.mn)),h('div',{style:'height:10px'}),sw,save);}
const TKINDS=[['daily_login','Connexion quotidienne'],['checks_today','Faire X vérifications payées'],['join_group','Rejoindre un groupe ou une chaîne'],['invite_friends','Avoir X filleuls actifs'],['link','Ouvrir un lien'],['proof','Envoyer une capture (tu valides)']];
async function aTasks(b,re){const[{data:tk},{data:gr}]=await Promise.all([sb.from('tasks').select('*').order('sort'),sb.from('groups').select('id,name')]);
  const edit=t=>sheet((sh,close)=>{const T=t||{title:'',description:'',kind:'daily_login',points:10,repeat:'once',target:1,url:'',group_id:null,active:true,sort:(tk||[]).length+1};
    const f=(k,type)=>h('input',{type:type||'text',value:T[k]==null?'':T[k]}),I={title:f('title'),description:f('description'),points:f('points','number'),target:f('target','number'),url:f('url'),sort:f('sort','number')};
    const kind=h('select',{},...TKINDS.map(([v,l])=>h('option',{value:v,selected:v===T.kind},l))),rep=h('select',{},h('option',{value:'once',selected:T.repeat==='once'},'Une seule fois'),h('option',{value:'daily',selected:T.repeat==='daily'},'Chaque jour')),
      grp=h('select',{},h('option',{value:''},'— aucun —'),...(gr||[]).map(g=>h('option',{value:g.id,selected:g.id===T.group_id},g.name))),act=h('select',{},h('option',{value:'1',selected:T.active},'Active'),h('option',{value:'0',selected:!T.active},'Désactivée'));
    sh.append(h('h3',{},t?'Modifier la mission':'Nouvelle mission'),h('label',{},'Titre'),I.title,h('label',{},'Description'),I.description,h('label',{},'Type'),kind,h('div',{class:'row2'},h('div',{},h('label',{},'Points'),I.points),h('div',{},h('label',{},'Objectif (X)'),I.target)),
      h('div',{class:'row2'},h('div',{},h('label',{},'Répétition'),rep),h('div',{},h('label',{},'Statut'),act)),h('label',{},'Groupe / chaîne (si « Rejoindre »)'),grp,h('label',{},'Lien (si « Ouvrir un lien »)'),I.url,h('label',{},'Ordre d’affichage'),I.sort,
      h('div',{class:'btns'},t?h('button',{class:'d',type:'button',on:{click:async()=>{if(!confirm('Supprimer cette mission ?'))return;const{error}=await sb.from('tasks').delete().eq('id',t.id);if(error)tip(error.message);else{close();re();}}}},'Supprimer'):null,h('button',{class:'g',type:'button',on:{click:close}},'Annuler'),
        h('button',{type:'button',on:{click:async()=>{const row={title:I.title.value.trim(),description:I.description.value.trim()||null,kind:kind.value,points:Math.max(1,Math.round(num(I.points.value))),target:Math.max(1,Math.round(num(I.target.value))),repeat:rep.value,
          url:I.url.value.trim()||null,group_id:grp.value||null,active:act.value==='1',sort:Math.round(num(I.sort.value))};if(!row.title){tip('Donne un titre.');return;}
          const q=t?sb.from('tasks').update(row).eq('id',t.id):sb.from('tasks').insert(row);const{error}=await q;if(error)tip(error.message);else{close();re();tip('Mission enregistrée');}}}},'Enregistrer')));});
  fill(b,h('button',{class:'btn3',type:'button',on:{click:()=>edit(null)}},ic('fa-plus'),'Nouvelle mission'),h('div',{style:'height:12px'}),(tk||[]).length?h('div',{class:'card'},...tk.map(t=>{const ui=KIND_UI[t.kind]||KIND_UI.link;
    return h('div',{class:'task',style:'cursor:pointer',on:{click:()=>edit(t)}},h('div',{class:'ti',style:'background:'+ui[1]+(t.active?'':';opacity:.4')},ic(ui[0])),h('div',{class:'m'},h('b',{},t.title),h('span',{},(TKINDS.find(k=>k[0]===t.kind)||[,t.kind])[1]+' · '+(t.repeat==='daily'?'chaque jour':'une fois')+(t.active?'':' · désactivée'))),h('span',{class:'pts'},'+'+t.points));})):h('div',{class:'empty2'},'Aucune mission.'));}
async function profMap(ids){const m={};const u=[...new Set(ids)].filter(Boolean);if(u.length){const{data}=await sb.from('profiles').select('id,username,display_name').in('id',u);(data||[]).forEach(p=>{m[p.id]=p;});}return m;}
const who=p=>p?(p.display_name||p.username)+' (@'+p.username+')':'Membre';
async function aWithdrawals(b,re){const{data}=await sb.from('withdrawals').select('*').order('created_at',{ascending:false}).limit(60),list=data||[],pm=await profMap(list.map(x=>x.user_id));
  const rank={pending:0,processing:1,approved:2,paid:3,rejected:4},sorted=list.slice().sort((a,c)=>(rank[a.status]-rank[c.status])||(new Date(c.created_at)-new Date(a.created_at)));
  const ST={pending:['En attente','wt'],processing:['En cours','in'],approved:['Approuvé','in'],paid:['Payé','ok'],rejected:['Refusé','no']};
  const act=async(x,st,note)=>{const{error}=await sb.rpc('admin_review_withdrawal',{p_id:x.id,p_status:st,p_note:note||null});if(error)tip(error.message);else{tip('Mis à jour');re();}};
  fill(b,sorted.length?h('div',{class:'card'},...sorted.map(x=>{const s=ST[x.status]||[x.status,'in'],open=['pending','processing','approved'].includes(x.status);
    return h('div',{class:'wd'},h('div',{class:'t1'},h('div',{},h('b',{},(x.amount_local?nf(x.amount_local)+' '+(x.currency||'USD'):money(x.amount,'USD'))+' · '+methName(x.method)),h('div',{},h('span',{},who(pm[x.user_id])+' · '+dateTime(x.created_at)+' · ≈ $'+Number(x.amount).toFixed(2)))),h('span',{class:'pill '+s[1]},s[0])),
      h('div',{class:'det',on:{click:()=>copy(x.details||'')}},x.details||'—'),x.qr_url?h('img',{class:'qrp',src:x.qr_url,alt:'QR',on:{click:()=>lightbox(x.qr_url)}}):null,x.note?h('div',{class:'hint'},'Note : '+x.note):null,
      open?h('div',{class:'acts'},x.status==='pending'?h('button',{class:'btn3 ghost sm',type:'button',on:{click:()=>act(x,'processing')}},'En cours'):null,h('button',{class:'btn3 ok sm',type:'button',on:{click:()=>{if(confirm('Marquer comme payé ? Tu dois avoir envoyé l’argent.'))act(x,'paid');}}},'Payé'),
        h('button',{class:'btn3 bad sm',type:'button',on:{click:()=>sheet((sh,close)=>{const n=h('textarea',{rows:3,placeholder:'Raison du refus (visible par le membre)'});sh.append(h('h3',{},'Refuser et rembourser'),n,h('div',{class:'btns'},h('button',{class:'g',type:'button',on:{click:close}},'Annuler'),h('button',{class:'d',type:'button',on:{click:()=>{close();act(x,'rejected',n.value.trim());}}},'Refuser')));})}},'Refuser')):null);})):h('div',{class:'empty2'},'Aucune demande de retrait.'));}
async function aProofs(b,re){const{data}=await sb.from('task_claims').select('*').eq('status','pending').order('created_at'),list=data||[];
  const[pm,{data:tk}]=await Promise.all([profMap(list.map(x=>x.user_id)),sb.from('tasks').select('id,title,points')]),tm={};(tk||[]).forEach(t=>{tm[t.id]=t;});
  const rev=async(x,ok,note)=>{const{error}=await sb.rpc('review_task_claim',{p_id:x.id,p_ok:ok,p_note:note||null});if(error)tip(error.message);else{tip(ok?'Validée':'Refusée');re();}};
  fill(b,list.length?h('div',{class:'card'},...list.map(x=>h('div',{class:'wd'},h('div',{class:'t1'},h('div',{},h('b',{},(tm[x.task_id]||{}).title||'Mission'),h('div',{},h('span',{},who(pm[x.user_id])+' · '+dateTime(x.created_at)))),h('span',{class:'pill ok'},'+'+((tm[x.task_id]||{}).points||0)+' pts')),
    x.proof_url?h('img',{class:'qrp',src:x.proof_url,alt:'Capture',style:'width:140px;height:140px',on:{click:()=>lightbox(x.proof_url)}}):null,
    h('div',{class:'acts'},h('button',{class:'btn3 ok sm',type:'button',on:{click:()=>rev(x,true)}},'Valider'),h('button',{class:'btn3 bad sm',type:'button',on:{click:()=>sheet((sh,close)=>{const n=h('textarea',{rows:3,placeholder:'Raison (visible par le membre)'});sh.append(h('h3',{},'Refuser la capture'),n,h('div',{class:'btns'},h('button',{class:'g',type:'button',on:{click:close}},'Annuler'),h('button',{class:'d',type:'button',on:{click:()=>{close();rev(x,false,n.value.trim());}}},'Refuser')));})}},'Refuser'))))):h('div',{class:'empty2'},'Aucune capture à valider.'));}
})();
