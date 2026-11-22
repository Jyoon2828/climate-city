/* Student models are built from the same pieces in the workshop, map and exports. */
const Inventions=(()=>{
  const catalog=new Map();
  const colors={teal:'#328a83',sun:'#eab64e',coral:'#d87961',sky:'#688fc9',leaf:'#76a55d',plum:'#a074ae'};
  const forms={module:'전망대',umbrella:'파라솔',pavilion:'지붕 쉼터',tank:'물탱크',garden:'화단',bridge:'다리',blocks:'자유 조립'};
  const effects={none:'모양만 살펴보기',shelter:'주변에 그늘 만들기',basin:'빗물을 잠시 모으기',garden:'빗물이 땅에 스미게 하기',raised:'물 위로 길 높이기'};
  const notes={none:'지도에 놓고 모양과 위치를 살펴봐요.',shelter:'폭염 시험에서 이 칸과 상하좌우 한 칸에 그늘이 생겨요.',basin:'집중호우 시험에서 저류지처럼 이 칸과 이웃 칸의 빗물을 잠시 모아요.',garden:'집중호우 시험에서 빗물 정원처럼 물이 땅에 스며들어요.',raised:'높은 길과 같은 높이의 받침이 생겨요. 다른 길과 연결하면 물이 차도 길 위로 다닐 수 있어요.'};
  const shapes={box:'네모 블록',column:'원기둥',cone:'뾰족 지붕',dome:'둥근 지붕',plate:'납작한 판'};
  const has=(options,key)=>Object.hasOwn(options,key);
  function suggest(text){
    const shade=/그늘|차양|햇빛|폭염|더위|양산|파라솔|우산/.test(text);
    const store=/저류|저장|탱크|물통|수조|빗물통|물탑|모[으을아]|담[는아을]/.test(text);
    const absorb=/스며|스미|흡수|투수|정원|화단/.test(text);
    const bridge=/다리|육교|고가|높은\s*길|대피로/.test(text);
    let form='module';
    if(/우산|파라솔|양산/.test(text))form='umbrella';
    else if(bridge)form='bridge';
    else if(/정원|화단|텃밭/.test(text))form='garden';
    else if(store)form='tank';
    else if(shade||/지붕|쉼터|정류장/.test(text))form='pavilion';
    const effect=bridge?'raised':store?'basin':absorb?'garden':shade?'shelter':'none';
    return {form,effect};
  }
  function register(input){
    if(!input||typeof input.id!=='string'||!/^inv-[a-z0-9-]{1,90}$/.test(input.id)||(typeof input.name!=='string'||!input.name.trim()))return;
    const cleaned={id:input.id,name:input.name.trim().slice(0,24),idea:String(input.idea||'').slice(0,160),
      form:has(forms,input.form)?input.form:'blocks',color:has(colors,input.color)?input.color:'teal',effect:has(effects,input.effect)?input.effect:'none',
      blocks:(Array.isArray(input.blocks)?input.blocks:[]).filter(b=>b&&Number.isInteger(b.slot)&&b.slot>=0&&b.slot<9&&has(shapes,b.shape)&&has(colors,b.color)).slice(0,27)};
    catalog.set(cleaned.id,cleaned);return cleaned;
  }
  function role(type){return catalog.get(type)?.effect||type;}
  function draw(m,design,x,y,z,held=false,links={}){
    const color=colors[design.color],post='#836c55',edge='#e7d8b6',water=held?'#51b4c1':'#77a9b3';
    const box=(cx,cz,w,d,base,h,tint,top=tint)=>m.box(x+cx-w/2,y+base,z+cz-d/2,w,h,d,tint,top);
    const ring=(cx,cz,r,base,h,taper,tint,top=tint,n=12)=>m.ring(x+cx,y+base,z+cz,r,r,taper,h,tint,top,n);
    const elevated=design.effect==='raised', bridge=design.form==='bridge';
    let deck=0;
    if(elevated||bridge){
      deck=elevated?Landscape.deck:.24;
      for(const dx of [.17,.83])for(const dz of [.19,.81])box(dx,dz,.08,.08,0,deck-.04,post);
      box(.5,.5,.92,.86,deck-.055,.055,post,edge);
      if(elevated){
        for(const [key,cx,cz,w,d] of [['N',.5,.06,.58,.12],['S',.5,.94,.58,.12],['W',.04,.5,.08,.58],['E',.96,.5,.08,.58]]){
          if(links[key])box(cx,cz,w,d,deck-.05,.05,post,edge);
        }
      }
    }
    y+=deck;
    box(.5,.5,.86,.80,0,.035,'#b0a48c','#e6dbbb');
    let centerTop=.035;
    if(design.form==='module'){
      ring(.5,.5,.31,.035,.095,.87,post,edge,8);ring(.5,.5,.19,.13,.35,.84,color,edge,8);
      ring(.5,.5,.32,.48,.09,1,edge,color,8);ring(.5,.5,.13,.57,.12,.4,color,edge,8);
      centerTop=.69;
    }else if(design.form==='umbrella'){
      ring(.5,.5,.17,.035,.04,1,post);ring(.5,.5,.034,.075,.50,1,post);
      const collecting=design.effect==='basin',flower=/꽃|꽃잎/.test(design.name+' '+design.idea);
      const hub=collecting?.55:.81,canopy=collecting?.78:.56;
      const center=[x+.5,y+hub,z+.5],count=flower?8:12;
      const rim=(angle,radius,h)=>[x+.5+radius*Math.cos(angle),y+h,z+.5+radius*Math.sin(angle)];
      for(let k=0;k<count;k++){
        const angle=k*2*Math.PI/count,next=(k+1)*2*Math.PI/count;
        const a=rim(angle,flower?.36:.46,canopy),b=rim(next,flower?.36:.46,canopy);
        const tip=rim((angle+next)/2,flower?.48:.46,canopy+(flower?.035:0));
        m.tri(tip,a,center,k%2?color:edge);m.tri(b,tip,center,k%2?color:edge);
      }
      if(collecting){
        ring(.5,.5,.17,.065,.19,1,color);ring(.5,.5,.18,.24,.035,1,edge);
        ring(.5,.5,.138,.275,.005,1,water);
      }
      ring(.5,.5,.03,hub,.035,.25,color);centerTop=hub+.035;
    }else if(design.form==='pavilion'){
      for(const dx of [.20,.80])for(const dz of [.22,.78])box(dx,dz,.046,.046,.035,.43,post);
      box(.5,.51,.60,.19,.16,.05,post,edge);
      for(let k=0;k<7;k++)box(.14+k*.12,.5,.118,.86,.465,.085,k%2?edge:color);
      centerTop=.55;
    }else if(design.form==='tank'){
      ring(.5,.5,.32,.035,.47,1,color);ring(.5,.5,.34,.09,.03,1,edge);
      ring(.5,.5,.34,.48,.055,1,edge);ring(.5,.5,.27,.535,.01,1,water);
      box(.80,.50,.10,.07,.20,.06,post);centerTop=.545;
    }else if(design.form==='garden'){
      box(.5,.5,.82,.74,.035,.10,color);box(.5,.5,.74,.66,.135,.017,'#847155');
      for(const [cx,cz] of [[.29,.30],[.72,.36],[.54,.61],[.32,.70]]){
        ring(cx,cz,.073,.15,.12,.55,'#73a566');ring(cx,cz,.047,.266,.031,.70,edge);
      }
      centerTop=.16;
    }else if(bridge){
      for(const dz of [.12,.88]){
        for(const dx of [.17,.5,.83])box(dx,dz,.035,.035,.035,.21,post);
        box(.5,dz,.80,.045,.235,.044,color);
      }
    }
    const levels=Array(9).fill(.035);
    for(let slot=0;slot<9;slot++){
      const row=Math.floor(slot/3),col=slot%3;
      if(design.form==='module'&&slot===4)levels[slot]=centerTop;
      if(design.form==='pavilion')levels[slot]=centerTop;
      if(design.form==='tank'&&(row===1||col===1))levels[slot]=centerTop;
      if(design.form==='umbrella')levels[slot]=slot===4?centerTop:((row===1||col===1)?.69:.59);
      if(design.form==='garden')levels[slot]=centerTop;
    }
    for(const part of design.blocks){
      const {slot,shape}=part,cx=.20+slot%3*.30,cz=.20+Math.floor(slot/3)*.30;
      const base=levels[slot],tint=colors[part.color];
      let height=.21;
      if(shape==='box')box(cx,cz,.23,.23,base,height,tint);
      else if(shape==='plate'){height=.055;box(cx,cz,.30,.30,base,height,tint);}
      else if(shape==='dome'){
        height=.135;ring(cx,cz,.13,base,.065,.88,tint);ring(cx,cz,.114,base+.065,.07,.25,tint);
      }else ring(cx,cz,.12,base,height,shape==='cone'?.02:1,tint);
      levels[slot]+=height;
    }
    return deck+Math.max(centerTop,...levels,design.form==='umbrella'?.84:0);
  }
  function preview(canvas,design,yaw=-.62){
    const mesh=new CityEngine.Mesh();
    mesh.box(.015,-.065,.015,.97,.065,.97,'#a3ab8a','#cedab2');
    const height=draw(mesh,design,0,0,0);
    CityEngine.draw(canvas,mesh.finish(),{yaw,pitch:.44,center:[.5,height*.45,.5],span:1.75,vertical:Math.max(1.18,height+.52)},true);
  }
  return {catalog,register,suggest,role,draw,preview,colors,forms,effects,notes,shapes};
})();
