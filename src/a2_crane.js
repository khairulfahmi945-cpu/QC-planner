/* ===== one crane: banner + tabs ===== */
let cur=null,tab='sum',prAll='open',prN=40,wqAll='open',wqN=40,oilN=8;
const tl=c=>'<ol class="tl" aria-label="PM status by month">'+MON.map(m=>{const st=cellState(c.pm.find(y=>y.m===m));return '<li class="t-'+st+'" title="'+MN[m]+': '+CELL[st]+'"><i></i><span>'+m.charAt(0)+'</span></li>'}).join('')+'</ol>';
const gauge=(cu,lim,label)=>{const c=num(cu),r=num(lim);if(!c||!r)return '';const p=c/r*100;return '<div class="gauge"><div class="rt"><span>'+(label||'Rope life used')+'</span><b>'+p.toFixed(1)+'%</b></div><div class="meter"><i class="'+ropeTone(p)+'" style="--w:'+Math.min(100,p).toFixed(1)+'%"></i></div></div>'};
const oilChips=x=>{const p=oilParts(x.ds);return (p.sa.length?chip('Sampling: '+p.sa.join(', '),'ok'):'')+(p.re.length?chip('Oil replaced: '+p.re.join(', '),'warn'):'')};
const sanyCard=s=>'<article class="card"><h3>SANY '+E((s.ty||'').toLowerCase())+' wirerope</h3><div class="chips">'+chip(s.st)+'</div>'+gauge(s.cur,s.lim)
  +dl(kv('Current moves',num(s.cur)!==null?nf(num(s.cur)):E(s.cur)),kv('Recommended moves',num(s.lim)!==null?nf(num(s.lim)):''),kv('Replaced on',fd(s.d)),kv('Moves at replacement',num(s.mv)!==null?nf(num(s.mv)):E(s.mv)),kv('Item code',E(s.item)),
    s.x2?kv('Earlier replacement',[fd(s.x2.d),num(s.x2.mv)!==null?nf(num(s.x2.mv))+' moves':'',E(s.x2.item)].filter(Boolean).join(' · ')):'')+'</article>';
const P={
sum(c){
  const l=lastPM(c),o=c.pr.filter(isOpen).length,w=c.wr[c.wr.length-1],oil=(c.oil||[])[0],sy=sanyOf(c);
  const dd=pmaDays(c),ex=dd===null?'':dd<0?chip('Expired','bad'):dd<=60?chip('Due in '+dd+' days','warn'):chip('Valid','ok');
  const nx=c.fyk.filter(x=>x.n>=ISO).sort((a,b)=>a.n.localeCompare(b.n))[0];
  return '<article class="card"><h3>Crane</h3>'+dl(kv('Fleet',E(c.fleet)),kv('Type',E(c.desc)),kv('PMA no.',E(c.pma)),kv('Serial no.',E(c.serial)),kv('PMA / CF expiry',c.pmaExp?fd(c.pmaExp)+' '+ex:''))+'</article>'
  +'<article class="card"><h3>Latest PM</h3>'+tl(c)+(l?'<div class="chips">'+chip(l.st)+chip(l.s)+'</div>'+dl(kv('Month',MN[l.m]+' '+YR()),kv('PM done',l.a.map(fd).join(', ')),kv('Remark',E(l.r))):empty('No PM record in '+YR()+'.'))+'</article>'
  +'<article class="card"><h3>PR / WO</h3>'+dl(kv('Open','<b>'+o+'</b>'),kv('Complete','<b>'+c.pr.filter(x=>cat(x)==='done').length+'</b>'),kv('Total',c.pr.length),kv('Next inspection',nx?E(nx.q)+' plan, '+fd(nx.n):''))+'</article>'
  +(()=>{const q=wqOf(c),op=q.filter(wqOpen),tc=topCrit(c);return '<article class="card'+(tc<9?' crit-'+tc:'')+'"><h3>Work requests</h3>'+(q.length?'<div class="chips">'+(tc<9?chip('Highest open criticality: P'+tc,critTone(tc)):chip('No open requests','ok'))+'</div>'+dl(kv('Open','<b>'+op.length+'</b>'),kv('Open by criticality',[1,2,3].map(n=>{const k=op.filter(x=>crit(x)===n).length;return k?chip('P'+n+' × '+k,critTone(n)):''}).join(' ')),kv('Closed',q.length-op.length),kv('Total',q.length)):empty('No work requests for this crane.'))+'</article>'})()
  +(w||sy.length?'<article class="card"><h3>Wirerope</h3>'+(w?'<div class="chips">'+chip(w.js)+chip(w.av)+'</div>':'')+dl(w?kv('Job',E(w.j)):'',w?kv('Current moves',E(w.cur)):'',...sy.map(s=>kv('SANY '+E((s.ty||'update').toLowerCase()),E(s.st)+(num(s.cur)!==null?', '+nf(num(s.cur))+' moves':''))))+'</article>':'')
  +(c.sos?'<article class="card"><h3>SOS coupling service</h3><div class="chips">'+(chip(c.sos.s)||chip('No status',''))+'</div>'+dl(kv('Date',fd(c.sos.d)))+'</article>':'')
  +(oil?'<article class="card"><h3>Latest oil work</h3><div class="chips">'+chip(oil.s)+oilChips(oil)+'</div>'+dl(kv('Plan date',fd(oil.d)),kv('Completed',fd(oil.c)),kv('Work order',E(oil.wo)))+'</article>':'');
},
pm(c){return c.pm.length?[...c.pm].reverse().map(x=>'<article class="card"><h3>'+MN[x.m]+' '+YR()+'</h3><div class="chips">'+chip(x.st)+chip(x.s)+'</div>'+dl(kv('PM done',x.a.map(fd).join(', ')),kv('Previous PM',fd(x.ls)),kv('Remark',E(x.r)),...Object.entries(x.p||{}).map(([k,v])=>kv(E(k),fd(v))))+'</article>').join(''):empty('No PM records in '+YR()+'.')},
pr(c){
  const all=[...c.pr].sort((a,b)=>b.d.localeCompare(a.d)),g={open:all.filter(x=>cat(x)==='open'),done:all.filter(x=>cat(x)==='done'),other:all.filter(x=>cat(x)==='other'),all:all},a=g[prAll]||all;
  const bar='<div class="seg">'+[['open','Open'],['done','Complete'],['other','Other'],['all','All']].filter(t=>t[0]!=='other'||g.other.length).map(t=>'<button data-pr="'+t[0]+'" aria-pressed="'+(prAll===t[0])+'">'+t[1]+' ('+g[t[0]].length+')</button>').join('')+'</div>';
  if(!a.length)return bar+empty('No PR or work orders in this view.');
  return bar+a.slice(0,prN).map(x=>'<article class="card"><h3>'+(E(x.j)||'No description')+'</h3><div class="chips">'+chip(x.st)+chip(x.ps)+'</div>'+dl(kv('Vendor',E(x.v)),kv('Cost',E(x.rm)),kv('WO',E(x.wo)),kv('PR',E(x.pr)),kv('PO',E(x.po)),kv('GRN',E(x.grn)),kv('Service code',E(x.sc)),kv('Date',fd(x.d)),kv('Planner update',E(x.pu)))+'</article>').join('')+(a.length>prN?'<button class="more" id="more">Show more ('+(a.length-prN)+' left)</button>':'');
},
wq(c){
  const all=[...wqOf(c)].sort((a,b)=>(wqOpen(b)-wqOpen(a))||(crit(a)-crit(b))||String(b.d).localeCompare(String(a.d))),g={open:all.filter(wqOpen),closed:all.filter(x=>!wqOpen(x)),all},a=g[wqAll]||all;
  const bar='<div class="seg">'+[['open','Open'],['closed','Closed'],['all','All']].map(t=>'<button data-wq="'+t[0]+'" aria-pressed="'+(wqAll===t[0])+'">'+t[1]+' ('+g[t[0]].length+')</button>').join('')+'</div>';
  if(!a.length)return bar+empty('No work requests in this view.');
  return bar+a.slice(0,wqN).map(x=>{const n=crit(x);return '<article class="card'+(n<9?' crit-'+n:'')+'"><h3>'+(E(x.ds)||'No description')+'</h3><div class="chips">'+chip(critLbl(x),critTone(n))+chip(x.st)+chip(x.ty)+'</div>'+dl(kv('Criticality',E(x.pri)),kv('Work request',E(x.no)),kv('Date',fd(x.d)+(x.tm?', '+E(x.tm):'')),kv('Equipment code',E(x.code)),kv('Work order',E(x.wo)),kv('WO status',E(x.wos)),kv('Remark',E(x.rm)))+'</article>'}).join('')+(a.length>wqN?'<button class="more" id="moreq">Show more ('+(a.length-wqN)+' left)</button>':'');
},
wr(c){
  const s=sanyOf(c).map(sanyCard).join('');
  const r=[...c.wr].reverse().map(x=>'<article class="card"><h3>'+E(x.j)+'</h3><div class="chips">'+chip(x.js)+chip(x.av)+(x.pri?chip('Priority '+x.pri,''):'')+'</div>'+gauge(x.cur,x.rec)+dl(kv('Plan group',E(x.mo)),kv('Plan date',fd(x.pd)),kv('Current moves',E(x.cur)),kv('Recommended moves',E(x.rec)),kv('Over moves',x.over?E(x.over)+(x.pct?' ('+E(x.pct)+'%)':''):''),kv('WO',E(x.wo)),kv('PR',E(x.pr)),kv('CWO',E(x.cwo)),kv('Item code',E(x.item)),kv('Note',E([x.loc,x.note].filter(Boolean).join(' · '))))+'</article>').join('');
  return s+r||empty('No wirerope records for this crane.');
},
ins(c){return c.fyk.length?'<article class="card"><h3>PMA / CF</h3>'+dl(kv('PMA no.',E(c.pma)),kv('Serial no.',E(c.serial)),kv('Expiry',fd(c.pmaExp)),kv('Status',c.pmaExp?ago(c.pmaExp):''))+'</article><article class="card"><h3>Quarterly inspection</h3><table class="qt"><thead><tr><th>Quarter</th><th>Actual</th><th>Next plan</th></tr></thead><tbody>'+c.fyk.map(x=>'<tr><td>'+E(x.q)+'</td><td>'+(fd(x.a)||'&ndash;')+'</td><td>'+(fd(x.n)||'&ndash;')+'</td></tr>').join('')+'</tbody></table></article>'
  +(c.sos?'<article class="card"><h3>SOS coupling service</h3><div class="chips">'+(chip(c.sos.s)||chip('No status',''))+'</div>'+dl(kv('Date',fd(c.sos.d)))+'</article>':''):empty('No inspection record for this crane.')},
oil(c){const a=c.oil||[];return a.length?a.slice(0,oilN).map(x=>'<article class="card"><h3>'+fd(oilDate(x)||x.d)+'</h3><div class="chips">'+chip(x.s)+oilChips(x)+'</div>'+dl(kv('Plan date',fd(x.d)),kv('Completed',fd(x.c)),kv('Work order',E(x.wo)),kv('Description',E(x.ds)))+'</article>').join('')+(a.length>oilN?'<button class="more" id="moreo">Show more ('+(a.length-oilN)+' left)</button>':''):empty('No oil sampling records for this crane.')}
};
const TABS=[['sum','Summary',c=>''],['pm','PM',c=>c.pm.length],['pr','PR / WO',c=>c.pr.filter(isOpen).length+' open'],['wq','Work request',c=>wqOf(c).filter(wqOpen).length+' open'],['wr','Wirerope',c=>c.wr.length+sanyOf(c).length],['ins','Inspection',c=>''],['oil','Oil',c=>(c.oil||[]).length]];
let GLK='';
function gl(wrap,box,o){
  const host=$(box),key=box+JSON.stringify(o);
  if(GLK===key&&host&&host.querySelector('canvas')){$(wrap).classList.add('has-gl');return}
  const ok=window.Q3D&&Q3D.mount(host,o);GLK=ok?key:'';
  if(ok&&Q3D.setTheme)Q3D.setTheme(isDark());
  $(wrap).classList.toggle('has-gl',!!ok);
}
function head(){
  const c=D.qcs[cur],dn=isDown(c),s=stOf(c);
  $('#dhead').innerHTML='<div class="banner" id="banner"><div class="gl" id="gl2"></div><div class="shade"></div><span class="drag">Drag to rotate</span><div class="plate"><span class="pid">'+cur+'</span><div><div class="fl">'+E(c.fleet||'Fleet not listed')+'</div>'+chip(s)+(topCrit(c)<9?chip('P'+topCrit(c)+' open WR',critTone(topCrit(c))):'')+'<span class="mode'+(dn?' down':'')+'"><i></i>'+(dn?'Boom up, crane parked':'Working cycle')+'</span><div class="upd">Data updated '+upd()+'</div></div></div></div>'
  +'<button class="btn" data-act="exone" type="button">Export '+cur+' (Excel)</button>';
  GLK='';gl('#banner','#gl2',{id:cur,sub:c.fleet||'',down:dn,close:true});
}
function draw(){
  const c=D.qcs[cur];
  $('#dbody').innerHTML='<div class="tabs" role="tablist">'+TABS.map(t=>'<button role="tab" data-t="'+t[0]+'" aria-selected="'+(tab===t[0])+'">'+t[1]+(t[2](c)!==''?'<small>'+t[2](c)+'</small>':'')+'</button>').join('')+'</div>'
  +'<div role="tabpanel" id="panel">'+P[tab](c)+'</div>';
}
