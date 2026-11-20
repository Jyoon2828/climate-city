/* Heights are relative levels for a classroom model, not measurements. */
const Landscape = (() => {
  const size=9;
  const heights=Array.from({length:size*size},(_,i)=>{
    const x=i%size,z=Math.floor(i/size);
    if(x===0 || (x===1 && z<2))return -1;
    return x<3?0:x<6?1:2;
  });
  const bands=[
    {name:'낮은 땅', face:'#ad7952', top:'#e6b978', ink:'#85501e', flag:'#fce4b7'},
    {name:'중간 땅', face:'#91a569', top:'#b8c987', ink:'#476030', flag:'#e4edc2'},
    {name:'높은 땅', face:'#527b60', top:'#6b9d7e', ink:'#195744', flag:'#cfe9da'}
  ];
  const ground=h=>h<0?-.17:.02+h*.43;
  const deck=.86;
  const wallHeight=.74;
  // One high tide at each sea-level scenario. Lengths and time are model units.
  const seaLevels=[-.18,.33,.74,.82];
  const directions=[[0,-1,'north'],[1,0,'east'],[0,1,'south'],[-1,0,'west']];
  const coastNames={west:'항구 쪽',north:'북쪽',south:'남쪽',east:'동쪽'};
  const edges=heights.map((h,i)=>{
    if(h<0)return [];
    const x=i%size,z=Math.floor(i/size),out=[];
    for(const [dx,dz,side] of directions){
      const col=x+dx,row=z+dz,inside=col>=0&&row>=0&&col<size&&row<size;
      if(!inside||heights[row*size+col]<0)out.push({side,area:inside?'west':side});
    }
    return out;
  });
  function neighbors(i){
    const x=i%size;
    return [x?i-1:-1,x<size-1?i+1:-1,i-size,i+size].filter(j=>j>=0&&j<heights.length);
  }
  const land=heights.map((_,i)=>i).filter(i=>heights[i]>=0);
  const bed=heights.map(ground);
  const landPairs=land.flatMap(i=>neighbors(i).filter(j=>j>i&&heights[j]>=0).map(j=>[i,j]));
  function coastalFlood(board,strength,groundWater,intakes,overtopped){
    const tide=seaLevels[strength],inlets=[];
    for(const i of land){
      for(const edge of edges[i]){
        const wall=board.walls?.includes(edge.area);
        const crest=bed[i]+(wall?wallHeight:0);
        if(crest>=tide)continue;
        inlets.push({i,crest});intakes.add(edge.area);
        if(wall)overtopped.add(edge.area);
      }
    }
    const depth=new Float64Array(heights.length),change=new Float64Array(heights.length);
    // Compare designs over the same interval. A submerged crest limits inflow,
    // and a cell can only send water above its own bed to a lower neighbour.
    for(let tick=0;tick<26&&inlets.length;tick++){
      change.fill(0);
      for(const {i,crest} of inlets){
        change[i]+=.18*Math.max(0,tide-Math.max(crest,bed[i]+depth[i]));
      }
      for(const [i,j] of landPairs){
        const difference=bed[i]+depth[i]-bed[j]-depth[j];
        const flow=.18*Math.max(-depth[j],Math.min(depth[i],difference));
        change[i]-=flow;change[j]+=flow;
      }
      for(const i of land)depth[i]+=change[i];
    }
    // A thin film on the ground is below the map's flood display threshold.
    for(const i of land)if(depth[i]>=.07)groundWater.set(i,bed[i]+depth[i]);
  }
  function flooding(board,mode,strength){
    const groundWater=new Map(),water=new Set(),intakes=new Set();
    const held=new Set(),overtopped=new Set();
    if(mode==='sea'){
      coastalFlood(board,strength,groundWater,intakes,overtopped);
    }else if(mode==='flood'){
      const load=heights.map((h,i)=>{
        if(h<0)return 0;
        const local=Number(['garden','permeable'].includes(board[i]));
        const nearby=Number(neighbors(i).some(j=>board[j]==='garden'&&heights[j]<=h));
        return Math.max(0,strength-h-local-nearby);
      });
      for(const i of land.filter(i=>board[i]==='basin')){
        // A basin holds four units, filling from its own plot, then adjacent runoff.
        let space=4;
        const catchment=[i,...neighbors(i).filter(j=>heights[j]>=heights[i]&&board[j]!=='basin')];
        for(const j of catchment){
          const take=Math.min(space,load[j]);load[j]-=take;space-=take;
          if(!space)break;
        }
        if(space<4)held.add(i);
      }
      for(const i of land)if(load[i]>0)groundWater.set(i,ground(heights[i])+.23+(load[i]-1)*.345);
    }
    for(const [i,level] of groundWater){
      if(board[i]!=='raised'||level>ground(heights[i])+deck+.012)water.add(i);
    }
    return {groundWater,water,intakes,overtopped,held};
  }
  return {heights,bands,ground,deck,wallHeight,seaLevels,edges,coastNames,neighbors,flooding};
})();
