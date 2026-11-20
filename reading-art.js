'use strict';
/* Small cutaway models illustrating the reading, in the village's map style. */
const CaseArt = (() => {
  const grass='#adbf83', sand='#e1bf86', stone='#c6c7b6', water='#6eb8c6';
  function base(m,top=grass,depth=.16){
    m.box(0,-depth,0,3,depth,1.8,'#ab9579',top);
  }
  function model(m,kind,x,z,y=0,variant=2){
    CoastalCity.addModel(m,kind,x,y,z,variant);
  }
  function bench(m,x,z){
    for(const foot of [0,.36])m.box(x+foot,.012,z,.04,.08,.12,'#5c6963');
    m.box(x-.03,.092,z-.02,.47,.045,.17,'#b57748');
    m.box(x-.03,.15,z+.12,.47,.09,.035,'#bf8655');
  }
  function person(m,x,z,shirt){
    m.box(x-.037,.01,z-.034,.074,.13,.066,'#45596b');
    m.ring(x,.13,z,.083,.059,.74,.17,shirt);
    m.ring(x,.30,z,.055,.052,.86,.10,'#d6a17b');
    m.ring(x,.38,z,.056,.053,.76,.038,'#654d43');
  }
  function parasol(m){
    base(m,'#d2cebb');
    m.box(0,.001,.9,3,.018,.87,'#717b7d');
    for(let i=0;i<7;i++)m.box(1.22,.023,.95+i*.114,.48,.009,.065,'#ece7cc');
    for(const x of [.08,.47,2.05,2.65])m.box(x,.022,1.32,.23,.008,.018,'#edcd88');
    m.box(.16,.01,.09,1.25,.025,.72,'#c9be9f');
    m.ring(.83,.03,.50,.055,.055,.84,.91,'#51625d');
    const cx=.83,cz=.5;
    for(let j=0;j<10;j++){
      const at=i=>[cx+.71*Math.cos(i*Math.PI/5),.88,cz+.56*Math.sin(i*Math.PI/5)];
      m.tri(at(j+1),at(j),[cx,1.11,cz],j%2?'#397866':'#588c65');
    }
    m.box(1.81,.015,.71,.044,.77,.042,'#556460');
    m.box(1.75,.59,.70,.16,.29,.10,'#354e50');
    m.box(1.795,.76,.81,.064,.066,.012,'#f59475');
    person(m,.60,.51,'#d17958');person(m,.98,.64,'#52949f');model(m,'shop',1.99,-.20);
  }
  function pocket(m){
    base(m);m.box(0,.003,.95,3,.02,.65,'#dac6a4');
    model(m,'tree',.12,.10);model(m,'tree',1.3,-.06,0,1);model(m,'tree',2.13,.25,0,3);
    bench(m,.88,.81);bench(m,1.91,.85);person(m,1.42,1.26,'#bd6e52');
  }
  function wind(m){
    base(m);
    m.box(0,.006,.65,3,.015,.50,'#8bc6c6',water);
    for(const [x,z,variant] of [[.02,-.25,1],[.84,-.30,3],[.05,.96,0],[.86,.99,2],[1.55,.97,0]])model(m,'tree',x,z,.01,variant);
    model(m,'home',1.99,-.28);model(m,'shop',2.1,.96);
    // Pale ribbons follow the stream from the woods into the neighbourhood.
    for(const [x,z] of [[.36,.78],[1.22,.95],[2.12,.78]]){
      m.box(x,.065,z,.42,.015,.042,'#e6f9e7');
      m.tri([x+.38,.08,z-.08],[x+.60,.08,z+.02],[x+.38,.08,z+.13],'#e6f9e7');
    }
  }
  function schoolyard(m){
    base(m,'#d7b98b');model(m,'school',.05,-.09);model(m,'tree',1.04,-.14);model(m,'tree',2.05,-.09,0,3);
    m.ring(2.19,.015,1.28,.57,.33,.98,.025,'#a1b582');bench(m,1.69,.90);
    person(m,1.47,1.32,'#b76955');person(m,1.14,1.22,'#658a9c');
    for(let i=0;i<4;i++)m.box(.15+i*.19,.011,1.17,.13,.017,.21,'#d2a86e');
  }
  function tunnel(m){
    base(m,'#b6bd91',.69);
    model(m,'home',.12,-.05);model(m,'shop',1.78,-.08);
    m.box(0,.005,1.08,3,.025,.53,'#737d7e');
    for(let i=0;i<6;i++)m.box(.12+i*.50,.032,1.33,.22,.008,.027,'#e9cc79');
    m.box(.22,-.59,1.803,2.54,.40,.026,'#485a60');
    m.box(.28,-.55,1.834,2.42,.19,.016,'#69b5c5');
    for(const x of [.51,1.94]){
      m.box(x,-.23,1.807,.16,.25,.03,'#657c80');
      m.box(x+.05,-.25,1.842,.055,.27,.01,'#8ecad1');
      m.box(x-.03,.015,1.59,.23,.02,.19,'#455c60');
    }
  }
  function square(m){
    base(m,'#6aaebe');m.box(0,.005,0,3,.13,.37,stone);
    m.box(0,.005,.37,.35,.13,1.43,stone);m.box(2.67,.005,.37,.33,.13,1.43,stone);
    m.box(.35,.005,1.58,2.32,.13,.22,stone);
    for(let i=0;i<3;i++)m.box(.36,.01,.39+i*.12,2.28,.105-i*.031,.12,'#b8bbaf');
    m.box(.72,.007,.83,1.52,.008,.56,'#7fbdca');
    for(const x of [.52,2.42]){
      m.box(x,.01,1.08,.035,.51,.03,'#546b6c');m.box(x-.08,.45,1.06,.18,.13,.035,'#e2cf99');
    }
    model(m,'tree',1.93,-.38,.14);person(m,.19,1.22,'#d59758');
  }
  function coast(m,withDike){
    base(m,sand);m.box(0,.003,0,.79,.042,1.8,'#69aebc',water);
    for(let i=0;i<3;i++)m.box(.08+i*.17,.05,.2+i*.42,.027,.01,.35,'#b5d9d3');
    if(withDike){
      const section=[[.81,.005],[1.18,.29],[1.4,.39],[1.65,.35],[1.99,.008]];
      for(let i=1;i<section.length;i++){
        const [a,ya]=section[i-1],[b,yb]=section[i];
        m.quad([a,ya,0],[a,ya,1.8],[b,yb,1.8],[b,yb,0],i===3?'#b4b282':sand);
        m.quad([a,0,1.8],[b,0,1.8],[b,yb,1.8],[a,ya,1.8],'#d7af77');
      }
      m.quad([1.12,0,1.805],[1.76,0,1.805],[1.52,.27,1.805],[1.34,.27,1.805],'#687b79');
      model(m,'home',1.95,.29,.01);
    }else{
      m.box(1.24,.004,0,1.76,.20,1.8,'#ac916d','#c8be8b');
      m.box(1.78,.204,0,1.22,.25,1.8,'#998870',grass);
      model(m,'home',1.93,.53,.455);
      model(m,'tree',1.84,-.27,.455,3);
      for(let i=0;i<4;i++)m.box(1.12+i*.16,.015+i*.062,1.51,.19,.035,.16,'#dbc29a');
    }
  }
  const sketches={parasol,pocket,wind,schoolyard,tunnel,square,dune:m=>coast(m,true),relocate:m=>coast(m,false)};
  function draw(canvas,key){
    const m=new CityEngine.Mesh();sketches[key](m);
    CityEngine.draw(canvas,m.finish(),{yaw:-.53,pitch:.50,center:[1.50,key==='tunnel'?-.06:.24,.90],span:3.72,vertical:2.28},true);
  }
  return {draw};
})();
