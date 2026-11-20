'use strict';
const CaseReader = (() => {
  const topics = {
    heat: {name:'폭염', cases:[
      {art:'parasol', place:'대한민국 · 부산 동구', title:'신호를 기다리는 그늘',
        story:['여름에 길을 건너려면 뜨거운 햇볕 아래에서 초록불을 기다려야 해요. 부산 동구는 부산역 근처처럼 사람들이 많이 건너는 곳에 커다란 그늘막을 세웠어요.',
          '파라솔을 닮은 이 그늘막은 햇빛과 바람에 따라 자동으로 움직여요. 사람들이 기다리는 자리에 그늘을 만들어, 길을 건너기 전 잠시 햇볕을 피할 수 있어요.'],
        question:'학교에서 집으로 가는 길에 가장 오래 서서 기다리는 곳은 어디인가요? 그 근처 어디에 그늘 쉼터를 놓을까요?',
        source:'부산 동구청', url:'https://www.bsdonggu.go.kr/board/view.donggu?boardId=BBS_0000025&dataSid=5090121&menuCd=DOM_000000103001006000&startPage=1'},
      {art:'pocket', place:'대한민국 · 대구 서구', title:'담장 자리에 생긴 공원',
        story:['길을 따라 담장이 길게 이어진 곳에서는 더운 날 걷다가도 그늘에서 쉴 자리를 찾기 어려워요. 대구 서구청은 담장을 허물고 그 자리에 길가 공원을 만들었어요.',
          '길과 맞닿은 땅에 나무와 풀을 심으면 그곳을 지나던 사람도 녹지를 이용할 수 있어요. 나뭇가지가 넓게 자란 자리에는 잠시 쉬어 갈 그늘도 생겨요.'],
        question:'학교와 병원 사이를 걸어가는 사람을 떠올려 보세요. 어느 길 옆에 나무와 쉼터를 놓으면 좋을까요?',
        source:'대전세종연구원', url:'https://clik.nanet.go.kr/clikr-collection/policyinfo/40/167/2019/CLIKC1489338695216058_attach_1.pdf'},
      {art:'wind', place:'대한민국 · 대구 북구 동화천', title:'하천을 따라 잇는 바람길숲',
        story:['도시 바깥 숲에는 밤이 되면 시원한 공기가 생겨요. 그 공기가 집과 가게가 모인 곳까지 잘 흐르도록 대구는 하천과 여러 녹지를 잇는 숲길을 만들었어요.',
          '북구 동화천 주변도 그중 한 곳이에요. 나무 한 그루의 그늘에서 더 나아가, 숲에서 불어오는 바람이 마을 어디까지 닿을지도 생각한 설계예요.'],
        question:'우리 마을에서는 어느 두 곳을 나무가 이어진 길로 연결하고 싶나요? 그 길을 걸을 사람을 생각해 보세요.',
        source:'대구광역시 건설본부', url:'https://www.aurum.re.kr/Research/PostView.aspx?cpage=1&gid=0&mm=1&pid=22921&ss=1'},
      {art:'schoolyard', place:'프랑스 · 파리', title:'나무 그늘이 생긴 학교 운동장',
        story:['마리즈 일즈 초등학교의 운동장에는 아스팔트가 넓게 깔려 있었어요. 학교는 운동장 일부를 걷어 내고 흙과 식물, 자연 재료로 놀이 공간을 꾸몄어요.',
          '이제 아이들은 쉬는 시간에 나무 그늘에서 놀거나 쉴 수 있어요. 매일 쓰는 운동장에도 더운 날 머물 자리를 마련한 거예요.'],
        question:'뛰어놀 공간과 그늘에서 쉴 공간이 모두 필요하다면 학교 주변 어디에 나무를 심을까요?',
        source:'파리 건축·도시·환경 협의회', url:'https://sites.google.com/caue75.fr/coursoasismarysehilsz/accueil'}
    ]},
    flood: {name:'집중호우', cases:[
      {art:'tunnel', place:'대한민국 · 서울 양천구 신월동', title:'땅속에 빗물을 모으는 터널',
        story:['짧은 시간에 큰비가 내리면 낮은 동네의 하수관으로 물이 한꺼번에 몰려요. 신월동 일대에서는 빗물이 지하 깊은 곳의 커다란 터널로 흘러 들어가게 했어요.',
          '터널은 비가 쏟아질 때 물을 잠시 담아 둬요. 비가 그치면 펌프로 안양천에 물을 내보내서 다음 비에 대비할 수 있어요.'],
        question:'우리 마을 지도에서 빗물이 모이기 쉬운 낮은 땅은 어디인가요? 그 근처에 빗물 저류지를 놓으면 무엇이 달라질까요?',
        source:'대한민국 정책브리핑', url:'https://www.korea.kr/news/policyNewsView.do?newsId=148930989'},
      {art:'square', place:'네덜란드 · 로테르담', title:'큰비가 오면 물을 담는 광장',
        story:['벤텀플레인 광장에는 주변 길보다 움푹한 운동 공간이 있어요. 맑은 날에는 사람들이 이곳에 내려가 공을 차거나 계단에 앉아 쉬어요.',
          '큰비가 오면 근처 지붕과 길에 떨어진 빗물이 물길을 따라 광장에 모여요. 하수도로 물이 한꺼번에 몰리는 것을 줄이고, 물이 빠진 뒤에는 다시 운동 공간으로 써요.'],
        question:'집과 운동 공간 사이에서 빗물이 어느 쪽으로 흐르게 하고 싶나요? 땅 높이 지도를 보고 정해 보세요.',
        source:'로테르담시', url:'https://www.rotterdam.nl/benthemplein'}
    ]},
    sea: {name:'해수면 상승', cases:[
      {art:'dune', place:'네덜란드 · 카트베이크', title:'모래언덕 속에 숨은 바닷가 둑',
        story:['카트베이크에서는 바닷가 모래언덕을 넓히고 그 안에 튼튼한 둑을 만들었어요. 해변에서 보면 모래언덕이지만, 그 속에는 마을을 지키는 구조물이 있어요.',
          '모래언덕과 둑은 바닷물과 집 사이의 높은 턱이 돼요. 바닷물의 높이가 올라가거나 폭풍이 밀어닥칠 때 물이 마을로 넘어올 위험을 줄여 줘요.'],
        question:'우리 마을에서 바다와 낮은 땅이 맞닿는 곳은 어디인가요? 어느 해안에 둑을 세울지 찾아보세요.',
        source:'네덜란드 기후적응 플랫폼', url:'https://klimaatadaptatienederland.nl/en/@297396/coastal-engineering-katwijk/'},
      {art:'relocate', place:'피지 · 부니도골로아', title:'높은 땅으로 옮겨 간 마을',
        story:['바닷가에 있던 부니도골로아 마을은 밀물 때 바닷물이 집과 밭까지 들어오는 일을 거듭 겪었어요. 짠 바닷물이 스며들면서 농작물을 기르는 일도 어려워졌어요.',
          '2014년 주민들은 바다에서 약 2킬로미터 떨어진 안쪽의 높은 땅으로 마을을 옮겼어요. 집을 새로 지을 땅을 고르는 일도 바닷물 피해를 줄이는 방법이에요.'],
        question:'학교나 병원을 옮긴다면 어느 높은 땅을 고를까요? 집에서 그곳까지 가는 길도 함께 살펴보세요.',
        source:'유엔 인권이사회', url:'https://digitallibrary.un.org/record/4064014/files/A_HRC_56_47-EN.pdf'}
    ]}
  };
  function init(startTopic, onDesign){
    const get = id => document.getElementById(id);
    const selected = {heat:0, flood:0, sea:0};
    let topic = startTopic;
    function showCase(index) {
      selected[topic]=index;
      const {name,cases}=topics[topic], item=cases[index];
      for(const [i,b] of Array.from(get('caseChoices').children).entries()){
        b.setAttribute('aria-pressed',String(i===index));
      }
      get('casePlace').textContent=item.place;
      get('caseTitle').textContent=item.title;
      get('caseStory').replaceChildren(...item.story.map(line=>{
        const p=document.createElement('p');p.textContent=line;return p;
      }));
      get('caseQuestion').textContent=item.question;
      get('caseSource').textContent='출처 · '+item.source;
      get('caseSource').href=item.url;
      get('caseSource').setAttribute('aria-label',item.source+' 원문 보기 (새 창)');
      get('useCase').textContent=name+'에 대비해 설계하기';
      const art=get('caseArt');
      art.setAttribute('aria-label',item.title+' 모형');
      CaseArt.draw(art,item.art);
    }
    function showTopic(key){
      topic=key;
      const {name,cases}=topics[topic];
      get('reading').dataset.topic=key;
      get('shelfTitle').textContent=name+' 사례';
      for(const b of get('readingTopics').children)b.setAttribute('aria-pressed',String(b.dataset.topic===key));
      get('caseChoices').replaceChildren(...cases.map((item,i)=>{
        const button=document.createElement('button'), title=document.createElement('b'), place=document.createElement('small');
        button.type='button';title.textContent=item.title;place.textContent=item.place;
        button.append(place,title);button.onclick=()=>showCase(i);return button;
      }));
      showCase(selected[key]);
    }
    for(const b of get('readingTopics').children)b.onclick=()=>showTopic(b.dataset.topic);
    get('useCase').onclick=()=>onDesign(topic);
    showTopic(topic);
  }
  return {init};
})();
