import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import readline from 'node:readline';
export function createOffline(directory) {
  const python=path.join(directory,'venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
  const model=path.join(directory,'vosk-model-small-ru-0.22');
  let child, pending, count=0;
  const ready=()=>existsSync(python)&&existsSync(path.join(model,'am','final.mdl'));
  function start(){
    const script=fileURLToPath(new URL('../scripts/offline_voice.py',import.meta.url)).replace(`app.asar${path.sep}`,`app.asar.unpacked${path.sep}`);
    child=spawn(python,['-u',script,model],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    readline.createInterface({input:child.stdout}).on('line',line=>{try{const value=JSON.parse(line);if(pending&&value.id===pending.id){clearTimeout(pending.timer);const p=pending;pending=null;if(value.error)p.reject(new Error(value.error));else p.resolve(value.text||'');}}catch{}});
    child.stderr.on('data',()=>{});
    child.on('error',()=>{if(pending){clearTimeout(pending.timer);pending.reject(new Error('Не удалось запустить офлайн-голос. Повтори INSTALL-OFFLINE.cmd.'));pending=null;}});
    child.on('exit',()=>{child=null;if(pending){clearTimeout(pending.timer);pending.reject(new Error('Офлайн-распознаватель остановился. Повтори INSTALL-OFFLINE.cmd.'));pending=null;}});
  }
  return {
    ready,
    recognize(audio){
      if(!ready())return Promise.reject(new Error('Офлайн-голос ещё не установлен. Запусти INSTALL-OFFLINE.cmd в папке проекта.'));
      if(pending)return Promise.reject(new Error('Предыдущая запись ещё распознаётся.'));
      if(!child)start();
      return new Promise((resolve,reject)=>{const id=++count;const timer=setTimeout(()=>{pending=null;child?.kill();reject(new Error('Офлайн-распознавание не ответило вовремя.'));},30000);pending={id,resolve,reject,timer};child.stdin.write(JSON.stringify({id,audio:audio.toString('base64')})+'\n');});
    },
    close(){if(pending){clearTimeout(pending.timer);pending.reject(new Error('Приложение закрыто.'));pending=null;}child?.kill();child=null;}
  };
}
