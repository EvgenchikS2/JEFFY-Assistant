// Same readiness rules as voice-state.mjs; kept inline so an already-running
// version can load this fix without restarting and losing session-only keys.
function voiceReadiness(settings, capabilities, keys) {
  let engine = settings.engine;
  const russianWindows = (capabilities.recognizers || []).some(r => r.culture === 'ru-RU');
  if (engine === 'windows' && !russianWindows && capabilities.offlineReady) engine = 'vosk';
  if (engine === 'vosk') return {engine,ready:!!capabilities.offlineReady,reason:'Офлайн-голос Vosk не найден. Запусти INSTALL-OFFLINE.cmd рядом с приложением, затем попробуй снова.'};
  if (engine === 'windows') return {engine,ready:russianWindows,reason:'Русский распознаватель Windows не установлен. Выбери Vosk в настройках или подключи Groq.'};
  if (engine === 'groq' || engine === 'gemini') return {engine,ready:!!keys[engine]?.configured,reason:`Для распознавания ${engine === 'groq' ? 'Groq' : 'Gemini'} нужен ключ. Добавь его в «Подключениях» или выбери Vosk в настройках.`};
  return {engine,ready:false,reason:'Выбери движок распознавания речи в настройках.'};
}
const paths = {
  orb:'<circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="3.5" ry="8"/><path d="M4 12h16"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plug:'<path d="M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v4"/>',
  settings:'<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
  volume:'<path d="M4 9h4l5-4v14l-5-4H4V9Zm12-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  play:'<path d="m8 5 11 7-11 7V5Z"/>',
  pause:'<path d="M8 5v14M16 5v14"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="1"/>',
  next:'<path d="m5 5 10 7-10 7V5Zm13 0v14"/>',
  music:'<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
  send:'<path d="m3 10 18-7-7 18-4-7-7-4Zm7 4L21 3"/>',
  file:'<path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h6"/>',
  folder:'<path d="M3 7V4h6l3 3h9v13H3V7Z"/>',
  monitor:'<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M12 16v5m-4 0h8"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  game:'<path d="M8 7h8c4 0 6 11 3 12-2 1-4-3-7-3s-5 4-7 3C2 18 4 7 8 7Zm0 3v5m-2.5-2.5h5M16 11h.01m2 3h.01"/>',
  coffee:'<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm12 1h2a3 3 0 0 1 0 6h-2M7 3v2m5-2v2"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  edit:'<path d="m14 5 5 5M4 20l1-6L16 3l5 5L10 19l-6 1Z"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  trash:'<path d="M4 6h16M9 3h6m-9 3 1 15h10l1-15M10 10v7m4-7v7"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const content=document.querySelector('#content'), modal=document.querySelector('#modal');
let state, page='home', query='', filter='Все', voiceState='idle', lastHeard='', lastReply='', frame=0, amplitude=0, outputAudio, recording, toastTimer;
const labels={home:'Обзор',commands:'Команды',scenarios:'Сценарии',history:'История',connections:'Подключения',settings:'Настройки'};
async function api(endpoint, body={}) {
  let response;try {response=await fetch('/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Jeffy-Token':state.token},body:JSON.stringify(body)});} catch {throw new Error('Jeffy недоступен. Перезапустите приложение.');}
  const result=await response.json();if(!response.ok)throw new Error(result.error || 'Ошибка запроса.');
  if(result.history)state.history=result.history;return result;
}
function toast(message,error=false){const box=document.querySelector('#toast');box.textContent=message;box.className='toast'+(error?' error':'');box.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.hidden=true,error?7000:3500);}
function guard(fn){return async(event)=>{try{await fn(event);}catch(e){toast(e.message,true);}};}
function bind(id,event,fn){document.getElementById(id)?.addEventListener(event,guard(fn));}
function heading(eyebrow,title,subtitle,extra=''){return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${extra}</div>`;}
function modalHead(title){return `<div class="modal-head"><h2 id="modal-title">${title}</h2><button class="icon-button" id="close-modal" aria-label="Закрыть">${icon('close')}</button></div>`;}
function openModal(html){document.querySelector('#modal-content').innerHTML=html;if(!modal.open)modal.showModal();bind('close-modal','click',()=>modal.close());}
modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
function smallHistory(entries,long=false){if(!entries.length)return `<div class="empty">Здесь появятся выполненные команды и голосовые запросы.<br>Попробуй сказать: «Джеффи, который час?»</div>`;return `<div class="activity-list ${long?'long-history':''}">${entries.map(h=>`<div class="activity-row ${h.status==='error'?'error':''}"><span class="status-icon">${icon(h.status==='error'?'close':'check')}</span><span>${esc(h.title)}</span><span class="detail">${esc(h.detail)}</span><time datetime="${esc(h.at)}">${esc(new Date(h.at).toLocaleString('ru-RU',long?{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}:{hour:'2-digit',minute:'2-digit'}))}</time></div>`).join('')}</div>`;}
function providerReady(){return voiceReadiness(state.settings,state.capabilities,state.keys).ready;}
async function refreshVoiceReadiness(){
  const response=await fetch('/api/bootstrap');
  if(!response.ok)throw new Error('Не удалось проверить голос. Обнови окно Jeffy.');
  const live=await response.json();state.token=live.token;state.capabilities=live.capabilities;state.keys=live.keys;state.settings=live.settings;
  const status=voiceReadiness(state.settings,state.capabilities,state.keys);
  if(status.engine!==state.settings.engine){state.settings=(await api('settings',{...state.settings,engine:status.engine})).settings;toast('Русский голос переключён на установленный Vosk.');}
  return status;
}
function render(){
  if(!state)return;cancelAnimationFrame(frame);
  page=labels[location.hash.slice(1)]?location.hash.slice(1):'home';
  document.querySelector('#page-label').textContent=labels[page];
  document.querySelector('#command-count').textContent=state.commands.length;
  document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===page));
  ({home:renderHome,commands:renderCommands,scenarios:renderCommands,connections:renderConnections,settings:renderSettings,history:renderHistory}[page])();
}
function renderHome(){
  const provider=state.providers[state.settings.provider], ready=providerReady();
  content.innerHTML=heading('ТВОЙ ГОЛОС. ТВОЁ ПРОСТРАНСТВО.','Привет. Я Джеффи.','Скажи, что нужно сделать. Остальное — за мной.',`<span class="badge ${ready?'':'warning'}"><i class="tiny-dot"></i>${ready?'Голос настроен':'Подключи распознавание'}</span>`)+`
  <div class="home-grid">
    <section class="panel voice-panel" aria-label="Голосовое управление">
      <div class="voice-panel-top"><span>JEFFY VOICE ENGINE</span><span class="signal"><i></i><i></i><i></i><i></i></span></div>
      <div class="orb-wrap"><canvas id="orb" aria-hidden="true"></canvas><div class="orb-words"><span>YOUR PERSONAL</span><strong>JEFFY</strong></div></div>
      <h2 class="voice-status" id="voice-status">Готов слушать</h2><p class="voice-sub" id="voice-sub">Нажми на микрофон и произнеси команду</p>
      <div class="voice-controls"><button id="mic-button" class="btn primary mic">${icon('mic')}<span>Начать говорить</span></button><button id="stop-button" class="circle-button" title="Остановить запись или ответ" aria-label="Остановить запись или ответ">${icon('stop')}</button></div>
      <div class="voice-panel-bottom"><span>${icon('lock')}Микрофон включается по нажатию</span><span>${['windows','vosk'].includes(state.settings.engine)?'OFFLINE · '+state.settings.engine.toUpperCase():'RU · '+esc(state.settings.engine.toUpperCase())}</span></div>
    </section>
    <div class="side-stack"><section class="panel connect-panel"><div class="panel-caption">ГОЛОСОВОЙ ИНТЕЛЛЕКТ</div><div class="engine-row"><div class="engine-logo">${icon('spark')}</div><div><h3>${esc(provider.name)}</h3><small>${state.keys[state.settings.provider].configured?'Ключ подключён':'Ожидает подключения'}</small></div></div><p class="engine-info">${state.settings.aiEnabled?'Задавай вопросы голосом. Джеффи ответит вслух — без текстового чата.':'Сейчас включены только команды компьютера. ИИ можно включить в настройках.'}</p><a class="text-link" href="#connections">Настроить подключение ${icon('arrow')}</a></section>
    <section class="panel guide-panel"><div class="panel-caption">ПОПРОБУЙ СКАЗАТЬ</div><ol><li>«Джеффи, открой YouTube»</li><li>«Джеффи, который час?»</li><li>«Джеффи, время работать»</li></ol></section></div>
  </div>
  <div id="last-phrase" class="transcript ${lastHeard||lastReply?'':'hide'}"><div class="label">Последняя фраза</div><p id="heard-text">${esc(lastHeard)}</p><p class="reply" id="reply-text">${esc(lastReply)}</p></div>
  <div class="section-heading"><h2>Одна фраза. Несколько действий.</h2><a href="#scenarios">Все сценарии ${icon('arrow')}</a></div>
  <div class="scenario-grid">${state.commands.filter(c=>c.group==='Сценарии').slice(0,3).map(c=>`<div class="panel scenario-card"><div class="scenario-icon">${icon(c.icon)}</div><div><h3>${esc(c.name)}</h3><p>${c.actions.length} ${c.actions.length===1?'действие':'действия'} · ${c.enabled?'включён':'отключён'}</p></div><button class="scenario-play" data-run="${esc(c.id)}" aria-label="Запустить ${esc(c.name)}" ${c.enabled?'':'disabled'}>${icon('play')}</button></div>`).join('')}</div>
  <div class="hint-row">${icon('spark')} Создай свой сценарий: открывай приложения, добавляй паузы и голосовые ответы.</div>
  <div class="section-heading home-history"><h2>Недавние действия</h2><a href="#history">Вся история ${icon('arrow')}</a></div><div id="home-history">${smallHistory(state.history.slice(0,3))}</div>`;
  bind('mic-button','click',toggleMicrophone);bind('stop-button','click',stopAll);
  attachRunButtons();updateVoice();drawOrb();
}
function updateVoice(){
  const messages={idle:['Готов слушать','Нажми на микрофон и произнеси команду'],listening:['Я слушаю тебя','Говори. Пауза в речи завершит запись.'],processing:['Разбираю твою фразу','Это займёт несколько секунд'],speaking:['Отвечаю голосом','Можно остановить ответ кнопкой рядом'],error:['Давай попробуем ещё раз','Проверь подключение в настройках']};
  const m=messages[voiceState];const title=document.querySelector('#voice-status');if(title)title.textContent=m[0];const sub=document.querySelector('#voice-sub');if(sub)sub.textContent=m[1];
  const btn=document.querySelector('#mic-button');if(btn){btn.innerHTML=icon(voiceState==='listening'?'stop':'mic')+`<span>${voiceState==='listening'?'Завершить запись':'Начать говорить'}</span>`;btn.disabled=voiceState==='processing';}
  document.querySelector('#last-phrase')?.classList.toggle('hide',!lastHeard&&!lastReply);
  if(document.querySelector('#heard-text'))document.querySelector('#heard-text').textContent=lastHeard;
  if(document.querySelector('#reply-text'))document.querySelector('#reply-text').textContent=lastReply;
}
function setVoice(value){voiceState=value;updateVoice();}
function drawOrb(){
  const canvas=document.querySelector('#orb');if(!canvas)return;
  const dpr=Math.min(devicePixelRatio,2),w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(t){
    ctx.clearRect(0,0,w,h);const active=voiceState==='listening'||voiceState==='speaking';const energy=active?amplitude:voiceState==='processing'?.2:.03;const radius=Math.min(w*.28,h*.38)*(1+energy*.12);const cx=w/2,cy=h/2;const time=reduced?0:t*.00025;
    const glow=ctx.createRadialGradient(cx,cy,15,cx,cy,radius*1.5);glow.addColorStop(0,'#428dde20');glow.addColorStop(.7,'#1c81f00a');glow.addColorStop(1,'#1c81f000');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    for(let j=0;j<22;j++){
      const latitude=-Math.PI/2+Math.PI*j/21;ctx.beginPath();
      for(let i=0;i<=110;i++){
        const longitude=i/110*Math.PI*2;const ripple=Math.sin(longitude*5+time*5+j*.7)*(2+energy*12);const rr=radius+ripple;
        let x=Math.cos(latitude)*Math.cos(longitude+time)*rr,y=Math.sin(latitude)*rr,z=Math.cos(latitude)*Math.sin(longitude+time)*rr;
        const yy=y*.82-z*.32,zz=y*.32+z*.82;const scale=1+zz/(radius*5);x=x*scale;const py=cy+yy*scale,px=cx+x;
        if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.strokeStyle=`rgba(91,170,255,${.13+(.5-Math.abs(j/21-.5))*.35+energy*.13})`;ctx.lineWidth=.7;ctx.stroke();
    }
    for(let i=0;i<52;i++){const angle=i*2.4+time*.6;const rad=radius*(1.22+.15*Math.sin(i*4));const x=cx+Math.cos(angle)*rad,y=cy+Math.sin(angle)*rad*.72;ctx.fillStyle=`rgba(148,203,255,${.12+((i%5)/5)*.2})`;ctx.fillRect(x,y,i%7===0?2:1,i%7===0?2:1);}
    ctx.beginPath();ctx.ellipse(cx,cy,radius*1.34,radius*.94,-.4,0,Math.PI*2);ctx.strokeStyle='#5398e61c';ctx.lineWidth=1;ctx.stroke();
    frame=requestAnimationFrame(draw);
  }frame=requestAnimationFrame(draw);
}
function renderCommands(){
  const scenarios=page==='scenarios';
  content.innerHTML=heading(scenarios?'ТВОИ РИТУАЛЫ':'УПРАВЛЯЙ СВОИМ ГОЛОСОМ',scenarios?'Сценарии':'Библиотека команд',scenarios?'Объедини несколько действий в одну голосовую фразу.':'Приложения, музыка и Windows — по твоей команде.',`<button class="btn primary" id="new-command">${icon('plus')}${scenarios?'Создать сценарий':'Добавить команду'}</button>`)+`
  <div class="toolbar"><input id="command-search" class="search" placeholder="Найти команду или фразу…" aria-label="Поиск команд" value="${esc(query)}"><div class="toolbar-group"><button id="import-commands" class="btn ghost small">${icon('upload')}Импорт</button><button id="export-commands" class="btn ghost small">${icon('download')}Экспорт</button><input id="import-file" class="hide" type="file" accept=".json,application/json"></div></div>
  ${scenarios?'':`<div class="filters">${['Все','Сайты','Приложения','Система','Сценарии','Мои команды'].map(f=>`<button class="filter ${filter===f?'active':''}" data-filter="${f}">${f}</button>`).join('')}</div>`}
  <div id="commands-list" class="command-grid"></div>
  <div class="tester"><h3>Проверить голосовую фразу</h3><p>Проверка показывает совпадение и не выполняет действия.</p><div class="key-line" style="margin-top:12px"><input id="preview-phrase" placeholder="Например: Джеффи, открой блокнот" aria-label="Фраза для проверки"><button id="preview-button" class="btn small">Проверить</button></div><p id="preview-result"></p></div>`;
  renderCommandList();bind('new-command','click',()=>editCommand(null,scenarios));
  bind('command-search','input',e=>{query=e.target.value;renderCommandList();});
  document.querySelectorAll('[data-filter]').forEach(el=>el.addEventListener('click',()=>{filter=el.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===el));renderCommandList();}));
  bind('export-commands','click',()=>{const blob=new Blob([JSON.stringify({version:1,commands:state.commands},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='jeffy-commands.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Экспортированы только команды, без ключей и истории.');});
  bind('import-commands','click',()=>document.querySelector('#import-file').click());
  bind('import-file','change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>1024*1024)throw new Error('Файл больше 1 МБ.');let data;try{data=JSON.parse(await file.text());}catch{throw new Error('Не удалось прочитать JSON-файл.');}const r=await api('commands/import',{commands:data.commands});state.commands=r.commands;render();toast('Команды импортированы.');});
  bind('preview-button','click',async()=>{const r=await api('commands/preview',{phrase:document.querySelector('#preview-phrase').value});document.querySelector('#preview-result').textContent=r.command?`${r.fuzzy?'Похожая фраза':'Точное совпадение'}: ${r.command.name}. Действий: ${r.command.actions.length}.`:'Совпадений нет. Проверь фразы и включённость команды.';});
}
function renderCommandList(){
  const list=state.commands.filter(c=>(page!=='scenarios'||c.group==='Сценарии')&&(page==='scenarios'||filter==='Все'||c.group===filter)&&(c.name+' '+c.phrases.join(' ')).toLowerCase().includes(query.toLowerCase()));
  document.querySelector('#commands-list').innerHTML=list.length?list.map(c=>`<article class="panel command-card ${c.enabled?'':'disabled'}"><div class="command-head"><div class="scenario-icon">${icon(c.icon)}</div><div><h3>${esc(c.name)}</h3><small>${esc(c.group)}</small></div></div><p class="command-phrase">«${esc(c.phrases[0])}»</p><div class="command-footer"><label class="switch"><input type="checkbox" data-toggle="${esc(c.id)}" ${c.enabled?'checked':''} aria-label="Включить ${esc(c.name)}"><span></span></label><span class="step-count">${c.actions.length} действ.</span><button class="icon-button edit" data-edit="${esc(c.id)}" aria-label="Редактировать ${esc(c.name)}">${icon('edit')}</button><button class="icon-button" data-run="${esc(c.id)}" ${c.enabled?'':'disabled'} aria-label="Выполнить ${esc(c.name)}">${icon('play')}</button></div></article>`).join(''):'<div class="empty">Ничего не найдено. Добавь свою первую команду.</div>';
  document.querySelectorAll('[data-edit]').forEach(el=>el.addEventListener('click',()=>editCommand(state.commands.find(c=>c.id===el.dataset.edit))));
  document.querySelectorAll('[data-toggle]').forEach(el=>el.addEventListener('change',guard(async()=>{const c=state.commands.find(c=>c.id===el.dataset.toggle);const r=await api('commands/save',{...c,enabled:el.checked});state.commands=r.commands;renderCommandList();})));
  attachRunButtons();
}
function attachRunButtons(){document.querySelectorAll('[data-run]').forEach(el=>el.addEventListener('click',guard(async()=>{el.disabled=true;try{await runCommand(el.dataset.run);}finally{el.disabled=false;}})));}
async function runCommand(id,confirmation){
  if(recording)await stopRecording(false);stopPlayback();setVoice('processing');
  try{const result=await api('commands/run',{id,confirmation});if(result.confirmation){setVoice('idle');showConfirmation(id,result);return;}lastHeard=result.command;lastReply=result.reply;updateVoice();if(page==='home')document.querySelector('#home-history').innerHTML=smallHistory(state.history.slice(0,3));await speak(result.reply);}catch(e){setVoice('error');throw e;}
}
function showConfirmation(id,result){openModal(modalHead('Подтверди действие')+`<p class="help-body">${esc(result.message)}</p><div class="modal-actions"><button id="cancel-confirmation" class="btn ghost">Отмена</button><button id="confirm-command" class="btn danger">Выполнить</button></div>`);bind('cancel-confirmation','click',()=>modal.close());bind('confirm-command','click',async()=>{modal.close();await runCommand(id,result.confirmation);});}
function editCommand(original,scenario=false){
  const draft=original?structuredClone(original):{name:'',phrases:[],group:scenario?'Сценарии':'Мои команды',icon:scenario?'layers':'spark',enabled:true,actions:[{type:'app',value:'notepad'}]};
  openModal(modalHead(original?'Редактировать команду':scenario?'Новый сценарий':'Новая команда')+`
  <form id="command-form"><div class="field"><label for="edit-name">Название</label><input id="edit-name" required maxlength="80" placeholder="Например: Моё рабочее утро" value="${esc(draft.name)}"></div><div class="field"><label for="edit-phrases">Голосовые фразы</label><textarea id="edit-phrases" required placeholder="Каждая фраза с новой строки">${esc(draft.phrases.join('\n'))}</textarea><small>Джеффи понимает небольшие ошибки в словах и «пожалуйста». Для похожих команд используй разные фразы. Слово «${esc(state.settings.wakeWord)}» можно произнести перед фразой.</small></div>
  <div class="field"><label for="edit-group">Раздел</label><select id="edit-group"><option value="Мои команды" ${draft.group!=='Сценарии'?'selected':''}>Мои команды</option><option value="Сценарии" ${draft.group==='Сценарии'?'selected':''}>Сценарии</option></select></div>
  <div class="editor-section"><h3>Действия по порядку</h3><button type="button" class="btn small ghost" id="add-step">${icon('plus')}Добавить</button></div><div id="steps" class="steps"></div><p class="inline-error" id="editor-error" role="alert"></p>
  <div class="modal-actions">${original?'<button type="button" id="delete-command" class="btn ghost danger delete">Удалить</button>':''}<button type="button" id="cancel-editor" class="btn ghost">Отмена</button><button type="submit" class="btn primary">Сохранить</button></div></form>`);
  const types={app:'Приложение',url:'Сайт',shortcut:'Системная клавиша',speak:'Сказать вслух',wait:'Пауза, секунды',time:'Текущее время',lock:'Блокировка ПК'};
  const defaultValues={app:'notepad',url:'https://',shortcut:'playpause',speak:'Готово.',wait:'1',time:'',lock:''};
  let shortcutRecorder;
  function drawSteps(){
    shortcutRecorder?.abort();shortcutRecorder=null;
    document.querySelector('#steps').innerHTML=draft.actions.map((a,i)=>{
      let field='';const options=a.type==='app'?state.apps:a.type==='shortcut'?state.shortcuts:null;
      if(options)field=`<div class="step-value custom-action"><div class="action-value-row"><input class="value-input" aria-label="${a.type==='app'?'Путь к приложению':'Сочетание клавиш'} ${i+1}" value="${esc(options[a.value]?'':a.value)}" placeholder="${a.type==='app'?'Путь к EXE или ярлыку…':'Например: Ctrl+Shift+S'}"><button type="button" class="btn small ${a.type==='app'?'pick-app':'record-shortcut'}">${a.type==='app'?'Выбрать…':'Записать'}</button></div><select class="value-preset" aria-label="Готовые варианты действия ${i+1}"><option value="">${a.type==='app'?'Своё приложение':'Своё сочетание'}</option>${Object.entries(options).map(([v,label])=>`<option value="${esc(v)}" ${a.value===v?'selected':''}>${esc(label)}</option>`).join('')}</select></div>`;
      else if(['time','lock'].includes(a.type))field=`<span class="step-value panel-caption">${a.type==='lock'?'С подтверждением':'Локально'}</span>`;
      else field=`<input class="step-value" aria-label="Значение действия ${i+1}" value="${esc(a.value)}" ${a.type==='wait'?'type="number" min="0" max="15" step="0.5"':'maxlength="2000"'}>`;
      return `<div data-step="${i}"><div class="step"><span class="step-number">${String(i+1).padStart(2,'0')}</span><select class="step-type" aria-label="Тип действия ${i+1}">${Object.entries(types).map(([v,label])=>`<option value="${v}" ${a.type===v?'selected':''}>${label}</option>`).join('')}</select>${field}<button type="button" class="icon-button remove-step" aria-label="Удалить действие ${i+1}">${icon('close')}</button></div><div class="step-move"><button type="button" data-move="-1" ${i===0?'disabled':''}>↑ Выше</button><button type="button" data-move="1" ${i===draft.actions.length-1?'disabled':''}>↓ Ниже</button></div></div>`;
    }).join('');
    document.querySelectorAll('[data-step]').forEach(row=>{
      const i=+row.dataset.step;
      row.querySelector('.step-type').addEventListener('change',e=>{draft.actions[i]={type:e.target.value,value:defaultValues[e.target.value]};drawSteps();});
      row.querySelector('input.step-value,select.step-value')?.addEventListener('input',e=>draft.actions[i].value=e.target.value);
      const valueInput=row.querySelector('.value-input'),preset=row.querySelector('.value-preset');
      valueInput?.addEventListener('input',e=>{draft.actions[i].value=e.target.value;preset.value='';});
      preset?.addEventListener('change',e=>{draft.actions[i].value=e.target.value;valueInput.value='';});
      row.querySelector('.pick-app')?.addEventListener('click',guard(async()=>{
        if(!window.jeffyDesktop?.pickApplication)throw new Error('Выбор файла доступен в обновлённом приложении Windows. Пока можно вставить полный путь к EXE или ярлыку.');
        const selected=await window.jeffyDesktop.pickApplication();if(selected){draft.actions[i].value=selected;valueInput.value=selected;preset.value='';}
      }));
      row.querySelector('.record-shortcut')?.addEventListener('click',()=>{
        const button=row.querySelector('.record-shortcut');button.textContent='Нажми клавиши…';
        shortcutRecorder?.abort();const controller=new AbortController();shortcutRecorder=controller;const cancel=()=>{controller.abort();if(shortcutRecorder===controller)shortcutRecorder=null;button.textContent='Записать';};
        modal.addEventListener('close',cancel,{once:true,signal:controller.signal});
        window.addEventListener('keydown',event=>{
          event.preventDefault();event.stopImmediatePropagation();if(event.code==='Escape'){cancel();return;}
          if(/^(Control|Shift|Alt|Meta)/.test(event.code))return;
          const names={ArrowUp:'Up',ArrowDown:'Down',ArrowLeft:'Left',ArrowRight:'Right',Equal:'Plus',Minus:'Minus',Comma:'Comma',Period:'Period',Slash:'Slash',Semicolon:'Semicolon',Quote:'Quote',Backquote:'Backquote',BracketLeft:'BracketLeft',BracketRight:'BracketRight',Backslash:'Backslash'};
          const key=names[event.code]||event.code.replace(/^(Key|Digit|Numpad)(?=[A-Z0-9]$)/,'');
          const combo=[event.ctrlKey?'Ctrl':null,event.altKey?'Alt':null,event.shiftKey?'Shift':null,event.metaKey?'Win':null,key].filter(Boolean).join('+');
          draft.actions[i].value=combo;valueInput.value=combo;preset.value='';cancel();
        },{capture:true,signal:controller.signal});
      });
      row.querySelector('.remove-step').addEventListener('click',()=>{draft.actions.splice(i,1);drawSteps();});
      row.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>{const j=i+(+b.dataset.move);[draft.actions[i],draft.actions[j]]=[draft.actions[j],draft.actions[i]];drawSteps();}));
    });
  }
  drawSteps();bind('add-step','click',()=>{if(draft.actions.length>=20)throw new Error('Максимум 20 действий.');draft.actions.push({type:'wait',value:'1'});drawSteps();});bind('cancel-editor','click',()=>modal.close());
  document.querySelector('#command-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const r=await api('commands/save',{...draft,name:document.querySelector('#edit-name').value,phrases:document.querySelector('#edit-phrases').value.split('\n').map(p=>p.trim()).filter(Boolean),group:document.querySelector('#edit-group').value});state.commands=r.commands;modal.close();render();toast('Команда сохранена.');}catch(error){document.querySelector('#editor-error').textContent=error.message;}finally{button.disabled=false;}});
  bind('delete-command','click',()=>{openModal(modalHead('Удалить команду?')+`<p class="help-body">«${esc(original.name)}» будет удалена из твоей библиотеки.</p><div class="modal-actions"><button id="cancel-delete" class="btn ghost">Отмена</button><button id="confirm-delete" class="btn danger">Удалить</button></div>`);bind('cancel-delete','click',()=>modal.close());bind('confirm-delete','click',async()=>{const r=await api('commands/delete',{id:original.id});state.commands=r.commands;modal.close();render();toast('Команда удалена.');});});
}
function renderConnections(){
  content.innerHTML=heading('ИНТЕЛЛЕКТ НА ТВОЙ ВЫБОР','Подключения','Бесплатный старт с облаком или полностью локальные ответы.')+`
  <div class="notice"><strong>Рекомендуем: Groq + голос Windows.</strong> Один ключ для распознавания речи и ответов. Ключ получают в своём аккаунте; free tier имеет лимиты. При выборе облака запись и вопрос отправляются выбранному провайдеру. Ключи по умолчанию хранятся только до закрытия Jeffy.</div>
  <div class="provider-grid">${Object.entries(state.providers).map(([p,data])=>`<section class="panel provider-card"><div class="provider-head"><div class="provider-name"><div class="engine-logo">${icon(p==='ollama'?'monitor':'spark')}</div><h2>${esc(data.name)}</h2></div><span class="badge ${state.keys[p].configured?'':'neutral'}">${p==='ollama'?'Без ключа':state.keys[p].configured?'Подключён':'Не подключён'}</span></div><p>${esc(data.description)}</p><div class="links"><a href="${esc(data.url)}" target="_blank" rel="noopener noreferrer">${p==='ollama'?'Скачать Ollama':'Получить ключ'} ↗</a><a href="${({groq:'https://console.groq.com/docs/rate-limits',gemini:'https://ai.google.dev/gemini-api/docs/pricing',openrouter:'https://openrouter.ai/docs/guides/routing/model-variants/free',ollama:'https://docs.ollama.com/quickstart'})[p]}" target="_blank" rel="noopener noreferrer">${p==='ollama'?'Инструкция':'Условия free tier'} ↗</a></div>
  ${p==='ollama'?'<div class="notice" style="margin:18px 0">После установки запусти в терминале:<br><code>ollama pull qwen3:4b</code><br>Для офлайн-голоса выбери Vosk.</div>':`<form data-key-form="${p}"><div class="field"><label for="key-${p}">API-ключ</label><div class="key-line"><input id="key-${p}" type="password" autocomplete="off" spellcheck="false" placeholder="${state.keys[p].configured?'Ключ уже подключён · можно заменить':'Вставь свой ключ'}" required><button class="btn small" type="submit">Сохранить</button></div></div><label class="check-line"><input id="remember-${p}" type="checkbox">Запомнить на этом ПК (Windows DPAPI)</label></form>`}
  <div class="toolbar-group"><button class="btn small ${state.settings.provider===p?'primary':'ghost'}" data-use-provider="${p}">${state.settings.provider===p?'Выбран для ответов':'Использовать'}</button>${p!=='ollama'&&state.keys[p].configured?`<button class="btn small ghost" data-remove-key="${p}">Удалить ключ</button>`:''}</div><div class="inline-error" data-key-error="${p}" role="alert"></div></section>`).join('')}</div><div class="hint-row">${icon('shield')} Сохранённые ключи зашифрованы для твоей учётной записи Windows. В экспорт команд они не входят.</div>`;
  document.querySelectorAll('[data-key-form]').forEach(form=>form.addEventListener('submit',async e=>{e.preventDefault();const p=form.dataset.keyForm;const btn=form.querySelector('button');btn.disabled=true;try{const r=await api('key',{provider:p,key:document.querySelector('#key-'+p).value,remember:document.querySelector('#remember-'+p).checked});state.keys=r.keys;renderConnections();toast('Ключ подключён. Проверь связь в настройках.');}catch(error){document.querySelector(`[data-key-error="${p}"]`).textContent=error.message;}finally{btn.disabled=false;}}));
  document.querySelectorAll('[data-use-provider]').forEach(btn=>btn.addEventListener('click',guard(async()=>{const p=btn.dataset.useProvider;if(p!=='ollama'&&!state.keys[p].configured)throw new Error('Сначала добавь API-ключ.');const settings={...state.settings,provider:p,model:state.providers[p].model,...(['groq','gemini'].includes(p)?{engine:p}:{})};state.settings=(await api('settings',settings)).settings;renderConnections();toast(`Выбран ${state.providers[p].name}.`);})));document.querySelectorAll('[data-remove-key]').forEach(btn=>btn.addEventListener('click',guard(async()=>{state.keys=(await api('key',{provider:btn.dataset.removeKey,key:'',remember:false})).keys;renderConnections();toast('Ключ удалён.');})));
}
const toggle = (id,title,text,value)=>`<div class="toggle-row"><div><strong>${title}</strong><p>${text}</p></div><label class="switch"><input id="${id}" type="checkbox" ${value?'checked':''} aria-label="${title}"><span></span></label></div>`;
function renderSettings(){
  const s=state.settings,ruVoice=state.capabilities.voices.some(v=>v.culture.startsWith('ru'));
  content.innerHTML=heading('ПОДСТРОЙ ПОД СЕБЯ','Настройки','Как Джеффи слышит, отвечает и работает с твоим компьютером.')+`<form id="settings-form"><div class="settings-grid"><section class="panel form-panel"><h2>Голос и распознавание</h2><div class="field"><label for="engine">Распознавание речи</label><select id="engine"><option value="vosk" ${s.engine==='vosk'?'selected':''}>Vosk · офлайн, без ключа</option><option value="groq" ${s.engine==='groq'?'selected':''}>Groq Whisper · облако</option><option value="gemini" ${s.engine==='gemini'?'selected':''}>Google Gemini · облако</option><option value="windows" ${s.engine==='windows'?'selected':''}>Windows · офлайн</option></select><small>Vosk: ${state.capabilities.offlineReady?'установлен':'запусти INSTALL-OFFLINE.cmd'}. Windows: ${state.capabilities.recognizers.some(r=>r.culture==='ru-RU')?'русский модуль установлен':'русский модуль не обнаружен'}. Облачные сервисы требуют ключа.</small></div><div class="field"><label for="voice">Голос ответа Windows</label><select id="voice"><option value="">Автоматически · русский, если установлен</option>${state.capabilities.voices.map(v=>`<option value="${esc(v.name)}" ${s.voice===v.name?'selected':''}>${esc(v.name)} · ${esc(v.culture)}</option>`).join('')}</select><small>${ruVoice?'Озвучка работает локально, без ключа.':'Русский SAPI-голос не обнаружен. Установи русский голос в параметрах речи Windows; пока используется доступный голос.'}</small></div><div class="field"><label for="rate">Скорость ответа</label><input id="rate" type="range" min="-5" max="5" value="${s.rate}"><small>Медленнее ← → быстрее</small></div><button type="button" id="test-voice" class="btn small ghost">${icon('volume')}Послушать голос</button>${toggle('auto-stop','Завершать по паузе','Запись остановится после 1,3 секунды тишины.',s.autoStop)}</section>
  <section class="panel form-panel"><h2>Поведение ассистента</h2><div class="field"><label for="provider">ИИ для голосовых вопросов</label><select id="provider">${Object.entries(state.providers).map(([p,d])=>`<option value="${p}" ${s.provider===p?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div><div class="field"><label for="model">Модель</label><input id="model" value="${esc(s.model)}" maxlength="120" required><small>Можно указать другую модель, доступную у выбранного провайдера.</small></div><div class="field"><label for="wake-word">Слово активации</label><input id="wake-word" value="${esc(s.wakeWord)}" maxlength="30" required><small>Проверяется после распознавания; постоянно слушать микрофон не нужно.</small></div>${toggle('prefix-only','Требовать слово активации','Реагировать только на фразы, начинающиеся с этого слова.',s.prefixOnly)}${toggle('ai-enabled','Отвечать на вопросы голосом','Если команды нет, передать вопрос выбранному ИИ.',s.aiEnabled)}${toggle('save-history','Сохранять историю действий','До 100 записей локально. Аудио не сохраняется.',s.saveHistory)}</section></div><div class="toolbar" style="margin-top:22px"><div class="toolbar-group"><button type="submit" class="btn primary">Сохранить настройки</button><button type="button" id="test-provider" class="btn ghost">Проверить ИИ</button></div><div class="inline-error" id="settings-error" role="alert"></div></div></form>`;
  bind('provider','change',e=>document.querySelector('#model').value=state.providers[e.target.value].model);
  document.querySelector('#settings-form').addEventListener('submit',async e=>{e.preventDefault();e.submitter.disabled=true;try{state.settings=(await api('settings',{provider:document.querySelector('#provider').value,model:document.querySelector('#model').value,engine:document.querySelector('#engine').value,voice:document.querySelector('#voice').value,rate:+document.querySelector('#rate').value,wakeWord:document.querySelector('#wake-word').value,prefixOnly:document.querySelector('#prefix-only').checked,aiEnabled:document.querySelector('#ai-enabled').checked,saveHistory:document.querySelector('#save-history').checked,autoStop:document.querySelector('#auto-stop').checked})).settings;toast('Настройки сохранены.');}catch(error){document.querySelector('#settings-error').textContent=error.message;}finally{e.submitter.disabled=false;}});
  bind('test-voice','click',async()=>{await speak('Привет. Я Джеффи. Рад тебя слышать.',{voice:document.querySelector('#voice').value,rate:+document.querySelector('#rate').value});});bind('test-provider','click',async e=>{e.currentTarget.disabled=true;try{const result=await api('provider/test');toast('ИИ ответил: '+result.reply);}finally{document.querySelector('#test-provider').disabled=false;}});
}
function renderHistory(){content.innerHTML=heading('ВСЁ ПОД КОНТРОЛЕМ','История действий','Выполненные команды и статус голосовых запросов.',`<button class="btn ghost" id="clear-history">${icon('trash')}Очистить</button>`)+`<div class="history-summary">${state.history.length} записей <span>Хранится только на этом компьютере</span></div>${smallHistory(state.history,true)}`;bind('clear-history','click',()=>{openModal(modalHead('Очистить историю?')+'<p class="help-body">Локальные записи действий и контекст голосового разговора будут удалены.</p><div class="modal-actions"><button id="cancel-clear" class="btn ghost">Отмена</button><button id="confirm-clear" class="btn danger">Очистить</button></div>');bind('cancel-clear','click',()=>modal.close());bind('confirm-clear','click',async()=>{await api('history/clear');modal.close();renderHistory();toast('История очищена.');});});}
function showHelp(){openModal(modalHead('Познакомься с Джеффи')+`<div class="help-body"><p><strong>1. Подключи голос.</strong> Для команд без ключа запусти INSTALL-OFFLINE.cmd и выбери Vosk в настройках. Для разговоров с ИИ добавь свой Groq-ключ в «Подключениях».</p><p><strong>2. Нажми микрофон.</strong> Скажи «Джеффи, открой блокнот» или задай вопрос. Запись закончится после паузы; можно остановить её вручную.</p><p><strong>3. Создай свои команды.</strong> В библиотеке добавь голосовую фразу и действия по порядку. Проверка фразы не запускает действия.</p><p>В приложении Windows работает <kbd>Ctrl+Shift+Space</kbd>. Закрытие окна сворачивает Jeffy в трей. Для выхода используй меню значка в трее.</p><p>Озвучка Windows бесплатная и локальная. Облако получает запись и вопрос только после включения микрофона и отправки фразы. Бесплатные API имеют лимиты и ограничения по регионам.</p></div><div class="modal-actions"><button id="help-connections" class="btn primary">Перейти к подключениям</button></div>`);bind('help-connections','click',()=>{modal.close();location.hash='connections';});}
bind('help-button','click',showHelp);
function stopPlayback(){if(outputAudio){outputAudio.pause();URL.revokeObjectURL(outputAudio.src);outputAudio=null;}amplitude=0;if(voiceState==='speaking')setVoice('idle');}
async function speak(text,options={}){
  stopPlayback();setVoice('speaking');
  try{const data=await api('speak',{text:text.slice(0,4000),...options});if(voiceState!=='speaking')return;const bytes=Uint8Array.from(atob(data.audio),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));const audio=new Audio(url);outputAudio=audio;amplitude=.17;
    await new Promise((resolve,reject)=>{audio.onended=()=>{URL.revokeObjectURL(url);if(outputAudio===audio)outputAudio=null;resolve();};audio.onerror=()=>reject(new Error('Не удалось воспроизвести голос Windows.'));audio.onpause=()=>resolve();audio.play().catch(reject);});
    amplitude=0;if(voiceState==='speaking')setVoice('idle');
  }catch(e){stopPlayback();setVoice('error');throw e;}
}
async function toggleMicrophone(){
  if(recording){await stopRecording(true);return;}
  if(voiceState==='processing')return;
  stopPlayback();if(page!=='home'){location.hash='home';render();}
  setVoice('processing');
  let readiness;
  try{readiness=await refreshVoiceReadiness();}catch(e){setVoice('error');throw e;}
  if(!readiness.ready){setVoice('error');throw new Error(readiness.reason);}
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});}
  catch{setVoice('error');throw new Error('Микрофон недоступен. Разреши доступ к микрофону для Jeffy в Windows или браузере.');}
  try{
    const ctx=new AudioContext();await ctx.resume();const source=ctx.createMediaStreamSource(stream);const processor=ctx.createScriptProcessor(4096,1,1);const silence=ctx.createGain();silence.gain.value=0;source.connect(processor);processor.connect(silence);silence.connect(ctx.destination);
    recording={ctx,stream,source,processor,silence,chunks:[],rate:ctx.sampleRate,started:performance.now(),lastSound:performance.now(),heard:false};
    processor.onaudioprocess=e=>{
      const r=recording;if(!r)return;const samples=new Float32Array(e.inputBuffer.getChannelData(0));r.chunks.push(samples);let sum=0;for(const sample of samples)sum+=sample*sample;const rms=Math.sqrt(sum/samples.length);amplitude=Math.min(1,rms*12);const now=performance.now();if(rms>.014){r.heard=true;r.lastSound=now;}
      if(now-r.started>20000 || (state.settings.autoStop&&r.heard&&now-r.lastSound>1300) || (!r.heard&&now-r.started>8000)) stopRecording(r.heard).catch(e=>toast(e.message,true));
    };setVoice('listening');
  }catch(e){stream.getTracks().forEach(t=>t.stop());throw e;}
}
function encodeWave(chunks,sourceRate){
  const length=chunks.reduce((n,a)=>n+a.length,0);const all=new Float32Array(length);let pos=0;for(const c of chunks){all.set(c,pos);pos+=c.length;}
  const targetRate=16000,n=Math.floor(length*targetRate/sourceRate),buffer=new ArrayBuffer(44+n*2),view=new DataView(buffer);
  const write=(offset,text)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));};write(0,'RIFF');view.setUint32(4,36+n*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,targetRate,true);view.setUint32(28,targetRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){const start=Math.floor(i*sourceRate/targetRate),end=Math.min(length,Math.floor((i+1)*sourceRate/targetRate));let sum=0;for(let j=start;j<end;j++)sum+=all[j];const sample=Math.max(-1,Math.min(1,sum/Math.max(1,end-start)));view.setInt16(44+i*2,sample<0?sample*32768:sample*32767,true);}
  const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);
}
async function stopRecording(submit){
  const r=recording;if(!r)return;recording=null;r.processor.onaudioprocess=null;r.stream.getTracks().forEach(t=>t.stop());r.source.disconnect();r.processor.disconnect();r.silence.disconnect();await r.ctx.close();amplitude=0;
  if(!submit||!r.heard){setVoice('idle');if(submit)toast('Не услышал речь. Поднеси микрофон ближе и попробуй ещё раз.');return;}
  setVoice('processing');
  try{const result=await api('transcribe',{audio:encodeWave(r.chunks,r.rate)});if(!result.text){setVoice('idle');toast('Не удалось разобрать речь. Попробуй ещё раз.');return;}lastHeard=result.text;lastReply='';updateVoice();const response=await api('phrase',{text:result.text});if(response.confirmation){setVoice('idle');const c=state.commands.find(c=>c.name===response.command);showConfirmation(c.id,response);return;}lastReply=response.reply;updateVoice();if(page==='home')document.querySelector('#home-history').innerHTML=smallHistory(state.history.slice(0,3));await speak(response.reply);}catch(e){setVoice('error');throw e;}
}
async function stopAll(){if(recording)await stopRecording(false);stopPlayback();if(voiceState!=='processing')setVoice('idle');else toast('Запрос уже отправлен. Дождись ответа.');}
window.jeffyToggleMicrophone=()=>toggleMicrophone().catch(e=>toast(e.message,true));
window.addEventListener('hashchange',()=>{query='';filter='Все';render();});
window.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.code==='Space'){e.preventDefault();window.jeffyToggleMicrophone();}});
window.addEventListener('beforeunload',()=>{recording?.stream.getTracks().forEach(t=>t.stop());stopPlayback();});
fetch('/api/bootstrap').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{state=data;render();}).catch(()=>{content.innerHTML='<div class="notice">Не удалось подключиться к Jeffy. Запусти START-JEFFY.cmd и обнови окно.</div>';});
