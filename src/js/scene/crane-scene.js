/* Q3D: animated 3D ship-to-shore quay crane scene (three.js r128). */
export const Q3D=(function(){
'use strict';
const RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const TH={};
const others=[],apexLights=[];
let stars,dark=false,T3,R,S,sky,CAM,clock,main,water,wPos,wBase,box,boxMat,truck,lctx,ltex,host=null,ro=null,io=null,raf=0,visible=true,failed=false;
const st={tz:-4,sy:22,tx:-130,boom:0,carry:'ship'};
let queue=[],ph=null,mode='work';
const ZS=25.2,ZL=-2,SHIP_TOP=12.8,TRUCK_TOP=4.05,SAFE=22,PARK=-4;
const BOXC=[0xE4572E,0x2F6C7C,0xC28A2A,0x9C3F2B,0x3B7A4A,0x1F4E79];
const cam={t0:0,th:0,ph:0,dth:0,dph:0,r:100,tgt:null,drag:null};

function webgl(){try{const c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl')||c.getContext('experimental-webgl')))}catch{return false}}

function init(){
  if(R)return true;
  if(failed||!window.THREE||!webgl()){failed=true;return false}
  try{build();return true}catch(e){console.warn('Q3D',e);failed=true;return false}
}

function build(){
  T3=window.THREE;const V=(x,y,z)=>new T3.Vector3(x,y,z);
  R=new T3.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  R.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  R.shadowMap.enabled=true;R.shadowMap.type=T3.PCFSoftShadowMap;
  // sky dome (world-space gradient so the horizon meets the fog)
  const HOR=0xE9AE6C;
  sky=new T3.Mesh(new T3.SphereGeometry(1000,32,16),new T3.ShaderMaterial({side:T3.BackSide,depthWrite:false,fog:false,
    uniforms:{top:{value:new T3.Color(0x05182A)},mid:{value:new T3.Color(0x2B6B82)},hor:{value:new T3.Color(HOR)},sd:{value:V(-420,45,150).normalize()}},
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top,mid,hor,sd;varying vec3 vP;void main(){float h=vP.y;vec3 c=h<0.?hor:mix(mix(hor,mid,smoothstep(0.,.2,h)),top,smoothstep(.2,.65,h));c+=vec3(1.,.62,.3)*pow(max(dot(vP,sd),0.),10.)*.45;gl_FragColor=vec4(c,1.);}'}));
  sky.renderOrder=-1;S=new T3.Scene();S.add(sky);
  S.fog=new T3.Fog(HOR,150,560);
  CAM=new T3.PerspectiveCamera(38,1.6,1,1500);cam.tgt=V(0,17,10);
  // lights
  TH.hemi=new T3.HemisphereLight(0xCFE4EE,0x3A2A1C,.75);S.add(TH.hemi);
  const sun=new T3.DirectionalLight(0xFFD7A0,1.15);sun.position.set(-160,95,90);sun.castShadow=true;
  const sh=sun.shadow;sh.mapSize.set(2048,2048);sh.camera.left=-110;sh.camera.right=110;sh.camera.top=90;sh.camera.bottom=-90;sh.camera.near=10;sh.camera.far=420;sh.bias=-.0006;
  S.add(sun);S.add(sun.target);
  const fill=new T3.DirectionalLight(0x8FC4D6,.35);fill.position.set(80,40,-120);S.add(fill);TH.sun=sun;TH.fill=fill;
  // sun disc + glow
  const gc=document.createElement('canvas');gc.width=gc.height=128;const gx=gc.getContext('2d'),rg=gx.createRadialGradient(64,64,0,64,64,64);
  rg.addColorStop(0,'rgba(255,240,200,1)');rg.addColorStop(.12,'rgba(255,214,130,.95)');rg.addColorStop(.4,'rgba(255,190,100,.25)');rg.addColorStop(1,'rgba(255,170,80,0)');
  gx.fillStyle=rg;gx.fillRect(0,0,128,128);const gt=new T3.CanvasTexture(gc);
  const sunS=new T3.Sprite(new T3.SpriteMaterial({map:gt,fog:false,depthWrite:false,blending:T3.AdditiveBlending}));sunS.position.set(-420,45,150);sunS.scale.set(170,170,1);S.add(sunS);TH.sunS=sunS;
  // sun glitter on water
  const gl2=document.createElement('canvas');gl2.width=64;gl2.height=256;const g2=gl2.getContext('2d'),lg=g2.createLinearGradient(0,0,0,256);
  lg.addColorStop(0,'rgba(255,200,120,.0)');lg.addColorStop(.25,'rgba(255,200,120,.55)');lg.addColorStop(1,'rgba(255,200,120,0)');g2.fillStyle=lg;g2.fillRect(0,0,64,256);
  const hg=g2.createLinearGradient(0,0,64,0);hg.addColorStop(0,'rgba(0,0,0,1)');hg.addColorStop(.5,'rgba(0,0,0,0)');hg.addColorStop(1,'rgba(0,0,0,1)');g2.globalCompositeOperation='destination-out';g2.fillStyle=hg;g2.fillRect(0,0,64,256);
  const glint=new T3.Mesh(new T3.PlaneGeometry(50,460),new T3.MeshBasicMaterial({map:new T3.CanvasTexture(gl2),transparent:true,depthWrite:false,blending:T3.AdditiveBlending,fog:false}));
  glint.rotation.x=-Math.PI/2;glint.rotation.z=-1.295;glint.position.set(-150,-2.7,62);S.add(glint);

  // materials
  const M={
    steel:new T3.MeshStandardMaterial({color:0xE3EAEE,roughness:.55,metalness:.35}),
    red:new T3.MeshStandardMaterial({color:0xC7362B,roughness:.55,metalness:.3}),
    dark:new T3.MeshStandardMaterial({color:0x22333C,roughness:.7,metalness:.3}),
    yel:new T3.MeshStandardMaterial({color:0xF2B705,roughness:.5,metalness:.25}),
    house:new T3.MeshStandardMaterial({color:0x0F7479,roughness:.6,metalness:.2}),
    glass:new T3.MeshStandardMaterial({color:0x10303E,roughness:.15,metalness:.8,emissive:0x1B4A5A,emissiveIntensity:.35}),
    cable:new T3.MeshStandardMaterial({color:0x2B3940,roughness:.6,metalness:.5}),
    quay:new T3.MeshStandardMaterial({color:0x56646B,roughness:.95}),
    edge:new T3.MeshStandardMaterial({color:0x3A454B,roughness:.9}),
    line:new T3.LineBasicMaterial({color:0x1A262C}),
    white:new T3.MeshStandardMaterial({color:0xF1F3F2,roughness:.6}),
  };
  const box3=(w,h,d,m)=>{const o=new T3.Mesh(new T3.BoxGeometry(w,h,d),m);o.castShadow=true;o.receiveShadow=true;return o};
  const unitCyl=new T3.CylinderGeometry(1,1,1,7);
  const rod=(r,m)=>{const o=new T3.Mesh(unitCyl,m);o.castShadow=true;o.userData.r=r;return o};
  const Y=V(0,1,0),tmp=V(0,0,0);
  const place=(o,a,b)=>{tmp.subVectors(b,a);const L=tmp.length();o.position.copy(a).addScaledVector(tmp,.5);o.scale.set(o.userData.r,L,o.userData.r);o.quaternion.setFromUnitVectors(Y,tmp.normalize())};

  // label texture shared by the main crane
  const lc=document.createElement('canvas');lc.width=512;lc.height=192;lctx=lc.getContext('2d');ltex=new T3.CanvasTexture(lc);ltex.anisotropy=4;

  function mkCrane(withLabel){
    const g=new T3.Group();
    const add=(o,x,y,z,p)=>{o.position.set(x,y,z);(p||g).add(o);return o};
    for(const x of[-9,9]){
      for(const z of[-8,8]){add(box3(1.5,27,1.5,M.steel),x,13.5,z);add(box3(2.6,1.6,5,M.red),x,.8,z);
        for(const w of[-1.4,1.4])add(box3(2.8,.9,.9,M.dark),x,.2,z+w)}
      add(box3(1.1,1.3,16,M.steel),x,9,0);
      add(box3(1.7,2.3,19,M.steel),x,27.4,0);
      const a=rod(.32,M.steel);place(a,V(x,9.7,-7.2),V(x,26.2,7.2));g.add(a);
      const b=rod(.32,M.steel);place(b,V(x,9.7,7.2),V(x,26.2,-7.2));g.add(b);
    }
    add(box3(19.6,2.3,1.7,M.steel),0,27.4,-8);add(box3(19.6,2.3,1.7,M.steel),0,27.4,8);
    add(box3(19.6,1.2,1.2,M.steel),0,18,-8);
    // red-white trims on portal
    add(box3(19.8,.5,1.8,M.red),0,26.1,-8);add(box3(19.8,.5,1.8,M.red),0,26.1,8);
    // saddle + backreach girders
    for(const z of[-8,8])add(box3(10,.7,2,M.steel),0,28.9,z);
    for(const x of[-4,4]){add(box3(1.1,2.5,42,M.steel),x,30.5,-13)}
    for(let z=-32;z<8;z+=6)add(box3(8,.35,.35,M.steel),0,29.4,z);
    // hinged outreach boom
    const out=new T3.Group();out.position.set(0,30.5,8);g.add(out);
    for(const x of[-4,4])add(box3(1.1,2.5,50,M.steel),x,0,25,out);
    for(let z=3;z<50;z+=6)add(box3(8,.35,.35,M.steel),0,-1.1,z,out);
    add(box3(9.2,2.8,1.2,M.red),0,0,50.3,out);
    // floodlights under boom
    const fl=new T3.MeshBasicMaterial({color:0xFFF1C2});
    for(const z of[14,30,44])add(new T3.Mesh(new T3.BoxGeometry(1.2,.3,.7),fl),0,-1.4,z,out);
    // A-frame
    
    for(const s of[-1,1]){
      const a=rod(.5,M.steel);place(a,V(s*8.6,28.6,-8),V(s*2.6,49,-5));g.add(a);
      const b=rod(.42,M.steel);place(b,V(s*8.6,28.6,8),V(s*2.6,49,-5));g.add(b);
      const c=rod(.2,M.cable);place(c,V(s*2.6,49,-5),V(s*4,31.8,-33.5));g.add(c);
    }
    add(box3(6.4,1.6,1.6,M.red),0,49,-5);
    const al=new T3.Mesh(new T3.SphereGeometry(.55,10,8),new T3.MeshBasicMaterial({color:0xFF2A1A}));add(al,0,50.2,-5);apexLights.push(al);
    const tl=new T3.Mesh(new T3.SphereGeometry(.4,8,6),new T3.MeshBasicMaterial({color:0xFF2A1A}));add(tl,0,1.8,50.3,out);apexLights.push(tl);
    // forestays (repositioned when the boom luffs)
    const fs=[];for(const s of[-1,1])for(const L of[26,49]){const f=rod(.18,M.cable);g.add(f);fs.push({f,s,L})}
    // machinery house + gantry walkway
    add(box3(10.5,5.6,11,M.house),0,34.6,-26);add(box3(10.7,.5,11.2,M.yel),0,37.6,-26);
    add(box3(10.6,.8,.3,M.white),0,33.4,-31.6);
    if(withLabel){
      const lm=new T3.MeshBasicMaterial({map:ltex});
      const p1=new T3.Mesh(new T3.PlaneGeometry(9,3.4),lm);p1.rotation.y=Math.PI;add(p1,0,35.6,-31.56);
      const p2=new T3.Mesh(new T3.PlaneGeometry(9.5,3.56),lm);p2.rotation.y=Math.PI;add(p2,0,22.4,-8.8);
      add(box3(10,3.9,.3,M.dark),0,22.4,-8.6);
      const p3=new T3.Mesh(new T3.PlaneGeometry(9.5,3.56),lm);add(p3,0,22.4,8.8);
      const p4=new T3.Mesh(new T3.PlaneGeometry(9,3.4),lm);p4.rotation.y=Math.PI/2;add(p4,5.27,35.2,-26);
      add(box3(10,3.9,.3,M.dark),0,22.4,8.6);
    }
    // cable reel on landside leg
    const reel=new T3.Mesh(new T3.CylinderGeometry(2,2,1.2,18),M.dark);reel.rotation.z=Math.PI/2;add(reel,-10.4,6,-8);
    // trolley + cabin
    const tr=new T3.Group();g.add(tr);tr.position.y=32.4;
    add(box3(10,2,5.4,M.yel),0,0,0,tr);add(box3(10.2,.4,5.6,M.dark),0,-1.1,0,tr);
    add(box3(3,3,3.4,M.white),-6.6,-2.6,1,tr);add(box3(3.06,1.2,3.46,M.glass),-6.6,-2.9,1,tr);
    const bc=new T3.Mesh(new T3.SphereGeometry(.45,10,8),new T3.MeshBasicMaterial({color:0xFFB000}));add(bc,3.5,1.3,0,tr);
    // spreader
    const sp=new T3.Group();g.add(sp);
    add(box3(12.2,.6,2.6,M.yel),0,.3,0,sp);add(box3(3.4,1,1.9,M.dark),0,1.1,0,sp);
    for(const x of[-6,6])add(box3(.4,.7,2.6,M.dark),x,.2,0,sp);
    // ropes
    const ropeGeo=new T3.BufferGeometry();ropeGeo.setAttribute('position',new T3.BufferAttribute(new Float32Array(48),3));
    const ropes=new T3.LineSegments(ropeGeo,M.line);ropes.frustumCulled=false;g.add(ropes);
    const H=V(0,0,0),A=V(0,0,0);
    return{g,tr,sp,bc,update(tz,sy,boom){
      const a=boom*Math.PI/180;out.rotation.x=-a;
      for(const o of fs){H.set(o.s*4,30.5+1.3*Math.cos(a)+o.L*Math.sin(a),8+o.L*Math.cos(a)-1.3*Math.sin(a));A.set(o.s*2.6,49,-5);place(o.f,A,H)}
      tr.position.z=tz;sp.position.set(0,sy,tz);
      const p=ropeGeo.attributes.position.array;let i=0;
      for(const sx of[-1,1])for(const sz of[-1,1])for(const dz of[-.25,.25]){
        p[i++]=sx*2.4;p[i++]=31.2;p[i++]=tz+sz*.9+dz;
        p[i++]=sx*1.2+sx*.2;p[i++]=sy+1.6;p[i++]=tz+sz*.6+dz;
      }
      ropeGeo.attributes.position.needsUpdate=true;
    }};
  }

  main=mkCrane(true);S.add(main.g);
  for(const [x,phase] of[[-50,1.7],[-100,4.1]]){const c=mkCrane(false);c.g.position.x=x;c.ph=phase;S.add(c.g);others.push(c)}

  // quay apron
  const q=box3(1600,8,420,M.quay);q.position.set(0,-4,-198);q.castShadow=false;S.add(q);
  const qe=box3(420,1.2,1.2,M.edge);qe.position.set(0,.2,11.6);S.add(qe);
  const yl=new T3.MeshBasicMaterial({color:0xF2B705});
  for(let x=-200;x<200;x+=8){const d=new T3.Mesh(new T3.PlaneGeometry(4.5,.35),yl);d.rotation.x=-Math.PI/2;d.position.set(x,.03,10.4);S.add(d)}
  const rail=new T3.MeshStandardMaterial({color:0x8A969C,roughness:.4,metalness:.7});
  for(const z of[-8,8]){const r=new T3.Mesh(new T3.BoxGeometry(420,.12,.35),rail);r.position.set(0,.06,z);r.receiveShadow=true;S.add(r)}
  const lane=new T3.MeshBasicMaterial({color:0xD9E2E6,transparent:true,opacity:.55});
  for(const z of[-4.6,.6])for(let x=-200;x<200;x+=10){const d=new T3.Mesh(new T3.PlaneGeometry(5,.22),lane);d.rotation.x=-Math.PI/2;d.position.set(x,.03,z);S.add(d)}
  // bollards
  for(let x=-120;x<=120;x+=24){const b=new T3.Mesh(new T3.CylinderGeometry(.5,.6,1.1,10),M.dark);b.position.set(x,.55,10.9);S.add(b)}
  // light masts
  for(const x of[-28,-76,-124]){const m=box3(.6,34,.6,M.dark);m.position.set(x,17,-22);S.add(m);const h=new T3.Mesh(new T3.BoxGeometry(4,1,1.4),new T3.MeshBasicMaterial({color:0xFFF4D0}));h.position.set(x,34,-22);S.add(h)}

  // water
  const wg=new T3.PlaneGeometry(1600,560,140,48);wg.rotateX(-Math.PI/2);
  water=new T3.Mesh(wg,new T3.MeshStandardMaterial({color:0x165466,roughness:.28,metalness:.35,flatShading:true}));
  water.position.set(0,-3,290);water.receiveShadow=true;S.add(water);
  wPos=wg.attributes.position;wBase=Float32Array.from(wPos.array);

  // container texture (corrugation)
  const cc=document.createElement('canvas');cc.width=128;cc.height=64;const cx=cc.getContext('2d');
  cx.fillStyle='#fff';cx.fillRect(0,0,128,64);for(let i=0;i<128;i+=6){cx.fillStyle='rgba(0,0,0,.13)';cx.fillRect(i,0,2,64);cx.fillStyle='rgba(255,255,255,.4)';cx.fillRect(i+3,0,1,64)}
  cx.strokeStyle='rgba(0,0,0,.35)';cx.lineWidth=4;cx.strokeRect(0,0,128,64);
  const ctex=new T3.CanvasTexture(cc);
  const cMat=new T3.MeshStandardMaterial({map:ctex,roughness:.7,metalness:.15});
  const COLS=['#9C3F2B','#2F6C7C','#C28A2A','#3B7A4A','#5A6F7D','#B5532F','#1F4E79','#D9D4C7','#7A2E4A','#E0E4E2'].map(c=>new T3.Color(c));
  const slots=[];let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  // ship
  const hull=(h,y,c)=>{const s=new T3.Shape();s.moveTo(-76,-13);s.lineTo(58,-13);s.quadraticCurveTo(76,-8,82,0);s.quadraticCurveTo(76,8,58,13);s.lineTo(-76,13);s.lineTo(-76,-13);
    const g=new T3.ExtrudeGeometry(s,{depth:h,bevelEnabled:false});g.rotateX(-Math.PI/2);const m=new T3.Mesh(g,new T3.MeshStandardMaterial({color:c,roughness:.6,metalness:.25}));m.position.set(0,y,33);m.castShadow=true;m.receiveShadow=true;return m};
  const ship=new T3.Group();S.add(ship);
  ship.add(hull(4.5,-6.5,0x8E2B22));ship.add(hull(6.6,-2,0x14303D));ship.add(hull(.5,4.6,0x9AA6AB));
  const br=box3(9,13,24,M.white);br.position.set(-68,11.6,33);ship.add(br);
  for(let k=0;k<4;k++){const w=box3(9.1,.9,24.1,M.glass);w.position.set(-68,8.6+k*2.8,33);ship.add(w)}
  const fun=box3(4,6,5,M.red);fun.position.set(-72,20,33);ship.add(fun);
  const mast=box3(.5,10,.5,M.dark);mast.position.set(70,9.5,33);ship.add(mast);
  for(let b=0;b<9;b++){const x=-52+b*13;for(let r=0;r<9;r++){const z=33+(r-4)*2.6;
    let tiers=b===4&&r===1?2:1+Math.floor(rnd()*4.2);if(b===4&&(r===0||r===2))tiers=Math.min(tiers,3);
    for(let t=0;t<tiers;t++)slots.push([x,5.1+t*2.6+1.3,z,0,Math.floor(rnd()*COLS.length)])}}
  // yard blocks (land side)
  for(const [x0,x1] of[[-190,-34]])for(let x=x0;x<x1;x+=13.4)for(let r=0;r<6;r++){const z=-26-r*2.7;const t=1+Math.floor(rnd()*3);for(let k=0;k<t;k++)slots.push([x,k*2.6+1.3,z,0,Math.floor(rnd()*COLS.length)])}
  const inst=new T3.InstancedMesh(new T3.BoxGeometry(12,2.55,2.45),cMat,slots.length);inst.castShadow=true;inst.receiveShadow=true;
  const mtx=new T3.Matrix4();slots.forEach((s,i)=>{mtx.makeTranslation(s[0],s[1],s[2]);inst.setMatrixAt(i,mtx);inst.setColorAt(i,COLS[s[4]])});
  inst.instanceMatrix.needsUpdate=true;if(inst.instanceColor)inst.instanceColor.needsUpdate=true;S.add(inst);

  // the container in play
  boxMat=new T3.MeshStandardMaterial({map:ctex,color:BOXC[0],roughness:.6,metalness:.15});
  box=new T3.Mesh(new T3.BoxGeometry(12,2.55,2.45),boxMat);box.castShadow=true;box.receiveShadow=true;S.add(box);
  // terminal tractor + chassis
  truck=new T3.Group();S.add(truck);
  const tb=(w,h,d,m,x,y)=>{const o=box3(w,h,d,m);o.position.set(x,y,0);truck.add(o)};
  tb(13,.5,2.4,M.dark,0,1.2);tb(3,2.8,2.5,M.yel,8.1,2.1);tb(1,1.2,2.3,M.glass,9.2,2.7);
  const wh=new T3.CylinderGeometry(.55,.55,.5,12);wh.rotateX(Math.PI/2);
  for(const x of[-5,-3.8,8.6,7])for(const z of[-1,1]){const w=new T3.Mesh(wh,M.dark);w.position.set(x,.55,z);truck.add(w)}
  truck.position.z=ZL;

  TH.glint=glint;TH.glass=M.glass;
  // night extras: stars and a work-light glow under the boom
  const sp=new Float32Array(900);for(let i=0;i<900;i+=3){const a=Math.random()*Math.PI*2,e=.08+Math.random()*1.2,r=900;sp[i]=Math.cos(a)*Math.cos(e)*r;sp[i+1]=Math.sin(e)*r;sp[i+2]=Math.sin(a)*Math.cos(e)*r}
  const sg2=new T3.BufferGeometry();sg2.setAttribute('position',new T3.BufferAttribute(sp,3));
  stars=new T3.Points(sg2,new T3.PointsMaterial({color:0xDCE9FF,size:2.2,sizeAttenuation:false,fog:false,transparent:true,opacity:.9,depthWrite:false}));stars.visible=false;S.add(stars);
  TH.lamp=new T3.PointLight(0xFFE0A0,0,150,1.6);TH.lamp.position.set(0,27,18);S.add(TH.lamp);
  TH.lamp2=new T3.PointLight(0xFFE0A0,0,120,1.6);TH.lamp2.position.set(10,24,-6);S.add(TH.lamp2);
  applyTheme();
  clock=new T3.Clock();
  // pointer orbit
  const el=R.domElement;el.setAttribute('aria-hidden','true');
  el.addEventListener('pointerdown',e=>{cam.drag={x:e.clientX,y:e.clientY,th:cam.dth,ph:cam.dph};});
  addEventListener('pointermove',e=>{if(!cam.drag)return;cam.dth=cam.drag.th-(e.clientX-cam.drag.x)*.006;cam.dph=Math.max(-.25,Math.min(.5,cam.drag.ph+(e.clientY-cam.drag.y)*.003));if(RM)frame(0)});
  addEventListener('pointerup',()=>{cam.drag=null});addEventListener('pointercancel',()=>{cam.drag=null});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start()});
}

function applyTheme(){
  if(!R)return;const u=sky.material.uniforms,d=dark;
  u.top.value.setHex(d?0x01040A:0x05182A);u.mid.value.setHex(d?0x071A2E:0x2B6B82);u.hor.value.setHex(d?0x16324A:0xE9AE6C);
  S.fog.color.setHex(d?0x16324A:0xE9AE6C);
  TH.hemi.intensity=d?.34:.75;TH.hemi.color.setHex(d?0x8FB4E0:0xCFE4EE);TH.hemi.groundColor.setHex(d?0x0A1420:0x3A2A1C);
  TH.sun.intensity=d?.42:1.15;TH.sun.color.setHex(d?0xA9C6FF:0xFFD7A0);TH.fill.intensity=d?.12:.35;
  TH.sunS.material.color.setHex(d?0xCFE0FF:0xFFFFFF);TH.sunS.scale.set(d?70:170,d?70:170,1);TH.sunS.position.y=d?120:45;
  TH.glint.material.color.setHex(d?0x6F8FC0:0xFFFFFF);TH.glint.material.opacity=d?.5:1;
  TH.glass.emissive.setHex(d?0xFFD98A:0x1B4A5A);TH.glass.emissiveIntensity=d?.9:.35;
  TH.lamp.intensity=d?1.5:0;TH.lamp2.intensity=d?1.1:0;
  water.material.color.setHex(d?0x0B2C40:0x165466);stars.visible=d;
  u.sd.value.set(-420,d?120:45,150).normalize();
}
function setTheme(d){dark=!!d;applyTheme();if(R&&(RM||!raf))frame(0)}
function drawLabel(id,sub,down){
  const c=lctx,w=512,h=192;c.clearRect(0,0,w,h);
  c.fillStyle='#0B2A3A';c.fillRect(0,0,w,h);
  c.fillStyle=down?'#C7362B':'#F2B705';c.fillRect(0,0,w,14);c.fillRect(0,h-14,w,14);
  c.fillStyle='#F2B705';c.font='700 118px "Barlow Semi Condensed",Barlow,Arial Narrow,Arial,sans-serif';c.textAlign='center';c.textBaseline='middle';
  c.fillText(id,w/2,sub?h/2-12:h/2+4);
  if(sub){c.fillStyle='#E6EFF2';c.font='600 30px Barlow,Arial,sans-serif';c.fillText(sub.toUpperCase(),w/2,h-40)}
  ltex.needsUpdate=true;
}

const ease=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
const P=(d,to,fn)=>({d,to:to||{},fn});
function cycle(){return[
  P(3.4,{tz:ZS,sy:SAFE,tx:0}),P(2.4,{sy:SHIP_TOP}),P(.5,{},()=>st.carry='crane'),P(2.4,{sy:SAFE}),
  P(3.6,{tz:ZL}),P(2.4,{sy:TRUCK_TOP}),P(.5,{},()=>st.carry='truck'),P(2,{sy:SAFE}),
  P(4.6,{tx:140}),P(0,{tx:-140},()=>{boxMat.color.setHex(BOXC[(Math.random()*BOXC.length)|0])}),
  P(4.6,{tx:0}),P(2.4,{sy:TRUCK_TOP}),P(.5,{},()=>st.carry='crane'),P(2.4,{sy:SAFE}),
  P(3.6,{tz:ZS}),P(2.4,{sy:SHIP_TOP}),P(.5,{},()=>st.carry='ship'),P(2.2,{sy:SAFE}),
  P(4.6,{tx:140}),P(0,{tx:-140})
]}
function step(dt){
  if(!ph){
    if(!queue.length){if(mode==='work')queue=cycle();else return}
    ph=queue.shift();ph.el=0;ph.from={};for(const k in ph.to)ph.from[k]=st[k];
  }
  ph.el+=dt;const p=ph.d?Math.min(1,ph.el/ph.d):1,e=ease(p);
  for(const k in ph.to)st[k]=ph.from[k]+(ph.to[k]-ph.from[k])*e;
  if(p>=1){const f=ph.fn;ph=null;if(f)f()}
}
function placeCamera(){
  main.update(st.tz,st.sy,st.boom);
  truck.position.x=st.tx;
  if(st.carry==='ship')box.position.set(0,SHIP_TOP-1.3,ZS);
  else if(st.carry==='crane')box.position.set(0,st.sy-1.3,st.tz);
  else box.position.set(st.tx,TRUCK_TOP-1.3,ZL);
}
function frame(dt){
  const t=clock?clock.elapsedTime:0;
  if(!RM)step(Math.min(dt,.1));
  placeCamera();
  for(const c of others){const k=t*.22+c.ph;c.update(13+16*Math.sin(k),19+6*Math.sin(k*1.7+1),0)}
  const blink=(Math.sin(t*4)>0)?1:.15;apexLights.forEach(l=>{l.material.color.setRGB(blink,blink*.16,blink*.1)});
  if(mode==='work'){main.bc.material.color.setHex(Math.sin(t*6)>0?0xFFB000:0x553300)}
  // waves
  if(!RM||!t){const a=wPos.array;for(let i=0;i<a.length;i+=3){const x=wBase[i],z=wBase[i+2];a[i+1]=Math.sin(x*.045+t*.9)*.45+Math.cos(z*.06+t*1.2)*.35+Math.sin((x+z)*.11+t*1.7)*.15}
    wPos.needsUpdate=true;water.geometry.computeVertexNormals()}
  // camera
  const w=host?host.clientWidth:1,h=host?host.clientHeight:1,asp=w/Math.max(1,h);
  const auto=RM?0:.2*Math.sin(t*.07);
  const ik=RM?1:Math.min(1,(performance.now()-cam.t0)/2800),ie=1-Math.pow(1-ik,3);
  const th=cam.th+auto+cam.dth-.7*(1-ie),phi=cam.ph+cam.dph+.32*(1-ie);
  const r=cam.r*Math.min(1.9,Math.max(1,1.55/asp))*(1+.85*(1-ie));
  CAM.position.set(cam.tgt.x+Math.sin(th)*Math.cos(phi)*r,cam.tgt.y+Math.sin(phi)*r,cam.tgt.z+Math.cos(th)*Math.cos(phi)*r);
  CAM.lookAt(cam.tgt);sky.position.copy(CAM.position);
  R.render(S,CAM);
}
function loop(){raf=requestAnimationFrame(loop);frame(clock.getDelta())}
function start(){if(!R||raf||RM||!visible||document.hidden)return;clock.getDelta();loop()}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0}
function resize(){if(!host||!R)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;R.setSize(w,h,false);CAM.aspect=w/h;CAM.updateProjectionMatrix();if(RM||!raf)frame(0)}

function mount(el,o){
  if(!el||!init())return false;
  o=o||{};
  host=el;el.appendChild(R.domElement);
  if(ro)ro.disconnect();if(window.ResizeObserver){ro=new ResizeObserver(resize);ro.observe(el)}
  if(io)io.disconnect();if(window.IntersectionObserver){io=new IntersectionObserver(es=>{visible=es[0].isIntersecting;visible?start():stop()});io.observe(el)}
  const down=!!o.down;mode=down?'down':'work';queue=[];ph=null;
  drawLabel(o.id||'QC',o.sub||'',down);
  main.bc.material.color.setHex(down?0xFF3B30:0xFFB000);
  if(down){Object.assign(st,{tz:PARK,sy:SAFE+2,tx:-140,boom:0,carry:'ship'});queue=[P(1.2,{}),P(5,{boom:80})];if(RM)st.boom=80}
  else{Object.assign(st,{tz:PARK,sy:SAFE,tx:-140,boom:0,carry:'ship'});if(RM)Object.assign(st,{tz:12,sy:SAFE,tx:0,carry:'crane'})}
  // framing
  if(o.close){cam.th=1.78;cam.ph=.1;cam.r=down?128:100;cam.tgt.set(0,down?34:20,down?2:12)}
  else{cam.th=1.75;cam.ph=.09;cam.r=118;cam.tgt.set(0,12,12)}
  cam.dth=0;cam.dph=0;cam.t0=performance.now();
  resize();stop();start();if(RM||!raf)frame(0);
  return true;
}
return{mount,setTheme,get ok(){return !failed&&!!window.THREE}};
})();
