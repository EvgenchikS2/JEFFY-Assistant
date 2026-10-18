(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map();
  const prefersReduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  let marker, markerY = 0, previousY = 0, currentPage = '', resizeFrame, glowFrame, glow, glowPanel, glowTime=0;
  const light={x:0,y:0,vx:0,vy:0,tx:0,ty:0};
  // Analytic underdamped spring: mass=1, stiffness=420, damping=32.
  // Browser keyframes sample physical displacement rather than an easing curve.
  const duration = 640, omega = Math.sqrt(420), damping = 16;
  const frequency = Math.sqrt(omega * omega - damping * damping);
  const samples = Array.from({length:77},(_,i)=>{
    const t=i/76*duration/1000;
    return i===76?1:1-Math.exp(-damping*t)*(Math.cos(frequency*t)+damping/frequency*Math.sin(frequency*t));
  });
  function spring(el,frames,delay=0){
    if(prefersReduced()){beforePage();return;}
    if(!el)return;
    active.get(el)?.cancel();
    const animation=el.animate(samples.map((x,i)=>({...frames(x),offset:i/(samples.length-1)})),{duration,delay});
    active.set(el,animation);
    animation.finished.then(()=>{if(active.get(el)===animation)active.delete(el);}).catch(()=>{});
    return animation;
  }
  function navigation(){
    const sidebar=document.querySelector('.sidebar'),item=document.querySelector('[data-nav].active');
    if(!item||!sidebar)return;
    if(!marker){marker=document.createElement('i');marker.className='motion-nav-marker';marker.setAttribute('aria-hidden','true');sidebar.append(marker);previousY=item.offsetTop;}
    markerY=item.offsetTop;marker.style.top=markerY+'px';marker.style.height=item.offsetHeight+'px';marker.style.left=item.offsetLeft+'px';marker.style.width=item.offsetWidth+'px';
    spring(marker,x=>({transform:`translate3d(0,${(previousY-markerY)*(1-x)}px,0)`}));
  }
  function beforePage(){
    if(marker)previousY=marker.offsetTop+(new DOMMatrixReadOnly(getComputedStyle(marker).transform)).m42;
    for(const animation of active.values())animation.cancel();active.clear();
    cancelAnimationFrame(glowFrame);glowFrame=0;glowPanel=null;glow?.remove();glow=null;
  }
  function afterPage(content,page){
    const changed=page!==currentPage;currentPage=page;navigation();
    if(prefersReduced()||!changed)return;
    const moments=[content.querySelector('.page-heading'),...Array.from(content.querySelectorAll('.panel')).slice(0,4)].filter(Boolean);
    moments.forEach((el,index)=>spring(el,x=>({opacity:Math.min(1,Math.max(0,x)),transform:`translate3d(0,${14*(1-x)}px,0) scale(${.985+.015*x})`}),index*35));
    const title=content.querySelector('h1');
    if(title){const text=title.textContent;title.setAttribute('aria-label',text);title.textContent='';
      Array.from(text).forEach((letter,index)=>{const span=document.createElement('span');span.textContent=letter===' '?'\u00a0':letter;span.className='motion-letter';span.setAttribute('aria-hidden','true');title.append(span);spring(span,x=>({opacity:Math.min(1,Math.max(0,x)),transform:`translate3d(0,${7*(1-x)}px,0)`}),Math.min(index*7,160));});}
  }
  function buttonMotion(el,target){
    if(!el||el.disabled||prefersReduced())return;
    const from=new DOMMatrixReadOnly(getComputedStyle(el).transform).a;
    el.style.transform=target===1?'':`scale(${target})`;
    spring(el,x=>({transform:`scale(${from+(target-from)*x})`}));
  }
  function layout(container,mutate){
    const previous=new Map(Array.from(container?.children||[]).filter(el=>!el.hidden).map(el=>[el,el.getBoundingClientRect()]));
    mutate();
    if(!container||prefersReduced())return;
    Array.from(container.children).filter(el=>!el.hidden).forEach(el=>{
      const old=previous.get(el),now=el.getBoundingClientRect(),dy=old?old.top-now.top:8;
      if(Math.abs(dy)>.5)spring(el,x=>({transform:`translate3d(0,${dy*(1-x)}px,0)`,opacity:old?1:Math.max(0,Math.min(1,x))}));
    });
  }
  function drawLight(time){
    if(!glow?.isConnected||prefersReduced()){glowFrame=0;return;}
    const dt=Math.min((time-glowTime)/1000||1/120,1/30);glowTime=time;
    light.vx+=(320*(light.tx-light.x)-30*light.vx)*dt;light.vy+=(320*(light.ty-light.y)-30*light.vy)*dt;
    light.x+=light.vx*dt;light.y+=light.vy*dt;glow.style.transform=`translate3d(${light.x-130}px,${light.y-130}px,0)`;
    if(Math.abs(light.x-light.tx)+Math.abs(light.y-light.ty)+Math.abs(light.vx)+Math.abs(light.vy)>.2)glowFrame=requestAnimationFrame(drawLight);else glowFrame=0;
  }
  document.addEventListener('pointermove',event=>{
    if(prefersReduced()||event.pointerType==='touch')return;
    const panel=event.target.closest('.voice-panel');
    if(!panel){if(glow)glow.style.opacity='0';return;}
    const rect=panel.getBoundingClientRect();
    if(panel!==glowPanel){glowPanel=panel;glow=document.createElement('i');glow.className='motion-glow';glow.setAttribute('aria-hidden','true');panel.prepend(glow);light.x=event.clientX-rect.left;light.y=event.clientY-rect.top;light.vx=light.vy=0;}
    light.tx=event.clientX-rect.left;light.ty=event.clientY-rect.top;glow.style.opacity='1';
    if(!glowFrame){glowTime=performance.now();glowFrame=requestAnimationFrame(drawLight);}
  });
  document.addEventListener('pointerover',event=>{const el=event.target.closest('button,.btn');if(el&&!el.contains(event.relatedTarget))buttonMotion(el,1.018);});
  document.addEventListener('pointerout',event=>{const el=event.target.closest('button,.btn');if(el&&!el.contains(event.relatedTarget))buttonMotion(el,1);});
  document.addEventListener('pointerdown',event=>buttonMotion(event.target.closest('button,.btn'),.965));
  document.addEventListener('pointerup',event=>buttonMotion(event.target.closest('button,.btn'),1));
  addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{previousY=markerY;navigation();});});
  reduced.addEventListener('change',()=>{beforePage();document.querySelectorAll('button,.btn').forEach(el=>el.style.transform='');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)beforePage();});
  window.JeffyMotion={beforePage,afterPage,spring,layout,
    modal:el=>spring(el,x=>({opacity:Math.min(1,Math.max(0,x)),transform:`translate3d(0,${18*(1-x)}px,0) scale(${.96+.04*x})`})),
    voice:state=>{const orb=document.querySelector('.orb-wrap');if(orb&&state!=='idle')spring(orb,x=>({transform:`scale(${1+.035*Math.sin(Math.PI*x)})`}));}
  };
})();
