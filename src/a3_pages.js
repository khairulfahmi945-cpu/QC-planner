/* ===== pages: Home is a short menu of summary cards; every card opens a page with the full detail ===== */
const UI={filt:'all',cview:'tiles',cq:'',wqf:'all',wqN:30,jobN:10,rpN:20,exN:8,dueN:8,olN:10};
const DEF=Object.assign({},UI);
const TOPICS=[['pm','PM'],['work-requests','Work requests'],['pr-wo','PR / WO'],['wirerope','Wirerope'],['certificates','Inspection'],['oil','Oil'],['fleets','Fleets']];
const topics=k=>'<nav class="topics" aria-label="Insight topics">'+TOPICS.map(t=>'<a href="#'+t[0]+'"'+(t[0]===k?' aria-current="page"':'')+'>'+t[1]+'</a>').join('')+'</nav>';
const FILTERS=[['all','All',c=>true],['down','Down',c=>isDown(c)],['p1','P1 open',c=>topCrit(c)===1],['pend','PM not done',c=>{const m=FC().m;return m&&pmNow(c,m)!=='done'}],['pma','PMA due / expired',c=>/exp|due/.test(pmaState(c))]];
const mkey=(y,m)=>y+'-'+pad(m),mnext=k=>{let y=+k.slice(0,4),m=+k.slice(5)+1;if(m>12){m=1;y++}return mkey(y,m)};
const lastMonths=n=>{const a=[];let y=T.getFullYear(),m=T.getMonth()+1;for(let i=0;i<n;i++){a.unshift(mkey(y,m));if(--m<1){m=12;y--}}return a};
/* Axis label for a month key: the month, plus the year under January and under the first bar. */
const mlab=(k,i)=>MON[+k.slice(5)-1]+((i===0||k.slice(5)==='01')?'<small>'+k.slice(0,4)+'</small>':'');
const noData=t=>'<article class="card empty-state"><h3>No data loaded yet</h3><p>'+t+'</p></article>';

/* ---------- Home ---------- */
function renderHome(){
  const el=$('#homebody');
  if(!D){el.innerHTML='<article class="card empty-state"><h3>No data loaded yet</h3><p>'+(!canUp()?'Waiting for an editor to upload the latest <b>LIVE UPDATE</b> file. It appears here automatically.':SH.db?'Upload the latest <b>LIVE UPDATE</b> Excel file (.xlsx). Everyone who opens this page sees it straight away.':'Upload the latest <b>LIVE UPDATE</b> Excel file (.xlsx). The page saves it on this device and opens it automatically next time.')+'</p>'
    +(canUp()?'<div class="tools"><label class="btn pri upbtn" for="file" tabindex="0" role="button">Upload live update file</label></div>':'')+msgEl()+'</article>';return}
  const f=FC(),N=f.N,m=f.m,ac=alertCounts(),pd=f.pm.done.length,pp=f.pm.plan.length;
  const cnt=k=>{const s=ac.A.find(x=>x.k===k);return s?s.rows.length:0},over=f.rope.filter(x=>x.p>=100).length;
  const why=[[f.down.length,'down'],[cnt('p1'),'P1 requests'],[cnt('pmaexp'),'PMA expired'],[over,over===1?'rope over limit':'ropes over limit']].filter(x=>x[0]).map(x=>x[0]+' '+x[1]).join(', ');
  const ok=f.oil.filter(x=>x.dt&&x.dt<=ISO).map(x=>x.dt.slice(0,7)).sort(),lm=ok.length?ok[ok.length-1]:'',on=lm?f.oil.filter(x=>x.dt.slice(0,7)===lm).length:0,sd=f.sos.filter(x=>/due/i.test(x.s)).length;
  const short=v=>v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?Math.round(v/1e3)+'k':String(Math.round(v));
  const pct=N?Math.round(f.ops/N*100):0,r0=f.rope[0];
  const sc=(href,label,n,capt,meter,tn)=>({href,label,n,capt,meter,tn});
  const cards=[
    sc('#attention','Needs attention',ac.bad,'cranes with a red alert'+(why?': '+why:''),'',ac.bad?'bad':'ok'),
    sc('#pm','PM '+(m?MN[m]:''),Math.round(pd/Math.max(1,N)*100)+'<small>%</small>','done · '+pd+' of '+N+' cranes',seg([[pd,'s-ok'],[pp,'s-wn']],N),''),
    sc('#work-requests','Work requests',nf(f.wqo.length),'open · '+f.wc[0]+' at P1',seg([[f.wc[0],'s-bd'],[f.wc[1],'s-wn'],[f.wc[2]+f.wc[3],'s-ok']],f.wqo.length),f.wc[0]?'bad':''),
    sc('#pr-wo','PR / WO','<small class="pre">MYR</small>'+short(f.jopenV),'open · '+nf(f.jopen.length)+' jobs',seg([[f.jv.done||0,'s-ok'],[f.jopenV,'s-wn']],(f.jv.done||0)+f.jopenV),''),
    sc('#wirerope','Wirerope',nf(f.wrp.length),'pending'+(r0?' · '+r0.id+' at '+r0.p.toFixed(0)+'%':''),seg([[f.wrd.length,'s-ok'],[f.wrp.length,'s-wn']],f.wrd.length+f.wrp.length),over?'bad':r0&&r0.p>=95?'warn':''),
    sc('#certificates','PMA / CF',f.pma.exp.length,'expired · '+f.pma.due.length+' due within 60 days',seg([[f.pma.ok.length,'s-ok'],[f.pma.due.length,'s-wn'],[f.pma.exp.length,'s-bd']],N),f.pma.exp.length?'bad':f.pma.due.length?'warn':''),
    sc('#oil','Oil &amp; coupling',on,lm?'oil jobs in '+MN[MON[+lm.slice(5)-1]]+(sd?' · '+sd+' couplings due':''):'no oil records','',''),
    sc('#fleets','Fleets',Object.keys(f.fleets).length,'crane batches compared side by side','','')];
  el.innerHTML=(MSG.k==='bad'?msgEl():'')+'<div class="hgrid">'
   +'<a class="sc fleet" href="#cranes" style="--i:0">'+ring(pct,f.ops/Math.max(1,N),'in operation')+'<div class="fk"><span class="sl">Fleet status</span><div class="kpis"><div><b data-n="'+N+'">'+N+'</b><span>Cranes</span></div><div><b data-n="'+f.ops+'">'+f.ops+'</b><span>In operation</span></div><div class="k-bad"><b data-n="'+f.down.length+'">'+f.down.length+'</b><span>Down</span></div></div><span class="st">See every crane</span></div><span class="go" aria-hidden="true">›</span></a>'
   +cards.map((c,i)=>'<a class="sc" href="'+c.href+'" style="--i:'+(i+1)+'"><span class="sl">'+(c.tn?'<i class="dot s-'+(c.tn==='bad'?'bd':c.tn==='warn'?'wn':'ok')+'"></i>':'')+c.label+'</span><b class="sn">'+c.n+'</b><span class="st">'+c.capt+'</span>'+c.meter+'<span class="go" aria-hidden="true">›</span></a>').join('')
   +'</div><p class="upd foot">Data from <b>'+E(D.src)+'</b>, uploaded <b>'+upd()+'</b>. <a href="#data">Manage data</a></p>';
  $$('#homebody b[data-n]').forEach(b=>count(b,+b.dataset.n));
}

/* ---------- Alerts ---------- */
function vAttention(){
  const ac=alertCounts(),A=ac.A;
  if(!A.length)return phead('Alerts','Nothing needs attention in the current file.');
  return phead('Alerts',ac.all+' cranes have something to act on. '+ac.bad+' of them have a red alert.')
   +'<div class="filters" role="group" aria-label="Jump to a section">'+A.map(s=>'<button type="button" data-jump="a-'+s.k+'">'+s.sh+' <small>'+s.rows.length+'</small></button>').join('')+'</div>'
   +A.map(s=>{const lim=UI['ao-'+s.k]?s.rows.length:6;return '<section class="asec" id="a-'+s.k+'"><div class="sech"><h3>'+s.t+'</h3><small>'+s.rows.length+'</small></div><div class="rows">'+s.rows.slice(0,lim).map(r=>row(r,r.tone||s.tone)).join('')+'</div>'+(s.rows.length>lim?'<button type="button" class="more" data-set="ao-'+s.k+':1">Show all '+s.rows.length+'</button>':'')+'</section>'}).join('');
}

/* ---------- Insights: PM ---------- */
function vPM(){
  const f=FC(),m=f.m,mn=m?MN[m]:'This month',N=f.N,Y=YR(),pd=f.pm.done.length,pp=f.pm.plan.length,pn=N-pd-pp;
  const dts=i=>{const x=D.qcs[i].pm.find(y=>y.m===m);return x?x.a.filter(isIso):[]};
  const chips=(ids,dt)=>'<div class="cchips">'+ids.map(i=>{const d=dt?dt(i):'',dn=isDown(D.qcs[i]);return '<a class="cchip'+(dn?' dn':'')+'" href="#'+i+'"'+(dn?' title="Crane down"':'')+'>'+i+(d?'<small>'+fdd(d)+'</small>':'')+'</a>'}).join('')+'</div>';
  const grp=(lab,ids,cl,dt)=>ids.length?'<div class="pg"><div class="rt"><span><i class="dot '+cl+'"></i>'+lab+'</span><b>'+ids.length+'</b></div>'+chips(ids,dt)+'</div>':'';
  const mx='<div class="mx">'+Object.entries(f.fleets).map(([fl,ids])=>'<div class="mxg"><h4>'+E(fl)+' <small>'+ids.length+'</small></h4><div class="mxh"><span></span>'+MON.map(k=>'<span>'+k.charAt(0)+'</span>').join('')+'</div>'
    +ids.map(i=>{const c=D.qcs[i];return '<a class="mxr" href="#'+i+'"><b>'+i+'</b>'+MON.map(k=>{const x=c.pm.find(y=>y.m===k),st=cellState(x),d=x?x.a.filter(isIso).map(fd).join(', '):'';return '<i class="t-'+st+'" title="'+i+' · '+MN[k]+': '+CELL[st]+(d?' ('+d+')':'')+'"></i>'}).join('')+'</a>'}).join('')+'</div>').join('')+'</div>';
  const since=IDS.map(i=>({i,d:lastDone(D.qcs[i])})).filter(x=>x.d).map(x=>Object.assign(x,{n:-dayDiff(x.d)})).sort((a,b)=>b.n-a.n).slice(0,8);
  return topics('pm')+phead('Preventive maintenance '+Y,m?mn+' is the current month in the file.':'')
   +kstrip([[pd,'Done in '+mn,'ok'],[pp,'In plan','warn'],[pn,'Not started',''],[Math.round(pd/Math.max(1,N)*100)+'%','Complete this month','']])
   +'<div class="igrid">'
   +card('PM completion by month','Share of cranes with PM completed, '+Y,vbars(f.pmM.map(x=>{const p=Math.round(x.d/x.n*100);return{top:p,h:p,l:x.k,cur:x.k===m,t:MN[x.k]+': '+x.d+' of '+x.n+' cranes'}}),'PM completion by month')
     +'<p class="cap">'+(m?mn+' is still in progress. ':'')+(f.streak>1?'The '+f.streak+' months before it finished at 100%.':'')+'</p>')
   +(since.length?card('Longest since the last completed PM','Days since the latest PM date marked completed',hbars(since.map(x=>({l:'<b>'+x.i+'</b> '+fd(x.d),v:x.n,h:'#'+x.i,c:isDown(D.qcs[x.i])?'s-bd':'s-tl'})),v=>v+' days')+'<p class="cap">Red bars are cranes that are down.</p>'):'')
   +card(mn+' by crane','Tap a crane to open it. The small date is the PM date in the file.',grp('Not started',[...f.pm.pend,...f.pm.none],'s-mu')+grp('In plan',f.pm.plan,'s-wn',i=>dts(i)[0]||'')+grp('Done',f.pm.done,'s-ok',i=>{const a=dts(i);return a[a.length-1]||''}),'wide')
   +card('PM status for every crane','One row per crane, one block per month of '+Y+'. Tap a row to open the crane.',lg([['PM done','','s-ok'],['In plan','','s-wn'],['Not done','','s-pd'],['Crane down','','s-bd'],['No record','','s-no']])+mx,'wide')
   +'</div>';
}

/* ---------- Insights: work requests ---------- */
function vWQ(){
  const f=FC(),q=f.wq,o=f.wqo;
  if(!q.length)return topics('work-requests')+phead('Work requests','')+noData('The file has no WORK REQUEST sheet, or it has no rows.');
  const by={};q.forEach(x=>{if(!isIso(x.d))return;const k=x.d.slice(0,7);(by[k]=by[k]||{o:0,c:0})[wqOpen(x)?'o':'c']++});
  const wm=Object.keys(by).sort().slice(-14),wmax=Math.max(1,...wm.map(k=>by[k].o+by[k].c));
  const ages=o.filter(x=>isIso(x.d)).map(x=>Math.max(0,-dayDiff(x.d)));
  const B=[['30 days or less',0,30],['31 to 90 days',31,90],['91 to 180 days',91,180],['181 to 365 days',181,365],['More than a year',366,1e9]].map(([l,a,b],i)=>({l,v:ages.filter(v=>v>=a&&v<=b).length,c:i>2?'s-bd':i>0?'s-wn':'s-tl'}));
  const pc={};o.forEach(x=>{pc[x.id]=(pc[x.id]||0)+1});const topc=Object.entries(pc).sort((a,b)=>b[1]-a[1]||(+a[0].slice(1)-+b[0].slice(1))).slice(0,8);
  const ty={};o.forEach(x=>{const k=x.ty||'No type';ty[k]=(ty[k]||0)+1});
  const list=o.filter(x=>UI.wqf==='all'||crit(x)===+UI.wqf).sort((a,b)=>(crit(a)-crit(b))||String(a.d).localeCompare(String(b.d)));
  const oldest=o.filter(x=>isIso(x.d)).sort((a,b)=>a.d.localeCompare(b.d))[0];
  return topics('work-requests')+phead('Work requests','CBM and live inspection requests. Criticality comes from the Priority column.')
   +kstrip([[nf(q.length),'Total',''],[nf(o.length),'Open','warn'],[nf(q.length-o.length),'Closed','ok'],[f.wc[0],'Open at P1',f.wc[0]?'bad':'']])
   +'<div class="igrid">'
   +card('Raised per month',wm.length?'From '+MN[MON[+wm[0].slice(5)-1]]+' '+wm[0].slice(0,4):'',vbars(wm.map((k,i)=>{const a=by[k].o,c=by[k].c;return{top:a+c,h:(a+c)/wmax*100,cl:'st',inn:'<u class="s-wn" style="height:'+(a/(a+c)*100).toFixed(1)+'%"></u>',l:mlab(k,i),t:MN[MON[+k.slice(5)-1]]+' '+k.slice(0,4)+': '+(a+c)+' raised, '+a+' still open'}}),'Work requests raised per month','yr')+lg([['Closed','','s-tl'],['Still open','','s-wn']]))
   +card('Open requests','By criticality, type and age',
      '<div class="rt"><span>Criticality</span><b>'+o.length+' open</b></div>'+seg([[f.wc[0],'s-bd'],[f.wc[1],'s-wn'],[f.wc[2]+f.wc[3],'s-ok']],o.length)+lg([['P1',f.wc[0],'s-bd'],['P2',f.wc[1],'s-wn'],['P3',f.wc[2],'s-ok']].concat(f.wc[3]?[['No priority',f.wc[3],'s-mu']]:[]))
     +'<h4>Type</h4>'+hbars(Object.entries(ty).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l:E(l),v})))
     +'<h4>Age of open requests</h4>'+hbars(B)+(oldest?'<p class="cap">Oldest open request: '+E(oldest.no)+' on '+oldest.id+', raised '+fd(oldest.d)+'.</p>':''))
   +card('Cranes with the most open requests','',hbars(topc.map(([i,v])=>({l:'<b>'+i+'</b> '+E(D.qcs[i].fleet),v,h:'#'+i,c:topCrit(D.qcs[i])===1?'s-bd':'s-tl'})))+'<p class="cap">Red bars have an open P1 request.</p>')
   +'</div>'
   +'<div class="sech"><h3>Open work requests</h3><small>'+list.length+'</small></div>'
   +'<div class="filters" role="group" aria-label="Filter by criticality">'+[['all','All',o.length],['1','P1',f.wc[0]],['2','P2',f.wc[1]],['3','P3',f.wc[2]]].map(t=>'<button type="button" data-set="wqf:'+t[0]+'" aria-pressed="'+(UI.wqf===t[0])+'">'+t[1]+' <small>'+t[2]+'</small></button>').join('')+'</div>'
   +(list.length?'<div class="rows">'+list.slice(0,UI.wqN).map(x=>{const n=crit(x);return row({id:x.id,m:E(x.ds)||'No description',s:[E(x.no),'raised '+fd(x.d),isIso(x.d)?ago(x.d):'',E(x.ty),E(x.wo),E(x.rm)].filter(Boolean).join(' · '),v:n<9?'<span class="chip '+critTone(n)+'">P'+n+'</span>':''},n===1?'bad':'')}).join('')+'</div>'+more('wqN',list.length-UI.wqN,30):empty('No open requests at this criticality.'));
}

/* ---------- Insights: PR / WO ---------- */
/* Group vendor names that are the same company written differently: short name vs full name, initials, spacing, case, one-letter typos. */
function vendorGroups(jobs){
  const raw=new Map();jobs.forEach(o=>{const n=(o.x.v||'').trim();if(!n)return;const r=raw.get(n)||{name:n,n:0,v:0};r.n++;r.v+=myr(o.x);raw.set(n,r)});
  const it=[...raw.values()].map(r=>{const u=r.name.toUpperCase().replace(/\s*&\s*/g,'&').replace(/[.,()]/g,' ').replace(/\s+/g,' ').trim(),core=u.replace(/\b(SDN|BHD|M)\b/g,' ').replace(/\s+/g,' ').trim(),w=core.split(' ').filter(Boolean);
    return Object.assign(r,{w,key:core.replace(/&/g,'N').replace(/ /g,''),ini:w.length>1?w.map(x=>x[0]).join(''):'',iniAll:u.split(' ').filter(Boolean).map(x=>x[0]).join('')})});
  const par=it.map((_,i)=>i),find=i=>par[i]===i?i:(par[i]=find(par[i]));
  const lev1=(a,b)=>{const la=a.length,lb=b.length;if(Math.abs(la-lb)>1)return false;let i=0,j=0,e=0;while(i<la&&j<lb){if(a[i]===b[j]){i++;j++}else{if(++e>1)return false;if(la>lb)i++;else if(lb>la)j++;else{i++;j++}}}return e+(la-i)+(lb-j)<=1};
  for(let a=0;a<it.length;a++)for(let b=a+1;b<it.length;b++){const A=it[a],B=it[b],S=A.key.length<=B.key.length?A:B,L=S===A?B:A;
    const same=A.key===B.key||(S.w.length===1&&L.w.length>1&&(L.w[0]===S.w[0]||L.ini===S.key||L.iniAll===S.key))||(S.key.length>=7&&A.w.length===1&&B.w.length===1&&lev1(A.key,B.key));
    if(same)par[find(a)]=find(b)}
  const g=new Map();it.forEach((r,i)=>{const k=find(i);(g.get(k)||g.set(k,[]).get(k)).push(r)});
  return [...g.values()].map(a=>{a.sort((x,y)=>y.n-x.n);return{name:a[0].name,names:a.map(x=>x.name),n:a.reduce((s,x)=>s+x.n,0),v:a.reduce((s,x)=>s+x.v,0)}}).sort((a,b)=>b.v-a.v);
}
function vPR(){
  const f=FC(),Y=YR(),J=f.jobs;
  if(!J.length)return topics('pr-wo')+phead('PR / WO','')+noData('The file has no PR sheet, or it has no rows.');
  const dv=f.jv.done||0,nv=f.jv.none||0,tot=dv+f.jopenV+nv||1;
  const stc={};f.jopen.forEach(o=>{const k=cap(o.x.st);stc[k]=(stc[k]||0)+1});
  const psc={};f.jopen.forEach(o=>{const k=o.x.ps?cap(o.x.ps):'No PR / PO status';psc[k]=(psc[k]||0)+1});
  const vg=vendorGroups(J.filter(o=>o.g!=='cancel')),merged=vg.slice(0,8).filter(x=>x.names.length>1);
  const by={};J.forEach(o=>{const d=o.x.d;if(!isIso(d)||d.slice(0,4)!==Y)return;const k=d.slice(0,7);(by[k]=by[k]||{o:0,c:0})[o.g==='done'?'c':isOpen(o.x)?'o':'x']++});
  const pm=Object.keys(by).sort(),pmax=Math.max(1,...pm.map(k=>by[k].o+by[k].c));
  const yr={};f.jopen.forEach(o=>{const m=/20\d\d/.exec(o.x.d||'');const k=m?m[0]:'No date';yr[k]=(yr[k]||0)+1});
  const big=f.jopen.filter(o=>myr(o.x)>0).sort((a,b)=>myr(b.x)-myr(a.x));
  const topc=IDS.map(i=>({i,n:D.qcs[i].pr.filter(isOpen).length})).filter(x=>x.n).sort((a,b)=>b.n-a.n||(+a.i.slice(1)-+b.i.slice(1))).slice(0,8);
  const ids=o=>o.ids.slice(0,3).join(', ')+(o.ids.length>3?' +'+(o.ids.length-3):'');
  return topics('pr-wo')+phead('PR / WO','Purchase requests and work orders. Open means not completed and not cancelled. A job listed against several cranes is counted once.')
   +kstrip([[nf(J.length),'Jobs',''],[nf(f.jopen.length),'Open','warn'],[nf(f.jg.done||0),'Completed','ok'],[fmtM(f.jopenV),'Open value','warn']])
   +'<div class="igrid">'
   +card('Value by status','Sum of the RM column',
      '<div class="money"><div><b>'+fmtM(dv)+'</b><span><i class="s-ok"></i>Completed</span></div><div><b>'+fmtM(f.jopenV)+'</b><span><i class="s-wn"></i>Open</span></div>'+(nv?'<div><b>'+fmtM(nv)+'</b><span><i class="s-mu"></i>No status</span></div>':'')+'</div>'+seg([[dv,'s-ok'],[f.jopenV,'s-wn'],[nv,'s-mu']],tot)
     +'<h4>Open jobs by job status</h4>'+hbars(Object.entries(stc).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l:E(l),v})),null,'s-wn')
     +'<h4>Open jobs by PR / PO status</h4>'+hbars(Object.entries(psc).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([l,v])=>({l:E(l),v})),null,'s-wn')
     +((f.jg.none||0)?'<p class="cap">'+f.jg.none+' jobs have no job status in the sheet'+((f.jg.cancel||0)?', and '+f.jg.cancel+' are cancelled':'')+'.</p>':''))
   +card('Top vendors by value','All jobs in the sheet except cancelled ones',hbars(vg.slice(0,8).map(x=>({l:E(x.name)+' <small>'+x.n+' jobs</small>',v:x.v})),fmtM)
     +(merged.length?'<p class="cap">Different spellings counted as one vendor: '+merged.map(x=>x.names.map(E).join(' + ')).join('; ')+'.</p>':''))
   +(pm.length?card('Jobs raised per month','By the DATE column, '+Y,vbars(pm.map(k=>{const a=by[k].o,c=by[k].c;return{top:a+c,h:(a+c)/pmax*100,cl:'st',inn:'<u class="s-wn" style="height:'+(a+c?a/(a+c)*100:0).toFixed(1)+'%"></u>',l:MON[+k.slice(5)-1],t:MN[MON[+k.slice(5)-1]]+': '+(a+c)+' raised, '+a+' still open'}}),'PR and WO jobs raised per month')+lg([['Completed','','s-tl'],['Still open','','s-wn']])):'')
   +card('Open jobs by year raised','How old the open backlog is',hbars(Object.entries(yr).sort((a,b)=>b[0].localeCompare(a[0])).map(([l,v])=>({l:E(l),v,c:l<Y?'s-wn':'s-tl'}))))
   +(topc.length?card('Cranes with the most open jobs','',hbars(topc.map(x=>({l:'<b>'+x.i+'</b> '+E(D.qcs[x.i].fleet),v:x.n,h:'#'+x.i})))):'')
   +'</div>'
   +(big.length?'<div class="sech"><h3>Largest open jobs</h3><small>by value</small></div><div class="rows">'+big.slice(0,UI.jobN).map(o=>row({id:o.ids[0],m:E(o.x.j)||'No description',s:[o.ids.length>1?ids(o):'',E(o.x.v),fd(o.x.d),E(cap(o.x.ps||o.x.st)),E(o.x.pr||o.x.wo)].filter(Boolean).join(' · '),v:fmtM(myr(o.x))})).join('')+'</div>'+more('jobN',Math.min(big.length,60)-UI.jobN,10):'');
}

/* ---------- Insights: wirerope ---------- */
function vRope(){
  const f=FC(),W=f.wr,pend=f.wrp,done=f.wrd,Y=+YR();
  const sany=[];IDS.forEach(i=>sanyOf(D.qcs[i]).forEach(s=>sany.push(Object.assign({id:i},s))));
  if(!W.length&&!sany.length)return topics('wirerope')+phead('Wirerope','')+noData('The file has no WIREROPE sheet, or it has no rows.');
  const at95=f.rope.filter(x=>x.p>=95).length;
  const types=['Main hoist','Trolley','Catenary','Boom','Other'].map(t=>({t,d:done.filter(x=>x.ty===t).length,p:pend.filter(x=>x.ty===t).length})).filter(x=>x.d+x.p),tmax=Math.max(1,...types.map(x=>x.d+x.p));
  const mre=new RegExp('^('+MON.map(k=>MN[k]).join('|')+')\\b(?:\\s+(\\d{4}))?','i');
  const gkey=s=>{const m=mre.exec(s||'');if(!m)return null;const mi=MON.findIndex(k=>MN[k].toLowerCase()===m[1].toLowerCase());return{y:m[2]?+m[2]:Y,m:mi}};
  const passed=s=>{const g=gkey(s);return !!g&&(g.y<T.getFullYear()||(g.y===T.getFullYear()&&g.m<T.getMonth()))};
  const pg=new Map();pend.forEach(x=>{const k=x.mo||'No group';pg.set(k,(pg.get(k)||0)+1)});
  const pgs=[...pg.entries()].map(([l,v])=>({l,v,g:gkey(l)})).sort((a,b)=>(a.g?0:1)-(b.g?0:1)||(a.g&&b.g?(a.g.y-b.g.y||a.g.m-b.g.m):a.l.localeCompare(b.l)));
  const late=pend.filter(x=>passed(x.mo)).length;
  const rs={};W.forEach(x=>{const k=gkey(x.mo)?'Planned by month':/additional/i.test(x.mo)?'Additional':(x.mo||'No group');rs[k]=(rs[k]||0)+1});
  const dn=done.map(x=>({x,c:num(x.cur),r:num(x.rec)})).filter(o=>o.c&&o.r),ov=dn.filter(o=>o.c>o.r).sort((a,b)=>b.c/b.r-a.c/a.r);
  const pct=x=>{const c=num(x.cur),r=num(x.rec);return c&&r?c/r*100:null};
  const pl=[...pend].sort((a,b)=>{const pa=pct(a),pb=pct(b);return (pb===null?-1:pb)-(pa===null?-1:pa)||(+a.id.slice(1)-+b.id.slice(1))});
  return topics('wirerope')+phead('Wirerope','Replacement jobs from the wirerope monitoring sheet'+(sany.length?' and the SANY update sheet':'')+'.')
   +kstrip([[nf(W.length),'Replacement jobs',''],[nf(done.length),'Done','ok'],[nf(pend.length),'Pending','warn'],[at95,'At 95% or more of limit',f.rope.some(x=>x.p>=100)?'bad':at95?'warn':'']])
   +'<div class="igrid">'
   +(f.rope.length?card('Closest to the move limit','Ropes not yet replaced, current moves against recommended moves','<div class="ropes">'+f.rope.slice(0,10).map(x=>'<a class="rp" href="#'+x.id+'"><b>'+x.id+'</b><span class="rn">'+E(x.j)+(x.sany?' · SANY sheet':'')+'</span><span class="rv">'+x.p.toFixed(1)+'%</span><div class="meter"><i class="'+ropeTone(x.p)+'" style="--w:'+Math.min(100,x.p).toFixed(1)+'%"></i></div><small>'+nf(x.c)+' of '+nf(x.r)+' moves'+(x.note?' · '+E(cap(x.note)):'')+'</small></a>').join('')+'</div>'):'')
   +(types.length?card('By rope type','Done and pending replacements','<div class="hbars">'+types.map(x=>'<div class="hb"><span>'+x.t+'</span><b>'+x.d+' done · '+x.p+' pending</b><div class="meter"><i class="s-ok" style="--w:'+(x.d/tmax*100).toFixed(1)+'%"></i><i class="s-wn" style="--w:'+(x.p/tmax*100).toFixed(1)+'%"></i></div></div>').join('')+'</div>'+lg([['Done','','s-ok'],['Pending','','s-wn']])):'')
   +(pgs.length?card('Pending by plan group','Groups as named in the sheet',hbars(pgs.map(x=>({l:E(x.l)+(passed(x.l)?' <small>month passed</small>':''),v:x.v,c:passed(x.l)?'s-bd':'s-wn'})))+(late?'<p class="cap">'+late+' pending replacements were planned for a month that has already passed.</p>':'')):'')
   +card('How replacements were grouped','All jobs in the sheet, done and pending',hbars(Object.entries(rs).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l:E(l),v,c:/broken|premature|acc/i.test(l)?'s-bd':'s-tl'})))+'<p class="cap">Red bars are the Broken strand, Prematured and Acc groups.</p>')
   +(dn.length?card('Replaced after the recommended moves','Completed jobs that have move counts','<div class="rt"><span>Over the limit when replaced</span><b>'+ov.length+' of '+dn.length+'</b></div>'+seg([[ov.length,'s-bd'],[dn.length-ov.length,'s-ok']],dn.length)+lg([['Over',ov.length,'s-bd'],['Within',dn.length-ov.length,'s-ok']])
     +(ov.length?'<h4>Furthest over</h4>'+hbars(ov.slice(0,6).map(o=>({l:'<b>'+o.x.id+'</b> '+E(o.x.ty)+' <small>'+nf(o.c)+' of '+nf(o.r)+'</small>',v:(o.c/o.r-1)*100,h:'#'+o.x.id,c:'s-bd'})),v=>'+'+v.toFixed(1)+'%'):'')):'')
   +'</div>'
   +(pl.length?'<div class="sech"><h3>Pending replacements</h3><small>'+pl.length+'</small></div><article class="card flat">'+rtable([
      ['Crane',x=>cid(x.id)],['Rope',x=>E(x.ty)],['Plan group',x=>E(x.mo)||'–'],
      ['Moves',x=>{const c=num(x.cur),r=num(x.rec);return c&&r?nf(c)+' of '+nf(r):'–'}],
      ['Life used',x=>{const p=pct(x);return p===null?'–':'<div class="tm"><div class="meter"><i class="'+ropeTone(p)+'" style="--w:'+Math.min(100,p).toFixed(0)+'%"></i></div>'+p.toFixed(1)+'%</div>'}],
      ['Rope stock',x=>chip(x.av)||'–'],['WO',x=>E(x.wo)||'–']],pl.slice(0,UI.rpN))+'</article>'+more('rpN',pl.length-UI.rpN,20):'')
   +(sany.length?'<div class="sech"><h3>SANY wirerope update</h3><small>'+sany.length+'</small></div><article class="card flat">'+rtable([
      ['Crane',x=>cid(x.id)],['Rope',x=>E(x.ty)||'–'],['Status',x=>chip(x.st)||'–'],
      ['Current moves',x=>num(x.cur)!==null?nf(num(x.cur))+(num(x.lim)?' of '+nf(num(x.lim)):''):'–'],
      ['Replaced on',x=>fd(x.d)||'–'],['Moves at replacement',x=>num(x.mv)!==null?nf(num(x.mv)):'–']],sany)+'</article>':'');
}

/* ---------- Insights: PMA / CF and quarterly inspection ---------- */
function vCert(){
  const f=FC(),N=f.N,A=alertSections(),sec=k=>{const s=A.find(x=>x.k===k);return s?s.rows:[]};
  const cnt={};IDS.forEach(i=>{const s=D.qcs[i].pmaExp;if(isIso(s)){const k=s.slice(0,7);cnt[k]=(cnt[k]||0)+1}});
  const keys=Object.keys(cnt).sort(),now=ISO.slice(0,7),lo=lastMonths(13)[0];let hi=now;for(let i=0;i<18;i++)hi=mnext(hi);
  const ms=[];if(keys.length){let k=keys[0]<lo?lo:keys[0];const end=keys[keys.length-1]>hi?hi:keys[keys.length-1];for(let g=0;k<=end&&g<40;g++){ms.push(k);k=mnext(k)}}
  const before=keys.filter(k=>k<lo).reduce((n,k)=>n+cnt[k],0),after=keys.filter(k=>k>hi).reduce((n,k)=>n+cnt[k],0),mmax=Math.max(1,...ms.map(k=>cnt[k]||0));
  const Q=['Q1','Q2','Q3','Q4'].map(q=>({q,d:f.all.filter(c=>(c.fyk||[]).some(x=>x.q===q&&x.a)).length}));
  const soon=f.insp.filter(x=>x.d!==null&&x.d>=0&&x.d<=30).sort((a,b)=>a.d-b.d);
  const ex=sec('pmaexp'),du=sec('pmadue'),io=sec('insp');
  return topics('certificates')+phead('PMA / CF and inspection','Certificate expiry dates and the quarterly inspection plan from the FYK INS sheet.')
   +kstrip([[f.pma.ok.length,'Valid','ok'],[f.pma.due.length,'Due within 60 days',f.pma.due.length?'warn':''],[f.pma.exp.length,'Expired',f.pma.exp.length?'bad':''],[f.pma.none.length,'No expiry date','']])
   +'<div class="igrid">'
   +(ms.length?card('PMA / CF expiry by month','Number of cranes whose certificate expires in each month',vbars(ms.map((k,i)=>({top:cnt[k]||'',h:(cnt[k]||0)/mmax*100,cl:k<now?'s-bd':k===now?'s-wn':'',l:mlab(k,i),t:MN[MON[+k.slice(5)-1]]+' '+k.slice(0,4)+': '+(cnt[k]||0)+' cranes'})),'PMA and CF expiry by month','yr')
     +lg([['Already passed','','s-bd'],['This month','','s-wn'],['Coming','','s-tl']])+((before||after)?'<p class="cap">'+[before?before+' expired before '+MN[MON[+lo.slice(5)-1]]+' '+lo.slice(0,4):'',after?after+' expire after '+MN[MON[+hi.slice(5)-1]]+' '+hi.slice(0,4):''].filter(Boolean).join(', ')+'.</p>':''),ms.length>12?'wide':''):'')
   +card('Quarterly inspection progress','Cranes with an actual inspection date in each quarter of '+YR(),'<div class="hbars">'+Q.map(x=>'<div class="hb"><span>'+x.q+'</span><b>'+x.d+' of '+N+'</b><div class="meter"><i class="'+(x.d===N?'s-ok':'s-tl')+'" style="--w:'+(x.d/Math.max(1,N)*100).toFixed(1)+'%"></i></div></div>').join('')+'</div>'
     +(io.length?'<p class="cap">'+io.length+' cranes are past their next inspection plan date. They are listed below.</p>':''))
   +(soon.length?card('Inspections planned in the next 30 days','Next plan date after the latest actual inspection','<div class="cchips">'+soon.map(x=>'<a class="cchip" href="#'+x.id+'">'+x.id+'<small>'+fdd(x.n)+'</small></a>').join('')+'</div>'):'')
   +'</div>'
   +(ex.length?'<div class="sech"><h3>PMA / CF expired</h3><small>'+ex.length+'</small></div><div class="rows">'+ex.slice(0,UI.exN).map(r=>row(r,'bad')).join('')+'</div>'+more('exN',ex.length-UI.exN,20):'')
   +(du.length?'<div class="sech"><h3>PMA / CF expiring within 60 days</h3><small>'+du.length+'</small></div><div class="rows">'+du.slice(0,UI.dueN).map(r=>row(r,'warn')).join('')+'</div>'+more('dueN',du.length-UI.dueN,20):'')
   +(io.length?'<div class="sech"><h3>Quarterly inspection plan date passed</h3><small>'+io.length+'</small></div><div class="rows">'+io.map(r=>row(r,'warn')).join('')+'</div>':'');
}

/* ---------- Insights: oil sampling and SOS coupling ---------- */
function vOil(){
  const f=FC(),O=f.oil.filter(x=>x.dt&&x.dt<=ISO);
  if(!O.length&&!f.sos.length)return topics('oil')+phead('Oil and coupling','')+noData('The file has no OIL SAMPLING sheet, or it has no rows.');
  const ms=lastMonths(12),by={};ms.forEach(k=>by[k]={s:0,r:0});const comp={};
  O.forEach(x=>{const k=x.dt.slice(0,7);if(!by[k])return;const p=oilParts(x.ds);by[k][p.re.length?'r':'s']++;p.sa.forEach(c=>{(comp[c]=comp[c]||{s:0,r:0}).s++});p.re.forEach(c=>{(comp[c]=comp[c]||{s:0,r:0}).r++})});
  const mmax=Math.max(1,...ms.map(k=>by[k].s+by[k].r)),tot=ms.reduce((n,k)=>n+by[k].s+by[k].r,0),rep=ms.reduce((n,k)=>n+by[k].r,0);
  const cl=Object.entries(comp).map(([c,v])=>({c,s:v.s,r:v.r})).sort((a,b)=>(b.s+b.r)-(a.s+a.r)).slice(0,8),cmax=Math.max(1,...cl.map(x=>x.s+x.r));
  const lastBy=IDS.map(i=>{const a=(D.qcs[i].oil||[]).map(oilDate).filter(d=>d&&d<=ISO).sort();return{i,d:a.length?a[a.length-1]:''}}).filter(x=>x.d).map(x=>Object.assign(x,{n:-dayDiff(x.d)})).sort((a,b)=>b.n-a.n);
  const recent=[...O].sort((a,b)=>b.dt.localeCompare(a.dt));
  const sc={};f.sos.forEach(x=>{const k=x.s?cap(x.s):'No status';sc[k]=(sc[k]||0)+1});
  const sopen=f.sos.filter(x=>x.s&&!/complete|done/i.test(x.s));
  return topics('oil')+phead('Oil and coupling','Oil sampling and oil replacement jobs, and the SOS coupling service list.')
   +kstrip([[nf(tot),'Oil jobs in 12 months',''],[nf(rep),'With oil replaced','warn'],[lastBy.length?lastBy[0].n+' d':'–','Longest since last job',''],[f.sos.filter(x=>/due/i.test(x.s)).length,'Couplings due','warn']])
   +'<div class="igrid">'
   +card('Oil jobs per month','Last 12 months, by completed date',vbars(ms.map((k,i)=>{const s=by[k].s,r=by[k].r;return{top:s+r||'',h:(s+r)/mmax*100,cl:'st',inn:'<u class="s-wn" style="height:'+(s+r?r/(s+r)*100:0).toFixed(1)+'%"></u>',l:mlab(k,i),t:MN[MON[+k.slice(5)-1]]+' '+k.slice(0,4)+': '+(s+r)+' jobs, '+r+' with oil replaced'}}),'Oil jobs per month','yr')+lg([['Sampling only','','s-tl'],['Oil replaced','','s-wn']]))
   +(cl.length?card('By component','Last 12 months. One job can cover several components.','<div class="hbars">'+cl.map(x=>'<div class="hb"><span>'+E(x.c)+'</span><b>'+x.s+' sampled · '+x.r+' replaced</b><div class="meter"><i class="s-tl" style="--w:'+(x.s/cmax*100).toFixed(1)+'%"></i><i class="s-wn" style="--w:'+(x.r/cmax*100).toFixed(1)+'%"></i></div></div>').join('')+'</div>'+lg([['Sampled','','s-tl'],['Oil replaced','','s-wn']])):'')
   +(lastBy.length?card('Longest since the last oil job','Days since the latest completed oil job on each crane',hbars(lastBy.slice(0,8).map(x=>({l:'<b>'+x.i+'</b> '+fd(x.d),v:x.n,h:'#'+x.i})),v=>v+' days')):'')
   +(f.sos.length?card('SOS coupling service','Status from the SOS coupling sheet, '+f.sos.length+' cranes',hbars(Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l:E(l),v,c:/due|down/i.test(l)?'s-wn':/complete|done/i.test(l)?'s-ok':'s-tl'})))
     +(sopen.length?'<h4>Not completed</h4><div class="cchips">'+sopen.map(x=>'<a class="cchip" href="#'+x.id+'" title="'+E(x.s)+'">'+x.id+'<small>'+E(cap(x.s).length>20?cap(x.s).slice(0,19)+'…':cap(x.s))+'</small></a>').join('')+'</div>':'')):'')
   +'</div>'
   +(recent.length?'<div class="sech"><h3>Latest oil jobs</h3><small>newest first</small></div><div class="rows">'+recent.slice(0,UI.olN).map(x=>{const p=oilParts(x.ds);return row({id:x.id,m:[p.sa.length?'Sampling: '+E(p.sa.join(', ')):'',p.re.length?'Oil replaced: '+E(p.re.join(', ')):''].filter(Boolean).join(' · ')||E(x.ds),s:[fd(x.dt),ago(x.dt),E(x.s),E(x.wo)].filter(Boolean).join(' · ')})}).join('')+'</div>'+more('olN',Math.min(recent.length,100)-UI.olN,20):'');
}

/* ---------- Insights: fleets ---------- */
function vFleets(){
  const f=FC(),m=f.m;
  const R=Object.entries(f.fleets).map(([fl,ids])=>{const a=ids.map(i=>D.qcs[i]);return{fl,n:a.length,dn:a.filter(isDown).length,pd:a.filter(c=>pmNow(c,m)==='done').length,
    ow:a.reduce((n,c)=>n+wqOf(c).filter(wqOpen).length,0),p1:a.reduce((n,c)=>n+wqOf(c).filter(x=>wqOpen(x)&&crit(x)===1).length,0),op:a.reduce((n,c)=>n+c.pr.filter(isOpen).length,0),
    ex:a.filter(c=>pmaState(c)==='exp').length,rp:a.reduce((n,c)=>n+c.wr.filter(x=>/pend/i.test(x.js)).length,0)}});
  const bad=v=>v?'<span class="chip bad">'+v+'</span>':'0';
  const mostW=[...R].sort((a,b)=>b.ow/b.n-a.ow/a.n)[0];
  return topics('fleets')+phead('Fleets','Each crane batch side by side. Counts are per fleet, so larger fleets naturally have more.')
   +'<article class="card flat">'+rtable([['Fleet',r=>'<b>'+E(r.fl)+'</b>'],['Cranes',r=>r.n],['Down',r=>bad(r.dn)],
      ['PM '+(m||'')+' done',r=>'<div class="tm"><div class="meter"><i class="s-ok" style="--w:'+(r.pd/r.n*100).toFixed(0)+'%"></i></div>'+r.pd+'/'+r.n+'</div>'],
      ['Open work requests',r=>r.ow],['Open P1',r=>bad(r.p1)],['Open PR / WO',r=>r.op],['PMA / CF expired',r=>r.ex?'<span class="chip warn">'+r.ex+'</span>':'0'],['Ropes pending',r=>r.rp]],R,'ft')+'</article>'
   +'<div class="igrid">'
   +card('Open work requests per crane','Average for each fleet',hbars([...R].sort((a,b)=>b.ow/b.n-a.ow/a.n).map(r=>({l:E(r.fl)+' <small>'+r.n+' cranes</small>',v:r.ow/r.n,c:r.p1?'s-bd':'s-tl'})),v=>v.toFixed(1))+'<p class="cap">Red bars have an open P1 request.'+(mostW&&mostW.ow?' '+E(mostW.fl)+' has the most per crane.':'')+'</p>')
   +card('Open PR / WO per crane','Average for each fleet',hbars([...R].sort((a,b)=>b.op/b.n-a.op/a.n).map(r=>({l:E(r.fl)+' <small>'+r.n+' cranes</small>',v:r.op/r.n})),v=>v.toFixed(1),'s-wn'))
   +'</div>';
}

/* ---------- Cranes ---------- */
function vCranes(){
  const f=FC(),m=f.m;
  return phead('Cranes',f.N+' cranes in '+Object.keys(f.fleets).length+' fleets. Tap a crane to open it.')
   +'<label class="find-in"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="vh">Find a crane number</span><input id="cq" type="search" inputmode="numeric" placeholder="Find a crane number" value="'+E(UI.cq)+'" autocomplete="off"></label>'
   +'<div class="filters" role="group" aria-label="Filter cranes">'+FILTERS.map(t=>'<button type="button" data-set="filt:'+t[0]+'" aria-pressed="'+(UI.filt===t[0])+'">'+t[1]+' <small>'+IDS.filter(i=>t[2](D.qcs[i])).length+'</small></button>').join('')+'</div>'
   +'<div class="cbar"><div class="seg sm" role="group" aria-label="View">'+[['tiles','Tiles'],['list','List']].map(t=>'<button type="button" data-set="cview:'+t[0]+'" aria-pressed="'+(UI.cview===t[0])+'">'+t[1]+'</button>').join('')+'</div>'
   +(m?'<span class="key"><i class="pm-done"></i>PM done<i class="pm-plan"></i>In plan<i class="pm-pend"></i>Not started</span>':'')+'</div><div id="clist"></div>';
}
function cranesList(){
  const el=$('#clist');if(!el||!D)return;
  const f=FC(),m=f.m,fl=FILTERS.find(t=>t[0]===UI.filt)||FILTERS[0],n=UI.cq.replace(/[^0-9]/g,'').replace(/^0+/,'');
  const pass=i=>fl[2](D.qcs[i])&&(!n||String(+i.slice(1)).includes(n));
  const ids=IDS.filter(pass);
  if(!ids.length){el.innerHTML=empty('No cranes match.');return}
  if(UI.cview==='list'){
    const rp=i=>{const r=f.rope.find(x=>x.id===i);return r?r.p:null},PS={done:['Done','ok'],plan:['In plan','warn'],pend:['Not started',''],none:['No record','']};
    el.innerHTML='<article class="card flat">'+rtable([['Crane',i=>cid(i)],['Fleet',i=>E(D.qcs[i].fleet)||'–'],['Status',i=>chip(stOf(D.qcs[i]))||'–'],
      ['PM '+(m||''),i=>{const s=PS[pmNow(D.qcs[i],m)];return chip(s[0],s[1])}],
      ['Open work requests',i=>{const c=D.qcs[i],k=wqOf(c).filter(wqOpen).length,t=topCrit(c);return k?k+(t<9?' <span class="chip '+critTone(t)+'">P'+t+'</span>':''):'0'}],
      ['Open PR / WO',i=>D.qcs[i].pr.filter(isOpen).length],
      ['PMA / CF',i=>{const c=D.qcs[i],d=pmaDays(c);return d===null?'–':fd(c.pmaExp)+' '+(d<0?chip('Expired','bad'):d<=60?chip(d+' d','warn'):'')}],
      ['Rope life used',i=>{const p=rp(i);return p===null?'–':'<div class="tm"><div class="meter"><i class="'+ropeTone(p)+'" style="--w:'+Math.min(100,p).toFixed(0)+'%"></i></div>'+p.toFixed(0)+'%</div>'}]],ids)+'</article>';
    return}
  let k=0;
  el.innerHTML=Object.entries(f.fleets).map(([name,a])=>{a=a.filter(pass);if(!a.length)return '';return '<h3 class="fl-h">'+E(name)+' <small>'+a.length+'</small></h3><div class="grid">'+a.map(i=>{const c=D.qcs[i],s=stOf(c),ps=m?pmNow(c,m):'none';
    return '<a class="qc pm-'+ps+(isDown(c)?' down':'')+'" style="--i:'+Math.min(k++,36)+'" href="#'+i+'" title="'+i+(m?' · PM '+MN[m]+': '+({done:'done',plan:'in plan',pend:'not started',none:'no record'}[ps]):'')+'">'+i+(s&&!/^ops$/i.test(s)?'<small>'+E(s)+'</small>':topCrit(c)===1?'<small>P1 open</small>':'')+'</a>'}).join('')+'</div>'}).join('');
}

/* ---------- Data ---------- */
function vData(){
  const head=phead('Data',SH.db?'One upload is shared with everyone who opens this page.':'The file you upload is saved on this device only.')
   +'<div class="tools">'+(canUp()?'<label class="btn pri upbtn" for="file" tabindex="0" role="button">Upload live update file</label>':'')+(D?'<button class="btn" type="button" data-act="exall">Export all (Excel)</button>':'')+'</div>'+msgEl();
  const how='<ol class="steps"><li>Open this page in Chrome, Safari or on a computer. The Claude phone app may not open the file picker.</li><li>Tap <b>Upload live update file</b> and choose the latest LIVE UPDATE Excel file (.xlsx).</li><li>Check the numbers under <b>What was read from the file</b>.</li></ol>';
  if(!D)return head+'<div class="igrid">'+card('No data loaded yet','',canUp()?how:'<p class="sub">Waiting for an editor to upload the latest LIVE UPDATE file. It appears here automatically.</p>')+'</div>';
  const f=FC(),cnt=(n,extra)=>(n?'<b>'+nf(n)+'</b>':'<span class="chip warn">Nothing read</span>')+(extra?'<small>'+extra+'</small>':'');
  const pmr=f.all.reduce((n,c)=>n+c.pm.length,0),prr=f.all.reduce((n,c)=>n+c.pr.length,0),sy=f.all.reduce((n,c)=>n+sanyOf(c).length,0),fx=D.fix&&D.fix.wqDates;
  const sh=D.sheets||null,sn=k=>sh&&sh[k]?'<small>Sheet: '+E(String(sh[k]).trim())+'</small>':'';
  return head+'<div class="igrid">'
   +card('Current file','',dl(kv('File',E(D.src)),kv('Uploaded',upd()),kv('Year',YR()),kv('Stored',SH.db?'Shared with everyone who opens this page':'On this device only')))
   +card('What was read from the file','Check these after every upload. A zero means a sheet was missing or laid out differently.','<div class="read">'+dl(
      kv('Cranes',cnt(f.N)+sn('fyk')),
      kv('PM rows',cnt(pmr,f.pmM.length?MN[f.pmM[0].k]+' to '+MN[f.pmM[f.pmM.length-1].k]+', '+f.pmM.length+' monthly sheets':'')),
      kv('PR / WO rows',cnt(prr,nf(f.jobs.length)+' unique jobs')+sn('pr')),
      kv('Work requests',cnt(f.wq.length,fx?fx+' dates corrected':'')+sn('wq')),
      kv('Wirerope jobs',cnt(f.wr.length)+sn('wr')),
      kv('SANY wirerope entries',cnt(sy)),
      kv('Oil records',cnt(f.oil.length)+sn('oil')),
      kv('Cranes with inspection dates',cnt(f.insp.length)),
      kv('SOS coupling rows',cnt(f.sos.length)+sn('sos')))+'</div>'
     +(fx?'<p class="cap">'+fx+' work request dates had the day and month swapped in the Excel file. They were corrected using the work request number.</p>':''))
   +card('How to update','',how)
   +'</div>';
}
