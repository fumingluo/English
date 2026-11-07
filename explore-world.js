// Lazy-loaded, procedural 3D learning world. No model or texture assets are downloaded.
let activeCleanup = null;
export async function mountExploreWorld(){
  if(activeCleanup){activeCleanup();activeCleanup=null;}
  const canvas=document.getElementById('exploreCanvas');
  if(!canvas)return;
  const loading=document.getElementById('exploreLoading');
  try{
    const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js');
    if(!canvas.isConnected)return;
    const host=canvas.parentElement;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
    renderer.setSize(host.clientWidth,host.clientHeight||460,false);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.shadowMap.enabled=false;
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0xb9d8e7);
    scene.fog=new THREE.Fog(0xb9d8e7,27,58);
    const camera=new THREE.PerspectiveCamera(43,host.clientWidth/(host.clientHeight||460),.1,90);
    camera.position.set(0,14,24);
    camera.lookAt(0,2,-1);
    scene.add(new THREE.HemisphereLight(0xeaf7ff,0x6c866d,2.0));
    const sun=new THREE.DirectionalLight(0xfff3d8,2.0);
    sun.position.set(-9,18,12);scene.add(sun);
    const mat=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness,flatShading:true});
    const grass=mat(0x789b79),snow=mat(0xf1f4ed),ice=mat(0xd8e9e9),rock=mat(0x81969a),pathMat=mat(0xc5b99b),pine1=mat(0x315f50),pine2=mat(0x477a61),trunk=mat(0x806c55);
    const heightAt=(x,v)=>0.15+2.4*Math.exp(-((x+2.2)*(x+2.2)/34+(v-2)*(v-2)/60))+3.1*Math.exp(-((x-1.6)*(x-1.6)/22+(v-7)*(v-7)/28))+1.2*Math.exp(-((x-5)*(x-5)/18+(v+5)*(v+5)/25));
    const terrainGeo=new THREE.PlaneGeometry(29,32,48,52);
    const pos=terrainGeo.attributes.position;
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),v=pos.getY(i);pos.setZ(i,heightAt(x,v));}
    terrainGeo.computeVertexNormals();terrainGeo.rotateX(-Math.PI/2);
    const terrain=new THREE.Mesh(terrainGeo,grass);terrain.position.y=0;scene.add(terrain);
    const base=new THREE.Mesh(new THREE.PlaneGeometry(100,100),mat(0x9db9a0));base.rotation.x=-Math.PI/2;base.position.y=-1.25;scene.add(base);
    // Distant faceted peaks frame the trail.
    for(const p of [{x:-10,z:-10,r:5,h:11},{x:-5,z:-14,r:6,h:14},{x:5,z:-15,r:7,h:16},{x:11,z:-9,r:5,h:10}]){
      const m=new THREE.Mesh(new THREE.ConeGeometry(p.r,p.h,7,3),ice);m.position.set(p.x,p.h*.42,p.z);scene.add(m);
      const cap=new THREE.Mesh(new THREE.ConeGeometry(p.r*.48,p.h*.42,7,1),snow);cap.position.set(p.x,p.h*.78,p.z);scene.add(cap);
    }
    const routePoints=[];
    for(let i=0;i<=120;i++){const t=i/120,v=-14+28*t,x=Math.sin(t*Math.PI*2.7)*3.35+Math.sin(t*Math.PI*5)*.65,z=-v;routePoints.push(new THREE.Vector3(x,heightAt(x,v)+.18,z));}
    const routeCurve=new THREE.CatmullRomCurve3(routePoints);
    const trail=new THREE.Mesh(new THREE.TubeGeometry(routeCurve,150,.22,7,false),pathMat);scene.add(trail);
    // Pine trees and scattered rocks are generated deterministically, without external assets.
    for(let i=0;i<58;i++){
      const v=-13+(i*7.31)%26,x=Math.sin(i*12.989)*10.2;
      const nearest=Math.abs(x-(Math.sin(((v+14)/28)*Math.PI*2.7)*3.35+Math.sin(((v+14)/28)*Math.PI*5)*.65));
      if(nearest<1.65)continue;
      const y=heightAt(x,v),scale=.55+(i%4)*.16;
      const tree=new THREE.Group();tree.position.set(x,y,-v);tree.scale.setScalar(scale);
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.09,.14,1,5),trunk);stem.position.y=.48;tree.add(stem);
      for(let j=0;j<3;j++){const crown=new THREE.Mesh(new THREE.ConeGeometry(.55-j*.1,.95,6),j%2?pine2:pine1);crown.position.y=.95+j*.43;tree.add(crown);}
      scene.add(tree);
    }
    for(let i=0;i<38;i++){
      const v=-13+(i*5.17)%26,x=Math.cos(i*7.7)*11.4,y=heightAt(x,v);
      const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.16+(i%3)*.08,0),rock);
      stone.position.set(x,y+.12,-v);stone.rotation.set(i*.3,i*.7,i*.2);scene.add(stone);
    }
    // Small stylized hiker: simple geometry keeps the scene light.
    const avatar=new THREE.Group();
    const jacket=mat(0x315d49),skin=mat(0xf0c9a2),dark=mat(0x35434a),pack=mat(0xc18b4d);
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.22,.28,.62,7),jacket);body.position.y=.72;avatar.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.19,8,6),skin);head.position.y=1.18;avatar.add(head);
    const hair=new THREE.Mesh(new THREE.SphereGeometry(.195,8,5,0,Math.PI*2,0,Math.PI*.55),dark);hair.position.y=1.23;avatar.add(hair);
    const bag=new THREE.Mesh(new THREE.BoxGeometry(.28,.34,.16),pack);bag.position.set(0,.79,-.23);avatar.add(bag);
    const legGeo=new THREE.CylinderGeometry(.075,.09,.38,6);
    for(const side of [-1,1]){const leg=new THREE.Mesh(legGeo,dark);leg.position.set(side*.12,.24,0);avatar.add(leg);}
    const marker=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),mat(0xffd77a));marker.position.y=1.55;avatar.add(marker);
    scene.add(avatar);
    const milestones=[];
    for(let i=1;i<=4;i++){const t=i/5,p=routeCurve.getPointAt(t);const orb=new THREE.Mesh(new THREE.SphereGeometry(.24,9,7),new THREE.MeshStandardMaterial({color:0xffe5a1,emissive:0x80602a,emissiveIntensity:.28,roughness:.6}));orb.position.copy(p);orb.position.y+=.35;scene.add(orb);milestones.push(orb);}
    const appState=window.getAppState?window.getAppState():{};
    const words=window.getAllWordsCount?window.getAllWordsCount():(Array.isArray(appState.custom)?appState.custom.length+25:25);
    const cards=appState.cards||{};
    const learned=Object.values(cards).filter(c=>c&&c.seen).length;
    const t=Math.max(.015,Math.min(.985,learned/Math.max(1,words)));
    const point=routeCurve.getPointAt(t),tangent=routeCurve.getTangentAt(t);
    avatar.position.copy(point);avatar.position.y+=.04;avatar.rotation.y=Math.atan2(tangent.x,tangent.z);
    if(loading)loading.style.display='none';
    let raf=0,disposed=false,resizeObserver=null;
    const start=performance.now();
    function resize(){if(!canvas.isConnected)return;const w=host.clientWidth,h=host.clientHeight||460;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);}else window.addEventListener('resize',resize);
    function animate(now){
      if(disposed)return;
      if(!canvas.isConnected){cleanup();return;}
      const elapsed=(now-start)/1000;
      avatar.position.y=point.y+.04+Math.sin(elapsed*2.3)*.045;
      avatar.rotation.z=Math.sin(elapsed*1.8)*.025;
      marker.position.y=1.55+Math.sin(elapsed*2.3)*.07;
      renderer.render(scene,camera);
      raf=requestAnimationFrame(animate);
    }
    function cleanup(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);if(resizeObserver)resizeObserver.disconnect();else window.removeEventListener('resize',resize);renderer.dispose();terrainGeo.dispose();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});}
    activeCleanup=cleanup;
    raf=requestAnimationFrame(animate);
  }catch(error){
    console.error('3D explore world:',error);
    if(loading){loading.style.display='grid';loading.textContent='3D 场景暂时无法加载，请检查网络后重新打开。';}
  }
}
window.mountExploreWorld=mountExploreWorld;
