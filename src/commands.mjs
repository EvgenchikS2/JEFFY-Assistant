import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {normalizeShortcut} from './shortcuts.mjs';

export const APPS = { notepad: 'Блокнот', calculator: 'Калькулятор', explorer: 'Проводник', telegram: 'Telegram', discord: 'Discord', steam: 'Steam', vscode: 'VS Code' };
export const SHORTCUTS = { desktop: 'Показать рабочий стол', playpause: 'Пауза / воспроизведение', next: 'Следующий трек', previous: 'Предыдущий трек', louder: 'Громче', quieter: 'Тише', mute: 'Выключить / включить звук' };
export function normalize(text) { return String(text).toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/(^|\s)телеграмм(?=\s|$)/g,'$1телеграм').replace(/\s+/g, ' ').trim(); }
const command = (id, name, phrases, icon, group, actions) => ({ id, name, phrases, icon, group, enabled: true, actions });
export const DEFAULT_COMMANDS = [
  command('youtube', 'Открыть YouTube', ['открой youtube', 'открой ютуб', 'запусти ютуб'], 'play', 'Сайты', [{type:'url', value:'https://youtube.com'}]),
  command('music', 'Яндекс Музыка', ['включи музыку', 'открой музыку'], 'music', 'Сайты', [{type:'url', value:'https://music.yandex.ru'}]),
  command('telegram', 'Открыть Telegram', ['открой телеграм', 'открой телеграмм', 'открой telegram', 'запусти телеграм', 'запусти телеграмм', 'запусти telegram'], 'send', 'Приложения', [{type:'app', value:'telegram'}]),
  command('notepad', 'Открыть Блокнот', ['открой блокнот'], 'file', 'Приложения', [{type:'app', value:'notepad'}]),
  command('calculator', 'Калькулятор', ['открой калькулятор'], 'grid', 'Приложения', [{type:'app', value:'calculator'}]),
  command('explorer', 'Проводник', ['открой проводник', 'открой файлы'], 'folder', 'Приложения', [{type:'app', value:'explorer'}]),
  command('desktop', 'Рабочий стол', ['покажи рабочий стол', 'сверни окна'], 'monitor', 'Система', [{type:'shortcut', value:'desktop'}]),
  command('louder', 'Сделать громче', ['сделай громче', 'громче'], 'volume', 'Система', [{type:'shortcut', value:'louder'}]),
  command('quieter', 'Сделать тише', ['сделай тише', 'тише'], 'volume', 'Система', [{type:'shortcut', value:'quieter'}]),
  command('pause', 'Пауза', ['пауза', 'останови музыку', 'продолжи музыку'], 'pause', 'Система', [{type:'shortcut', value:'playpause'}]),
  command('next', 'Следующий трек', ['следующий трек', 'переключи трек'], 'next', 'Система', [{type:'shortcut', value:'next'}]),
  command('mute', 'Выключить звук', ['выключи звук', 'включи звук'], 'volume', 'Система', [{type:'shortcut', value:'mute'}]),
  command('time', 'Сколько времени', ['который час', 'сколько времени'], 'clock', 'Система', [{type:'time'}]),
  command('lock', 'Заблокировать компьютер', ['заблокируй компьютер'], 'lock', 'Система', [{type:'lock'}]),
  command('focus', 'Время работать', ['режим работы', 'время работать'], 'spark', 'Сценарии', [{type:'app',value:'notepad'}, {type:'wait',value:'1'}, {type:'speak',value:'Режим работы включён. Удачной работы.'}]),
  command('game', 'Игровой режим', ['игровой режим'], 'game', 'Сценарии', [{type:'app',value:'steam'}, {type:'wait',value:'2'}, {type:'app',value:'discord'}, {type:'speak',value:'Игровой режим включён.'}]),
  command('break', 'Сделать перерыв', ['сделаем перерыв', 'время отдыха'], 'coffee', 'Сценарии', [{type:'speak',value:'Отдохни немного. Встань, потянись и выпей воды.'}])
];
function phraseShape(text){
  return normalize(text).split(' ').filter(t=>!['пожалуйста','плиз','ну'].includes(t)).join(' ').replace(/^(запусти|открыть|открывай) /,'открой ');
}
function editDistance(a,b){
  const grid=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
  for(let i=0;i<=a.length;i++)grid[i][0]=i;for(let j=0;j<=b.length;j++)grid[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
    grid[i][j]=Math.min(grid[i-1][j]+1,grid[i][j-1]+1,grid[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])grid[i][j]=Math.min(grid[i][j],grid[i-2][j-2]+1);
  }return grid[a.length][b.length];
}
export function findCommand(text, commands, wakeWord = 'джеффи', prefixOnly = false) {
  let phrase = normalize(text);
  const configuredPrefix = normalize(wakeWord);
  const aliases=configuredPrefix==='джеффи' ? ['джеффи','джефи'] : [configuredPrefix];
  const prefix=aliases.find(p=>p && (phrase===p || phrase.startsWith(p+' '))) || configuredPrefix;
  const hasPrefix = prefix && (phrase === prefix || phrase.startsWith(prefix + ' '));
  if (prefixOnly && !hasPrefix) return {command:null};
  if (hasPrefix) phrase = phrase.slice(prefix.length).trim();
  const matches = commands.filter(c => c.enabled && c.phrases.some(p => normalize(p) === phrase));
  if (matches.length > 1) throw new Error('Эта фраза есть у нескольких команд. Измените фразы в редакторе.');
  if(matches[0])return {command:matches[0],fuzzy:false,score:1};
  const shape=phraseShape(phrase), words=shape.split(' ');
  if(!shape||shape.length>180||words.some(t=>['не','нет','отмена','отмени'].includes(t)))return {command:null};
  const actionWords=['открой','закрой','включи','выключи','удали','создай','заблокируй','разблокируй','сделай','покажи','сверни'];
  const candidates=[];
  for(const command of commands.filter(c=>c.enabled)){
    let best=0;
    for(const p of command.phrases){
      const target=phraseShape(p),targetWords=target.split(' ');
      if(shape===target){best=1;break;}
      if(words.length!==targetWords.length||Math.abs(shape.length-target.length)>2)continue;
      if(actionWords.includes(words[0])&&actionWords.includes(targetWords[0])&&words[0]!==targetWords[0])continue;
      let changes=0,total=0,valid=true;
      for(let i=0;i<words.length;i++)if(words[i]!==targetWords[i]){
        const d=editDistance(words[i],targetWords[i]);
        if(Math.min(words[i].length,targetWords[i].length)<4||d>2){valid=false;break;}
        changes++;total+=d;
      }
      if(!valid||changes>1||total>2)continue;
      const score=1-total/Math.max(shape.length,target.length);
      const threshold=words.length===1&&shape.length>=5&&total===1?.8:.85;
      if(score>=threshold)best=Math.max(best,score);
    }
    if(best)candidates.push({command,score:best,fuzzy:true});
  }
  candidates.sort((a,b)=>b.score-a.score);
  if(candidates.length>1&&candidates[0].score-candidates[1].score<.06)throw new Error(`Фраза похожа на несколько команд: «${candidates[0].command.name}» и «${candidates[1].command.name}». Скажи точнее.`);
  return candidates[0]||{command:null};
}
export function matchCommand(...args){return findCommand(...args).command;}
export function validateApplication(value){
  if(APPS[value])return value;
  if(typeof value!=='string'||value.length>1000||/[\x00-\x1f"<>|?*]/.test(value)||! /^[A-Za-z]:[\\/]/.test(value)||!['.exe','.lnk'].includes(path.win32.extname(value).toLowerCase()))throw new Error('Выберите EXE или ярлык LNK либо укажите полный путь к нему.');
  return path.win32.normalize(value);
}
export function validateCommand(raw) {
  if (!raw || typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 80) throw new Error('Название: от 1 до 80 символов.');
  if (!Array.isArray(raw.phrases) || !raw.phrases.length || raw.phrases.length > 20 || raw.phrases.some(p => typeof p !== 'string' || !normalize(p) || p.length > 160)) throw new Error('Добавьте от 1 до 20 голосовых фраз.');
  if (!Array.isArray(raw.actions) || !raw.actions.length || raw.actions.length > 20) throw new Error('Добавьте от 1 до 20 действий.');
  const actions = raw.actions.map(a => {
    const value = String(a.value ?? '');
    if (a.type === 'app') return {type:a.type,value:validateApplication(value)};
    if (a.type === 'shortcut') return {type:a.type,value:SHORTCUTS[value]?value:normalizeShortcut(value)};
    if (a.type === 'url') {
      let url; try { url = new URL(value); } catch { throw new Error('Укажите полный адрес сайта: https://…'); }
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || value.length > 2000) throw new Error('Допустимы только http/https без логина и пароля.');
      return {type:a.type,value:url.href};
    }
    if (a.type === 'wait' && Number.isFinite(+value) && +value >= 0 && +value <= 15) return {type:a.type,value};
    if (a.type === 'speak' && value.trim() && value.length <= 600) return {type:a.type,value};
    if (['time','lock'].includes(a.type)) return {type:a.type};
    throw new Error('Недопустимое действие или значение.');
  });
  if (actions.reduce((s,a) => s + (a.type === 'wait' ? +a.value : 0),0) > 30) throw new Error('Суммарная пауза не должна превышать 30 секунд.');
  return {id: typeof raw.id === 'string' && /^[\w-]{1,80}$/.test(raw.id) ? raw.id : randomUUID(), name:raw.name.trim(), phrases:[...new Set(raw.phrases.map(p=>p.trim()))], icon:raw.icon || 'spark', group:['Сценарии','Сайты','Приложения','Система','Мои команды'].includes(raw.group) ? raw.group : 'Мои команды', enabled:raw.enabled !== false, actions};
}
export function checkConflicts(commands) {
  if(new Set(commands.map(c=>c.id)).size!==commands.length) throw new Error('Обнаружены повторяющиеся идентификаторы команд.');
  const seen = new Map();
  for (const c of commands) if(c.enabled) for (const p of c.phrases) {
    const key = normalize(p);
    if(seen.has(key) && seen.get(key) !== c.id) throw new Error(`Фраза «${p}» уже используется другой командой.`);
    seen.set(key,c.id);
  }
}
