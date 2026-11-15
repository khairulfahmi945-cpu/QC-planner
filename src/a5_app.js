/* ===== router, navigation, events, theme ===== */
const VIEWS={attention:vAttention,pm:vPM,'work-requests':vWQ,'pr-wo':vPR,wirerope:vRope,certificates:vCert,oil:vOil,fleets:vFleets,cranes:vCranes,data:vData};
const isTopic=k=>TOPICS.some(t=>t[0]===k);
let page='home',lastTopic='pm',fromPage='home';const SCR={};
function renderView(anim){
  const el=$('#view');el.classList.toggle('still',!anim);
  if(!D&&page!=='data'){el.innerHTML=phead('No data loaded yet','')+'<article class="card empty-state"><p>Open the Data page to upload the latest LIVE UPDATE file.</p><div class="tools"><a class="btn pri" href="#data">Go to Data</a></div></article>';return}
  el.innerHTML=VIEWS[page]();
  if(page==='cranes')cranesList();
}
/* nav=true when the address changed; false when the same page is redrawn with new data. */
function route(nav){
  const raw=decodeURIComponent(location.hash.slice(1)),key=raw.toLowerCase(),id=raw.toUpperCase(),prev=page;
  if(nav)SCR[prev]=window.scrollY;
  const isCrane=!!(D&&D.qcs[id]);
  page=isCrane?'crane':VIEWS[key]?key:'home';
  if(isTopic(page))lastTopic=page;
  if(page==='crane'&&prev!=='crane')fromPage=prev;
  $('#home').hidden=page!=='home';$('#view').hidden=page==='home'||page==='crane';$('#detail').hidden=page!=='crane';
  if(page==='home'){renderHome();gl('#hero','#gl1',{id:'QC',sub:'Quay crane',down:false})}
  else if(page==='crane'){
    if(nav||cur!==id){cur=id;tab='sum';prAll=D.qcs[id].pr.some(x=>cat(x)==='open')?'open':'all';prN=40;wqAll=wqOf(D.qcs[id]).some(wqOpen)?'open':'all';wqN=40;oilN=8}
    $('#q').value='';$('#sug').innerHTML='';$('#homebody').hidden=false;
    head();draw()}
  else renderView(nav);
  /* header and navigation state */
  const n=page==='home'?'home':page==='attention'?'attention':isTopic(page)?'insights':page==='data'?'data':'cranes';
  $$('#nav a').forEach(a=>{if(a.dataset.n===n)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  $('#nins').setAttribute('href','#'+lastTopic);
  const b=$('#nbadge'),k=D?alertCounts().bad:0;b.textContent=k;b.hidden=!k;
  $('#back').hidden=page!=='crane';
  $('.bar h1').textContent=page==='crane'?cur+' · '+(D.qcs[cur].fleet||'Crane'):'QC DASHBOARD STATUS';
  if(nav){if(prev==='crane'&&page===fromPage&&SCR[page]!=null)window.scrollTo(0,SCR[page]);else window.scrollTo(0,0)}
}
addEventListener('hashchange',()=>swap(()=>route(true)));
$('#back').addEventListener('click',()=>{location.hash=fromPage==='home'||fromPage==='crane'?'':fromPage});
/* Home search */
function matches(v){
  const n=String(v).toUpperCase().replace(/[^0-9]/g,'').replace(/^0+/,'');
  if(!n)return [];
  const k=i=>String(+i.slice(1));
  return IDS.filter(i=>k(i).includes(n)).sort((a,b)=>(k(b).startsWith(n)-k(a).startsWith(n))||(+a.slice(1)-+b.slice(1))).slice(0,12);
}
$('#q').addEventListener('input',e=>{
  const m=matches(e.target.value),has=!!e.target.value.trim();
  $('#homebody').hidden=has;
  $('#sug').innerHTML=!has?'':!D?empty('Upload the live update file first.'):m.length?m.map(i=>{const c=D.qcs[i];return '<a class="sug" href="#'+i+'"><b>'+i+'</b><span>'+E(c.fleet)+'</span>'+chip(stOf(c))+'</a>'}).join(''):empty('No crane found. Check the number and try again.');
});
$('#f').addEventListener('submit',e=>{e.preventDefault();const m=matches($('#q').value);if(m.length)location.hash=m[0]});
/* One crane: tabs and paging */
$('#detail').addEventListener('click',e=>{
  const t=e.target.closest('[data-t]'),p=e.target.closest('[data-pr]'),w=e.target.closest('[data-wq]');
  if(t){tab=t.dataset.t;draw();const tb=$('#dbody');if(tb.getBoundingClientRect().top<0)tb.scrollIntoView({block:'start'})}
  else if(p){prAll=p.dataset.pr;prN=40;draw()}
  else if(w){wqAll=w.dataset.wq;wqN=40;draw()}
  else if(e.target.id==='moreq'){wqN+=40;draw()}
  else if(e.target.id==='more'){prN+=40;draw()}
  else if(e.target.id==='moreo'){oilN+=16;draw()}
});
/* Pages: filters, paging, jumps and actions are plain data attributes */
document.addEventListener('click',e=>{
  const s=e.target.closest('[data-set]'),m=e.target.closest('[data-more]'),j=e.target.closest('[data-jump]'),a=e.target.closest('[data-act]');
  if(s){const v=s.dataset.set,i=v.indexOf(':'),k=v.slice(0,i);UI[k]=v.slice(i+1);Object.keys(DEF).forEach(x=>{if(/N$/.test(x)&&x!==k)UI[x]=DEF[x]});swap(()=>renderView(false))}
  else if(m){UI[m.dataset.more]+=+m.dataset.step||20;renderView(false)}
  else if(j){const t=document.getElementById(j.dataset.jump);if(t)t.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'})}
  else if(a){if(!D)return;if(a.dataset.act==='exall')xport(IDS,'QC-all-'+D.built+'.xlsx');else if(a.dataset.act==='exone')xport([cur],'QC-'+cur+'-'+D.built+'.xlsx')}
});
document.addEventListener('input',e=>{if(e.target.id==='cq'){UI.cq=e.target.value;cranesList()}});
/* ===== Light / dark mode ===== */
const RT=document.documentElement,isDark=()=>RT.dataset.theme?RT.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
function syncTheme(){const d=isDark();$('#theme').classList.toggle('is-dark',d);$('#thl').textContent=d?'Light':'Dark';$('#theme').setAttribute('aria-pressed',d);if(window.Q3D&&Q3D.setTheme)Q3D.setTheme(d)}
$('#theme').addEventListener('click',()=>{const t=isDark()?'light':'dark';try{localStorage.setItem('qcTheme',t)}catch(_){}swap(()=>{RT.dataset.theme=t;syncTheme()})});
try{const t=localStorage.getItem('qcTheme');if(t==='light'||t==='dark')RT.dataset.theme=t}catch(_){}
new MutationObserver(syncTheme).observe(RT,{attributes:true,attributeFilter:['data-theme']});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',syncTheme);
/* ===== start ===== */
route(false);syncTheme();
shared();
DB.get().then(s=>{if(s&&s.qcs&&!D){useData(s);route(false)}});
