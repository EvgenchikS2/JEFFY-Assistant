import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { DEFAULT_COMMANDS, APPS, SHORTCUTS, findCommand, validateCommand, checkConflicts, normalize } from './commands.mjs';
import { PROVIDERS, answer, transcribe } from './providers.mjs';
import { windows } from './windows.mjs';
import { createOffline } from './offline.mjs';
import { voiceReadiness } from '../public/voice-state.mjs';

const root = fileURLToPath(new URL('../',import.meta.url));
const defaults = { provider:'groq', model:PROVIDERS.groq.model, engine:'vosk', voice:'', rate:0, wakeWord:'джеффи', prefixOnly:false, aiEnabled:true, saveHistory:true, autoStop:true };
export async function createServer({ port=0, dataDir=path.join(root,'data'), offlineDir=path.join(root,'offline'), runWindows=windows } = {}) {
  const offline = createOffline(offlineDir);
  await mkdir(dataDir,{recursive:true});
  const statePath = path.join(dataDir,'state.json'), secretsPath = path.join(dataDir,'keys.dpapi.json');
  let state = {settings:{...defaults},commands:structuredClone(DEFAULT_COMMANDS),history:[]};
  try {
    const stored = JSON.parse(await readFile(statePath,'utf8'));
    const commands = stored.commands.map(validateCommand); checkConflicts(commands);
    state = {settings:{...defaults,...stored.settings},commands,history:Array.isArray(stored.history)?stored.history.slice(0,100):[]};
    if(!PROVIDERS[state.settings.provider]) state.settings.provider = defaults.provider;
  } catch(e) { if(e.code !== 'ENOENT') { await writeFile(path.join(dataDir,`recovery-${Date.now()}.json`),await readFile(statePath)).catch(()=>{}); console.warn('Jeffy: повреждённое состояние сохранено в recovery; загружены стандартные команды.'); } }
  let keys = {}, protectedKeys = {}, context = [], busy = false, targetWindow='';
  try { protectedKeys = JSON.parse(await readFile(secretsPath,'utf8')); for(const [p,encrypted] of Object.entries(protectedKeys)) if(PROVIDERS[p]) { try { keys[p] = (await runWindows('unprotect',{value:encrypted})).value; } catch { console.warn(`Jeffy: сохранённый ключ ${p} недоступен в этой учётной записи Windows.`); } } } catch {}
  const token = randomBytes(32).toString('hex'), confirmations = new Map();
  let persistQueue = Promise.resolve();
  function persist() {
    const json = JSON.stringify(state,null,2);
    persistQueue = persistQueue.catch(()=>{}).then(async()=>{const temp = statePath+'.tmp';await writeFile(temp,json,'utf8');await rename(temp,statePath);});
    return persistQueue;
  }
  let capabilities;
  async function caps() { if(!capabilities) capabilities = await runWindows('capabilities').catch(()=>({voices:[],recognizers:[]})); return capabilities; }
  const keyStatus = ()=>Object.fromEntries(Object.keys(PROVIDERS).map(p=>[p,{configured:p==='ollama'||!!keys[p],saved:!!protectedKeys[p]}]));
  async function log(entry) { if(state.settings.saveHistory) {state.history.unshift({id:randomUUID(),at:new Date().toISOString(),...entry});state.history=state.history.slice(0,100);await persist();} }
  async function execute(c, confirmationToken) {
    if(busy) throw new Error('Предыдущая команда ещё выполняется.');
    if(c.actions.some(a=>a.type==='lock')) {
      const record = confirmations.get(confirmationToken);
      if(!record || record.id!==c.id || record.expires<Date.now()) {
        for(const [k,v] of confirmations) if(v.expires<Date.now()) confirmations.delete(k);
        const confirmation = randomBytes(16).toString('hex'); confirmations.set(confirmation,{id:c.id,expires:Date.now()+30000});
        return {confirmation,command:c.name,message:'Команда заблокирует компьютер. Выполнить?'};
      }
      confirmations.delete(confirmationToken);
    }
    busy = true;
    const completed = []; let reply = `Команда «${c.name}» выполнена.`,launchedApplication=false;
    try {
      for(const a of c.actions) {
        if(a.type==='wait') await new Promise(r=>setTimeout(r,+a.value*1000));
        else if(a.type==='time') reply = `Сейчас ${new Intl.DateTimeFormat('ru-RU',{hour:'numeric',minute:'2-digit'}).format(new Date())}.`;
        else if(a.type==='speak') {
          // Intermediate speech is played by Windows before subsequent steps.
          if(c.actions.at(-1)!==a) {
            const wav = await runWindows('speak',{text:a.value,voice:state.settings.voice,rate:state.settings.rate});
            await runWindows('play',{audio:wav.audio},30000);
          } else reply = a.value;
        }
        else {await runWindows(a.type,{value:a.value,...(a.type==='shortcut'&&!SHORTCUTS[a.value]&&!launchedApplication&&targetWindow?{target:targetWindow}:{})});if(['app','url'].includes(a.type))launchedApplication=true;}
        completed.push(a.type);
      }
      await log({kind:'command',title:c.name,status:'ok',detail:`${completed.length} действий`});
      return {kind:'command',command:c.name,reply,completed};
    } catch(e) {await log({kind:'command',title:c.name,status:'error',detail:`${completed.length} действий выполнено. ${e.message}`});throw new Error(`${e.message}${completed.length ? ` Уже выполнено действий: ${completed.length}.` : ''}`);} finally {busy=false;}
  }
  async function handlePhrase(text) {
    if(typeof text!=='string' || !text.trim() || text.length>3000) throw new Error('Не удалось разобрать речь. Попробуйте ещё раз.');
    const matched = findCommand(text,state.commands,state.settings.wakeWord,state.settings.prefixOnly), cmd=matched.command;
    if(cmd) return {...await execute(cmd),heard:text,fuzzy:matched.fuzzy,score:matched.score};
    const phrase = normalize(text), wake=normalize(state.settings.wakeWord);
    const hasWake=[wake,...(wake==='джеффи'?['джефи']:[])].some(w=>phrase===w || phrase.startsWith(w+' '));
    if(state.settings.prefixOnly && !hasWake) return {kind:'ignored',heard:text,reply:'В начале команды произнесите слово «'+state.settings.wakeWord+'».'};
    if(/^(привет|джеффи привет|привет джеффи)$/.test(phrase)) return {kind:'local',heard:text,reply:'Привет! Я Джеффи. Готов помочь.'};
    if(!state.settings.aiEnabled) return {kind:'unknown',heard:text,reply:'Команда не найдена. Добавьте эту фразу в библиотеку команд.'};
    if(busy) throw new Error('Предыдущая команда ещё выполняется.');
    busy=true;
    try {
      const reply = await answer(text,state.settings,keys,context);
      context.push({role:'user',content:text},{role:'assistant',content:reply});context=context.slice(-8);
      await log({kind:'voice',title:'Голосовой вопрос',status:'ok',detail:PROVIDERS[state.settings.provider].name});
      return {kind:'voice',heard:text,reply};
    } finally {busy=false;}
  }
  const server = http.createServer(async(req,res)=>{
    const json = (status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
    const host = `127.0.0.1:${server.address()?.port}`;
    res.setHeader('X-Content-Type-Options','nosniff');
    if(req.headers.host!==host || (req.headers.origin && req.headers.origin!==`http://${host}`)) return json(403,{error:'Запрос разрешён только из окна Jeffy.'});
    const url = new URL(req.url,`http://${host}`);
    if(url.pathname.startsWith('/api/')) {
      if(req.method==='GET' && url.pathname==='/api/bootstrap') {
        const currentCaps={...await caps(),offlineReady:offline.ready()};
        const voice=voiceReadiness(state.settings,currentCaps,keyStatus());
        if(voice.engine!==state.settings.engine){state.settings={...state.settings,engine:voice.engine};await persist();}
        return json(200,{token, ...state,keys:keyStatus(),providers:PROVIDERS,apps:APPS,shortcuts:SHORTCUTS,capabilities:currentCaps,platform:process.platform});
      }
      if(req.headers['x-jeffy-token']!==token) return json(403,{error:'Недействительная сессия. Перезапустите окно Jeffy.'});
      if(req.method!=='POST') return json(405,{error:'Метод не поддерживается.'});
      try {
        let total=0;const chunks=[];
        for await(const chunk of req) {total+=chunk.length;if(total>8*1024*1024) {json(413,{error:'Слишком длинная запись.'});return;}chunks.push(chunk);}
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
        let result;
        switch(url.pathname) {
          case '/api/settings': {
            const s = body;
            if(!PROVIDERS[s.provider] || !['groq','gemini','windows','vosk'].includes(s.engine)) throw new Error('Неизвестный провайдер.');
            if(typeof s.model!=='string' || !/^[\w.\-/:]{1,120}$/.test(s.model)) throw new Error('Недопустимое имя модели.');
            if(typeof s.wakeWord!=='string' || !normalize(s.wakeWord) || s.wakeWord.length>30) throw new Error('Слово активации: от 1 до 30 символов.');
            if(!Number.isInteger(+s.rate) || +s.rate < -5 || +s.rate > 5) throw new Error('Недопустимая скорость речи.');
            if(s.voice && !(await caps()).voices.some(v=>v.name===s.voice)) throw new Error('Этот голос Windows не установлен.');
            state.settings={provider:s.provider,model:s.model,engine:s.engine,voice:String(s.voice||''),rate:+s.rate,wakeWord:s.wakeWord, prefixOnly:!!s.prefixOnly,aiEnabled:!!s.aiEnabled,saveHistory:!!s.saveHistory,autoStop:!!s.autoStop};
            context=[];await persist();result={settings:state.settings};break;
          }
          case '/api/key': {
            if(!PROVIDERS[body.provider] || body.provider==='ollama') throw new Error('Неизвестный провайдер.');
            if(typeof body.key!=='string' || body.key.length>600 || /[\r\n]/.test(body.key)) throw new Error('Недопустимый ключ.');
            const p=body.provider;
            if(body.key && body.remember) protectedKeys[p]=(await runWindows('protect',{value:body.key.trim()})).value;
            else delete protectedKeys[p];
            if(body.key.trim()) keys[p]=body.key.trim();else delete keys[p];
            await writeFile(secretsPath,JSON.stringify(protectedKeys),'utf8'); result={keys:keyStatus()};break;
          }
          case '/api/provider/test': result={reply:await answer('Ответь одним словом: готов.',state.settings,keys)};break;
          case '/api/commands/save': {
            const c = validateCommand(body);const next = state.commands.filter(x=>x.id!==c.id);next.push(c);if(next.length>200)throw new Error('В библиотеке допускается до 200 команд.');checkConflicts(next);state.commands=next;
            await persist();result={commands:state.commands};break;
          }
          case '/api/commands/delete': state.commands=state.commands.filter(c=>c.id!==body.id);await persist();result={commands:state.commands};break;
          case '/api/commands/import': {
            if(!Array.isArray(body.commands) || body.commands.length>200) throw new Error('Файл должен содержать до 200 команд.');
            const imported=body.commands.map(validateCommand);const next=state.commands.filter(c=>!imported.some(i=>i.id===c.id)).concat(imported);
            if(next.length>200) throw new Error('В библиотеке допускается до 200 команд.');checkConflicts(next);state.commands=next;await persist();result={commands:next};break;
          }
          case '/api/commands/preview': {result=findCommand(body.phrase,state.commands,state.settings.wakeWord,state.settings.prefixOnly);break;}
          case '/api/commands/run': {const c=state.commands.find(c=>c.id===body.id&&c.enabled);if(!c)throw new Error('Команда отключена или не найдена.');result=await execute(c,body.confirmation);break;}
          case '/api/phrase': result=await handlePhrase(body.text);break;
          case '/api/transcribe': {
            if(typeof body.audio!=='string' || body.audio.length>7000000 || !/^[A-Za-z0-9+/=]+$/.test(body.audio)) throw new Error('Некорректная запись.');
            const audio=Buffer.from(body.audio,'base64');
            if(audio.length<44 || audio.toString('ascii',0,4)!=='RIFF' || audio.toString('ascii',8,12)!=='WAVE') throw new Error('Ожидается WAV-аудио.');
            const text=state.settings.engine==='vosk' ? await offline.recognize(audio) : state.settings.engine==='windows' ? (await runWindows('recognize',{audio:body.audio},25000)).text : await transcribe(audio,state.settings.engine,keys);
            result={text};break;
          }
          case '/api/speak': {
            if(typeof body.text!=='string' || !body.text.trim() || body.text.length>4000) throw new Error('Недопустимый текст озвучки.');
            const voice=body.voice ?? state.settings.voice,rate=+(body.rate ?? state.settings.rate);
            if(voice && !(await caps()).voices.some(v=>v.name===voice))throw new Error('Этот голос Windows не установлен.');
            if(!Number.isInteger(rate)||rate < -5||rate > 5)throw new Error('Недопустимая скорость речи.');
            result=await runWindows('speak',{text:body.text,voice,rate},30000);break;
          }
          case '/api/history/clear': state.history=[];context=[];await persist();result={history:[]};break;
          default: return json(404,{error:'Неизвестный запрос.'});
        }
        return json(200,{...result,history:state.history});
      } catch(e) {return json(400,{error:e.message || 'Ошибка запроса.'});}
    }
    if(req.method!=='GET') return json(405,{error:'Метод не поддерживается.'});
    const assets = {'/':'index.html','/app.js':'app.js','/voice-state.mjs':'voice-state.mjs','/styles.css':'styles.css','/logo.svg':'logo.svg'};
    if(!assets[url.pathname]) return json(404,{error:'Не найдено.'});
    try {
      const data = await readFile(path.join(root,'public',assets[url.pathname]));
      const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'}[path.extname(assets[url.pathname])];
      res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; media-src 'self' blob: data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});res.end(data);
    } catch {return json(500,{error:'Файлы интерфейса не найдены.'});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  server.on('close',()=>offline.close());
  return {server,url:`http://127.0.0.1:${server.address().port}`,setTargetWindow:handle=>{targetWindow=/^\d+$/.test(String(handle))?String(handle):'';},close:()=>{offline.close();return new Promise(r=>server.close(r));}};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const app=await createServer({port:Number(process.env.JEFFY_PORT || 47831)});
  console.log(`Jeffy: ${app.url}\nДля остановки нажмите Ctrl+C.`);
}
