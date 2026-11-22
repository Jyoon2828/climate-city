/* Coastal neighbourhood models. x and z are map coordinates; y is height. */
const CoastalCity = (() => {
  const size=Landscape.size;
  const roadTypes=new Set(['road','raised','permeable']);
  const ground=Landscape.bands.map(b=>b.face);
  const lawns=[['#e8bd79','#e5b571','#edc583'],['#bdcd8e','#b6c886','#bccc8b'],['#689879','#729e80','#639476']];
  const groundHeight=Landscape.ground;
  const seed=(n)=>{const x=Math.sin(n*237.7+.82)*43758.5453;return x-Math.floor(x);};
  const worldCache=[];
  function crown(m,x,y,z,r,seedN=0){
    const leaf=['#689451','#527c53','#70965a','#87a353'][seedN%4],top=['#8fac63','#759963','#91ab6a','#aab966'][seedN%4];
    m.ring(x,y,z,r*.16,r*.15,.7,r*1.45,'#795f49','#927253',6);
    m.ring(x,y+r*.94,z,r*.54,r*.52,1.75,r*.52,leaf,leaf,8,.22);
    m.ring(x,y+r*1.46,z,r*.945,r*.91,.81,r*.87,leaf,top,8,.22);
    m.ring(x,y+r*2.33,z,r*.77,r*.74,.36,r*.47,top,top,8,.22);
  }
  function pine(m,x,y,z,r){
    m.ring(x,y,z,r*.18,r*.18,.85,r*.8,'#745d44');
    for(let i=0;i<3;i++)m.ring(x,y+r*(.48+i*.55),z,r*(1-i*.20),r*(1-i*.20),0,r*(1.7-i*.19),['#466f5c','#548464','#65936e'][i],undefined,7,.1);
  }
  function pillar(m,x,y,z,h,r,col){m.ring(x,y,z,r,r,.96,h,col,col,8);}
  function ledge(m,x,y,z,w,d,col='#d9d1bb',t=.032){m.box(x-.014,y,z-.014,w+.028,t,d+.028,col);}
  function roof(m,x,y,z,w,d,h,col){
    const a=[x,y,z],b=[x+w,y,z],c=[x+w,y,z+d],e=[x,y,z+d],f=[x+.13*w,y+h,z+d/2],g=[x+w*.87,y+h,z+d/2];
    m.quad(a,f,g,b,col);m.quad(e,c,g,f,col);m.tri(a,e,f,col);m.tri(b,g,c,col);
  }
  function terrace(m,x,y,z,w,d){
    m.box(x,y,z,w,.038,d,'#d7cfb8','#9fa6a0');
    const Y=y+.038;
    m.box(x,Y,z,w,.035,.018,'#dbd6bf');m.box(x,Y,z+d-.018,w,.035,.018,'#dbd6bf');
    m.box(x,Y,z,.018,.035,d,'#dbd6bf');m.box(x+w-.018,Y,z,.018,.035,d,'#dbd6bf');
  }
  function ac(m,x,y,z,s=.13){m.box(x,y,z,s,.07,s*.77,'#8d9994','#b9c2b7');m.box(x+.02,y+.071,z+.012,s*.67,.004,s*.43,'#647979');}
  function facePanel(m,x,y,z,w,d,side,offset,height,width,tall,col,pr=.007){
    if(pr<=.015){
      const Y=y+height,T=Y+tall;
      if(side===0){const l=x+offset,r=l+width,f=z+d+pr;m.quad([l,Y,f],[r,Y,f],[r,T,f],[l,T,f],col);}
      else if(side===1){const r=x+w-offset,l=r-width,f=z-pr;m.quad([r,Y,f],[l,Y,f],[l,T,f],[r,T,f],col);}
      else if(side===2){const l=z+offset,r=l+width,f=x-pr;m.quad([f,Y,l],[f,Y,r],[f,T,r],[f,T,l],col);}
      else {const r=z+d-offset,l=r-width,f=x+w+pr;m.quad([f,Y,r],[f,Y,l],[f,T,l],[f,T,r],col);}
      return;
    }
    if(side===0)m.box(x+offset,y+height,z+d,width,tall,pr,col);
    if(side===1)m.box(x+w-offset-width,y+height,z-pr,width,tall,pr,col);
    if(side===2)m.box(x-pr,y+height,z+offset,pr,tall,width,col);
    if(side===3)m.box(x+w,y+height,z+d-offset-width,pr,tall,width,col);
  }
  function windows(m,x,y,z,w,d,levels,cols,stepY,style){
    for(let side=0;side<4;side++){
      const span=side<2?w:d,count=side<2?cols:Math.max(2,Math.round(cols*d/w));
      for(let row=0;row<levels;row++)for(let c=0;c<count;c++){
        const unit=span/count,ww=unit*(style==='glass'?.84:.59),off=unit*(c+.5)-ww/2,h=.091+row*stepY;
        const glass=['#54838a','#6a9da4','#477783','#80a9aa','#5a8691'][(row*5+c*7+side*3+row*c)%5];
        facePanel(m,x,y,z,w,d,side,off,h,ww,stepY*.57,glass);
        if(style==='balcony'&&(c+row+side)%3!==1){
          facePanel(m,x,y,z,w,d,side,off-.018,h-.016,ww+.035,.021,'#e5d7bb',.045);
          facePanel(m,x,y,z,w,d,side,off-.01,h+.008,ww+.02,.036,'#a8b8ac',.047);
        }
      }
    }
  }
  function entry(m,x,y,z,w,d){
    m.box(x+w*.38,y,z+d,.24*w,.20,.012,'#375963');
    m.box(x+w*.28,y+.215,z+d-.005,w*.45,.028,.095,'#ddd9c4');
    m.box(x+w*.3,y,z+d+.02,w*.42,.025,.10,'#d6cbb0');
  }
  function civic(m,type,x,y,z){
    const school=type==='school',w=school?.81:.66,d=school?.41:.55,xx=x+(1-w)/2,zz=z+.23;
    const floors=school?2:3, step=.215, ht=floors*step+.06;
    m.box(x+.06,y,z+.10,.88,.025,.80,'#bdc1b2','#d5d3bb');y+=.025;
    m.box(xx,y,zz,w,ht,d,school?'#d1aa79':'#dde2d7');
    windows(m,xx,y,zz,w,d,floors,school?5:4,step,'regular');
    for(let i=1;i<floors;i++)ledge(m,xx,y+i*step,zz,w,d,school?'#be946a':'#61a6ab',.022);
    if(school){
      roof(m,xx-.024,y+ht,zz-.024,w+.048,d+.048,.115,'#527286');
      m.box(x+.42,y,z+.52,.215,ht+.18,.21,'#d8ba8d');
      m.box(x+.40,y+ht+.16,z+.50,.255,.04,.25,'#e9d7b0');
      roof(m,x+.39,y+ht+.20,z+.49,.28,.27,.09,'#46687a');
      m.box(x+.47,y+ht+.04,z+.733,.1,.10,.008,'#f0e9c9');
      m.box(x+.516,y+ht+.075,z+.742,.009,.044,.005,'#3c5660');
      m.box(x+.52,y+ht+.075,z+.742,.028,.009,.005,'#3c5660');
      m.box(x+.47,y,z+.732,.115,.18,.012,'#405e63');
      m.box(x+.10,y+.002,z+.76,.22,.014,.085,'#91a979');
      pillar(m,x+.86,y,z+.78,.54,.009,'#cbcfbc');m.box(x+.86,y+.43,z+.78,.13,.10,.008,'#eeb24e');
    } else {
      terrace(m,xx-.015,y+ht,zz-.015,w+.03,d+.03);ac(m,x+.30,y+ht+.039,z+.36);
      m.box(x+.56,y+ht+.038,z+.40,.16,.06,.14,'#8ba2a0');
      for(const side of [0,1,2,3]){
        const span=side<2?w:d,off=span/2-.082;
        facePanel(m,xx,y,zz,w,d,side,off,ht-.16,.164,.068,'#e17861',.014);
        facePanel(m,xx,y,zz,w,d,side,off+.049,ht-.21,.066,.17,'#e17861',.015);
      }
      entry(m,xx,y,zz,w,d);
    }
  }
  function house(m,x,y,z,n){
    const w=.49,d=.48,xx=x+.26,zz=z+.28;
    m.box(x+.10,y,z+.1,.80,.020,.80,'#99af7b');y+=.02;
    m.box(xx,y,zz,w,.34,d,'#e1c6a0');windows(m,xx,y,zz,w,d,1,3,.20,'regular');
    const colors=['#b76851','#788995','#b9815b','#aa6253'];
    roof(m,xx-.035,y+.34,zz-.035,w+.07,d+.07,.21,colors[n%4]);
    m.box(xx+.32,y+.42,zz+.10,.065,.16,.075,'#b78e78');
    m.box(xx+.065,y,zz+d,.105,.18,.01,'#6b7264');
    m.box(xx+.02,y+.18,zz+d,.19,.025,.092,'#cbad88');
    m.box(xx+.06,y,zz+d+.005,.10,.011,.14,'#d0c4a9');
    for(let k=0;k<4;k++)m.box(x+.13+k*.037,y,z+.82,.027,.092,.027,'#e7d9b9');
    crown(m,x+.15,y,z+.29,.095,n%4);
  }
  function tower(m,type,x,y,z,n){
    const apt=type==='apartment',variant=Math.floor(seed(n+126)*4);
    const w=apt?.59:.49+variant*.035,d=apt?.47:.46,xx=x+(1-w)/2,zz=z+.23,step=apt?.173:.16;
    const floors=apt?4+variant:7+variant,ht=step*floors+.045;
    const body=apt?['#d5b398','#cba98b','#c79779','#d7c4a2'][variant]:['#7299a8','#a08e83','#578a98','#b49976'][variant];
    const trim=apt?'#e2d6be':['#bdccc5','#ddd0b9','#9bb4b6','#d4bd99'][variant];
    m.box(x+.08,y,z+.09,.84,.03,.82,'#bac1b0','#d5d3bd');y+=.03;
    m.box(xx-.071,y,zz-.055,w+.142,.24,d+.11,apt?'#c4997f':'#69898e');windows(m,xx-.071,y,zz-.055,w+.142,d+.11,1,5,.23,'glass');
    entry(m,xx-.071,y,zz-.055,w+.142,d+.11);
    ledge(m,xx-.075,y+.24,zz-.060,w+.15,d+.12);
    const Y=y+.26;
    m.box(xx,Y,zz,w,ht,d,body);
    windows(m,xx,Y,zz,w,d,floors,apt?3:4,step,apt?'balcony':'glass');
    for(let i=1;i<=floors;i++)ledge(m,xx,Y+i*step,zz,w,d,trim,apt?.026:.017);
    for(const dx of [0,w-.028])for(const dz of [0,d-.028])m.box(xx+dx,Y,zz+dz,.032,ht,.032,apt?'#c18e71':'#d0d1b8');
    terrace(m,xx-.018,Y+ht,zz-.018,w+.036,d+.036);
    const top=Y+ht+.038;
    m.box(xx+.10,top,zz+.09,w*.56,apt?.13:.21,d*.55,apt?'#c3b399':'#83a0a4');
    if(!apt && variant%2===1){
      m.box(xx+.065,top,zz+.055,w-.13,.27,d-.11,body);
      windows(m,xx+.065,top,zz+.055,w-.13,d-.11,1,3,.17,'glass');
      terrace(m,xx+.055,top+.27,zz+.05,w-.11,d-.10);
      m.ring(xx+w*.5,top+.31,zz+d*.5,.102,.10,.42,.22,'#728980','#aeb3a0',6);
    }
    else if(!apt){terrace(m,xx+.09,top+.21,zz+.08,w*.59,d*.59);pillar(m,xx+.24,top+.247,zz+.19,.27,.014,'#cbd1bd');}
    else{ac(m,xx+.35,top,zz+.34,.12);ac(m,xx+.17,top,zz+.34,.12);}
    crown(m,x+.13,y,z+.7,.078,n%4);
  }
  function shop(m,x,y,z,n){
    m.box(x+.07,y,z+.09,.86,.026,.82,'#ccbea9');y+=.026;
    m.box(x+.13,y,z+.25,.74,.355,.46,'#daaa7a');
    windows(m,x+.13,y,z+.25,.74,.46,1,4,.26,'regular');
    terrace(m,x+.105,y+.355,z+.23,.79,.50);
    for(let k=0;k<8;k++)m.box(x+.14+k*.09,y+.26,z+.69,.09,.03,.135,k%2?'#f3d6a2':(n%2?'#648b84':'#b86751'));
    entry(m,x+.13,y,z+.25,.74,.46);ac(m,x+.32,y+.395,z+.35);
  }
  function garden(m,x,y,z){
    m.box(x+.07,y,z+.07,.86,.055,.86,'#b5ab8e','#d7ccac');m.box(x+.11,y+.055,z+.11,.78,.011,.78,'#779675');
    m.ring(x+.42,y+.068,z+.55,.22,.19,.95,.009,'#82b6b1','#82b6b1',10);
    for(let k=0;k<15;k++){
      const dx=.17+seed(k+4)*.66,dz=.14+seed(k+43)*.69;
      if(Math.hypot(dx-.42,dz-.55)<.20)continue;
      m.ring(x+dx,y+.065,z+dz,.047,.044,.3,.10+seed(k)*.09,k%3?'#7e9a59':'#9ca860',undefined,5);
      if(k%3===0)m.ring(x+dx,y+.183,z+dz,.028,.028,.65,.028,'#d88a70',undefined,5);
    }
  }
  function bench(m,x,y,z){
    m.box(x,y+.055,z,.28,.033,.082,'#aa7e55');m.box(x,y+.075,z+.074,.28,.076,.017,'#bc9365');
    for(const a of [.035,.215])m.box(x+a,y,z+.016,.025,.058,.048,'#506568');
  }
  function shelter(m,x,y,z){
    m.box(x+.08,y,z+.09,.84,.045,.83,'#bbbeae','#d3cfb9');
    for(const dx of [.22,.76])for(const dz of [.24,.73])m.box(x+dx,y+.045,z+dz,.035,.40,.035,'#895f43');
    for(let k=0;k<8;k++)m.box(x+.12+k*.098,y+.45,z+.12,.083,.048,.77,'#bd8b59','#d5ac75');
    bench(m,x+.34,y+.045,z+.51);m.box(x+.16,y+.39,z+.16,.68,.043,.04,'#936d4e');
  }
  function lamp(m,x,y,z){
    pillar(m,x,y,z,.27,.012,'#667373');m.box(x-.009,y+.26,z-.012,.074,.015,.025,'#677579');m.box(x+.045,y+.253,z-.02,.038,.016,.038,'#ecd9a3');
  }
  function car(m,x,y,z,along,col){
    const part=(dx,h,dz,w,H,d,color)=>along?m.box(x+dx,y+h,z+dz,w,H,d,color):m.box(x+dz,y+h,z+dx,d,H,w,color);
    for(const dx of [.04,.18])for(const dz of [-.006,.095])part(dx,.005,dz,.04,.042,.019,'#344348');
    part(0,.028,0,.25,.046,.11,col);part(.045,.074,.012,.153,.039,.086,'#55737c');part(.067,.113,.013,.103,.010,.084,col);
    part(.231,.046,.015,.021,.018,.024,'#e9d9ab');
  }
  function street(m,x,y,z,type,links,n){
    const raised=type==='raised',pave=type==='permeable',h=raised?Landscape.deck:.045,Y=y+h;
    const asphalt=pave?'#84a299':raised?'#7f8e86':'#59676a', curb=raised?'#d0b78c':'#c9c8b2';
    const {N,S,W,E}=links;
    if(raised){for(const dx of [.18,.74])for(const dz of [.18,.74])m.box(x+dx,y,z+dz,.08,h-.055,.08,'#948879');}
    const start=raised?Y-.06:y;
    m.box(x+.09,start,z+.09,.82,Y-start,.82,curb);
    const strip=(dx,dz,w,d)=>m.box(x+dx,Y,z+dz,w,.009,d,asphalt);
    strip(.20,.20,.60,.60);
    if(N){m.box(x+.09,start,z,.82,Y-start,.21,curb);strip(.20,0,.60,.21);}
    if(S){m.box(x+.09,start,z+.79,.82,Y-start,.21,curb);strip(.20,.79,.60,.21);}
    if(W){m.box(x,start,z+.09,.21,Y-start,.82,curb);strip(0,.20,.21,.60);}
    if(E){m.box(x+.79,start,z+.09,.21,Y-start,.82,curb);strip(.79,.20,.21,.60);}
    const thin=(dx,dz,w,d,col)=>m.box(x+dx,Y+.011,z+dz,w,.004,d,col);
    for(const [on,dx,dz,w,d] of [[N,.493,0,.014,.17],[S,.493,.83,.014,.17],[W,0,.493,.17,.014],[E,.83,.493,.17,.014]])
      if(on)thin(dx,dz,w,d,pave?'#c0ceb3':'#dfc786');
    const count=[N,S,E,W].filter(Boolean).length;
    if(count>2){
      for(let k=0;k<6;k++){if(W)thin(.146,.24+k*.09,.075,.053,'#e1ded0');if(N)thin(.24+k*.09,.146,.053,.075,'#e1ded0');}
    }else if(!pave)thin(.46,.46,.073,.035,'#e5ca87');
    if(pave)for(let k=0;k<4;k++)thin(.24,.25+k*.13,.50,.009,'#b3c4b4');
    if(n%2===0)lamp(m,x+.13,Y,z+.14);
    if(count===2 && n%3===1){crown(m,x+.14,Y,z+.17,.076,n%4);crown(m,x+.84,Y,z+.82,.083,(n+1)%4);}
    if(n%5===0){
      pillar(m,x+.83,Y,z+.15,.072,.016,'#52757d');m.ring(x+.83,Y+.067,z+.15,.019,.019,.87,.031,'#d3ad85',undefined,6);
    }
    if(count===2&&!pave&&n%3!==1)car(m,x+.32,Y+.015,z+.32,!!(E||W),['#df9d55','#cf705e','#d7d8c2','#5e91a7'][n%4]);
  }
  function basin(m,x,y,z,stored){
    m.ring(x+.5,y,z+.5,.45,.42,.98,.035,'#a28b63','#cbbd94',12);
    m.ring(x+.5,y+.035,z+.5,.39,.36,.98,.014,'#7d9767','#a5ad78',12);
    const rx=stored?.35:.20,rz=stored?.31:.16;
    m.ring(x+.50,y+.049,z+.49,rx,rz,.99,stored?.038:.012,'#548f9b',stored?'#66bac8':'#8bb9b0',12);
    if(stored)m.box(x+.39,y+.088,z+.46,.17,.004,.014,'#c1e6df');
    for(let k=0;k<6;k++){
      const a=k*.35+.14,px=x+.5+.36*Math.cos(a),pz=z+.5+.34*Math.sin(a);
      m.ring(px,y+.04,pz,.025,.025,.24,.11,'#729244',undefined,5);
    }
    m.box(x+.12,y+.035,z+.25,.16,.045,.09,'#9b9b8b');
  }
  function seaWall(m,x,y,z,side){
    const along=side==='north'||side==='south';
    const px=x+(side==='east'?.88:0),pz=z+(side==='south'?.88:0);
    const w=along?1:.12,d=along?.12:1;
    m.box(px,y,pz,w,Landscape.wallHeight-.06,d,'#738483');
    m.box(px-.01,y+Landscape.wallHeight-.06,pz-.01,w+.02,.06,d+.02,'#cbb887','#dfc897');
    for(const at of [.12,.62]){
      m.box(px+(along?at:.01),y+.005,pz+(along?.01:at),along?.08:.13,Landscape.wallHeight-.10,along?.13:.08,'#a1a799');
    }
  }
  function models(m,type,x,y,z,n,links,stored=false){
    const invention=Inventions.catalog.get(type);
    if(invention)Inventions.draw(m,invention,x,y,z,stored,links);
    else if(type==='home')house(m,x,y,z,n);
    else if(type==='school'||type==='clinic')civic(m,type,x,y,z);
    else if(type==='tower'||type==='apartment')tower(m,type,x,y,z,n);
    else if(type==='shop')shop(m,x,y,z,n);
    else if(type==='tree'){
      m.ring(x+.50,y,z+.50,.33,.28,.94,.032,'#88a777','#91ad78',10);
      crown(m,x+.47,y+.032,z+.49,.235,n%4);crown(m,x+.76,y+.03,z+.28,.125,(n+1)%4);
    }
    else if(type==='shelter')shelter(m,x,y,z);
    else if(type==='garden')garden(m,x,y,z);
    else if(type==='basin')basin(m,x,y,z,stored);
    else if(type==='seawall')seaWall(m,x,y,z,'west');
    else if(roadTypes.has(type))street(m,x,y,z,type,links||{N:false,S:false,E:true,W:true},n);
  }
  function ferry(m,x,y,z){
    const pts=[[-.18,-.44],[0,-.57],[.18,-.44],[.18,.38],[.10,.49],[-.10,.49],[-.18,.38]];
    for(let i=0;i<pts.length;i++){
      const a=pts[i],b=pts[(i+1)%pts.length];
      m.quad([x+a[0]*.74,y,z+a[1]*.86],[x+b[0]*.74,y,z+b[1]*.86],[x+b[0],y+.13,z+b[1]],[x+a[0],y+.13,z+a[1]],'#315c70');
      m.tri([x,y+.13,z],[x+b[0],y+.13,z+b[1]],[x+a[0],y+.13,z+a[1]],'#d1c7a8');
    }
    m.box(x-.135,y+.13,z-.29,.27,.13,.59,'#e8dfc5');
    m.box(x-.139,y+.18,z-.25,.278,.06,.50,'#5a8a96');m.box(x-.14,y+.25,z-.30,.28,.026,.60,'#f0e2c7');
    m.box(x-.09,y+.278,z-.13,.18,.086,.30,'#d9decf');m.box(x-.052,y+.36,z+.03,.10,.08,.09,'#bd6e52');
  }
  function harbor(m,waterline){
    const sea=Landscape.seaLevels[0];
    m.owner=-1;
    const surface=(x0,z0,x1,z1)=>m.quad([x0,waterline,z0],[x0,waterline,z1],[x1,waterline,z1],[x1,waterline,z0],'#63abbb',1);
    if(waterline===sea)surface(-180,-180,180,180);
    else {
      // Keep the open sea outside the coastline, including when land behind a dike stays dry.
      surface(-180,-180,180,0);surface(-180,size,180,180);
      surface(-180,0,0,size);surface(size,0,180,size);
      Landscape.heights.forEach((level,i)=>{
        if(level<0){const x=i%size,z=Math.floor(i/size);surface(x,z,x+1,z+1);}
      });
    }
    // Outlying rocky islets and anchored buoys add depth around the editable coastline.
    for(const [x,z,r] of [[-1.45,7.95,.54],[-2.05,7.59,.20],[1.0,size+1.15,.28],[size+.97,1.39,.38],[1.15,-1.25,.43],[-1.19,8.70,.14]]){
      m.ring(x,sea-.02,z,r,r*.65,.81,.18,'#a5a38c','#a3ad85',8,.24);
      if(r>.35){m.ring(x,sea+.16,z,r*.78,r*.50,.66,.06,'#94a77e','#9aad82',8,.24);pine(m,x+.09,sea+.21,z,r*.27);}
    }
    const x=-.30,z=5.8;
    m.ring(x,sea-.04,z,.28,.27,.85,.22,'#919383','#c2c0a8',10);
    for(let i=0;i<4;i++)m.ring(x,sea+.18+i*.14,z,.13-i*.009,.13-i*.009,.94,.14,i%2?'#bb6954':'#f1e0bc',undefined,10);
    m.ring(x,sea+.74,z,.15,.15,.98,.044,'#435d64');m.ring(x,sea+.784,z,.099,.099,1,.13,'#d3c08e',undefined,8);
    m.ring(x,sea+.91,z,.14,.14,.16,.10,'#98564d',undefined,10);
    for(const [px,pz] of [[.99,3.07],[.99,3.6],[.99,4.13]]){
      m.box(px-.80,sea+.18,pz,.80,.052,.16,'#927b5d','#c4a77c');
      for(const dx of [-.72,-.25])m.box(px+dx,sea,pz+.05,.035,.255,.035,'#756a53');
    }
    ferry(m,-.09,waterline,3.67);ferry(m,-1.22,waterline,1.9);
    for(const [bx,bz] of [[-.7,6.9],[-1.5,4.7],[.1,.9]]){m.ring(bx,waterline,bz,.05,.05,.55,.10,'#e1a459');pillar(m,bx,waterline+.10,bz,.08,.011,'#e4d9ae');}
    // Short glints are fixed to the water and also appear in software rendering.
    for(let i=0;i<260;i++){
      const px=seed(i+90)*(size+11)-5,pz=seed(i+490)*(size+9)-4;
      if(px>.82&&px<size+.1&&pz>-.05&&pz<size+.05)continue;
      const w=.025+seed(i+870)*.15;
      m.quad([px,waterline+.005,pz],[px+w*.34,waterline+.005,pz+.009],[px+w,waterline+.005,pz+.013],[px+w*.71,waterline+.005,pz+.003],'#9ccbd0');
    }
  }
  function border(m,x,y,z,color){
    for(const off of [.02,.954]){
      m.box(x+.02,y,z+off,.955,.014,.025,color);
      m.box(x+off,y,z+.02,.025,.014,.955,color);
    }
  }
  function scene(board,terrain,result,selected=-1,heightOnly=false){
    const mode=result?result.mode+'-'+result.strength:'clear',key=mode+':'+selected+':'+heightOnly;
    const cached=worldCache.find(entry=>entry.board===board&&entry.key===key);
    if(cached)return cached.mesh;
    const m=new CityEngine.Mesh();harbor(m,Landscape.seaLevels[result?.mode==='sea'?result.strength:0]);
    const roadAt=(x,z)=> x>=0&&z>=0&&x<size&&z<size&&roadTypes.has(Inventions.role(board[z*size+x]));
    for(let i=0;i<terrain.length;i++){
      const x=i%size,z=Math.floor(i/size),level=terrain[i],type=board[i],Y=groundHeight(level),role=Inventions.role(type);
      if(level<0)continue;
      m.owner=i; const lawn=lawns[level][Math.floor(seed(i+31)*3)];
      const surface=result?.groundWater.get(i),wet=surface!==undefined,hot=result?.hot.has(i);
      m.box(x,-.27,z,1,Y+.231,1,ground[level],ground[level]);
      m.box(x,Y-.041,z,1,.041,1,ground[level],lawn,2);
      // Mark the change of elevation along its upper lip, including the vertical face.
      if(x>0&&terrain[i-1]>=0&&terrain[i-1]<level){
        m.box(x,Y-.12,z,.018,.044,1,level===2?'#ced9b0':'#eadba8');
        m.box(x+.012,Y+.002,z,.022,.008,1,level===2?'#e3e3bc':'#efe0aa');
      }
      if(heightOnly){
        m.box(x+.01,Y+.003,z+.01,.98,.005,.014,ground[level]);
        m.box(x+.01,Y+.003,z+.01,.014,.005,.98,ground[level]);
        continue;
      }
      if(!type){
        for(let k=0;k<3;k++){
          const px=x+.12+.72*seed(i*7+k),pz=z+.12+.71*seed(i*13+k+82);
          m.ring(px,Y+.001,pz,.028,.014,.35,.020,'#9db77b',undefined,4);
        }
        const rim=['#c49a65','#9faf75','#59896e'][level], y=Y+.002;
        m.quad([x,y,z],[x,y,z+1],[x+.016,y,z+1],[x+.016,y,z],rim);
        m.quad([x,y,z],[x,y,z+.016],[x+1,y,z+.016],[x+1,y,z],rim);
      }
      if(hot)m.box(x+.014,Y+.006,z+.014,.972,.008,.972,'#e3a167');
      const links={N:roadAt(x,z-1),S:roadAt(x,z+1),W:roadAt(x-1,z),E:roadAt(x+1,z)};
      models(m,type,x,Y+.012,z,i,links,result?.held.has(i));
      if(['school','clinic','shop','apartment','tower'].includes(type)){
        if(i%2){bench(m,x+.13,Y+.04,z+.14);crown(m,x+.81,Y+.025,z+.17,.09,i%4);}
        else {m.box(x+.105,Y+.028,z+.73,.08,.03,.13,'#b4a88b');crown(m,x+.145,Y+.058,z+.79,.087,i%4);}
      }
      for(const edge of Landscape.edges[i]){
        if(board.walls?.includes(edge.area))seaWall(m,x,Y,z,edge.side);
      }
      if(x===1||(x===2&&z<2)){
        m.box(x,Y+.003,z,.065,.012,1,'#d1c4a7');
        for(const zz of [.12,.58]){m.box(x+.016,Y+.01,z+zz,.024,.10,.024,'#7e8276');}
        m.box(x+.017,Y+.093,z,.017,.018,1,'#a7a798');
      }
      // Join neighbouring road surfaces across the small terrain terraces.
      if(roadTypes.has(role)){
        for(const [dx,dz] of [[1,0],[0,1]]){
          if(!roadAt(x+dx,z+dz))continue;
          const other=i+dx+dz*size,level2=groundHeight(terrain[other])+(Inventions.role(board[other])==='raised'?Landscape.deck:.045);
          const level1=Y+(role==='raised'?Landscape.deck:.045);
          if(Math.abs(level2-level1)<.01)continue;
          const a=level1+.023,b=level2+.023;
          if(dx)m.quad([x+.80,a,z+.2],[x+.80,a,z+.80],[x+1.2,b,z+.80],[x+1.2,b,z+.20],'#707a77');
          else m.quad([x+.2,a,z+.80],[x+.2,b,z+1.2],[x+.80,b,z+1.2],[x+.80,a,z+.8],'#707a77');
        }
      }
      if(wet){
        const depth=Math.max(.01,surface-Y-.011);
        m.box(x+.003,Y+.011,z+.003,.994,depth,.994,'#5199ae','#70b8c7');
        for(let k=0;k<3;k++)m.box(x+.14+k*.22,Y+depth+.013,z+.22+seed(i+k)*.49,.095,.003,.009,'#bfe1db');
      }else if(hot&&roadTypes.has(role))border(m,x,Y+.012+(role==='raised'?Landscape.deck:.045),z,'#ea9955');
      if(i===selected)border(m,x,Y+(wet?.63:.08),z,'#ffe597');
    }
    const out=m.finish();worldCache.unshift({board,key,mesh:out});worldCache.length=Math.min(worldCache.length,4);return out;
  }
  const icons=new Map();
  function icon(type){
    if(icons.has(type))return icons.get(type);
    const design=Inventions.catalog.get(type);
    if(design){
      const canvas=document.createElement('canvas');canvas.width=120;canvas.height=86;
      Inventions.preview(canvas,design);
      const url=canvas.toDataURL();icons.set(type,url);return url;
    }
    const m=new CityEngine.Mesh();
    m.box(.025,-.078,.025,.95,.078,.95,'#b6baa3','#a8ba8e');
    models(m,type==='move'?'school':type,0,.003,0,2);
    const out=document.createElement('canvas');out.width=120;out.height=86;
    const tall=type==='tower'||type==='apartment';
    const civicIcon=['clinic','school','move','seawall'].includes(type);
    CityEngine.draw(out,m.finish(),{yaw:-.53,pitch:.54,center:[.5,tall?(type==='tower'?.99:.64):(civicIcon?.43:.23),.5],span:tall?2.15:1.47,vertical:tall?(type==='tower'?2.55:1.67):(civicIcon?1.34:1.1)},true);
    const url=out.toDataURL();icons.set(type,url);return url;
  }
  return {scene,icon,groundHeight,addModel:models};
})();
