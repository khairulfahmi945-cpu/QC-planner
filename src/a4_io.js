/* ===== reading the Excel file, export, upload and shared storage ===== */
const PARTS=['HOIST','TROLLEY','BOOM','GANTRY','AUXILIARY'];
const cv=v=>{if(v==null||v==='')return '';if(v instanceof Date){if(isNaN(v))return '';const d=new Date(v.getTime()+432e5),y=d.getFullYear();return y<2000?'':y+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}return typeof v==='number'?String(v):String(v).replace(/\s+/g,' ').trim()};
const qid=v=>{const m=/^Q\s*C?\s*-?\s*(\d{1,3})$/i.exec(cv(v));return m?'Q'+pad(m[1]):null};
const qids=(...a)=>{for(const v of a){const o=[];String(v||'').replace(/(^|[^A-Za-z0-9])Q(?:C)?\s*-?\s*(\d{1,3})(?!\d)/gi,(s,x,n)=>{const q='Q'+pad(n);if(!o.includes(q))o.push(q);return s});if(o.length)return o}return[]};
const money=v=>{const s=cv(v);return /^\d+(\.\d+)?$/.test(s)?'MYR '+Number(s).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):s};
function parse(buf,name){
 const nm=XLSX.read(buf,{type:'array',bookSheets:true}).SheetNames,U=x=>x.trim().toUpperCase(),f1=p=>nm.find(x=>U(x).indexOf(p)===0);
 /* Sheets that carry a year in their name: take the newest year. */
 const pick=re=>{let b=null,by=-1;nm.forEach(x=>{const m=re.exec(U(x));if(m&&+m[1]>by){by=+m[1];b=x}});return{n:b,y:by}};
 const MR=/^(PM\s+)?(JANUARI|JANUARY|JAN|FEBRUARY|FEB|MARCH|MAR|APRIL|APR|MAY|JUNE|JUN|JULY|JUL|AUGUST|AUG|SEPTEMBER|SEPT|SEP|OCTOBER|OCT|NOVEMBER|NOV|DECEMBER|DEC)(?:\s*'?\s*(20\d\d|\d\d))?\s*$/i;
 const mi=s=>MON.findIndex(m=>m.toUpperCase()===s.trim().replace(/^PM\s+/i,'').slice(0,3).toUpperCase());
 const myear=s=>{const m=MR.exec(s.trim());return m&&m[3]?(+m[3]<100?2000+ +m[3]:+m[3]):0};
 const pP=pick(/^PR\s*(20\d\d)\b/),pW=pick(/^WIREROPE\s*(20\d\d)\b/);
 const cand=nm.filter(x=>MR.test(x.trim()));
 const year=Math.max(0,...cand.map(myear))||(pP.y>0?pP.y:0)||new Date().getFullYear();
 const bym={};cand.forEach(x=>{const y=myear(x),k=mi(x);if(k<0||(y&&y!==year))return;if(!bym[k]||(y&&!myear(bym[k])))bym[k]=x});
 const months=Object.keys(bym).map(Number).sort((a,b)=>a-b).map(k=>bym[k]);
 const nF=f1('FYK INS'),nP=pP.n||f1('PR 20'),nW=pW.n||f1('WIREROPE 20'),nS=f1('SHEET1'),nC=nm.find(x=>/^SOS COUPLING SERV/i.test(x.trim()))||f1('SOS COUPLING'),nO=f1('OIL SAMPLING'),nR=f1('WORK REQUEST');
 if(!nF||!months.length)throw new Error('FYK INS or the monthly sheets are missing.');
 const wb=XLSX.read(buf,{type:'array',cellDates:true,sheets:[...months,nF,nP,nW,nS,nC,nO,nR].filter(Boolean)});
 const rows=n=>n&&wb.Sheets[n]?XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''}):[];
 const N=x=>cv(x).toUpperCase().replace(/\s+/g,' ').trim();
 const Q={},M=new Set(),mk=q=>Q[q]||(Q[q]={pm:[],pr:[],wr:[],oil:[],fyk:[],wq:[]}),fix={wqDates:0};
 rows(nF).slice(2).forEach(r=>{const q=qid(r[1]);if(!q)return;M.add(q);Object.assign(mk(q),{fleet:cv(r[2]),desc:cv(r[3]),pma:cv(r[4]),serial:cv(r[5]),pmaExp:cv(r[6]),fyk:[0,1,2,3].map(i=>({q:'Q'+(i+1),a:cv(r[7+2*i]),n:cv(r[8+2*i])}))})});
 months.forEach(sh=>{const R=rows(sh),mo=MON[mi(sh)];
  /* Find the QC ID column from the data itself, then the header rows just above the first crane row. */
  const W=R.reduce((m,r)=>Math.max(m,r.length),0);let ci=-1,best=0;
  for(let i=0;i<Math.min(W,12);i++){let n=0;R.forEach(r=>{if(qid(r[i]))n++});if(n>best){best=n;ci=i}}
  if(ci<0||best<1)return;
  const f=R.findIndex(r=>qid(r[ci]));
  const hr=[];for(let k=f-1;k>=0&&hr.length<2;k--){if(R[k].some(x=>cv(x)!==''))hr.unshift(R[k])}
  const h=[];for(let i=0;i<W;i++)h.push(hr.map(r=>N(r[i])).filter(Boolean).join(' '));
  const last=hr.length?hr[hr.length-1].map(N):[];
  let L=h.findIndex(x=>x.indexOf('LIVE INSPECTION')>=0);if(L<0)L=W;
  const find=t=>{for(let i=0;i<L;i++)if(i!==ci&&t(h[i]||'',last[i]||''))return i;return -1};
  const cs=find(x=>/QC\s*STATUS|CRANE STATUS|QC CONDITION/.test(x)),
        cl=find(x=>/LAST/.test(x)&&/MAINT|PM|SERVIC/.test(x)),
        ct=find((x,l)=>(l==='STATUS'||/PM STATUS|^STATUS$|JOB STATUS/.test(x))&&!/QC\s*STATUS|CRANE STATUS/.test(x)),
        cr=find(x=>/REMARK/.test(x));
  const ca=[],cp=[];for(let i=0;i<L;i++){if(i===ci)continue;if(/ACTUAL/.test(h[i]||''))ca.push(i);const w=PARTS.find(P=>(last[i]||'')===P||(h[i]||'')===P);if(w)cp.push([i,w])}
  const g=(r,i)=>i>=0?cv(r[i]):'';
  R.slice(f).forEach(r=>{const q=qid(r[ci]);if(!q)return;M.add(q);const p={};cp.forEach(([i,w])=>{const v=cv(r[i]);if(v)p[w.charAt(0)+w.slice(1).toLowerCase()]=v});mk(q).pm.push({m:mo,st:g(r,cs),ls:g(r,cl),a:ca.map(i=>cv(r[i])).filter(Boolean),s:g(r,ct),r:g(r,cr),p})})});
 rows(nP).slice(2).forEach(r=>{const ids=qids(r[1],r[2]);if(!ids.length)return;const it={d:cv(r[0]),j:cv(r[2]).slice(0,220),sc:cv(r[3]),wo:cv(r[4]),pr:cv(r[5]),v:cv(r[6]),rm:money(r[7]),st:cv(r[8]),ps:cv(r[9]),po:cv(r[10]),grn:cv(r[11]),pu:cv(r[12]).slice(0,200)};ids.forEach(q=>{if(M.has(q))mk(q).pr.push(it)})});
 let wm='';rows(nW).slice(2).forEach(r=>{if(cv(r[0]))wm=cv(r[0]);const q=qid(r[2]);if(!q||!M.has(q))return;let p=cv(r[17]);if(p!==''&&!isNaN(p))p=Number(p).toFixed(1);
  mk(q).wr.push({mo:wm.charAt(0)+wm.slice(1).toLowerCase(),j:cv(r[3]).slice(0,160),js:cv(r[5]),item:cv(r[6]),wo:cv(r[9]),pr:cv(r[10]),cwo:cv(r[11]),pd:cv(r[12]),loc:cv(r[13]).slice(0,80),rec:cv(r[14]),cur:cv(r[15]),over:cv(r[16]),pct:p,pri:cv(r[18]).slice(0,20),av:cv(r[19]),note:cv(r[20]).slice(0,80)})});
 /* SANY update sheet: one block per rope type, each with its own move limit and header row. */
 (()=>{let ty='',lim=null,H=null;rows(nS).forEach(r=>{const up=N(r[0]),t=/^(MAIN HOIST|HOIST|TROLLEY|BOOM|CATENARY)\b.*WIRE ?ROPE/.exec(up);
   if(t){ty=t[1].replace('MAIN ','');ty=ty.charAt(0)+ty.slice(1).toLowerCase();lim=null;H=null;return}
   if(up==='QC ID'){H=r.slice(0,12).map(N);return}
   if(!H){const n=r.slice(0,8).find(x=>typeof x==='number'&&x>=1000);if(n&&!qid(r[0]))lim=n;return}
   const q=qid(r[0]);if(!q||!M.has(q))return;
   const ic=H.indexOf('CURRENT MOVES'),i2=H.findIndex(x=>/^2ND/.test(x));
   const e={ty,lim:lim?String(lim):'',st:cv(r[1]),d:cv(r[2]),mv:cv(r[3]),item:cv(r[5]),cur:ic>=0?cv(r[ic]):''};
   if(i2>=0&&(cv(r[i2])||cv(r[i2+1])))e.x2={d:cv(r[i2]),mv:cv(r[i2+1]),item:cv(r[i2+3])};
   const c=mk(q);(c.sany=c.sany||[]).push(e)})})();
 (()=>{const R=rows(nC),h=R.findIndex(r=>r.some(x=>N(x)==='QC ID')),H=h>=0?R[h].map(N):[];
   const iq=h>=0?H.indexOf('QC ID'):1,idt=h>=0&&H.indexOf('DATE')>=0?H.indexOf('DATE'):2,ist=h>=0&&H.indexOf('STATUS')>=0?H.indexOf('STATUS'):3;
   R.slice(h>=0?h+1:1).forEach(r=>{const q=qid(r[iq]);if(q&&M.has(q))mk(q).sos={d:cv(r[idt]),s:cv(r[ist])}})})();
 const oil={};rows(nO).slice(1).forEach(r=>{const q=qid(r[1]);if(q&&M.has(q))(oil[q]=oil[q]||[]).push({d:cv(r[0]),ds:cv(r[3]).slice(0,140),wo:cv(r[4]).slice(0,60),s:cv(r[5]),c:cv(r[6])})});
 Object.keys(oil).forEach(q=>{mk(q).oil=oil[q].sort((a,b)=>String(b.d).localeCompare(String(a.d))).slice(0,60)});
 (()=>{const R=rows(nR),dmy=s=>{const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);return m?m[3]+'-'+pad(m[2])+'-'+pad(m[1]):s};
  const h=R.findIndex(r=>r.some(x=>N(x)==='WORK REQUEST')&&r.some(x=>/PRIORITY|CRITICAL/.test(N(x))));if(h<0)return;
  const H=R[h].map(N),c=t=>H.findIndex(x=>t.test(x)),g=(r,i)=>i>=0?cv(r[i]):'';
  const iN=c(/^WORK REQUEST$/),iD=c(/^DATE$/),iT=c(/^TIME$/),iS=c(/^DESC/),iP=c(/PRIORITY|CRITICAL/),iSt=c(/^STATUS$/),iC=c(/^CODE$|EQUIP/),iTy=c(/^TYPE$/),iW=c(/WORK ORDER|^WO$/),iWs=c(/WO STATUS/),iR=c(/REMARK/);
  /* Excel turns a typed 03/04/2026 into 4 March when the day is 12 or less. The request number starts with year and month (WR2604...), so use it to put the day and month back. */
  const wdate=(no,v)=>{const s=cv(v),p=/^WR(\d\d)(\d\d)/i.exec(no),m=RX.exec(s);
    if(v instanceof Date&&p&&m&&+m[2]!==+p[2]&&+m[3]===+p[2]){fix.wqDates++;return m[1]+'-'+m[3]+'-'+m[2]}return dmy(s)};
  R.slice(h+1).forEach(r=>{const no=g(r,iN);if(!no)return;const m=/^Q\s*C?\s*-?\s*(\d{1,3})(?!\d)/i.exec(g(r,iC));const q=m?'Q'+pad(m[1]):qids(g(r,iS))[0];
   if(!q||!M.has(q))return;mk(q).wq.push({no,d:iD>=0?wdate(no,r[iD]):'',tm:(()=>{const v=r[iT];if(v instanceof Date&&!isNaN(v)){const t=new Date(v.getTime()+500),h=t.getHours();return (h%12||12)+':'+pad(t.getMinutes())+':'+pad(t.getSeconds())+(h<12?' AM':' PM')}return g(r,iT)})(),ds:g(r,iS).slice(0,200),pri:g(r,iP),st:g(r,iSt),code:g(r,iC),ty:g(r,iTy),wo:g(r,iW),wos:g(r,iWs),rm:g(r,iR).slice(0,200)})})})();
 const qcs={};[...M].sort((a,b)=>a.slice(1)-b.slice(1)).forEach(q=>{qcs[q]=mk(q)});
 const t=new Date();return{v:2,built:t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate()),at:t.getTime(),src:name,year,fix,sheets:{fyk:nF,pm:months,pr:nP,wr:nW,sany:nS,sos:nC,oil:nO,wq:nR},qcs};
}
async function xport(ids,fn){
 if(!window.XLSX)return say('The Excel writer is still loading. Try again in a few seconds.','bad');
 const S=[],PM=[],PR=[],WR=[],IN=[],OL=[],WQ=[];
 ids.forEach(q=>{const c=D.qcs[q],l=lastPM(c);
  S.push({QC:q,Fleet:c.fleet,Type:c.desc,'PMA no':c.pma,'Serial no':c.serial,'PMA/CF expiry':c.pmaExp,'Latest status':l?l.st:'','Latest PM month':l?l.m:'','Open PR/WO':c.pr.filter(isOpen).length,'Open work requests':wqOf(c).filter(wqOpen).length,'Highest open criticality':topCrit(c)<9?'P'+topCrit(c):'','SOS coupling':c.sos?c.sos.s:''});
  wqOf(c).forEach(x=>WQ.push({QC:q,'Work request':x.no,Date:x.d,Time:x.tm,Description:x.ds,Criticality:x.pri,Status:x.st,Type:x.ty,'Equipment code':x.code,'Work order':x.wo,'WO status':x.wos,Remark:x.rm}));
  c.pm.forEach(x=>PM.push(Object.assign({QC:q,Month:MN[x.m],'QC status':x.st,'Previous PM':x.ls,'PM done':x.a.join(', '),Status:x.s,Remark:x.r},x.p)));
  c.pr.forEach(x=>PR.push({QC:q,Category:cat(x)==='done'?'Complete':cat(x)==='open'?'Open':'Other',Date:x.d,Job:x.j,Vendor:x.v,Cost:x.rm,WO:x.wo,PR:x.pr,PO:x.po,GRN:x.grn,'Service code':x.sc,'Job status':x.st,'PR/PO status':x.ps,'Planner update':x.pu}));
  c.wr.forEach(x=>WR.push({QC:q,'Plan group':x.mo,Job:x.j,Status:x.js,Availability:x.av,'Plan date':x.pd,'Current moves':x.cur,'Recommended moves':x.rec,'Over moves':x.over,'Over %':x.pct,WO:x.wo,PR:x.pr,CWO:x.cwo,'Item code':x.item}));
  sanyOf(c).forEach(s=>WR.push({QC:q,'Plan group':'SANY update',Job:'SANY '+(s.ty||'')+' wirerope',Status:s.st,'Plan date':s.d,'Current moves':s.cur,'Recommended moves':s.lim,'Item code':s.item}));
  c.fyk.forEach(x=>IN.push({QC:q,Quarter:x.q,Actual:x.a,'Next plan':x.n}));
  (c.oil||[]).forEach(x=>OL.push({QC:q,'Plan date':x.d,Work:x.ds,WO:x.wo,Status:x.s,Completed:x.c}))});
 const wb=XLSX.utils.book_new();
 [['Summary',S],['PM '+YR(),PM],['PR-WO',PR],['Work request',WQ],['Wirerope',WR],['Inspection',IN],['Oil',OL]].forEach(a=>{if(a[1].length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(a[1]),a[0])});
 let dls=null;try{dls=window.claude&&window.claude.use&&await window.claude.use('downloads')}catch(_){}
 if(!dls){try{XLSX.writeFile(wb,fn);say('Export ready: '+fn,'ok')}catch(x){say('Could not save the file.','bad')}return}
 try{await dls.save({filename:fn,data:XLSX.write(wb,{type:'array',bookType:'xlsx'})});say('Export ready: '+fn,'ok')}
 catch(x){if(!x||x.code!=='declined')say('Could not save the file ('+((x&&x.code)||'error')+').','bad')}
}
/* Some in-app views (for example a phone app's built-in browser) never open the file picker. Detect that and say what to do. */
let pickT=0;
document.addEventListener('click',e=>{if(!e.target.closest('.upbtn'))return;clearTimeout(pickT);const left=()=>{clearTimeout(pickT)};
  addEventListener('blur',left,{once:true});document.addEventListener('visibilitychange',left,{once:true});
  pickT=setTimeout(()=>say('The file picker did not open here. This app may block file uploads. Open the same link in Safari or Chrome, or upload from a computer. Everyone sees the upload either way.','bad'),1800)});
$('#file').addEventListener('change',()=>clearTimeout(pickT));
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('upbtn')){e.preventDefault();e.target.click()}});
$('#file').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
 for(let i=0;i<40&&!window.XLSX;i++){say('Loading the Excel reader…');await new Promise(r=>setTimeout(r,250))}
 if(!window.XLSX)return say('The Excel reader could not load. Check your internet connection and try again.','bad');
 say('Reading '+f.name+'. This can take up to 30 seconds on a phone.');
 await new Promise(r=>setTimeout(r,60));
 let d;try{d=parse(await f.arrayBuffer(),f.name);if(!Object.keys(d.qcs).length)throw new Error('no cranes found in this file.');d.pmRows=Object.values(d.qcs).reduce((n,c)=>n+c.pm.length,0)}catch(x){return say('Could not read this file: '+x.message,'bad')}
 useData(d);const saved=await DB.set(d);route(false);
 const sum='Loaded '+IDS.length+' cranes, '+d.pmRows+' PM rows and '+IDS.reduce((n,q)=>n+wqOf(D.qcs[q]).length,0)+' work requests from '+f.name+'.',warn=d.pmRows?'':' Warning: no PM rows were found in the monthly sheets, so crane status will be blank.';
 if(SH.db&&SH.assets){
  say('Loaded '+IDS.length+' cranes. Sharing with everyone…');
  try{const up=await SH.assets.upload(new Blob([JSON.stringify(d)],{type:'application/json'}),{type:'application/json'});
   const old=SH.cur&&SH.cur.asset;SH.loading=d.at;
   await SH.db.doc('live/current').set({asset:up.id,src:d.src,built:d.built,at:d.at,cranes:IDS.length});
   if(old&&old!==up.id)SH.assets.delete(old).catch(()=>{});
   say(sum+' Everyone who opens this page now sees this file.'+warn,d.pmRows?'ok':'bad')}
  catch(x){say('Loaded on this device, but sharing failed ('+((x&&x.code)||'error')+'). Try uploading again.','bad')}
 } else say(sum+(saved?' Saved on this device.':' Could not save it on this device; it will be gone after you close the page.')+warn,saved&&d.pmRows?'ok':'bad');
});
async function shared(){
  if(!window.claude||!window.claude.use)return;
  let db=null;try{db=await window.claude.use('db')}catch(_){}
  if(!db)return;
  SH.db=db;try{SH.assets=await window.claude.use('assets')}catch(_){}
  if(!SH.assets)say('Only people with edit access to this page can upload. You see the latest file they uploaded.');
  route(false);
  const tm=setTimeout(()=>{if(!SH.got)say('Can\'t reach the shared data yet.'+(D?' Showing the copy saved on this device.':''),'bad')},10000);
  db.doc('live/current').onSnapshot(async s=>{
    if(!s.metadata.fromCache&&!SH.got){SH.got=true;clearTimeout(tm)}
    if(!s.exists){SH.cur=null;return}
    const m=s.data();SH.cur=m;
    if((D&&D.at===m.at&&D.src===m.src)||SH.loading===m.at)return;
    SH.loading=m.at;
    try{const r=await fetch('/_blob/'+m.asset);if(!r.ok)throw 0;const d=await r.json();if(!d||!d.qcs)throw 0;
      if(SH.cur!==m)return;useData(d);DB.set(d);route(false);
      if(!SH.assets)say('Updated to '+d.src+'.','ok');else if(MSG.k==='bad'&&/shared data/i.test(MSG.t))say('','')}
    catch(_){SH.loading=null;say('Could not load the latest shared data. Reload the page to try again.','bad')}
  },()=>{clearTimeout(tm);SH.got=true;say('Shared data is unavailable right now.'+(D?' Showing the copy saved on this device.':''),'bad')});
}
