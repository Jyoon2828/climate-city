/* Encode the complete orbit with a fixed presentation clock, independent of drawing speed. */
const OrbitMovie=(()=>{
  const enc=new TextEncoder(),str=s=>enc.encode(s);
  const u8=(...bytes)=>new Uint8Array(bytes),u16=n=>u8(n>>>8,n),u24=n=>u8(n>>>16,n>>>8,n),u32=n=>u8(n>>>24,n>>>16,n>>>8,n);
  function join(...parts){
    const buf=new Uint8Array(parts.reduce((n,a)=>n+a.length,0));let offset=0;
    for(const part of parts){buf.set(part,offset);offset+=part.length;}return buf;
  }
  const zero=n=>new Uint8Array(n);
  function box(name,...data){return join(u32(8+data.reduce((n,a)=>n+a.length,0)),str(name),...data);}
  const full=(name,flags,...data)=>box(name,u32(flags),...data);
  function mp4(frames,config,w,h,fps){
    const count=frames.length,unit=1000/fps,duration=count*unit;
    const ftyp=box('ftyp',str('isom'),u32(512),str('isomiso2avc1mp41'));
    const sizes=frames.map(f=>f.data.length),offset=ftyp.length+8;
    const matrix=join(u32(65536),u32(0),u32(0),u32(0),u32(65536),u32(0),u32(0),u32(0),u32(0x40000000));
    const visual=box('avc1',zero(6),u16(1),zero(16),u16(w),u16(h),u32(0x480000),u32(0x480000),zero(4),u16(1),zero(32),u16(24),u16(65535),box('avcC',new Uint8Array(config)));
    const keys=frames.map((f,i)=>f.key?i+1:0).filter(Boolean);
    const stbl=box('stbl',full('stsd',0,u32(1),visual),full('stts',0,u32(1),u32(count),u32(unit)),
      full('stsc',0,u32(1),u32(1),u32(count),u32(1)),full('stsz',0,u32(0),u32(count),...sizes.map(u32)),
      full('stco',0,u32(1),u32(offset)),full('stss',0,u32(keys.length),...keys.map(u32)));
    const minf=box('minf',full('vmhd',1,zero(8)),box('dinf',full('dref',0,u32(1),full('url ',1))),stbl);
    const mdia=box('mdia',full('mdhd',0,zero(8),u32(1000),u32(duration),u16(0x55c4),u16(0)),full('hdlr',0,zero(4),str('vide'),zero(12),str('Village video\0')),minf);
    const trak=box('trak',full('tkhd',7,zero(8),u32(1),zero(4),u32(duration),zero(8),zero(8),matrix,u32(w*65536),u32(h*65536)),mdia);
    const moov=box('moov',full('mvhd',0,zero(8),u32(1000),u32(duration),u32(65536),u16(256),zero(10),matrix,zero(24),u32(2)),trak);
    const length=sizes.reduce((n,s)=>n+s,0);
    return new Blob([ftyp,u32(length+8),str('mdat'),...frames.map(f=>f.data),moov],{type:'video/mp4'});
  }
  const integer=n=>n<256?u8(n):n<65536?u16(n):n<16777216?u24(n):u32(n);
  function tag(id,...parts){
    const size=parts.reduce((n,a)=>n+a.length,0);let width=1;
    while(size>=2**(width*7)-1)width++;
    const header=zero(width);let n=size;
    for(let i=width-1;i>=0;i--){header[i]=n&255;n=Math.floor(n/256);}header[0]|=1<<(8-width);
    return join(integer(id),header,...parts);
  }
  const val=(id,n)=>tag(id,integer(n));
  function webm(frames,w,h,fps){
    const header=tag(0x1a45dfa3,val(0x4286,1),val(0x42f7,1),val(0x42f2,4),val(0x42f3,8),tag(0x4282,str('webm')),val(0x4287,2),val(0x4285,2));
    const t=zero(8);new DataView(t.buffer).setFloat64(0,frames.length*1000/fps);
    const info=tag(0x1549a966,val(0x2ad7b1,1000000),tag(0x4d80,str('Village')),tag(0x5741,str('Village')),tag(0x4489,t));
    const tracks=tag(0x1654ae6b,tag(0xae,val(0xd7,1),val(0x73c5,1),val(0x83,1),tag(0x86,str('V_VP8')),val(0x23e383,1e9/fps),tag(0xe0,val(0xb0,w),val(0xba,h))));
    let offset=info.length+tracks.length;const clusters=[],cues=[];
    for(let i=0;i<frames.length;i+=fps){
      const start=i*1000/fps,blocks=frames.slice(i,i+fps).map((data,j)=>tag(0xa3,u8(0x81),u16(j*1000/fps),u8(0x80),data));
      const cluster=tag(0x1f43b675,val(0xe7,start),...blocks);
      cues.push(tag(0xbb,val(0xb3,start),tag(0xb7,val(0xf7,1),val(0xf1,offset))));
      clusters.push(cluster);offset+=cluster.length;
    }
    return new Blob([header,tag(0x18538067,info,tracks,...clusters,tag(0x1c53bb6b,...cues))],{type:'video/webm'});
  }
  async function vp8(canvas){
    const img=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));
    if(!img||img.type!=='image/webp')throw Error('WebP encoding unavailable');
    const data=new Uint8Array(await img.arrayBuffer()),view=new DataView(data.buffer);
    for(let i=12;i+8<=data.length;){
      const n=view.getUint32(i+4,true);if(i+8+n>data.length)break;
      if(data[i]===86&&data[i+1]===80&&data[i+2]===56&&data[i+3]===32)return data.slice(i+8,i+8+n);
      i+=8+n+(n&1);
    }
    throw Error('VP8 frame unavailable');
  }
  const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
  async function create(canvas,render,onProgress){
    const fps=20,count=fps*8,w=canvas.width,h=canvas.height;
    const config={codec:'avc1.42001f',width:w,height:h,bitrate:3500000,framerate:fps,latencyMode:'realtime',avc:{format:'avc'}};
    let supported=false;
    try{supported=!!window.VideoEncoder && (await VideoEncoder.isConfigSupported(config)).supported;}catch{}
    if(supported){
      let codec,desc,error;
      try{
        const encoded=[];
        codec=new VideoEncoder({output(chunk,meta){
          if(meta?.decoderConfig?.description)desc=new Uint8Array(meta.decoderConfig.description).slice();
          const data=zero(chunk.byteLength);chunk.copyTo(data);encoded.push({data,key:chunk.type==='key',time:chunk.timestamp});
        },error(e){error=e;}});
        codec.configure(config);
        for(let i=0;i<count;i++){
          render(i/(count-1));
          const frame=new VideoFrame(canvas,{timestamp:i*1e6/fps,duration:1e6/fps});
          try{codec.encode(frame,{keyFrame:i%fps===0});}finally{frame.close();}
          if(codec.encodeQueueSize>4)await codec.flush();
          if(error)throw error;
          onProgress((i+1)/count);await pause();
        }
        await codec.flush();
        if(!desc||encoded.length!==count||encoded.some((f,i)=>i&&encoded[i-1].time>=f.time))throw Error('Incomplete MP4');
        return mp4(encoded,desc,w,h,fps);
      }catch(e){console.warn('Using WebM encoder',e);}finally{if(codec&&codec.state!=='closed')codec.close();}
    }
    const frames=[];
    for(let i=0;i<count;i++){
      render(i/(count-1));frames.push(await vp8(canvas));onProgress((i+1)/count);await pause();
    }
    return webm(frames,w,h,fps);
  }
  return {create};
})();
