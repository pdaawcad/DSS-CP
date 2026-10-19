import * as T from './vendor/three/three.module.js';

const mat=(color,metalness=.25,roughness=.48)=>new T.MeshStandardMaterial({color,metalness,roughness});
function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=!material.isShaderMaterial;m.receiveShadow=!material.isShaderMaterial;parent.add(m);return m;}
function box(g,w,h,d,c,x=0,y=0,z=0){return mesh(g,new T.BoxGeometry(w,h,d),typeof c==='object'?c:mat(c),x,y,z);}
function line(g,points,color=0x75dbc9,opacity=1){const m=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color,transparent:true,opacity}));g.add(m);return m;}
function brandTexture(){const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#15414b';ctx.fillRect(0,0,256,128);ctx.fillStyle='#dbf4ec';ctx.font='bold 65px sans-serif';ctx.fillText('CP',25,76);ctx.font='15px sans-serif';ctx.fillText('GLOBAL LOGISTICS',25,103);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
function decal(parent,x,y,z,w,h){const m=mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:brandTexture(),side:T.DoubleSide}),x,y,z);return m;}
function container(g,x,y,z,color=0x388c87,scale=1){const group=new T.Group();g.add(group);group.position.set(x,y,z);group.scale.setScalar(scale);box(group,.76,.38,.34,color);const rib=mat(0x244c52);for(let i=0;i<9;i++)box(group,.012,.33,.351,rib,-.33+i*.083,0,0);return group;}
function ship(){const g=new T.Group(),hull=new T.Shape();hull.moveTo(-2,-.45);hull.lineTo(1.5,-.45);hull.lineTo(2.05,0);hull.lineTo(1.5,.45);hull.lineTo(-2,.45);hull.lineTo(-2.18,.2);hull.lineTo(-2.18,-.2);hull.closePath();const geo=new T.ExtrudeGeometry(hull,{depth:.46,bevelEnabled:true,bevelSize:.09,bevelThickness:.1,bevelSegments:2,steps:1});geo.rotateX(-Math.PI/2);mesh(g,geo,mat(0x173b4d),0,-.15);box(g,3.4,.07,.83,0x9caeab,-.1,.37);box(g,3.5,.1,.91,0xae7960,-.12,-.08);
  const colors=[0x4e9990,0xc19c72,0x668caa,0xd3b687];for(let x=0;x<4;x++)for(let z=0;z<2;z++)for(let y=0;y<(x===3?1:2);y++)container(g,-.95+x*.78,.6+y*.4,-.19+z*.38,colors[(x+z+y)%4]);
  box(g,.42,.8,.64,0xd2ded9,-1.75,.72);box(g,.6,.2,.82,0xd9e8e4,-1.72,1.13);box(g,.61,.1,.84,0x215d6b,-1.72,1.13);box(g,.08,.56,.08,0x99c7be,-1.8,1.48);box(g,.16,.35,.18,0x9a6b51,-1.48,1.2);decal(g,-.25,.12,.49,.75,.31);return g;}
function plane(){const g=new T.Group();const silver=mat(0xe2ecea,.5,.28);const body=mesh(g,new T.SphereGeometry(1,32,20),silver);body.scale.set(2,.21,.22);
  function wing(points,color,y=0){const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:false});geo.rotateX(-Math.PI/2);return mesh(g,geo,mat(color,.45,.35),0,y);}
  wing([[.4,-.15],[-.8,-1.85],[-1.16,-1.88],[-.65,-.15]],0xaebfc6);wing([[.4,.15],[-.8,1.85],[-1.16,1.88],[-.65,.15]],0xcadbdc);wing([[-1.3,-.1],[-1.88,-.85],[-2,-.85],[-1.8,-.1]],0x56b8a7,.05);wing([[-1.3,.1],[-1.88,.85],[-2,.85],[-1.8,.1]],0x56b8a7,.05);
  const tail=new T.Shape();tail.moveTo(-1.2,0);tail.lineTo(-1.83,.8);tail.lineTo(-1.98,.8);tail.lineTo(-1.85,0);mesh(g,new T.ExtrudeGeometry(tail,{depth:.065,bevelEnabled:false}),mat(0x399d92),0,.1,-.032);
  for(const z of [-.7,.7]){const e=mesh(g,new T.CylinderGeometry(.145,.13,.57,24),silver,-.3,-.17,z);e.rotation.z=Math.PI/2;const inlet=mesh(g,new T.CircleGeometry(.115,24),mat(0x173843),-.008,-.17,z);inlet.rotation.y=Math.PI/2;}
  for(let i=0;i<13;i++)box(g,.045,.047,.435,0x1c5266,-1.2+i*.18,.095);
  box(g,.3,.08,.32,0x285566,1.5,.12);return g;}
function truck(){const g=new T.Group();box(g,3.15,.16,.73,0x1f303c,0,.17);box(g,2.24,1,.83,0x247b7b,-.46,.81);for(let i=0;i<19;i++)box(g,.025,.93,.85,0x1e6064,-1.51+i*.119,.81);box(g,.75,.8,.78,0xdbe7df,1.13,.67);box(g,.48,.32,.78,0xc3d8d6,1.02,1.16);box(g,.03,.29,.65,0x1e4a5b,1.518,.91);box(g,.35,.25,.793,0x234b5e,1.16,1);box(g,.04,.2,.54,0x203847,1.535,.49);for(const z of [-.29,.29])box(g,.055,.085,.13,0xfde4a2,1.56,.59,z);
  for(const x of [-1.32,-.96,.25,1.1])for(const z of [-.43,.43]){const w=mesh(g,new T.CylinderGeometry(.23,.23,.16,20),mat(0x101c28),x,.24,z);w.rotation.x=Math.PI/2;const rim=mesh(g,new T.CylinderGeometry(.13,.13,.165,16),mat(0xa0b5b7,.7),x,.24,z);rim.rotation.x=Math.PI/2;}
  decal(g,-.35,.88,.437,1.03,.52);return g;}
function earth(world){const g=new T.Group();const c=document.createElement('canvas');c.width=2048;c.height=1024;const ctx=c.getContext('2d');ctx.fillStyle='#133041';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#284858';ctx.lineWidth=1;for(let x=0;x<c.width;x+=c.width/24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,c.height);ctx.stroke();}for(let y=0;y<c.height;y+=c.height/12){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(c.width,y);ctx.stroke();}
  for(const f of world.features){const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[];ctx.fillStyle=f.properties.name==='Thailand'?'#b3ecbd':'#427b7b';ctx.strokeStyle='#659793';for(const rings of polys){ctx.beginPath();for(const ring of rings)ring.forEach(([lon,lat],i)=>{const x=(lon+180)/360*c.width,y=(90-lat)/180*c.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.fill('evenodd');ctx.stroke();}}
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;mesh(g,new T.SphereGeometry(1.68,64,40),new T.MeshStandardMaterial({map:texture,roughness:.6,metalness:.3})).receiveShadow=false;
  const glow=mesh(g,new T.SphereGeometry(1.72,48,32),new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,uniforms:{color:{value:new T.Color('#63d4ce')}},vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n; varying vec3 v; uniform vec3 color; void main(){float a=pow(1.-abs(dot(n,v)),3.);gl_FragColor=vec4(color,a*.48);}'}));
  const point=(lon,lat,r)=>new T.Vector3(-r*Math.cos(lat*Math.PI/180)*Math.cos(lon*Math.PI/180),r*Math.sin(lat*Math.PI/180),r*Math.cos(lat*Math.PI/180)*Math.sin(lon*Math.PI/180));
  const start=point(100.5,13.7,1.7),arcs=[];for(const [lon,lat]of [[10,51],[139,35],[-74,40],[151,-34],[55,25],[-46,-23]]){const end=point(lon,lat,1.7),mid=start.clone().add(end).normalize().multiplyScalar(2.3);const curve=new T.QuadraticBezierCurve3(start,mid,end);line(g,curve.getPoints(60),0x75e6c7,.75);const dot=mesh(g,new T.SphereGeometry(.03,8,8),new T.MeshBasicMaterial({color:0xcafde4}));arcs.push({curve,dot});mesh(g,new T.SphereGeometry(.033,8,8),new T.MeshBasicMaterial({color:0xf0c99d}),end.x,end.y,end.z);}
  g.userData.arcs=arcs;return g;}
function crane(g,x,z){const c=new T.Group();c.position.set(x,0,z);g.add(c);const m=mat(0xa7b5ad);for(const q of [-.32,.32])box(c,.055,1.22,.06,m,q,.58,0);box(c,1.15,.07,.09,m,.12,1.21);box(c,.05,.48,.05,m,-.21,1.45);box(c,.05,.6,.05,0x6bbbad,.55,.88);box(c,.34,.05,.12,0xd1b37d,.55,.58);line(c,[new T.Vector3(-.21,1.69,0),new T.Vector3(.66,1.22,0)],0x829e9e);}
function hero(world){const g=new T.Group(),orb=earth(world);orb.scale.setScalar(.8);orb.position.set(0,3.15,-.85);g.add(orb);
  const base=mesh(g,new T.CylinderGeometry(3.3,3.3,.12,96),mat(0x0f2737,.4,.55),0,-.7,0);const quay=box(g,3.2,.15,1.25,0x384e59,0,-.54,1.1);for(let i=0;i<12;i++)box(g,.11,.015,.2,0xb4aa83,-1.45+i*.26,-.455,1.66);
  const ring=new T.Mesh(new T.TorusGeometry(3.03,.012,6,100),new T.MeshBasicMaterial({color:0x57bcb3,transparent:true,opacity:.4}));ring.rotation.x=Math.PI/2;ring.position.y=-.615;g.add(ring);
  for(let i=0;i<3;i++){crane(g,-1.3+i*.57,.64);container(g,-1.3+i*.7,-.29,1.18,[0xab8964,0x428785,0x5f7c9e][i],.62);}
  box(g,1.18,.61,.75,0x718b8d,1.86,-.29,.65);box(g,1.28,.06,.87,0xc0cec1,1.86,.045,.65);for(let i=0;i<4;i++)box(g,.15,.32,.018,0x1c4e5b,1.48+i*.25,-.34,1.04);decal(g,1.86,-.12,1.045,.48,.23);
  const boat=ship();boat.scale.setScalar(.48);boat.position.set(-.65,-.38,2.1);boat.rotation.y=.15;g.add(boat);const aircraft=plane();aircraft.scale.setScalar(.33);g.add(aircraft);const lorry=truck();lorry.scale.setScalar(.2);g.add(lorry);
  return {group:g,animate(t,drag){orb.rotation.y=-1.35+t*.065+drag;orb.userData.arcs.forEach(({curve,dot},i)=>dot.position.copy(curve.getPoint((t*.08+i*.13)%1)));const a=t*.18+.4;aircraft.position.set(Math.cos(a)*2.7,3.15+Math.sin(a)*.25,Math.sin(a)*1.75);aircraft.rotation.y=-a-Math.PI/2;aircraft.rotation.z=Math.sin(a)*.06;boat.position.y=-.38+Math.sin(t)*.023;boat.rotation.z=Math.sin(t*.8)*.012;lorry.position.set(Math.sin(t*.18)*1.6,-.46,1.68);lorry.rotation.y=Math.cos(t*.18)>0?0:Math.PI;}};
}

export function createTransportGraphics(world){
  const entries=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let pause=reduced.matches,elapsed=0,last=0,disposed=false;
  function release(e){e.cleanup?.();e.scene.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.map?.dispose();m.dispose();}});e.renderer.dispose();e.renderer.forceContextLoss();e.canvas.remove();}
  function sync(){
    for(const [el,e] of entries)if(!el.isConnected||!el.checkVisibility()){release(e);entries.delete(el);}
    for(const el of document.querySelectorAll('[data-transport-3d]')){
      if(entries.has(el)||!el.checkVisibility())continue;
      const kind=el.getAttribute('data-transport-3d'),main=kind==='hero',canvas=document.createElement('canvas');canvas.className='transport-local-canvas';canvas.setAttribute('aria-hidden','true');
      let renderer;try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch{continue;}
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
      const scene=new T.Scene();scene.add(new T.HemisphereLight(0xc9e9fa,0x192c36,2.3));const sun=new T.DirectionalLight(0xfff0d7,3.1);sun.position.set(-3,7,5);scene.add(sun);const rim=new T.DirectionalLight(0x67e8d4,2.5);rim.position.set(4,3,-4);scene.add(rim);
      const content=main?hero(world):{group:kind==='SEA'?ship():kind==='AIR'?plane():truck()};scene.add(content.group);
      const camera=new T.PerspectiveCamera(main?38:33,1,.1,100);camera.position.set(main?7:5,main?5.8:3.1,main?10:6);camera.lookAt(0,main?1.45:.25,0);
      const e={renderer,canvas,scene,camera,content,main,drag:0,width:0,height:0};entries.set(el,e);el.append(canvas);el.classList.add('has-webgl');
      if(main){let start=null;const down=ev=>{if(ev.pointerType==='touch')return;start={x:ev.clientX,drag:e.drag};el.setPointerCapture(ev.pointerId);};const move=ev=>{if(start)e.drag=start.drag+(ev.clientX-start.x)*.008;};const up=()=>start=null;el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);e.cleanup=()=>{el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);};}
    }
  }
  function frame(t){if(disposed)return;requestAnimationFrame(frame);if(t-last<33)return;const dt=Math.min((t-last)/1000,.08);last=t;if(document.hidden)return;if(!pause)elapsed+=dt;
    for(const [el,e]of entries){const r=el.getBoundingClientRect();if(!el.isConnected||!r.width||!r.height||r.bottom<0||r.top>innerHeight)continue;
      const w=Math.round(r.width),h=Math.round(r.height);if(e.width!==w||e.height!==h){e.renderer.setSize(w,h,false);e.width=w;e.height=h;e.camera.aspect=w/h;e.camera.updateProjectionMatrix();}
      if(e.main)e.content.animate(elapsed,e.drag);else{e.content.group.rotation.y=-.12+Math.sin(elapsed*.25)*.08;e.content.group.position.y=0;}
      e.renderer.render(e.scene,e.camera);
    }
  }
  requestAnimationFrame(frame);
  return {sync,setPaused(v){pause=v;},get paused(){return pause;},dispose(){disposed=true;entries.forEach(release);entries.clear();}};
}

