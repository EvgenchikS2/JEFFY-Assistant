import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServer} from '../src/server.mjs';

test('voice previews are temporary; saved options survive restart and reach every speech path',async()=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'jeffy-speech-'));
  const calls=[];
  const runWindows=async(op,payload)=>{calls.push({op,payload});return op==='capabilities'?{voices:[{name:'Test Russian',culture:'ru-RU'},{name:'Test English',culture:'en-US'}],recognizers:[]}:{audio:'test'};};
  let app=await createServer({dataDir,runWindows});
  let bootstrap=await(await fetch(app.url+'/api/bootstrap')).json();
  const post=async(endpoint,body)=>{const r=await fetch(app.url+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Jeffy-Token':bootstrap.token},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
  try{
    bootstrap.settings.ttsProvider='windows';
    assert.equal((await post('settings',bootstrap.settings)).status,200);
    const selected={voice:'Test Russian',rate:-2,pitch:'low',volume:65};
    assert.equal((await post('speak',{text:'Предпрослушивание',...selected})).status,200);
    assert.deepEqual(calls.at(-1).payload,{text:'Предпрослушивание',...selected});
    assert.equal((await(await fetch(app.url+'/api/bootstrap')).json()).settings.pitch,'medium');
    assert.equal((await post('settings',{...bootstrap.settings,...selected})).status,200);
    await app.close();app=await createServer({dataDir,runWindows});bootstrap=await(await fetch(app.url+'/api/bootstrap')).json();
    for(const [key,value] of Object.entries(selected))assert.equal(bootstrap.settings[key],value);
    assert.equal((await post('speak',{text:'Ответ ассистента'})).status,200);
    assert.deepEqual(calls.at(-1).payload,{text:'Ответ ассистента',...selected});
    const command={id:'speech-check',name:'Две реплики',phrases:['проверка озвучки'],actions:[{type:'speak',value:'Первая реплика'},{type:'speak',value:'Вторая реплика'}]};
    assert.equal((await post('commands/save',command)).status,200);
    const result=await post('commands/run',{id:command.id});assert.equal(result.status,200);assert.equal(result.data.reply,'Вторая реплика');
    assert.ok(calls.some(c=>c.op==='speak'&&c.payload.text==='Первая реплика'&&Object.entries(selected).every(([k,v])=>c.payload[k]===v)));
    // Invalid drafts must neither invoke a synthesizer nor replace saved preferences.
    for(const invalid of [{pitch:'<audio src="bad"/>'},{volume:101},{volume:0},{rate:6},{rate:1.5},{voice:'Missing voice'}]){
      const count=calls.filter(c=>c.op==='speak').length;
      assert.equal((await post('speak',{text:'Проверка',...invalid})).status,400);
      assert.equal((await post('settings',{...bootstrap.settings,...invalid})).status,400);
      assert.equal(calls.filter(c=>c.op==='speak').length,count);
    }
    const saved=JSON.parse(await readFile(path.join(dataDir,'state.json'),'utf8')).settings;
    for(const [key,value] of Object.entries(selected))assert.equal(saved[key],value);
    // Clients with the previous settings form retain the added voice preferences.
    const {pitch,volume,...oldSettings}=saved;
    assert.equal((await post('settings',oldSettings)).status,200);
    const latest=(await(await fetch(app.url+'/api/bootstrap')).json()).settings;
    assert.equal(latest.pitch,'low');assert.equal(latest.volume,65);
  }finally{await app.close();await rm(dataDir,{recursive:true,force:true});}
});
