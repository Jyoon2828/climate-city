/* A small orthographic mesh renderer. All views, picking and exports share these world coordinates. */
const CityEngine = (() => {
  const rgbCache = new Map();
  function rgb(hex){
    if (!rgbCache.has(hex)) {
      const n=parseInt(hex.slice(1),16);
      rgbCache.set(hex,[n>>16,(n>>8)&255,n&255].map(v=>v/255));
    }
    return rgbCache.get(hex);
  }
  const unit=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
  const sun=unit([-.65,1.45,.65]);
  class Mesh {
    constructor(){this.coords=[];this.color=[];this.light=[];this.surface=[];this.ids=[];this.owner=-1;}
    tri(a,b,c,color,mat=0){
      const u=b.map((v,j)=>v-a[j]),v=c.map((n,j)=>n-a[j]);
      const n=unit([u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]);
      const dot=Math.max(0,n.reduce((s,d,i)=>s+d*sun[i],0));
      const shade= .76+.11*Math.max(0,n[1])+.16*dot+.035*n[0];
      const col=rgb(color);
      this.coords.push(...a,...b,...c);this.ids.push(this.owner);
      for(let i=0;i<3;i++){this.color.push(...col);this.light.push(shade);this.surface.push(mat);}
    }
    quad(a,b,c,d,col,m=0){this.tri(a,b,c,col,m);this.tri(a,c,d,col,m);}
    box(x,y,z,w,h,d,col,top=col,mat=0){
      const X=x+w,Y=y+h,Z=z+d;
      this.quad([x,Y,z],[x,Y,Z],[X,Y,Z],[X,Y,z],top,mat);
      this.quad([x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z],col,mat);
      this.quad([X,y,z],[x,y,z],[x,Y,z],[X,Y,z],col,mat);
      this.quad([x,y,z],[x,y,Z],[x,Y,Z],[x,Y,z],col,mat);
      this.quad([X,y,Z],[X,y,z],[X,Y,z],[X,Y,Z],col,mat);
    }
    ring(x,y,z,rx,rz,topRadius,ht,color,cap=color,sides=8,turn=0){
      const a=[],b=[];
      for(let i=0;i<sides;i++){
        const t=i*2*Math.PI/sides+turn,dx=rx*Math.cos(t),dz=rz*Math.sin(t);
        a.push([x+dx,y,z+dz]);b.push([x+dx*topRadius,y+ht,z+dz*topRadius]);
      }
      for(let i=0;i<sides;i++){
        const j=(i+1)%sides;this.quad(a[j],a[i],b[i],b[j],color);
        if(topRadius)this.tri(b[j],b[i],[x,y+ht,z],cap);
      }
    }
    finish(){this.coords=new Float32Array(this.coords);this.color=new Float32Array(this.color);this.light=new Float32Array(this.light);this.surface=new Float32Array(this.surface);this.ids=new Int16Array(this.ids);return this;}
  }
  function basis(camera,w,h){
    const {yaw,pitch}=camera, cs=Math.cos(yaw),sn=Math.sin(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
    const scale=Math.min(w/(camera.span||13.1), h/(camera.vertical||9.45))*(camera.zoom||1);
    return {r:[cs,0,-sn],u:[-sn*sp,cp,-cs*sp],v:[sn*cp,sp,cs*cp],c:camera.center||[4.45,.45,4.5],sx:2*scale/w,sy:2*scale/h,scale,w,h};
  }
  function project(x,y,z,b) {
    x-=b.c[0];y-=b.c[1];z-=b.c[2];
    return [b.w/2+b.scale*(x*b.r[0]+z*b.r[2]),b.h/2-b.scale*(x*b.u[0]+y*b.u[1]+z*b.u[2]),x*b.v[0]+y*b.v[1]+z*b.v[2]];
  }
  const drawable=document.createElement('canvas');
  let gl=null, program, shadowProgram, shadowMap, shadowBuffer, vertexBuffer, gpuMesh, gpuShadow;
  const shadowSize=1024;
  const vSource=`
    attribute vec3 position,color; attribute float light,material;
    uniform vec3 center,right,up,view;
    uniform vec2 scale;
    varying vec3 base,world;
    varying float kind;
    void main(){vec3 v=position-center;
      gl_Position=vec4(dot(v,right)*scale.x,dot(v,up)*scale.y,-dot(v,view)/128.,1.);
      world=position;base=color*light;kind=material;
    }`;
  const lightSource=`
    vec3 lightCoords(vec3 world){
      vec3 p=world-vec3(4.5,.65,4.5);
      return vec3(dot(p,vec3(.707107,0.,.707107))/9.8,
        dot(p,vec3(.596,.535,-.596))/9.8,
        -dot(p,vec3(-.378,.845,.378))/18.);
    }`;
  const frag=`
    precision highp float;
    varying vec3 base,world;varying float kind;
    uniform sampler2D shadeMap;uniform float shadows;
    `+lightSource+`
    float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    float compareDepth(vec2 uv,float d){return step(d,texture2D(shadeMap,uv).r);}
    void main(){
      vec3 color=base;
      if(kind>.5 && kind<1.5){
        vec2 p=world.xz;
        float coast=clamp((8.-length(p-vec2(4.,4.)))/5.,0.,1.);
        color=mix(vec3(.222,.542,.652),vec3(.37,.72,.74),coast);
        float ripple=sin(p.y*45.+3.*sin(p.x*5.+p.y*.7))*.5+.5;
        color+=.055*smoothstep(.94,1.,ripple)*smoothstep(.3,.9,sin(p.x*9.-p.y*5.)*.5+.5);
      } else if(kind>1.5 && kind<2.5) {
        color+=.019*(hash(floor(world.xz*67.))-.5);
      }
      vec3 lp=lightCoords(world)*.5+.5;
      if(shadows>.5 && all(greaterThan(lp.xy,vec2(.001))) && all(lessThan(lp.xy,vec2(.999)))){
        float d=lp.z-.0037;
        float vis=(compareDepth(lp.xy+vec2(-.0008,-.0008),d)+compareDepth(lp.xy+vec2(.0008,-.0008),d)+compareDepth(lp.xy+vec2(-.0008,.0008),d)+compareDepth(lp.xy+vec2(.0008,.0008),d))*.25;
        color*=mix(vec3(.72,.78,.83),vec3(1.),vis);
      }
      gl_FragColor=vec4(color,1.);
    }`;
  function buildProgram(vs,fs){
    const p=gl.createProgram();
    for(const [t,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
      const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
      gl.attachShader(p,s);gl.deleteShader(s);
    }
    gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
  }
  try{
    gl=drawable.getContext('webgl',{antialias:true,preserveDrawingBuffer:true,alpha:false});
    if(gl){
      program=buildProgram(vSource,frag);
      shadowProgram=buildProgram('attribute vec3 position;'+lightSource+'void main(){gl_Position=vec4(lightCoords(position),1.);}', 'precision highp float; void main(){gl_FragColor=vec4(vec3(gl_FragCoord.z),1.);}');
      vertexBuffer=gl.createBuffer();shadowMap=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,shadowMap);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,shadowSize,shadowSize,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      for(const t of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,t,gl.NEAREST);
      for(const t of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,t,gl.CLAMP_TO_EDGE);
      shadowBuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shadowBuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,shadowMap,0);
      const depth=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,shadowSize,shadowSize);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    }
  }catch(e){console.warn('Software 3D renderer',e);gl=null;}
  drawable.addEventListener('webglcontextlost',e=>{e.preventDefault();gl=null;});
  function attributes(p){
    for(const [name,n,off] of [['position',3,0],['color',3,12],['light',1,24],['material',1,28]]){
      const a=gl.getAttribLocation(p,name);if(a>=0){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,n,gl.FLOAT,false,32,off);}
    }
  }
  function gpu(mesh,b,icon){
    const {w,h}=b;
    if(drawable.width!==w)drawable.width=w;if(drawable.height!==h)drawable.height=h;
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);
    if(gpuMesh!==mesh){
      if(!mesh.interleaved){
        const packed=new Float32Array(mesh.light.length*8);
        for(let i=0;i<mesh.light.length;i++){
          const j=i*8,k=i*3;packed[j]=mesh.coords[k];packed[j+1]=mesh.coords[k+1];packed[j+2]=mesh.coords[k+2];
          packed[j+3]=mesh.color[k];packed[j+4]=mesh.color[k+1];packed[j+5]=mesh.color[k+2];packed[j+6]=mesh.light[i];packed[j+7]=mesh.surface[i];
        }
        mesh.interleaved=packed;
      }
      gl.bufferData(gl.ARRAY_BUFFER,mesh.interleaved,gl.STATIC_DRAW);gpuMesh=mesh;
    }
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    if(!icon && gpuShadow!==mesh){
      gl.bindFramebuffer(gl.FRAMEBUFFER,shadowBuffer);gl.viewport(0,0,shadowSize,shadowSize);
      gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(shadowProgram);attributes(shadowProgram);gl.drawArrays(gl.TRIANGLES,0,mesh.light.length);gpuShadow=mesh;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
    if(icon)gl.clearColor(.93,.95,.925,1);else gl.clearColor(.38,.66,.73,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);attributes(program);
    for(const [key,v] of [['center',b.c],['right',b.r],['up',b.u],['view',b.v]])gl.uniform3fv(gl.getUniformLocation(program,key),v);
    gl.uniform2f(gl.getUniformLocation(program,'scale'),b.sx,b.sy);gl.uniform1f(gl.getUniformLocation(program,'shadows'),icon?0:1);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,shadowMap);gl.uniform1i(gl.getUniformLocation(program,'shadeMap'),0);
    gl.drawArrays(gl.TRIANGLES,0,mesh.light.length);return drawable;
  }
  const scratch=document.createElement('canvas'), mapSize=384;
  function shadowsFor(mesh){
    if(mesh.shadowPixels)return mesh.shadowPixels;
    const depths=new Float32Array(mapSize*mapSize).fill(-1000),p=mesh.coords;
    const lx=[],ly=[],lz=[];
    for(let t=0;t<mesh.ids.length;t++){
      for(let k=0;k<3;k++){
        const j=t*9+k*3,x=p[j]-4.5,y=p[j+1]-.65,z=p[j+2]-4.5;
        lx[k]=(.5+(x+z)*.707107/19.6)*mapSize;
        ly[k]=(.5+(x*.596+y*.535-z*.596)/19.6)*mapSize;
        lz[k]=-x*.378+y*.845+z*.378;
      }
      const ux=lx[1]-lx[0],uy=ly[1]-ly[0],vx=lx[2]-lx[0],vy=ly[2]-ly[0],det=ux*vy-uy*vx;
      if(Math.abs(det)<.0001)continue;
      const x0=Math.max(0,Math.floor(Math.min(...lx))),x1=Math.min(mapSize-1,Math.ceil(Math.max(...lx)));
      const y0=Math.max(0,Math.floor(Math.min(...ly))),y1=Math.min(mapSize-1,Math.ceil(Math.max(...ly)));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        const dx=x+.5-lx[0],dy=y+.5-ly[0],u=(dx*vy-dy*vx)/det,v=(ux*dy-uy*dx)/det;
        if(u<0||v<0||u+v>1)continue;
        const d=lz[0]+u*(lz[1]-lz[0])+v*(lz[2]-lz[0]),i=y*mapSize+x;
        if(d>depths[i])depths[i]=d;
      }
    }
    mesh.shadowPixels=depths;return depths;
  }
  function software(mesh,camera,target,icon){
    const ratio=Math.min(1,1120/target.width),w=Math.round(target.width*ratio),h=Math.round(target.height*ratio);
    if(scratch.width!==w)scratch.width=w;if(scratch.height!==h)scratch.height=h;
    const ctx=scratch.getContext('2d'),img=ctx.createImageData(w,h),pixels=new Uint32Array(img.data.buffer),depths=new Float32Array(w*h).fill(-Infinity);
    pixels.fill(icon?0xffecf1ed:0xffab9766);
    const b=basis(camera,w,h),p=mesh.coords,shadows=icon?null:shadowsFor(mesh);
    const pack=(r,g,b)=> (255<<24)|(Math.min(255,b)<<16)|(Math.min(255,g)<<8)|Math.min(255,r);
    const waters=Array.from({length:64},(_,i)=>{const t=i/63;return pack(47+63*t,126+59*t,156+35*t);});
    const X=new Float64Array(3),Y=new Float64Array(3),Z=new Float64Array(3);
    for(let t=0;t<mesh.ids.length;t++){
      const j=t*9;
      for(let k=0;k<3;k++){
        const at=j+k*3,x=p[at]-b.c[0],y=p[at+1]-b.c[1],z=p[at+2]-b.c[2];
        X[k]=w/2+b.scale*(x*b.r[0]+z*b.r[2]);Y[k]=h/2-b.scale*(x*b.u[0]+y*b.u[1]+z*b.u[2]);Z[k]=x*b.v[0]+y*b.v[1]+z*b.v[2];
      }
      const ux=X[1]-X[0],uy=Y[1]-Y[0],vx=X[2]-X[0],vy=Y[2]-Y[0],det=ux*vy-uy*vx;
      if(Math.abs(det)<.001)continue;
      const minX=Math.max(0,Math.floor(Math.min(X[0],X[1],X[2]))),maxX=Math.min(w-1,Math.ceil(Math.max(X[0],X[1],X[2]))),minY=Math.max(0,Math.floor(Math.min(Y[0],Y[1],Y[2]))),maxY=Math.min(h-1,Math.ceil(Math.max(Y[0],Y[1],Y[2])));
      const mul=mesh.light[t*3]*255,col=mesh.color,red=col[j]*mul,green=col[j+1]*mul,blue=col[j+2]*mul;
      const lit=pack(red,green,blue),shade=pack(red*.69,green*.75,blue*.80);
      const ax=p[j],ay=p[j+1],az=p[j+2],dx1=p[j+3]-ax,dy1=p[j+4]-ay,dz1=p[j+5]-az,dx2=p[j+6]-ax,dy2=p[j+7]-ay,dz2=p[j+8]-az;
      const water=mesh.surface[t*3]===1,invu=vy/det,invv=-uy/det;
      for(let y=minY;y<=maxY;y++){
        const dy=y+.5-Y[0],dx=minX+.5-X[0];
        let u=(dx*vy-dy*vx)/det,v=(ux*dy-uy*dx)/det;
        for(let x=minX;x<=maxX;x++,u+=invu,v+=invv){
          if(u<0||v<0||u+v>1)continue;
          const i=y*w+x,d=Z[0]+u*(Z[1]-Z[0])+v*(Z[2]-Z[0]);
          if(d<depths[i])continue;
          const wx=ax+u*dx1+v*dx2,wy=ay+u*dy1+v*dy2,wz=az+u*dz1+v*dz2;
          let pixel=lit;
          if(water){
            const coast=Math.max(0,Math.min(1,1.12-Math.sqrt((wx-4.4)*(wx-4.4)*.011025+(wz-4.5)*(wz-4.5)*.011664)+.10));
            pixel=waters[Math.min(63,Math.floor((coast*.96+.03)*63))];
          }
          if(shadows){
            const sx=((.5+(wx+wz-9)*.707107/19.6)*mapSize)|0;
            const sy=((.5+((wx-wz)*.596+(wy-.65)*.535)/19.6)*mapSize)|0;
            const sd=(-wx+wz)*.378+(wy-.65)*.845;
            if(sx>=0&&sx<mapSize&&sy>=0&&sy<mapSize&&shadows[sy*mapSize+sx]>sd+.075){
              pixel=water?pack((pixel&255)*.75,((pixel>>8)&255)*.8,((pixel>>16)&255)*.83):shade;
            }
          }
          depths[i]=d;pixels[i]=pixel;
        }
      }
    }
    ctx.putImageData(img,0,0);return scratch;
  }
  function draw(target,mesh,cam,icon=false){
    const b=basis(cam,target.width,target.height);
    const src=gl?gpu(mesh,b,icon):software(mesh,cam,target,icon);
    target.getContext('2d').drawImage(src,0,0,target.width,target.height);return b;
  }
  function pick(mesh,b,x,y){
    let answer=-1,nearest=-Infinity;const p=mesh.coords;
    for(let i=0;i<mesh.ids.length;i++){
      const j=i*9, A=project(p[j],p[j+1],p[j+2],b),B=project(p[j+3],p[j+4],p[j+5],b),C=project(p[j+6],p[j+7],p[j+8],b);
      const ux=B[0]-A[0],uy=B[1]-A[1],vx=C[0]-A[0],vy=C[1]-A[1],det=ux*vy-uy*vx;
      if(Math.abs(det)<.0001)continue;
      const dx=x-A[0],dy=y-A[1],u=(dx*vy-dy*vx)/det,v=(ux*dy-uy*dx)/det;
      if(u<0||v<0||u+v>1)continue;
      const d=A[2]+u*(B[2]-A[2])+v*(C[2]-A[2]);
      if(d>=nearest){nearest=d;answer=mesh.ids[i];}
    }
    return answer;
  }
  return {Mesh, draw, pick, project};
})();
