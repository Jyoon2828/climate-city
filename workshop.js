const Workshop=(()=>{
  const el=id=>document.getElementById(id);
  const model=Inventions;
  const colorNames={teal:'청록',sun:'노랑',coral:'산호',sky:'파랑',leaf:'연두',plum:'보라'};
  const positions=['왼쪽 뒤','가운데 뒤','오른쪽 뒤','왼쪽 가운데','가운데','오른쪽 가운데','왼쪽 앞','가운데 앞','오른쪽 앞'];
  let blocks=[],color='teal',yaw=-.62,frame=0;
  function options(id,items,auto){
    const select=el(id);
    if(auto)select.add(new Option('아이디어로 추천','auto'));
    for(const [key,label] of Object.entries(items))select.add(new Option(label,key));
  }
  function values(){
    const name=el('ideaName').value.trim(),idea=el('ideaStory').value.trim();
    const proposed=model.suggest(name+' '+idea);
    const choose=(id,fallback)=>el(id).value==='auto'?fallback:el(id).value;
    return {name,idea,color,blocks:[...blocks],form:choose('ideaFormKind',proposed.form),effect:choose('ideaEffect',proposed.effect)};
  }
  function render(){
    frame=0;if(!el('workshop').open)return;
    const draft=values(),proposed=model.suggest(draft.name+' '+draft.idea);
    model.preview(el('ideaPreview'),draft,yaw);
    el('previewName').textContent=draft.name||'내 구조물';
    el('ideaPreview').setAttribute('aria-label',(draft.name||'내 구조물')+' 입체 미리보기 · '+model.forms[draft.form]);
    el('ideaFormKind').options[0].textContent='추천 · '+model.forms[proposed.form];
    el('ideaEffect').options[0].textContent='추천 · '+model.effects[proposed.effect];
    el('effectHint').textContent=model.notes[draft.effect];
    el('undoPart').disabled=!blocks.length;
    for(const b of el('ideaColors').children)b.setAttribute('aria-pressed',b.dataset.color===color);
    for(const b of el('partGrid').children){
      const slot=Number(b.dataset.slot),stack=blocks.filter(p=>p.slot===slot),last=stack.at(-1);
      b.textContent=stack.length?String(stack.length):'＋';
      b.title=positions[slot]+' · '+stack.length+'개';b.setAttribute('aria-label',b.title);
      b.style.backgroundColor=last?model.colors[last.color]:'';
      b.disabled=stack.length>=3;
    }
  }
  function refresh(){if(!frame)frame=requestAnimationFrame(render);}
  function init(onSave){
    options('ideaFormKind',model.forms,true);options('ideaEffect',model.effects,true);options('partShape',model.shapes,false);
    for(const [key,label] of Object.entries(colorNames)){
      const b=document.createElement('button');b.type='button';b.dataset.color=key;b.title=label;
      b.setAttribute('aria-label',label);b.style.setProperty('--swatch',model.colors[key]);
      b.onclick=()=>{color=key;refresh();};el('ideaColors').append(b);
    }
    positions.forEach((position,slot)=>{
      const b=document.createElement('button');b.type='button';b.dataset.slot=slot;
      b.onclick=()=>{
        if(blocks.filter(p=>p.slot===slot).length>=3)return;
        const shape=el('partShape').value;blocks.push({slot,shape,color});
        el('partMessage').textContent=position+' · '+model.shapes[shape]+' 추가';refresh();
      };
      el('partGrid').append(b);
    });
    el('ideaForm').oninput=refresh;
    el('ideaName').addEventListener('input',()=>el('ideaName').setCustomValidity(''));
    el('turnIdea').onclick=()=>{yaw+=Math.PI/4;refresh();};
    el('undoPart').onclick=()=>{blocks.pop();el('partMessage').textContent='마지막 부품을 거뒀어요.';refresh();};
    for(const id of ['closeWorkshop','cancelWorkshop'])el(id).onclick=()=>el('workshop').close();
    el('ideaForm').onsubmit=event=>{
      event.preventDefault();const draft=values();
      if(!draft.name){el('ideaName').setCustomValidity('구조물의 이름을 적어 주세요.');el('ideaName').reportValidity();return;}
      draft.id='inv-'+(globalThis.crypto?.randomUUID?.()||(Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)));
      onSave(draft);el('workshop').close();
    };
  }
  function open(){
    el('ideaForm').reset();el('ideaName').setCustomValidity('');el('partMessage').textContent='';
    el('partsPanel').open=false;blocks=[];color='teal';yaw=-.62;
    el('workshop').showModal();el('ideaName').focus();render();
  }
  return {init,open};
})();
