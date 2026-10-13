import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../src/server.mjs';
import {DEFAULT_COMMANDS} from '../src/commands.mjs';
test('local API authenticates, persists commands and confirms risky actions',async()=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'jeffy-test-'));const calls=[];
  const app=await createServer({dataDir,runWindows:async(op,payload)=>{calls.push({op,payload});return {voices:[],recognizers:[],audio:'test'};}});
  try{
    const bootstrap=await (await fetch(app.url+'/api/bootstrap')).json();assert.equal(bootstrap.commands.length,17);
    const post=async(endpoint,body,token=bootstrap.token,origin)=>{const response=await fetch(app.url+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Jeffy-Token':token,...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
    assert.equal((await post('commands/run',{id:'time'},'wrong')).status,403);
    assert.equal((await post('commands/run',{id:'time'},bootstrap.token,'https://foreign.example')).status,403);
    const preview=await post('commands/preview',{phrase:'Джеффи, который час?'});assert.equal(preview.data.command.id,'time');assert.equal(calls.filter(c=>c.op!=='capabilities').length,0);
    const time=await post('phrase',{text:'Джеффи, который час?'});assert.match(time.data.reply,/Сейчас/);assert.equal(time.data.history.length,1);
    const lock=await post('commands/run',{id:'lock'});assert.ok(lock.data.confirmation);assert.ok(!calls.some(c=>c.op==='lock'));
    const confirmed=await post('commands/run',{id:'lock',confirmation:lock.data.confirmation});assert.equal(confirmed.data.kind,'command');assert.equal(calls.filter(c=>c.op==='lock').length,1);
    const replay=await post('commands/run',{id:'lock',confirmation:lock.data.confirmation});assert.ok(replay.data.confirmation);assert.equal(calls.filter(c=>c.op==='lock').length,1);
    const command={id:'custom',name:'Мой сценарий',phrases:['проверка'],group:'Сценарии',actions:[{type:'time'},{type:'speak',value:'Проверка завершена.'}]};
    assert.equal((await post('commands/save',command)).status,200);
    const conflict=await post('commands/save',{...command,id:'conflict'});assert.equal(conflict.status,400);
    const customApp=await post('commands/save',{id:'own-app',name:'Мой редактор',phrases:['запусти мой редактор'],actions:[{type:'app',value:'D:\\Apps\\Editor.exe'},{type:'shortcut',value:'Ctrl+Shift+S'}]});assert.equal(customApp.status,200);
    const customResult=await post('phrase',{text:'открой пожалуйста мой редактор'});assert.equal(customResult.data.kind,'command');assert.ok(calls.some(c=>c.op==='app'&&c.payload.value==='D:\\Apps\\Editor.exe'));assert.ok(calls.some(c=>c.op==='shortcut'&&c.payload.value==='Ctrl+Shift+S'));
    const badImport=await post('commands/import',{commands:[{...command,id:'bad',actions:[{type:'shell',value:'bad'}]}]});assert.equal(badImport.status,400);
    const persisted=JSON.parse(await readFile(path.join(dataDir,'state.json'),'utf8'));assert.equal(persisted.commands.find(c=>c.id==='custom').name,'Мой сценарий');assert.equal(persisted.commands.length,19);
    const unknown=await post('phrase',{text:'нет такой команды'});assert.equal(unknown.status,400);assert.match(unknown.data.error,/Добавьте ключ/);
    assert.equal((await post('transcribe',{audio:'bm90LXdhdg=='})).status,400);
    assert.equal((await fetch(app.url+'/../package.json')).status,404);
    await post('history/clear',{});
    assert.equal(JSON.parse(await readFile(path.join(dataDir,'state.json'),'utf8')).history.length,0);
  } finally{await app.close();await rm(dataDir,{recursive:true,force:true});}
});
test('bootstrap migrates unavailable Windows recognition to installed Vosk',async()=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'jeffy-migration-')),offlineDir=path.join(dataDir,'offline');
  await mkdir(path.join(offlineDir,'venv',process.platform==='win32'?'Scripts':'bin'),{recursive:true});
  await mkdir(path.join(offlineDir,'vosk-model-small-ru-0.22','am'),{recursive:true});
  await writeFile(path.join(offlineDir,'venv',process.platform==='win32'?'Scripts/python.exe':'bin/python'),'test fixture; never executed');
  await writeFile(path.join(offlineDir,'vosk-model-small-ru-0.22','am','final.mdl'),'test fixture');
  await writeFile(path.join(dataDir,'state.json'),JSON.stringify({settings:{engine:'windows'},commands:DEFAULT_COMMANDS,history:[]}));
  const app=await createServer({dataDir,offlineDir,runWindows:async()=>({voices:[],recognizers:[{culture:'en-US'}]})});
  try{const state=await(await fetch(app.url+'/api/bootstrap')).json();assert.equal(state.settings.engine,'vosk');assert.equal(JSON.parse(await readFile(path.join(dataDir,'state.json'),'utf8')).settings.engine,'vosk');}
  finally{await app.close();await rm(dataDir,{recursive:true,force:true});}
});
