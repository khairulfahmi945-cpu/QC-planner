/* ===== QC Dashboard Status: state, storage and shared calculations ===== */
let D=null,IDS=[],FCACHE=null;
function useData(d){D=d&&d.qcs?d:null;IDS=D?Object.keys(D.qcs):[];FCACHE=null}
/* Saved data: the latest uploaded live update file, kept in this browser (IndexedDB, localStorage fallback). */
const DB={
  open(){return new Promise((ok,no)=>{if(!window.indexedDB)return no(new Error('no idb'));const r=indexedDB.open('qc-lookup',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})},
  async get(){return Promise.race([DB._get(),new Promise(r=>setTimeout(()=>r(null),4000))])},
  async _get(){try{const db=await DB.open();const v=await new Promise((ok,no)=>{const q=db.transaction('kv').objectStore('kv').get('data');q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});if(v)return v}catch(_){}
    try{return JSON.parse(localStorage.getItem('qcD')||'null')}catch(_){return null}},
  async set(d){return Promise.race([DB._set(d),new Promise(r=>setTimeout(()=>r(false),4000))])},
  async _set(d){let ok1=false;try{const db=await DB.open();await new Promise((ok,no)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(d,'data');t.oncomplete=ok;t.onerror=()=>no(t.error)});ok1=true}catch(_){}
    try{localStorage.setItem('qcD',JSON.stringify(d))}catch(_){try{localStorage.removeItem('qcD')}catch(_){}}
    return ok1}
};
/* Shared mode (claude.ai): one upload is stored in the page's shared storage and every viewer loads it. */
const SH={db:null,assets:null,cur:null,loading:null,got:false};
const canUp=()=>!SH.db||!!SH.assets;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const E=v=>String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pad=n=>String(+n).padStart(2,'0');
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MN={Jan:'January',Feb:'February',Mar:'March',Apr:'April',May:'May',Jun:'June',Jul:'July',Aug:'August',Sep:'September',Oct:'October',Nov:'November',Dec:'December'};
const T=new Date(),T0=new Date(T.getFullYear(),T.getMonth(),T.getDate()),ISO=T.getFullYear()+'-'+pad(T.getMonth()+1)+'-'+pad(T.getDate());
const RX=/^(\d{4})-(\d\d)-(\d\d)$/,isIso=s=>RX.test(s||'');
const fd=s=>{const m=RX.exec(s||'');return m?(+m[3])+' '+MON[+m[2]-1]+' '+m[1]:E(s)};
const fdd=s=>{const m=RX.exec(s||'');return m?(+m[3])+' '+MON[+m[2]-1]:E(s)};
/* Whole days from today to a date: negative is in the past. */
const dayDiff=s=>{const m=RX.exec(s||'');return m?Math.round((new Date(+m[1],+m[2]-1,+m[3])-T0)/864e5):null};
const ago=s=>{const d=dayDiff(s);return d===null?'':d<0?(-d)+' days ago':d===0?'today':'in '+d+' days'};
const YR=()=>String((D&&D.year)||String((D&&D.built)||'').slice(0,4)||T.getFullYear());
const RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const tone=t=>/long down|exceed|reject|expired|overdue|not avail/i.test(t)?'bad':/^ops$|complete|done|closed|available|valid/i.test(t)?'ok':/open|pend|wait|due|progress|partial|sched|plan/i.test(t)?'warn':'';
const chip=(t,x)=>t?'<span class="chip '+(x||tone(t))+'">'+E(t)+'</span>':'';
const kv=(k,v)=>v?'<div class="kv"><dt>'+k+'</dt><dd>'+v+'</dd></div>':'';
const dl=(...r)=>'<dl>'+r.join('')+'</dl>';
const empty=t=>'<p class="empty">'+t+'</p>';
const num=v=>{const s=String(v==null?'':v).trim();return /^-?[\d,]+(\.\d+)?$/.test(s)?parseFloat(s.replace(/,/g,'')):null};
const nf=v=>Number(v).toLocaleString('en-US');
const myr=x=>/MYR/i.test(x.rm||'')?(num(String(x.rm).replace(/MYR/i,''))||0):0;
const fmtM=v=>'MYR '+(v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?Math.round(v/1e3)+'k':Math.round(v));
/* Sentence case for ALL-CAPS sheet values, keeping the usual abbreviations in capitals. */
const cap=s=>{s=String(s||'').toLowerCase().replace(/\b(po|pr|wo|wr|grn|pm|qc|ohc|mcs|scr|mcr|tls|sos|sany|hpu)\b/g,m=>m.toUpperCase());return s.charAt(0).toUpperCase()+s.slice(1)};
const plural=(n,w)=>n+' '+w+(n===1?'':'s');

/* ---------- per-crane helpers ---------- */
const lastPM=c=>[...c.pm].reverse().find(x=>x.st||x.s||x.a.length);
const stOf=c=>{const l=lastPM(c);return l?l.st:''};
const isDown=c=>/down|breakdown|\bbd\b|not avail|out of service|oos/i.test(stOf(c));
const isOpen=x=>x.st&&!/complete|clos|done|cancel/i.test(x.st);
const cat=x=>/complete|clos|done/i.test(x.st)?'done':isOpen(x)?'open':'other';
/* Work requests: criticality comes from the Priority column (Priority 1 is most critical). */
const wqOf=c=>c.wq||[];
const crit=x=>{const m=/priority\s*(\d)/i.exec(x.pri||'');return m?+m[1]:9};
const critLbl=x=>{const n=crit(x);return n<9?'P'+n+(/minor/i.test(x.pri)?' · Minor':/major/i.test(x.pri)?' · Major impact':''):(x.pri||'')};
const critTone=n=>n===1?'bad':n===2?'warn':'ok';
const wqOpen=x=>!/clos|cancel|complet|reject/i.test(x.st||'');
const topCrit=c=>Math.min(9,...wqOf(c).filter(wqOpen).map(crit));
/* PM */
const pmState=x=>!x?'none':/complete|done/i.test(x.s)?'done':/plan|progress|partial|sched/i.test(x.s)?'plan':'pend';
/* A month cell: PM done wins, then crane down, then the PM state. */
const cellState=x=>{const s=pmState(x);return s==='done'?'done':/down/i.test(x&&x.st||'')?'down':s};
const CELL={done:'PM done',plan:'In plan',pend:'Not done',none:'No record',down:'Crane down'};
const curMon=()=>{const has=new Set();IDS.forEach(i=>D.qcs[i].pm.forEach(x=>has.add(MON.indexOf(x.m))));const a=[...has].filter(k=>k>=0).sort((x,y)=>x-y);if(!a.length)return null;
  if(+YR()===T.getFullYear()){const b=a.filter(k=>k<=T.getMonth());return MON[b.length?b[b.length-1]:a[0]]}return MON[a[a.length-1]]};
const pmNow=(c,m)=>pmState(c.pm.find(x=>x.m===m));
const lastDone=c=>{let b='';c.pm.forEach(x=>{if(pmState(x)==='done')x.a.forEach(a=>{if(isIso(a)&&a<=ISO&&a>b)b=a})});return b};
const downSince=c=>{let k=null,on=false;for(let i=c.pm.length-1;i>=0;i--){const x=c.pm[i];if(!on&&!(x.st||x.s||x.a.length))continue;on=true;if(/down/i.test(x.st))k=x.m;else break}return k};
/* PMA / CF certificate */
const pmaDays=c=>dayDiff(c.pmaExp);
const pmaState=c=>{const d=pmaDays(c);return d===null?'none':d<0?'exp':d<=60?'due':'ok'};
/* Quarterly inspection: the latest quarter with an actual date, and its next plan date. */
const inspNext=c=>{const l=[...(c.fyk||[])].reverse().find(x=>x.a);return l?{q:l.q,a:l.a,n:l.n,d:dayDiff(l.n)}:null};
/* Wirerope */
const ropeType=j=>{const s=String(j||'').toUpperCase();return /CATENARY/.test(s)?'Catenary':/TROLLEY/.test(s)?'Trolley':/BOOM/.test(s)?'Boom':/HOIST/.test(s)?'Main hoist':'Other'};
const ropeTone=p=>p>=100?'s-bd':p>=90?'s-wn':'s-tl';
const sanyOf=c=>Array.isArray(c.sany)?c.sany:c.sany?[{ty:'',lim:'',st:c.sany.st,d:'',mv:'',item:c.sany.item,cur:num(c.sany.cur)!==null?c.sany.cur:''}]:[];
/* Oil: "OIL SAMPLING : <parts> OIL REPLACEMENT : <parts>" */
const oilParts=ds=>{const m=/OIL\s+SAMPLING\s*:?\s*(.*?)\s*OIL\s+REPLACEMENT\s*:?\s*(.*)$/i.exec(ds||''),sp=s=>String(s||'').toUpperCase().split(/[\/,&+]|\bAND\b/).map(x=>x.replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim()).filter(x=>x&&x.length<=24);
  return m?{sa:sp(m[1]),re:sp(m[2])}:{sa:[],re:[]}};
const oilDate=x=>isIso(x.c)?x.c:isIso(x.d)?x.d:'';

/* ---------- fleet-wide numbers, computed once per data load ---------- */
function FC(){
  if(FCACHE)return FCACHE;
  const f={};f.all=IDS.map(i=>D.qcs[i]);f.N=IDS.length;f.m=curMon();
  f.down=IDS.filter(i=>isDown(D.qcs[i]));f.ops=f.all.filter(c=>/^ops$/i.test(stOf(c))).length;
  f.pm={done:[],plan:[],pend:[],none:[]};IDS.forEach(i=>f.pm[pmNow(D.qcs[i],f.m)].push(i));
  f.pmM=MON.map(k=>{const xs=f.all.map(c=>c.pm.find(x=>x.m===k)).filter(Boolean);return{k,n:xs.length,d:xs.filter(x=>pmState(x)==='done').length}}).filter(x=>x.n);
  f.streak=0;for(let i=f.pmM.length-1;i>=0;i--){if(f.pmM[i].k===f.m)continue;if(MON.indexOf(f.pmM[i].k)>MON.indexOf(f.m))continue;if(f.pmM[i].d===f.pmM[i].n)f.streak++;else break}
  /* work requests */
  f.wq=[];IDS.forEach(i=>wqOf(D.qcs[i]).forEach(x=>f.wq.push(Object.assign({id:i},x))));f.wqo=f.wq.filter(wqOpen);
  f.wc=[1,2,3].map(n=>f.wqo.filter(x=>crit(x)===n).length);f.wc.push(f.wqo.length-f.wc[0]-f.wc[1]-f.wc[2]);
  /* PR / WO: a job listed against several cranes is one job */
  f.jobs=[];const mp=new Map();IDS.forEach(i=>D.qcs[i].pr.forEach(x=>{const k=x.wo+'|'+x.pr+'|'+x.j+'|'+x.d;let o=mp.get(k);if(!o){o={x,ids:[]};mp.set(k,o);f.jobs.push(o)}if(!o.ids.includes(i))o.ids.push(i)}));
  const grp=x=>/complete|clos|done/i.test(x.st)?'done':/cancel/i.test(x.st)?'cancel':/return/i.test(x.st)?'ret':/plan|progress/i.test(x.st)?'plan':/open/i.test(x.st)?'open':x.st?'other':'none';
  f.jg={};f.jv={};f.jobs.forEach(o=>{const g=o.g=grp(o.x);f.jg[g]=(f.jg[g]||0)+1;f.jv[g]=(f.jv[g]||0)+myr(o.x)});
  f.jopen=f.jobs.filter(o=>isOpen(o.x));f.jopenV=f.jopen.reduce((n,o)=>n+myr(o.x),0);
  f.wait=f.jopen.filter(o=>/waiting crane/i.test(o.x.ps)).length;
  /* wirerope */
  f.wr=[];IDS.forEach(i=>D.qcs[i].wr.forEach(x=>f.wr.push(Object.assign({id:i,ty:ropeType(x.j)},x))));
  f.wrp=f.wr.filter(x=>/pend/i.test(x.js));f.wrd=f.wr.filter(x=>/done|complete/i.test(x.js));
  f.rope=[];IDS.forEach(i=>{const c=D.qcs[i];
    c.wr.forEach(x=>{const cu=num(x.cur),r=num(x.rec);if(/pend/i.test(x.js)&&cu&&r)f.rope.push({id:i,j:ropeType(x.j),c:cu,r,p:cu/r*100,note:x.mo||''})});
    sanyOf(c).forEach(s=>{const cu=num(s.cur),r=num(s.lim);if(cu&&r&&!/complete|done/i.test(s.st))f.rope.push({id:i,j:s.ty||'Wirerope',c:cu,r,p:cu/r*100,note:s.st||'',sany:1})})});
  f.rope.sort((a,b)=>b.p-a.p);
  /* certificates */
  f.pma={ok:[],due:[],exp:[],none:[]};IDS.forEach(i=>f.pma[pmaState(D.qcs[i])].push(i));
  f.pma.exp.sort((a,b)=>pmaDays(D.qcs[a])-pmaDays(D.qcs[b]));f.pma.due.sort((a,b)=>pmaDays(D.qcs[a])-pmaDays(D.qcs[b]));
  f.insp=IDS.map(i=>Object.assign({id:i},inspNext(D.qcs[i])||{})).filter(x=>x.q);
  f.inspOver=f.insp.filter(x=>x.d!==null&&x.d<0).sort((a,b)=>a.d-b.d);
  /* oil */
  f.oil=[];IDS.forEach(i=>(D.qcs[i].oil||[]).forEach(x=>f.oil.push(Object.assign({id:i,dt:oilDate(x)},x))));
  f.sos=IDS.filter(i=>D.qcs[i].sos).map(i=>Object.assign({id:i},D.qcs[i].sos));
  /* fleets */
  f.fleets={};IDS.forEach(i=>{const k=D.qcs[i].fleet||'Other';(f.fleets[k]=f.fleets[k]||[]).push(i)});
  return FCACHE=f;
}
/* Alerts, grouped by reason. Each row is one crane or one work request. */
function alertSections(){
  const f=FC(),S=[];
  S.push({k:'down',t:'Cranes down',sh:'Down',tone:'bad',rows:f.down.map(i=>{const c=D.qcs[i],ds=downSince(c),ld=lastDone(c),ow=wqOf(c).filter(wqOpen).length;
    return{id:i,m:E(stOf(c))+(ds?' since '+MN[ds]+' '+YR():''),s:[E(c.fleet),ld?'last PM done '+fd(ld):'',ow?plural(ow,'open work request'):''].filter(Boolean).join(' · ')}})});
  S.push({k:'p1',t:'Open P1 work requests',sh:'P1 requests',tone:'bad',rows:f.wqo.filter(x=>crit(x)===1).sort((a,b)=>String(a.d).localeCompare(String(b.d))).map(x=>(
    {id:x.id,m:E(x.ds)||'No description',s:[E(x.no),'raised '+fd(x.d),isIso(x.d)?ago(x.d):'',E(x.ty),E(x.wo)].filter(Boolean).join(' · ')}))});
  S.push({k:'rope',t:'Wirerope at 95% or more of its move limit',sh:'Rope 95%+',tone:'warn',rows:f.rope.filter(x=>x.p>=95).map(x=>(
    {id:x.id,tone:x.p>=100?'bad':'warn',m:E(x.j)+' rope at '+x.p.toFixed(1)+'% of its move limit',s:[nf(x.c)+' of '+nf(x.r)+' moves',E(cap(x.note)),x.sany?'SANY update sheet':''].filter(Boolean).join(' · ')}))});
  S.push({k:'pmaexp',t:'PMA / CF expired',sh:'PMA expired',tone:'bad',rows:f.pma.exp.map(i=>{const c=D.qcs[i];return{id:i,m:'Expired '+fd(c.pmaExp),s:[E(c.fleet),(-pmaDays(c))+' days ago',E(c.pma)].filter(Boolean).join(' · ')}})});
  S.push({k:'pmadue',t:'PMA / CF expiring within 60 days',sh:'PMA due',tone:'warn',rows:f.pma.due.map(i=>{const c=D.qcs[i],d=pmaDays(c);return{id:i,m:'Expires '+fd(c.pmaExp),s:[E(c.fleet),d===0?'today':'in '+d+' days',E(c.pma)].filter(Boolean).join(' · ')}})});
  S.push({k:'insp',t:'Quarterly inspection plan date passed',sh:'Inspection',tone:'warn',rows:f.inspOver.map(x=>(
    {id:x.id,m:'Next inspection was planned for '+fd(x.n),s:[E(D.qcs[x.id].fleet),(-x.d)+' days ago','last done '+fd(x.a)+' ('+E(x.q)+')'].join(' · ')}))});
  return S.filter(s=>s.rows.length);
}
const alertCounts=()=>{const A=alertSections(),bad=new Set(),all=new Set();A.forEach(s=>s.rows.forEach(r=>{all.add(r.id);if((r.tone||s.tone)==='bad')bad.add(r.id)}));return{A,bad:bad.size,all:all.size}};

/* ---------- small UI builders ---------- */
const seg=(parts,tot)=>'<div class="meter">'+parts.map(([v,cl])=>v>0?'<i class="'+cl+'" style="--w:'+(v/Math.max(1e-9,tot)*100).toFixed(2)+'%"></i>':'').join('')+'</div>';
const lg=a=>'<div class="lg">'+a.map(([t,v,cl])=>'<span><i class="'+cl+'"></i>'+t+(v===''||v==null?'':' <b>'+v+'</b>')+'</span>').join('')+'</div>';
const kstrip=a=>'<div class="kstrip">'+a.map(([v,l,c])=>'<div'+(c?' class="k-'+c+'"':'')+'><b>'+v+'</b><span>'+l+'</span></div>').join('')+'</div>';
const card=(h,sub,body,cls)=>'<article class="card ins'+(cls?' '+cls:'')+'"><h3>'+h+'</h3>'+(sub?'<p class="sub">'+sub+'</p>':'')+body+'</article>';
const phead=(h,p)=>'<div class="phead"><h2>'+h+'</h2>'+(p?'<p>'+p+'</p>':'')+'</div>';
const hbars=(a,fmt,cls)=>{const mx=Math.max(1e-9,...a.map(x=>x.v));return '<div class="hbars">'+a.map(x=>{const inner='<span>'+x.l+'</span><b>'+(fmt?fmt(x.v,x):nf(x.v))+'</b><div class="meter"><i class="'+(x.c||cls||'s-tl')+'" style="--w:'+(x.v/mx*100).toFixed(1)+'%"></i></div>';return x.h?'<a class="hb" href="'+x.h+'">'+inner+'</a>':'<div class="hb">'+inner+'</div>'}).join('')+'</div>'};
const vbars=(a,label,cls)=>'<div class="vbars'+(cls?' '+cls:'')+(a.length>12?' dense':'')+'" role="img" aria-label="'+E(label)+'">'+a.map((x,i)=>'<div class="vb'+(x.cur?' cur':'')+'" title="'+E(x.t||'')+'"><b>'+x.top+'</b><i'+(x.cl?' class="'+x.cl+'"':'')+' style="--h:'+Math.max(0,x.h).toFixed(1)+'%;--i:'+i+'">'+(x.inn||'')+'</i><span>'+x.l+'</span></div>').join('')+'</div>';
const ring=(pct,frac,label)=>{const R=46,C=2*Math.PI*R;return '<div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="'+R+'" class="trk"/><circle cx="60" cy="60" r="'+R+'" class="val" style="--c:'+C.toFixed(1)+';--o:'+(C*(1-Math.max(0,Math.min(1,frac)))).toFixed(1)+'"/></svg><div class="rc"><b data-n="'+pct+'">'+pct+'</b><small>%</small><span>'+label+'</span></div></div>'};
/* A table on wide screens; on a phone each row becomes a small card with labels, so nothing scrolls sideways. */
const rtable=(cols,rows,cls)=>'<table class="rtb'+(cls?' '+cls:'')+'"><thead><tr>'+cols.map(c=>'<th>'+c[0]+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>'<td data-l="'+c[0]+'"'+(c[2]?' class="'+c[2]+'"':'')+'>'+c[1](r)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
const cid=i=>'<a class="cid" href="#'+i+'">'+i+'</a>';
const row=(r,tn)=>'<a class="row'+(tn?' '+tn:'')+'" href="#'+r.id+'"><b class="rid">'+r.id+'</b><div class="rb"><p class="rm">'+r.m+'</p>'+(r.s?'<p class="rs">'+r.s+'</p>':'')+'</div>'+(r.v?'<span class="rv">'+r.v+'</span>':'<span class="go" aria-hidden="true">›</span>')+'</a>';
const more=(key,left,step)=>left>0?'<button type="button" class="more" data-more="'+key+'" data-step="'+step+'">Show '+Math.min(step,left)+' more ('+left+' left)</button>':'';
/* Cross-fade between pages where the browser supports it. A transition that is cut short by the next tap is not an error. */
function swap(fn){if(!document.startViewTransition||RM)return fn();try{const t=document.startViewTransition(fn);['ready','finished','updateCallbackDone'].forEach(k=>{if(t&&t[k]&&t[k].catch)t[k].catch(()=>{})})}catch(_){fn()}}
function count(el,n){if(RM){el.textContent=n;return}const t0=performance.now(),d=900;(function f(t){const p=Math.min(1,(t-t0)/d);el.textContent=Math.round(n*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(t0)}
let MSG={t:'',k:''};
const say=(t,k)=>{MSG={t:t||'',k:k||''};$$('.msg').forEach(m=>{m.textContent=MSG.t;m.className='msg '+MSG.k})};
const msgEl=()=>'<p class="msg '+MSG.k+'" role="status">'+E(MSG.t)+'</p>';
const upd=()=>!D?'':fd(D.built)+(D.at?', '+new Date(D.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'');
